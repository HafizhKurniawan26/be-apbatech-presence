// src/controllers/attendance.controller.ts
import { Context } from "hono";
import { createDb, type Env } from "../db";
import { attendances, locations } from "../db/schema";
import { eq, and, between, desc, isNull } from "drizzle-orm";
import { CloudinaryService } from "../services/cloudinary.service";
import { calculateDistance } from "../utils/haversine.utils";
import { checkAttendanceStatus } from "../utils/time.validator";
import { NotificationHelper } from "../utils/notification.helper";
import { FCMService } from "../services/fcm.service";
import { R2Service } from "../services/r2.service";

// Utility function untuk format working hours
function formatWorkingHours(hours: number): string {
  const totalMinutes = Math.floor(hours * 60);
  const jam = Math.floor(totalMinutes / 60);
  const menit = totalMinutes % 60;
  return `${jam} jam ${menit} menit`;
}

// Utility function untuk mendapatkan folder path dengan tanggal
function getDateBasedFolder(basePath: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${basePath}/${year}/${month}/${day}`;
}

export class AttendanceController {
  /**
   * Check-in dengan GPS
   */
  static async checkIn(c: Context<{ Bindings: Env }>) {
    const user = c.get("user");
    const db = createDb(c.env.DB);

    try {
      const formData = await c.req.formData();

      const locationId = Number(formData.get("location_id"));
      const latitude = Number(formData.get("latitude"));
      const longitude = Number(formData.get("longitude"));
      const method = (formData.get("method") as "gps" | "qr_code") || "gps";
      const photo = formData.get("photo") as File | null;

      if (!locationId || !latitude || !longitude) {
        return c.json(
          { success: false, message: "Missing required fields" },
          400,
        );
      }

      if (!photo) {
        return c.json(
          { success: false, message: "Photo is required for check-in" },
          400,
        );
      }

      // Validasi file photo
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];
      if (!allowedTypes.includes(photo.type)) {
        return c.json(
          {
            success: false,
            message: "Invalid photo format. Allowed: JPG, JPEG, PNG, WEBP",
            code: "INVALID_PHOTO_FORMAT",
          },
          400,
        );
      }

      if (photo.size > 5 * 1024 * 1024) {
        return c.json(
          {
            success: false,
            message: "Photo size too large. Max 5MB",
            code: "PHOTO_TOO_LARGE",
          },
          400,
        );
      }

      const [location] = await db
        .select()
        .from(locations)
        .where(eq(locations.id, locationId))
        .limit(1);

      if (!location) {
        return c.json({ success: false, message: "Location not found" }, 404);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [existingAttendance] = await db
        .select()
        .from(attendances)
        .where(
          and(
            eq(attendances.userId, user.id),
            between(attendances.checkIn, today, tomorrow),
          ),
        )
        .limit(1);

      if (existingAttendance) {
        return c.json(
          { success: false, message: "You have already checked in today" },
          400,
        );
      }

      const distance = calculateDistance(
        latitude,
        longitude,
        location.latitude,
        location.longitude,
      );

      if (distance > location.radius) {
        return c.json(
          {
            success: false,
            message: `You are outside the allowed radius`,
            data: {
              distance,
              max_radius: location.radius,
              difference: distance - location.radius,
            },
          },
          400,
        );
      }

      // PERUBAHAN: Upload ke R2 dengan folder berdasarkan tanggal
      let photoUrl: string | undefined;
      let photoKey: string | undefined;
      try {
        const r2Service = new R2Service(c.env);
        const publicId = r2Service.generatePublicId(user.id, "checkin");

        // Buat folder berdasarkan tanggal: presensi/checkin/YYYY/MM/DD/
        const dateFolder = getDateBasedFolder("presensi/checkin");

        const uploadResult = await r2Service.uploadImage(
          photo,
          dateFolder, // Gunakan folder dengan tanggal
          publicId,
        );
        photoUrl = uploadResult.url;
        photoKey = uploadResult.key;
        console.log(`✅ Check-in photo uploaded: ${photoUrl}`);
      } catch (error) {
        console.error("Failed to upload photo to R2:", error);
        return c.json(
          { success: false, message: "Failed to upload photo" },
          500,
        );
      }

      const now = new Date();
      const status = checkAttendanceStatus(now, location.checkInTime);

      const [attendance] = await db
        .insert(attendances)
        .values({
          userId: user.id,
          locationId: locationId,
          checkIn: now,
          status: status,
          method: method,
          latitude: latitude,
          longitude: longitude,
          photoUrl: photoUrl,
          photoKey: photoKey,
        })
        .returning();

      // Kirim notifikasi
      try {
        const notificationHelper = new NotificationHelper(c.env);
        await notificationHelper.sendAttendanceNotification(
          user.id,
          user.name,
          status,
          now,
        );
      } catch (error) {
        console.error("Failed to send notification:", error);
      }

      return c.json(
        {
          success: true,
          message: "Check-in successful",
          data: {
            attendance,
            distance,
            status,
            location_name: location.name,
            photo_url: photoUrl,
          },
        },
        201,
      );
    } catch (error) {
      console.error("Check-in error:", error);
      return c.json(
        {
          success: false,
          message: "Internal server error",
          error:
            process.env.NODE_ENV === "development" ? String(error) : undefined,
        },
        500,
      );
    }
  }

  /**
   * Scan QR Code dengan foto wajib (support check-in & check-out)
   */
  static async scanQRWithPhoto(c: Context<{ Bindings: Env }>) {
    const user = c.get("user");
    const db = createDb(c.env.DB);

    try {
      const formData = await c.req.formData();

      const qrToken = formData.get("qr_token") as string;
      const photo = formData.get("photo") as File | null;
      const type =
        (formData.get("type") as "check_in" | "check_out") || "check_in";
      const latitude = formData.get("latitude")
        ? Number(formData.get("latitude"))
        : undefined;
      const longitude = formData.get("longitude")
        ? Number(formData.get("longitude"))
        : undefined;

      if (!qrToken) {
        return c.json({ success: false, message: "QR token is required" }, 400);
      }

      if (!photo) {
        return c.json(
          {
            success: false,
            message: "Selfie photo is required for QR scan",
            code: "PHOTO_REQUIRED",
          },
          400,
        );
      }

      // Validasi file photo
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "image/webp",
      ];
      if (!allowedTypes.includes(photo.type)) {
        return c.json(
          {
            success: false,
            message: "Invalid photo format. Allowed: JPG, JPEG, PNG, WEBP",
            code: "INVALID_PHOTO_FORMAT",
          },
          400,
        );
      }

      if (photo.size > 5 * 1024 * 1024) {
        return c.json(
          {
            success: false,
            message: "Photo size too large. Max 5MB",
            code: "PHOTO_TOO_LARGE",
          },
          400,
        );
      }

      // Ambil data dari KV
      const qrDataRaw = await c.env.KV.get(`qr:${qrToken}`);
      if (!qrDataRaw) {
        return c.json(
          {
            success: false,
            message: "Invalid or expired QR code",
            code: "INVALID_QR",
          },
          400,
        );
      }

      const qrData = JSON.parse(qrDataRaw);
      const locationIdNum = Number(qrData.locationId);
      const qrType = type || qrData.type;

      const [location] = await db
        .select()
        .from(locations)
        .where(eq(locations.id, locationIdNum))
        .limit(1);

      if (!location) {
        return c.json({ success: false, message: "Location not found" }, 404);
      }

      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // PERUBAHAN: Upload ke R2 dengan folder berdasarkan tanggal
      let photoUrl: string;
      let photoKey: string;
      try {
        const r2Service = new R2Service(c.env);

        // Buat folder berdasarkan tanggal
        const dateFolder = getDateBasedFolder(
          qrType === "check_in"
            ? "presensi/checkin/qr"
            : "presensi/checkout/qr",
        );

        const publicId = `${user.id}_${Date.now()}_${qrType}`;
        const uploadResult = await r2Service.uploadImage(
          photo,
          dateFolder, // Gunakan folder dengan tanggal
          publicId,
        );
        photoUrl = uploadResult.url;
        photoKey = uploadResult.key;
        console.log(`✅ QR ${qrType} photo uploaded: ${photoUrl}`);
      } catch (error) {
        console.error("Failed to upload photo to R2:", error);
        return c.json(
          {
            success: false,
            message: "Failed to upload selfie photo",
            code: "UPLOAD_FAILED",
          },
          500,
        );
      }

      // CHECK-IN
      if (qrType === "check_in") {
        const [existingAttendance] = await db
          .select()
          .from(attendances)
          .where(
            and(
              eq(attendances.userId, user.id),
              between(attendances.checkIn, today, tomorrow),
            ),
          )
          .limit(1);

        if (existingAttendance) {
          return c.json(
            {
              success: false,
              message: "You have already checked in today",
              code: "ALREADY_CHECKED_IN",
              data: {
                attendance_id: existingAttendance.id,
                check_in_time: existingAttendance.checkIn,
              },
            },
            400,
          );
        }

        // Hitung jarak jika koordinat tersedia
        let distance: number | null = null;
        if (latitude && longitude) {
          distance = calculateDistance(
            latitude,
            longitude,
            location.latitude,
            location.longitude,
          );

          if (distance > location.radius) {
            return c.json(
              {
                success: false,
                message: `You are outside the allowed radius`,
                data: {
                  distance,
                  max_radius: location.radius,
                  difference: distance - location.radius,
                },
              },
              400,
            );
          }
        }

        const status = checkAttendanceStatus(now, location.checkInTime);

        const [attendance] = await db
          .insert(attendances)
          .values({
            userId: user.id,
            locationId: locationIdNum,
            checkIn: now,
            status: status,
            method: "qr_code",
            latitude: latitude || null,
            longitude: longitude || null,
            photoUrl: photoUrl,
            photoKey: photoKey,
          })
          .returning();

        // Hapus QR token setelah digunakan
        await c.env.KV.delete(`qr:${qrToken}`);

        // Kirim notifikasi
        try {
          const notificationHelper = new NotificationHelper(c.env);
          await notificationHelper.sendAttendanceNotification(
            user.id,
            user.name,
            status,
            now,
          );
        } catch (error) {
          console.error("Failed to send notification:", error);
        }

        return c.json(
          {
            success: true,
            message: "Check-in successful with QR code",
            data: {
              type: "check_in",
              attendance: {
                id: attendance.id,
                check_in: attendance.checkIn,
                status: attendance.status,
                photo_url: attendance.photoUrl,
              },
              location_name: location.name,
              method: "qr_code",
              has_selfie: true,
              distance: distance,
            },
          },
          201,
        );
      }

      // CHECK-OUT
      else if (qrType === "check_out") {
        const [activeAttendance] = await db
          .select()
          .from(attendances)
          .where(
            and(
              eq(attendances.userId, user.id),
              between(attendances.checkIn, today, tomorrow),
              isNull(attendances.checkOut),
            ),
          )
          .orderBy(desc(attendances.checkIn))
          .limit(1);

        if (!activeAttendance) {
          return c.json(
            {
              success: false,
              message: "No active check-in found for today",
              code: "NO_ACTIVE_ATTENDANCE",
              data: {
                has_checked_in: false,
                suggestion: "Please check-in first before checking out",
              },
            },
            400,
          );
        }

        // Hitung jarak jika koordinat tersedia
        let distance: number | null = null;
        if (latitude && longitude) {
          distance = calculateDistance(
            latitude,
            longitude,
            location.latitude,
            location.longitude,
          );

          if (distance > location.radius) {
            return c.json(
              {
                success: false,
                message: `You are outside the allowed radius for check-out`,
                data: {
                  distance,
                  max_radius: location.radius,
                  difference: distance - location.radius,
                },
              },
              400,
            );
          }
        }

        const checkInTime = new Date(activeAttendance.checkIn as Date);
        const workingHoursMs = now.getTime() - checkInTime.getTime();
        const workingHours = workingHoursMs / (1000 * 60 * 60);

        const [updatedAttendance] = await db
          .update(attendances)
          .set({
            checkOut: now,
            checkOutLocationId: locationIdNum,
            checkOutLatitude: latitude || null,
            checkOutLongitude: longitude || null,
            checkOutPhotoUrl: photoUrl,
            checkOutPhotoKey: photoKey,
            workingHours: Math.round(workingHours * 100) / 100,
            updatedAt: now,
          })
          .where(eq(attendances.id, activeAttendance.id))
          .returning();

        // Hapus QR token setelah digunakan
        await c.env.KV.delete(`qr:${qrToken}`);

        // Kirim notifikasi checkout
        try {
          const notificationHelper = new NotificationHelper(c.env);
          await notificationHelper.sendCheckoutNotification(
            user.id,
            user.name,
            now,
            workingHours,
          );
        } catch (error) {
          console.error("Failed to send notification:", error);
        }

        return c.json(
          {
            success: true,
            message: "Check-out successful with QR code",
            data: {
              type: "check_out",
              attendance: {
                id: updatedAttendance.id,
                check_in: activeAttendance.checkIn,
                check_out: updatedAttendance.checkOut,
                working_hours: updatedAttendance.workingHours,
                working_hours_formatted: formatWorkingHours(workingHours),
                photo_url: updatedAttendance.checkOutPhotoUrl,
              },
              location_name: location.name,
              method: "qr_code",
              has_selfie: true,
              distance: distance,
            },
          },
          200,
        );
      } else {
        return c.json(
          {
            success: false,
            message: 'Invalid QR type. Must be "check_in" or "check_out"',
          },
          400,
        );
      }
    } catch (error) {
      console.error("QR scan with photo error:", error);
      return c.json(
        {
          success: false,
          message: "Internal server error",
          error:
            process.env.NODE_ENV === "development" ? String(error) : undefined,
        },
        500,
      );
    }
  }

  /**
   * Check-out dengan GPS
   */
  static async checkOut(c: Context<{ Bindings: Env }>) {
    const user = c.get("user");
    const db = createDb(c.env.DB);

    try {
      const formData = await c.req.formData();

      const attendanceId = Number(formData.get("attendance_id"));
      const locationId = Number(formData.get("location_id"));
      const latitude = Number(formData.get("latitude"));
      const longitude = Number(formData.get("longitude"));
      const photo = formData.get("photo") as File | null;

      if (!attendanceId || !locationId || !latitude || !longitude) {
        return c.json(
          { success: false, message: "Missing required fields" },
          400,
        );
      }

      const [attendance] = await db
        .select()
        .from(attendances)
        .where(
          and(
            eq(attendances.id, attendanceId),
            eq(attendances.userId, user.id),
          ),
        )
        .limit(1);

      if (!attendance) {
        return c.json(
          { success: false, message: "Attendance record not found" },
          404,
        );
      }

      if (attendance.checkOut) {
        return c.json(
          { success: false, message: "You have already checked out today" },
          400,
        );
      }

      const [location] = await db
        .select()
        .from(locations)
        .where(eq(locations.id, locationId))
        .limit(1);

      if (!location) {
        return c.json({ success: false, message: "Location not found" }, 404);
      }

      const distance = calculateDistance(
        latitude,
        longitude,
        location.latitude,
        location.longitude,
      );

      if (distance > location.radius) {
        return c.json(
          {
            success: false,
            message: `You are outside the allowed radius`,
            data: {
              distance,
              max_radius: location.radius,
              difference: distance - location.radius,
            },
          },
          400,
        );
      }

      // PERUBAHAN: Upload ke R2 dengan folder berdasarkan tanggal
      let photoUrl: string | undefined;
      let photoKey: string | undefined;

      if (photo) {
        try {
          const r2Service = new R2Service(c.env);
          const publicId = r2Service.generatePublicId(user.id, "checkout");

          // Buat folder berdasarkan tanggal untuk checkout
          const dateFolder = getDateBasedFolder("presensi/checkout");

          const uploadResult = await r2Service.uploadImage(
            photo,
            dateFolder, // Gunakan folder dengan tanggal
            publicId,
          );
          photoUrl = uploadResult.url;
          photoKey = uploadResult.key;
          console.log(`✅ Check-out photo uploaded: ${photoUrl}`);
        } catch (error) {
          console.error("Failed to upload photo to R2:", error);
          return c.json(
            { success: false, message: "Failed to upload photo" },
            500,
          );
        }
      }

      const now = new Date();
      const checkInTime = new Date(attendance.checkIn);
      const workingHours =
        (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

      const [updatedAttendance] = await db
        .update(attendances)
        .set({
          checkOut: now,
          checkOutLocationId: locationId,
          checkOutLatitude: latitude,
          checkOutLongitude: longitude,
          checkOutPhotoUrl: photoUrl,
          checkOutPhotoKey: photoKey,
          workingHours: Math.round(workingHours * 100) / 100,
          updatedAt: now,
        })
        .where(eq(attendances.id, attendanceId))
        .returning();

      try {
        const fcmService = new FCMService(c.env);
        await fcmService.sendToUser(user.id, {
          title: "✅ Check-Out Berhasil",
          body: `Check-out berhasil pada ${now.toLocaleTimeString("id-ID")}. Total jam kerja: ${workingHours.toFixed(1)} jam`,
          data: { type: "checkout", working_hours: workingHours.toString() },
        });
      } catch (error) {
        console.error("Failed to send notification:", error);
      }

      return c.json({
        success: true,
        message: "Check-out successful",
        data: {
          attendance: updatedAttendance,
          distance,
          working_hours: workingHours.toFixed(2),
          working_hours_formatted: formatWorkingHours(workingHours),
          location_name: location.name,
          photo_url: photoUrl,
        },
      });
    } catch (error) {
      console.error("Check-out error:", error);
      return c.json({ success: false, message: "Internal server error" }, 500);
    }
  }

  /**
   * Get active attendance (belum check-out)
   */
  static async getActiveAttendance(c: Context<{ Bindings: Env }>) {
    const user = c.get("user");
    const db = createDb(c.env.DB);

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [activeAttendance] = await db
        .select({
          id: attendances.id,
          checkIn: attendances.checkIn,
          status: attendances.status,
          method: attendances.method,
          location: { id: locations.id, name: locations.name },
        })
        .from(attendances)
        .leftJoin(locations, eq(attendances.locationId, locations.id))
        .where(
          and(
            eq(attendances.userId, user.id),
            between(attendances.checkIn, today, tomorrow),
            isNull(attendances.checkOut),
          ),
        )
        .limit(1);

      if (!activeAttendance || !activeAttendance.checkIn) {
        return c.json({
          success: true,
          data: { has_active: false, attendance: null },
        });
      }

      const now = new Date();
      const checkInTime = new Date(activeAttendance.checkIn);
      const currentDuration =
        (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

      return c.json({
        success: true,
        data: {
          has_active: true,
          attendance: activeAttendance,
          current_duration_hours: Math.round(currentDuration * 100) / 100,
          current_duration_formatted: formatWorkingHours(currentDuration),
        },
      });
    } catch (error) {
      console.error("Get active attendance error:", error);
      return c.json({ success: false, message: "Internal server error" }, 500);
    }
  }

  /**
   * Get attendance history untuk employee
   */
  static async history(c: Context<{ Bindings: Env }>) {
    const user = c.get("user");
    const db = createDb(c.env.DB);

    const query = c.req.query();
    const month = query.month
      ? parseInt(query.month)
      : new Date().getMonth() + 1;
    const year = query.year ? parseInt(query.year) : new Date().getFullYear();
    const limit = query.limit ? parseInt(query.limit) : 50;
    const offset = query.offset ? parseInt(query.offset) : 0;

    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const attendanceRecords = await db
        .select({
          id: attendances.id,
          checkIn: attendances.checkIn,
          checkOut: attendances.checkOut,
          status: attendances.status,
          method: attendances.method,
          workingHours: attendances.workingHours,
          photoUrl: attendances.photoUrl,
          checkOutPhotoUrl: attendances.checkOutPhotoUrl,
          location: { id: locations.id, name: locations.name },
        })
        .from(attendances)
        .leftJoin(locations, eq(attendances.locationId, locations.id))
        .where(
          and(
            eq(attendances.userId, user.id),
            between(attendances.checkIn, startDate, endDate),
          ),
        )
        .orderBy(desc(attendances.checkIn))
        .limit(limit)
        .offset(offset);

      const totalWorkingHours = attendanceRecords.reduce(
        (sum, record) => sum + (record.workingHours || 0),
        0,
      );

      const recordsWithFormatted = attendanceRecords.map((record) => ({
        ...record,
        working_hours_formatted: record.workingHours
          ? formatWorkingHours(record.workingHours)
          : null,
      }));

      return c.json({
        success: true,
        data: {
          records: recordsWithFormatted,
          pagination: { limit, offset },
          summary: {
            month,
            year,
            total_days: attendanceRecords.length,
            total_working_hours: Math.round(totalWorkingHours * 100) / 100,
            total_working_hours_formatted:
              formatWorkingHours(totalWorkingHours),
            average_working_hours:
              attendanceRecords.length > 0
                ? Math.round(
                    (totalWorkingHours / attendanceRecords.length) * 100,
                  ) / 100
                : 0,
            average_working_hours_formatted:
              attendanceRecords.length > 0
                ? formatWorkingHours(
                    totalWorkingHours / attendanceRecords.length,
                  )
                : "0 jam 0 menit",
          },
        },
      });
    } catch (error) {
      console.error("Get history error:", error);
      return c.json({ success: false, message: "Internal server error" }, 500);
    }
  }

  /**
   * Get today's attendance status
   */
  static async todayStatus(c: Context<{ Bindings: Env }>) {
    const user = c.get("user");
    const db = createDb(c.env.DB);

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [attendance] = await db
        .select({
          id: attendances.id,
          checkIn: attendances.checkIn,
          status: attendances.status,
          method: attendances.method,
          photoUrl: attendances.photoUrl,
          location: { id: locations.id, name: locations.name },
        })
        .from(attendances)
        .leftJoin(locations, eq(attendances.locationId, locations.id))
        .where(
          and(
            eq(attendances.userId, user.id),
            between(attendances.checkIn, today, tomorrow),
          ),
        )
        .limit(1);

      return c.json({
        success: true,
        data: {
          has_checked_in: !!attendance,
          attendance: attendance || null,
          date: today.toISOString().split("T")[0],
        },
      });
    } catch (error) {
      console.error("Get today status error:", error);
      return c.json({ success: false, message: "Internal server error" }, 500);
    }
  }
}
