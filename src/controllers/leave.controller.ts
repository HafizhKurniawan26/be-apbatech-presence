// src/controllers/leave.controller.ts
import { Context } from "hono";
import { createDb, type Env } from "../db";
import { leaveRequests, users } from "../db/schema";
import { eq, and, between, desc, sql } from "drizzle-orm";
import { CloudinaryService } from "../services/cloudinary.service";
import { NotificationHelper } from "../utils/notification.helper";
import type { CreateLeaveRequestInput } from "../validators/leave.validator";
import { R2Service } from "../services/r2.service";

// Utility function untuk mendapatkan folder path dengan tanggal
function getDateBasedFolder(basePath: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${basePath}/${year}/${month}/${day}`;
}

export class LeaveController {
  /**
   * Create leave request (Employee only)
   */
  static async createRequest(c: Context<{ Bindings: Env }>) {
    const user = c.get("user");
    const db = createDb(c.env.DB);

    try {
      // Parse multipart form data
      const formData = await c.req.formData();

      const type = formData.get("type") as "cuti" | "izin" | "sakit";
      const startDate = formData.get("start_date") as string;
      const endDate = formData.get("end_date") as string;
      const reason = formData.get("reason") as string;
      const attachment = formData.get("attachment") as File | null;

      // Validasi input required fields
      if (!type || !startDate || !endDate || !reason) {
        return c.json(
          {
            success: false,
            message: "Missing required fields",
            required: ["type", "start_date", "end_date", "reason"],
            received: { type, startDate, endDate, reason: !!reason },
          },
          400,
        );
      }

      // Validasi tipe leave
      const validTypes = ["cuti", "izin", "sakit"];
      if (!validTypes.includes(type)) {
        return c.json(
          {
            success: false,
            message: "Invalid leave type. Must be: cuti, izin, or sakit",
            valid_types: validTypes,
          },
          400,
        );
      }

      // Parse dan validasi dates
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return c.json(
          {
            success: false,
            message: "Invalid date format. Use YYYY-MM-DD",
            errors: {
              start_date: isNaN(start.getTime()) ? "Invalid start date" : null,
              end_date: isNaN(end.getTime()) ? "Invalid end date" : null,
            },
          },
          400,
        );
      }

      // Validasi range tanggal
      if (end < start) {
        return c.json(
          {
            success: false,
            message: "End date must be after or equal to start date",
            data: {
              start_date: startDate,
              end_date: endDate,
            },
          },
          400,
        );
      }

      // Validasi tidak boleh request untuk tanggal yang sudah lewat
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (start < today) {
        return c.json(
          {
            success: false,
            message: "Cannot request leave for past dates",
            data: {
              requested_start: startDate,
              current_date: today.toISOString().split("T")[0],
            },
          },
          400,
        );
      }

      // Validasi maksimum durasi cuti (misal maks 30 hari)
      const maxDays = 30;
      const totalDaysRequested =
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
        1;

      if (totalDaysRequested > maxDays) {
        return c.json(
          {
            success: false,
            message: `Leave duration cannot exceed ${maxDays} days`,
            data: {
              requested_days: totalDaysRequested,
              max_days: maxDays,
            },
          },
          400,
        );
      }

      // Validasi panjang alasan
      if (reason.length < 10) {
        return c.json(
          {
            success: false,
            message: "Reason must be at least 10 characters",
            data: {
              current_length: reason.length,
              min_length: 10,
            },
          },
          400,
        );
      }

      if (reason.length > 500) {
        return c.json(
          {
            success: false,
            message: "Reason cannot exceed 500 characters",
            data: {
              current_length: reason.length,
              max_length: 500,
            },
          },
          400,
        );
      }

      // Cek overlapping leave requests yang masih aktif (pending atau approved)
      const [overlappingLeave] = await db
        .select()
        .from(leaveRequests)
        .where(
          and(
            eq(leaveRequests.userId, user.id),
            sql`status IN ('pending', 'approved')`,
            sql`(
            (start_date <= ${end.toISOString()} AND end_date >= ${start.toISOString()})
          )`,
          ),
        )
        .limit(1);

      if (overlappingLeave) {
        return c.json(
          {
            success: false,
            message: "You have an overlapping leave request",
            code: "OVERLAPPING_LEAVE",
            data: {
              existing_request: {
                id: overlappingLeave.id,
                type: overlappingLeave.type,
                start_date: overlappingLeave.startDate,
                end_date: overlappingLeave.endDate,
                status: overlappingLeave.status,
                total_days: overlappingLeave.totalDays,
              },
              requested: {
                start_date: startDate,
                end_date: endDate,
                total_days: totalDaysRequested,
              },
            },
          },
          400,
        );
      }

      // Validasi quota untuk tiap jenis leave
      const currentYear = new Date().getFullYear();
      const yearStart = new Date(currentYear, 0, 1);
      const yearEnd = new Date(currentYear, 11, 31);

      // Hitung quota yang sudah digunakan
      const [usedQuota] = await db
        .select({
          total_days: sql<number>`COALESCE(SUM(total_days), 0)`,
        })
        .from(leaveRequests)
        .where(
          and(
            eq(leaveRequests.userId, user.id),
            eq(leaveRequests.type, type),
            eq(leaveRequests.status, "approved"),
            between(leaveRequests.startDate, yearStart, yearEnd),
          ),
        );

      const quotaPerType = {
        cuti: 12, // 12 days per year
        izin: 6, // 6 days per year
        sakit: 14, // 14 days per year
      };

      const usedDays = usedQuota?.total_days || 0;
      const remainingQuota = quotaPerType[type] - usedDays;

      if (totalDaysRequested > remainingQuota) {
        return c.json(
          {
            success: false,
            message: `Insufficient ${type} quota`,
            code: "INSUFFICIENT_QUOTA",
            data: {
              leave_type: type,
              quota_total: quotaPerType[type],
              quota_used: usedDays,
              quota_remaining: remainingQuota,
              requested_days: totalDaysRequested,
              year: currentYear,
            },
          },
          400,
        );
      }

      // PERUBAHAN: Upload attachment ke Cloudflare R2 dengan struktur folder berdasarkan tanggal
      let attachmentUrl: string | undefined;
      let attachmentKey: string | undefined;

      if (attachment && attachment.size > 0) {
        // Validasi file attachment
        const allowedTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/webp",
          "application/pdf",
        ];

        if (!allowedTypes.includes(attachment.type)) {
          return c.json(
            {
              success: false,
              message:
                "Invalid attachment format. Allowed: JPG, PNG, WEBP, PDF",
              code: "INVALID_ATTACHMENT_FORMAT",
              allowed_formats: allowedTypes,
            },
            400,
          );
        }

        // Maksimal 5MB
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (attachment.size > maxSize) {
          return c.json(
            {
              success: false,
              message: "Attachment size too large. Max 5MB",
              code: "ATTACHMENT_TOO_LARGE",
              data: {
                size_mb: (attachment.size / (1024 * 1024)).toFixed(2),
                max_size_mb: 5,
              },
            },
            400,
          );
        }

        try {
          const r2Service = new R2Service(c.env);

          // Generate public ID dengan informasi lengkap
          const publicId = r2Service.generatePublicId(
            user.id,
            `leave_${type}_${startDate}_${endDate}`,
          );

          // Buat folder berdasarkan tanggal upload (saat ini)
          // Format: leaves/{type}/YYYY/MM/DD/
          const dateFolder = getDateBasedFolder(`leaves/${type}`);

          console.log(`📁 Uploading leave attachment to: ${dateFolder}`);

          const uploadResult = await r2Service.uploadImage(
            attachment,
            dateFolder, // Gunakan folder dengan struktur tanggal
            publicId,
          );

          attachmentUrl = uploadResult.url;
          attachmentKey = uploadResult.key;

          console.log(`✅ Attachment uploaded to R2: ${attachmentKey}`);
          console.log(`🔗 Public URL: ${attachmentUrl}`);
        } catch (error) {
          console.error("Failed to upload attachment to R2:", error);
          return c.json(
            {
              success: false,
              message: "Failed to upload attachment. Please try again.",
              code: "UPLOAD_FAILED",
              error:
                process.env.NODE_ENV === "development"
                  ? String(error)
                  : undefined,
            },
            500,
          );
        }
      }

      // Validasi attachment untuk sakit (wajib)
      if (type === "sakit" && !attachmentUrl) {
        return c.json(
          {
            success: false,
            message:
              "Medical certificate attachment is required for sick leave",
            code: "ATTACHMENT_REQUIRED",
            data: {
              leave_type: "sakit",
              requirement: "Medical certificate or doctor's note",
            },
          },
          400,
        );
      }

      // Validasi attachment untuk cuti panjang (>3 hari)
      if (type === "cuti" && totalDaysRequested > 3 && !attachmentUrl) {
        return c.json(
          {
            success: false,
            message: "Attachment is required for leave longer than 3 days",
            code: "ATTACHMENT_REQUIRED_LONG_LEAVE",
            data: {
              leave_type: "cuti",
              requested_days: totalDaysRequested,
              threshold: 3,
            },
          },
          400,
        );
      }

      // Create leave request di database
      const now = new Date();
      const [leaveRequest] = await db
        .insert(leaveRequests)
        .values({
          userId: user.id,
          type: type,
          startDate: start,
          endDate: end,
          reason: reason.trim(),
          attachmentUrl: attachmentUrl,
          attachmentKey: attachmentKey,
          totalDays: totalDaysRequested,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      // Kirim notifikasi ke semua admin
      try {
        // Get all admin users
        const admins = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            fcmToken: users.fcmToken,
          })
          .from(users)
          .where(eq(users.role, "admin"));

        if (admins.length > 0) {
          const notificationHelper = new NotificationHelper(c.env);

          // Format tanggal untuk notifikasi
          const formatDate = (date: Date) => {
            return date.toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            });
          };

          const startDateFormatted = formatDate(start);
          const endDateFormatted = formatDate(end);

          // Kirim notifikasi ke semua admin
          await notificationHelper.sendLeaveRequestNotificationToAdmin(
            admins.map((a) => a.id),
            user.name,
            type,
            {
              start_date: startDateFormatted,
              end_date: endDateFormatted,
              total_days: totalDaysRequested,
              reason: reason.substring(0, 100),
              request_id: leaveRequest.id,
            },
          );

          console.log(
            `Notifications sent to ${admins.length} admins for leave request #${leaveRequest.id}`,
          );
        }
      } catch (error) {
        // Jangan gagalkan request jika notifikasi gagal
        console.error("Failed to send admin notifications:", error);
      }

      // Kirim notifikasi konfirmasi ke user
      try {
        const notificationHelper = new NotificationHelper(c.env);
        await notificationHelper.sendNotification(user.id, {
          title: "Pengajuan Cuti/Izin Dikirim",
          body: `Pengajuan ${type.toUpperCase()} Anda untuk ${totalDaysRequested} hari telah dikirim dan menunggu persetujuan admin.`,
          data: {
            type: "leave_submitted",
            leave_id: leaveRequest.id.toString(),
            status: "pending",
          },
        });
      } catch (error) {
        console.error("Failed to send user confirmation notification:", error);
      }

      // Return success response
      return c.json(
        {
          success: true,
          message: "Leave request submitted successfully",
          code: "LEAVE_REQUEST_CREATED",
          data: {
            request: {
              id: leaveRequest.id,
              type: leaveRequest.type,
              start_date: leaveRequest.startDate,
              end_date: leaveRequest.endDate,
              status: leaveRequest.status,
              reason: leaveRequest.reason,
              total_days: leaveRequest.totalDays,
              attachment_url: leaveRequest.attachmentUrl,
              created_at: leaveRequest.createdAt,
            },
            summary: {
              total_days: totalDaysRequested,
              leave_type: type,
              quota_remaining: remainingQuota - totalDaysRequested,
              quota_used_after_request: usedDays + totalDaysRequested,
            },
            next_steps:
              type === "sakit"
                ? "Medical certificate received. Admin will review your request within 1x24 hours."
                : "Your request has been submitted. Admin will review and notify you via notification.",
            estimated_response_time: "1-2 business days",
          },
        },
        201,
      );
    } catch (error) {
      console.error("Create leave request error:", error);

      // Error handling yang lebih detail
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      return c.json(
        {
          success: false,
          message: "Internal server error",
          code: "INTERNAL_SERVER_ERROR",
          error:
            process.env.NODE_ENV === "development" ? errorMessage : undefined,
          timestamp: new Date().toISOString(),
        },
        500,
      );
    }
  }

  /**
   * Get leave history for employee
   */
  static async getHistory(c: Context<{ Bindings: Env }>) {
    const user = c.get("user");
    const db = createDb(c.env.DB);

    const query = c.req.query();
    const status = query.status as string | undefined;
    const type = query.type as string | undefined;
    const limit = query.limit ? parseInt(query.limit) : 20;
    const offset = query.offset ? parseInt(query.offset) : 0;

    try {
      let conditions = [eq(leaveRequests.userId, user.id)];

      // Filter by status
      if (status && ["pending", "approved", "rejected"].includes(status)) {
        conditions.push(eq(leaveRequests.status, status as any));
      }

      // Filter by type
      if (type && ["cuti", "izin", "sakit"].includes(type)) {
        conditions.push(eq(leaveRequests.type, type as any));
      }

      // Query leave requests
      const requests = await db
        .select({
          id: leaveRequests.id,
          type: leaveRequests.type,
          startDate: leaveRequests.startDate,
          endDate: leaveRequests.endDate,
          status: leaveRequests.status,
          reason: leaveRequests.reason,
          attachmentUrl: leaveRequests.attachmentUrl,
          totalDays: leaveRequests.totalDays,
          rejectionReason: leaveRequests.rejectionReason,
          approvedAt: leaveRequests.approvedAt,
          createdAt: leaveRequests.createdAt,
          approver: {
            id: users.id,
            name: users.name,
          },
        })
        .from(leaveRequests)
        .leftJoin(users, eq(leaveRequests.approvedBy, users.id))
        .where(and(...conditions))
        .orderBy(desc(leaveRequests.createdAt))
        .limit(limit)
        .offset(offset);

      // Get summary
      const summary = await db
        .select({
          status: leaveRequests.status,
          count: sql<number>`count(*)`,
        })
        .from(leaveRequests)
        .where(eq(leaveRequests.userId, user.id))
        .groupBy(leaveRequests.status);

      // Calculate remaining leave quota (example: 12 days per year)
      const currentYear = new Date().getFullYear();
      const yearStart = new Date(currentYear, 0, 1);
      const yearEnd = new Date(currentYear, 11, 31);

      const [yearlyApproved] = await db
        .select({
          total_days: sql<number>`COALESCE(SUM(total_days), 0)`,
        })
        .from(leaveRequests)
        .where(
          and(
            eq(leaveRequests.userId, user.id),
            eq(leaveRequests.status, "approved"),
            between(leaveRequests.startDate, yearStart, yearEnd),
          ),
        );

      const totalQuota = 12; // 12 days per year
      const usedDays = yearlyApproved?.total_days || 0;
      const remainingQuota = totalQuota - usedDays;

      return c.json({
        success: true,
        data: {
          requests: requests,
          summary: {
            leave_quota: {
              total: totalQuota,
              used: usedDays,
              remaining: remainingQuota,
            },
            by_status: summary.reduce(
              (acc, curr) => {
                acc[curr.status] = curr.count;
                return acc;
              },
              {} as Record<string, number>,
            ),
          },
          pagination: {
            limit,
            offset,
            total: requests.length,
          },
        },
      });
    } catch (error) {
      console.error("Get leave history error:", error);
      return c.json(
        {
          success: false,
          message: "Internal server error",
        },
        500,
      );
    }
  }

  /**
   * Get leave request detail
   */
  static async getDetail(c: Context<{ Bindings: Env }>) {
    const user = c.get("user");
    const requestId = c.req.param("id");
    const db = createDb(c.env.DB);

    try {
      const [leaveRequest] = await db
        .select({
          id: leaveRequests.id,
          type: leaveRequests.type,
          startDate: leaveRequests.startDate,
          endDate: leaveRequests.endDate,
          status: leaveRequests.status,
          reason: leaveRequests.reason,
          attachmentUrl: leaveRequests.attachmentUrl,
          totalDays: leaveRequests.totalDays,
          rejectionReason: leaveRequests.rejectionReason,
          approvedAt: leaveRequests.approvedAt,
          createdAt: leaveRequests.createdAt,
          updatedAt: leaveRequests.updatedAt,
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
          approver: {
            id: sql<number>`approver.id`,
            name: sql<string>`approver.name`,
          },
        })
        .from(leaveRequests)
        .leftJoin(users, eq(leaveRequests.userId, users.id))
        .leftJoin(
          sql`users AS approver`,
          eq(leaveRequests.approvedBy, sql`approver.id`),
        )
        .where(
          and(
            eq(leaveRequests.id, Number(requestId)),
            // Employee can only see their own requests
            user.role === "admin"
              ? undefined
              : eq(leaveRequests.userId, user.id),
          ),
        )
        .limit(1);

      if (!leaveRequest) {
        return c.json(
          {
            success: false,
            message: "Leave request not found",
          },
          404,
        );
      }

      return c.json({
        success: true,
        data: leaveRequest,
      });
    } catch (error) {
      console.error("Get leave detail error:", error);
      return c.json(
        {
          success: false,
          message: "Internal server error",
        },
        500,
      );
    }
  }

  /**
   * Cancel leave request (only if still pending)
   */
  static async cancelRequest(c: Context<{ Bindings: Env }>) {
    const user = c.get("user");
    const requestId = c.req.param("id");
    const db = createDb(c.env.DB);

    try {
      const [leaveRequest] = await db
        .select()
        .from(leaveRequests)
        .where(
          and(
            eq(leaveRequests.id, Number(requestId)),
            eq(leaveRequests.userId, user.id),
          ),
        )
        .limit(1);

      if (!leaveRequest) {
        return c.json(
          {
            success: false,
            message: "Leave request not found",
          },
          404,
        );
      }

      if (leaveRequest.status !== "pending") {
        return c.json(
          {
            success: false,
            message: "Can only cancel pending requests",
          },
          400,
        );
      }

      // Optional: Delete attachment from R2 if exists
      if (leaveRequest.attachmentKey) {
        try {
          const r2Service = new R2Service(c.env);
          await r2Service.deleteImage(leaveRequest.attachmentKey);
          console.log(`🗑️ Deleted attachment: ${leaveRequest.attachmentKey}`);
        } catch (error) {
          console.error("Failed to delete attachment from R2:", error);
          // Don't fail the request if deletion fails
        }
      }

      // Delete or mark as cancelled
      await db
        .delete(leaveRequests)
        .where(eq(leaveRequests.id, Number(requestId)));

      return c.json({
        success: true,
        message: "Leave request cancelled successfully",
      });
    } catch (error) {
      console.error("Cancel leave request error:", error);
      return c.json(
        {
          success: false,
          message: "Internal server error",
        },
        500,
      );
    }
  }

  /**
   * Check leave quota
   */
  static async checkQuota(c: Context<{ Bindings: Env }>) {
    const user = c.get("user");
    const db = createDb(c.env.DB);

    try {
      const currentYear = new Date().getFullYear();
      const yearStart = new Date(currentYear, 0, 1);
      const yearEnd = new Date(currentYear, 11, 31);

      // Get used days by type
      const usedByType = await db
        .select({
          type: leaveRequests.type,
          total_days: sql<number>`COALESCE(SUM(total_days), 0)`,
        })
        .from(leaveRequests)
        .where(
          and(
            eq(leaveRequests.userId, user.id),
            eq(leaveRequests.status, "approved"),
            between(leaveRequests.startDate, yearStart, yearEnd),
          ),
        )
        .groupBy(leaveRequests.type);

      // Get pending days
      const [pendingDays] = await db
        .select({
          total_days: sql<number>`COALESCE(SUM(total_days), 0)`,
        })
        .from(leaveRequests)
        .where(
          and(
            eq(leaveRequests.userId, user.id),
            eq(leaveRequests.status, "pending"),
            between(leaveRequests.startDate, yearStart, yearEnd),
          ),
        );

      const quotas = {
        cuti: { total: 12, used: 0, remaining: 12 },
        izin: { total: 6, used: 0, remaining: 6 },
        sakit: { total: 14, used: 0, remaining: 14 },
      };

      // Update used quotas
      usedByType.forEach((item) => {
        if (quotas[item.type as keyof typeof quotas]) {
          quotas[item.type as keyof typeof quotas].used = item.total_days;
          quotas[item.type as keyof typeof quotas].remaining =
            quotas[item.type as keyof typeof quotas].total - item.total_days;
        }
      });

      return c.json({
        success: true,
        data: {
          year: currentYear,
          quotas: quotas,
          pending_days: pendingDays?.total_days || 0,
        },
      });
    } catch (error) {
      console.error("Check quota error:", error);
      return c.json(
        {
          success: false,
          message: "Internal server error",
        },
        500,
      );
    }
  }
}
