// src/controllers/admin.controller.ts
import { Context } from "hono";
import { createDb, type Env } from "../db";
import {
  users,
  attendances,
  leaveRequests,
  locations,
  fcmTokens,
} from "../db/schema";
import {
  eq,
  and,
  between,
  desc,
  asc,
  sql,
  gte,
  lte,
  isNull,
  isNotNull,
  inArray,
  notInArray,
} from "drizzle-orm";
import { NotificationHelper } from "../utils/notification.helper";
import type { UpdateLeaveStatusInput } from "../validators/leave.validator";
import { FCMService } from "../services/fcm.service";

export class AdminController {
  /**
   * Get attendance recap (Rekap Presensi)
   * Role: Admin only
   */

  // src/controllers/admin.controller.ts - Fixed getAttendanceRecap method

  // src/controllers/admin.controller.ts - Fixed getAttendanceRecap

  static async getAttendanceRecap(c: Context<{ Bindings: Env }>) {
    const db = createDb(c.env.DB);

    const query = c.req.query();
    const month = query.month
      ? parseInt(query.month)
      : new Date().getMonth() + 1;
    const year = query.year ? parseInt(query.year) : new Date().getFullYear();
    const locationId = query.location_id
      ? parseInt(query.location_id)
      : undefined;

    try {
      // 1. Buat Date boundaries dengan presisi UTC+7 (WIB)
      const startWIB = `${year}-${month.toString().padStart(2, "0")}-01T00:00:00+07:00`;
      const startDate = new Date(startWIB);

      const nextMonth = month === 12 ? 1 : month + 1;
      const nextMonthYear = month === 12 ? year + 1 : year;
      const nextMonthStartWIB = `${nextMonthYear}-${nextMonth.toString().padStart(2, "0")}-01T00:00:00+07:00`;
      const endDate = new Date(new Date(nextMonthStartWIB).getTime() - 1);

      // Build conditions
      let conditions = [
        gte(attendances.checkIn, startDate),
        lte(attendances.checkIn, endDate),
      ];

      if (locationId) {
        conditions.push(eq(attendances.locationId, locationId));
      }

      // 2. Daily Attendance Summary (Tanpa / 1000)
      const dailyAttendance = await db
        .select({
          date: sql<string>`date(${attendances.checkIn}, 'unixepoch', '+07:00')`,
          total_employees: sql<number>`count(distinct ${attendances.userId})`,
          ontime: sql<number>`sum(case when ${attendances.status} = 'ontime' then 1 else 0 end)`,
          late: sql<number>`sum(case when ${attendances.status} = 'late' then 1 else 0 end)`,
          gps_checkins: sql<number>`sum(case when ${attendances.method} = 'gps' then 1 else 0 end)`,
          qr_checkins: sql<number>`sum(case when ${attendances.method} = 'qr_code' then 1 else 0 end)`,
          avg_check_in_time: sql<string>`time(avg(
            strftime('%H', ${attendances.checkIn}, 'unixepoch', '+07:00') * 3600 +
            strftime('%M', ${attendances.checkIn}, 'unixepoch', '+07:00') * 60 +
            strftime('%S', ${attendances.checkIn}, 'unixepoch', '+07:00')
          ), 'unixepoch')`,
        })
        .from(attendances)
        .where(and(...conditions))
        .groupBy(sql`date(${attendances.checkIn}, 'unixepoch', '+07:00')`)
        .orderBy(sql`date(${attendances.checkIn}, 'unixepoch', '+07:00')`);

      // 3. Employee Attendance Summary (Tanpa / 1000 & Perbaikan orderBy)
      const employeeAttendance = await db
        .select({
          userId: users.id,
          name: users.name,
          email: users.email,
          nip: users.nip,
          total_days: sql<number>`count(distinct date(${attendances.checkIn}, 'unixepoch', '+07:00'))`,
          ontime_days: sql<number>`sum(case when ${attendances.status} = 'ontime' then 1 else 0 end)`,
          late_days: sql<number>`sum(case when ${attendances.status} = 'late' then 1 else 0 end)`,
          avg_check_in_time: sql<string>`time(avg(
            strftime('%H', ${attendances.checkIn}, 'unixepoch', '+07:00') * 3600 +
            strftime('%M', ${attendances.checkIn}, 'unixepoch', '+07:00') * 60 +
            strftime('%S', ${attendances.checkIn}, 'unixepoch', '+07:00')
          ), 'unixepoch')`,
          total_working_hours: sql<number>`coalesce(sum(${attendances.workingHours}), 0)`,
          avg_working_hours: sql<number>`coalesce(avg(${attendances.workingHours}), 0)`,
        })
        .from(users)
        .leftJoin(
          attendances,
          and(
            eq(users.id, attendances.userId),
            gte(attendances.checkIn, startDate),
            lte(attendances.checkIn, endDate),
          ),
        )
        .where(eq(users.role, "employee"))
        .groupBy(users.id)
        .orderBy(
          desc(
            sql`count(distinct date(${attendances.checkIn}, 'unixepoch', '+07:00'))`,
          ),
        );

      // 4. Location Statistics (Perbaikan orderBy)
      const locationStats = await db
        .select({
          locationId: locations.id,
          name: locations.name,
          total_checkins: sql<number>`count(${attendances.id})`,
          unique_employees: sql<number>`count(distinct ${attendances.userId})`,
          ontime: sql<number>`sum(case when ${attendances.status} = 'ontime' then 1 else 0 end)`,
          late: sql<number>`sum(case when ${attendances.status} = 'late' then 1 else 0 end)`,
        })
        .from(locations)
        .leftJoin(
          attendances,
          and(
            eq(locations.id, attendances.locationId),
            gte(attendances.checkIn, startDate),
            lte(attendances.checkIn, endDate),
          ),
        )
        .groupBy(locations.id)
        .orderBy(desc(sql`count(${attendances.id})`));

      // 5. Overall Summary (Tanpa / 1000)
      const [overallSummary] = await db
        .select({
          total_employees: sql<number>`count(distinct ${users.id})`,
          total_working_days: sql<number>`count(distinct date(${attendances.checkIn}, 'unixepoch', '+07:00'))`,
          total_checkins: sql<number>`count(${attendances.id})`,
          total_ontime: sql<number>`sum(case when ${attendances.status} = 'ontime' then 1 else 0 end)`,
          total_late: sql<number>`sum(case when ${attendances.status} = 'late' then 1 else 0 end)`,
          avg_daily_checkins: sql<number>`round(cast(count(${attendances.id}) as float) / nullif(count(distinct date(${attendances.checkIn}, 'unixepoch', '+07:00')), 0), 1)`,
          total_working_hours: sql<number>`coalesce(sum(${attendances.workingHours}), 0)`,
        })
        .from(users)
        .leftJoin(
          attendances,
          and(
            eq(users.id, attendances.userId),
            gte(attendances.checkIn, startDate),
            lte(attendances.checkIn, endDate),
          ),
        )
        .where(eq(users.role, "employee"));

      // 6. Employees Not Checked In Today
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
      });
      const todayStr = formatter.format(new Date());

      const todayStart = new Date(`${todayStr}T00:00:00+07:00`);
      const todayEnd = new Date(`${todayStr}T23:59:59.999+07:00`);

      const checkedInToday = await db
        .select({ userId: attendances.userId })
        .from(attendances)
        .where(
          and(
            gte(attendances.checkIn, todayStart),
            lte(attendances.checkIn, todayEnd),
          ),
        );

      const checkedInIds = checkedInToday.map((c) => c.userId);

      let notCheckedIn = [];
      if (checkedInIds.length === 0) {
        notCheckedIn = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            nip: users.nip,
          })
          .from(users)
          .where(eq(users.role, "employee"));
      } else {
        notCheckedIn = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            nip: users.nip,
          })
          .from(users)
          .where(
            and(eq(users.role, "employee"), notInArray(users.id, checkedInIds)),
          );
      }

      return c.json({
        success: true,
        data: {
          period: {
            month,
            year,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
          },
          overall_summary: overallSummary || {
            total_employees: 0,
            total_working_days: 0,
            total_checkins: 0,
            total_ontime: 0,
            total_late: 0,
            avg_daily_checkins: 0,
            total_working_hours: 0,
          },
          daily_attendance: dailyAttendance,
          employee_attendance: employeeAttendance,
          location_stats: locationStats,
          employees_not_checked_in_today: {
            date: todayStr,
            count: notCheckedIn.length,
            employees: notCheckedIn,
          },
        },
      });
    } catch (error) {
      console.error("Get attendance recap error:", error);
      return c.json(
        {
          success: false,
          message: "Internal server error",
          error: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  }

  /**
   * Get all leave requests (Admin)
   */
  static async getLeaveRequests(c: Context<{ Bindings: Env }>) {
    const db = createDb(c.env.DB);

    const query = c.req.query();
    const status = query.status as string | undefined;
    const type = query.type as string | undefined;
    const limit = query.limit ? parseInt(query.limit) : 20;
    const offset = query.offset ? parseInt(query.offset) : 0;

    try {
      let conditions = [];

      if (status && ["pending", "approved", "rejected"].includes(status)) {
        conditions.push(eq(leaveRequests.status, status as any));
      }

      if (type && ["cuti", "izin", "sakit"].includes(type)) {
        conditions.push(eq(leaveRequests.type, type as any));
      }

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
          createdAt: leaveRequests.createdAt,
          approvedAt: leaveRequests.approvedAt,
          employee: {
            id: users.id,
            name: users.name,
            email: users.email,
            nip: users.nip,
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
        .where(and(...conditions))
        .orderBy(desc(leaveRequests.createdAt))
        .limit(limit)
        .offset(offset);

      // Get summary statistics
      const [summary] = await db
        .select({
          total_pending: sql<number>`sum(case when ${leaveRequests.status} = 'pending' then 1 else 0 end)`,
          total_approved: sql<number>`sum(case when ${leaveRequests.status} = 'approved' then 1 else 0 end)`,
          total_rejected: sql<number>`sum(case when ${leaveRequests.status} = 'rejected' then 1 else 0 end)`,
          by_type_cuti: sql<number>`sum(case when ${leaveRequests.type} = 'cuti' then 1 else 0 end)`,
          by_type_izin: sql<number>`sum(case when ${leaveRequests.type} = 'izin' then 1 else 0 end)`,
          by_type_sakit: sql<number>`sum(case when ${leaveRequests.type} = 'sakit' then 1 else 0 end)`,
        })
        .from(leaveRequests);

      return c.json({
        success: true,
        data: {
          requests: requests,
          summary: summary,
          pagination: {
            limit,
            offset,
          },
        },
      });
    } catch (error) {
      console.error("Get leave requests error:", error);
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
   * Approve or reject leave request
   */
  static async updateLeaveRequest(c: Context<{ Bindings: Env }>) {
    const user = c.get("user"); // Admin user
    const requestId = c.req.param("id");
    const body = await c.req.json<UpdateLeaveStatusInput>();
    const db = createDb(c.env.DB);

    try {
      // Find leave request
      const [leaveRequest] = await db
        .select()
        .from(leaveRequests)
        .where(eq(leaveRequests.id, Number(requestId)))
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
            message: "Can only update pending requests",
          },
          400,
        );
      }

      // Update leave request
      const [updatedRequest] = await db
        .update(leaveRequests)
        .set({
          status: body.status,
          approvedBy: user.id,
          approvedAt: new Date(),
          rejectionReason:
            body.status === "rejected" ? body.rejection_reason : null,
          updatedAt: new Date(),
        })
        .where(eq(leaveRequests.id, Number(requestId)))
        .returning();

      // Get employee data for notification
      const [employee] = await db
        .select({
          id: users.id,
          name: users.name,
        })
        .from(users)
        .where(eq(users.id, leaveRequest.userId))
        .limit(1);

      // Send notification to employee
      if (employee) {
        try {
          const notificationHelper = new NotificationHelper(c.env);
          await notificationHelper.sendLeaveStatusNotification(
            employee.id,
            body.status,
            new Date(leaveRequest.startDate),
            new Date(leaveRequest.endDate),
            body.rejection_reason,
          );
        } catch (error) {
          console.error("Failed to send leave notification:", error);
        }
      }

      return c.json({
        success: true,
        message: `Leave request ${body.status} successfully`,
        data: updatedRequest,
      });
    } catch (error) {
      console.error("Update leave request error:", error);
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
   * Get employee list with attendance summary
   */
  static async getEmployees(c: Context<{ Bindings: Env }>) {
    const db = createDb(c.env.DB);

    const query = c.req.query();
    const search = query.search as string | undefined;
    const limit = query.limit ? parseInt(query.limit) : 50;
    const offset = query.offset ? parseInt(query.offset) : 0;

    try {
      let conditions = [eq(users.role, "employee")];

      if (search) {
        conditions.push(
          sql`(${users.name} LIKE ${"%" + search + "%"} OR ${users.email} LIKE ${"%" + search + "%"} OR ${users.nip} LIKE ${"%" + search + "%"})`,
        );
      }

      const employees = await db
        .select({
          id: users.id,
          nip: users.nip,
          name: users.name,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
          // Attendance summary untuk bulan ini
          total_attendance_month: sql<number>`
            (SELECT COUNT(DISTINCT date(${attendances.checkIn} / 1000, 'unixepoch'))
             FROM ${attendances}
             WHERE ${attendances.userId} = ${users.id}
             AND strftime('%Y-%m', datetime(${attendances.checkIn} / 1000, 'unixepoch')) = strftime('%Y-%m', 'now'))
          `,
          // Status today
          checked_in_today: sql<boolean>`
            EXISTS (
              SELECT 1 FROM ${attendances}
              WHERE ${attendances.userId} = ${users.id}
              AND date(${attendances.checkIn} / 1000, 'unixepoch') = date('now')
            )
          `,
        })
        .from(users)
        .where(and(...conditions))
        .orderBy(asc(users.name))
        .limit(limit)
        .offset(offset);

      return c.json({
        success: true,
        data: {
          employees: employees,
          total: employees.length,
          pagination: { limit, offset },
        },
      });
    } catch (error) {
      console.error("Get employees error:", error);
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
   * Get employee detailed attendance report
   */
  static async getEmployeeReport(c: Context<{ Bindings: Env }>) {
    const db = createDb(c.env.DB);
    const employeeId = c.req.param("employeeId");

    const query = c.req.query();
    const month = query.month
      ? parseInt(query.month)
      : new Date().getMonth() + 1;
    const year = query.year ? parseInt(query.year) : new Date().getFullYear();

    try {
      // Check if employee exists
      const [employee] = await db
        .select({
          id: users.id,
          nip: users.nip,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(
          and(eq(users.id, Number(employeeId)), eq(users.role, "employee")),
        )
        .limit(1);

      if (!employee) {
        return c.json(
          {
            success: false,
            message: "Employee not found",
          },
          404,
        );
      }

      // Date range
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      // Get attendance records
      const attendanceRecords = await db
        .select({
          id: attendances.id,
          checkIn: attendances.checkIn,
          checkOut: attendances.checkOut,
          status: attendances.status,
          method: attendances.method,
          workingHours: attendances.workingHours,
          photoUrl: attendances.photoUrl,
          location: {
            id: locations.id,
            name: locations.name,
          },
        })
        .from(attendances)
        .leftJoin(locations, eq(attendances.locationId, locations.id))
        .where(
          and(
            eq(attendances.userId, Number(employeeId)),
            between(attendances.checkIn, startDate, endDate),
          ),
        )
        .orderBy(desc(attendances.checkIn));

      // Get statistics
      const [stats] = await db
        .select({
          total_days: sql<number>`count(distinct date(${attendances.checkIn} / 1000, 'unixepoch'))`,
          ontime_days: sql<number>`sum(case when ${attendances.status} = 'ontime' then 1 else 0 end)`,
          late_days: sql<number>`sum(case when ${attendances.status} = 'late' then 1 else 0 end)`,
          total_working_hours: sql<number>`coalesce(sum(${attendances.workingHours}), 0)`,
          avg_working_hours: sql<number>`coalesce(avg(${attendances.workingHours}), 0)`,
          avg_check_in_time: sql<string>`time(avg(cast(strftime('%s', datetime(${attendances.checkIn} / 1000, 'unixepoch')) as integer)), 'unixepoch')`,
        })
        .from(attendances)
        .where(
          and(
            eq(attendances.userId, Number(employeeId)),
            between(attendances.checkIn, startDate, endDate),
          ),
        );

      // Get leave requests
      const leaveData = await db
        .select()
        .from(leaveRequests)
        .where(
          and(
            eq(leaveRequests.userId, Number(employeeId)),
            sql`${leaveRequests.startDate} <= ${endDate.getTime()} AND ${leaveRequests.endDate} >= ${startDate.getTime()}`,
          ),
        )
        .orderBy(asc(leaveRequests.startDate));

      return c.json({
        success: true,
        data: {
          employee: employee,
          period: { month, year },
          statistics: stats,
          attendance_records: attendanceRecords,
          leave_requests: leaveData,
        },
      });
    } catch (error) {
      console.error("Get employee report error:", error);
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
   * Send notification to specific user
   */
  static async sendNotification(c: Context<{ Bindings: Env }>) {
    const body = await c.req.json<{
      user_id: number;
      title: string;
      body: string;
      data?: Record<string, string>;
    }>();

    try {
      const notificationHelper = new FCMService(c.env);

      const result = await notificationHelper.sendToUser(body.user_id, {
        title: body.title,
        body: body.body,
        data: body.data,
      });

      return c.json({
        success: true,
        message: "Notification sent",
        data: result,
      });
    } catch (error) {
      console.error("Send notification error:", error);
      return c.json(
        {
          success: false,
          message: "Failed to send notification",
        },
        500,
      );
    }
  }

  /**
   * Broadcast notification to all employees
   */
  static async broadcastNotification(c: Context<{ Bindings: Env }>) {
    const body = await c.req.json<{
      title: string;
      body: string;
      data?: Record<string, string>;
    }>();

    try {
      const notificationHelper = new FCMService(c.env);

      // Send to topic
      await notificationHelper.sendToTopic("all_employees", {
        title: body.title,
        body: body.body,
        data: body.data,
      });

      return c.json({
        success: true,
        message: "Broadcast notification sent",
      });
    } catch (error) {
      console.error("Broadcast notification error:", error);
      return c.json(
        {
          success: false,
          message: "Failed to broadcast notification",
        },
        500,
      );
    }
  }

  /**
   * Get dashboard summary
   */
  static async getDashboard(c: Context<{ Bindings: Env }>) {
    const db = createDb(c.env.DB);

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59);

      // Today's attendance
      const [todayStats] = await db
        .select({
          total_checked_in: sql<number>`count(distinct ${attendances.userId})`,
          ontime: sql<number>`sum(case when ${attendances.status} = 'ontime' then 1 else 0 end)`,
          late: sql<number>`sum(case when ${attendances.status} = 'late' then 1 else 0 end)`,
          checked_out: sql<number>`sum(case when ${attendances.checkOut} is not null then 1 else 0 end)`,
        })
        .from(attendances)
        .where(between(attendances.checkIn, today, todayEnd));

      // Total employees
      const [totalEmployees] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.role, "employee"));

      // Pending leave requests
      const [pendingLeaves] = await db
        .select({ count: sql<number>`count(*)` })
        .from(leaveRequests)
        .where(eq(leaveRequests.status, "pending"));

      // Active QR codes (approximate)
      const activeQRs = await c.env.KV.list({ prefix: "qr:" });

      return c.json({
        success: true,
        data: {
          date: today.toISOString().split("T")[0],
          today_attendance: {
            total_checked_in: todayStats?.total_checked_in || 0,
            ontime: todayStats?.ontime || 0,
            late: todayStats?.late || 0,
            checked_out: todayStats?.checked_out || 0,
            total_employees: totalEmployees?.count || 0,
            attendance_rate: totalEmployees?.count
              ? Math.round(
                  ((todayStats?.total_checked_in || 0) / totalEmployees.count) *
                    100,
                )
              : 0,
          },
          pending_leave_requests: pendingLeaves?.count || 0,
          active_qr_codes: activeQRs.keys.length,
        },
      });
    } catch (error) {
      console.error("Get dashboard error:", error);
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
   * Get daily report for export
   */
  static async getDailyReport(c: Context<{ Bindings: Env }>) {
    const db = createDb(c.env.DB);

    const query = c.req.query();
    const date = query.date || new Date().toISOString().split("T")[0];

    try {
      const reportDate = new Date(date);
      reportDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(reportDate);
      nextDay.setDate(nextDay.getDate() + 1);

      // Get all attendance for the date
      const dailyRecords = await db
        .select({
          employee: {
            id: users.id,
            nip: users.nip,
            name: users.name,
            email: users.email,
          },
          attendance: {
            id: attendances.id,
            checkIn: attendances.checkIn,
            checkOut: attendances.checkOut,
            status: attendances.status,
            method: attendances.method,
            workingHours: attendances.workingHours,
          },
          location: {
            id: locations.id,
            name: locations.name,
          },
        })
        .from(users)
        .innerJoin(
          attendances,
          and(
            eq(users.id, attendances.userId),
            between(attendances.checkIn, reportDate, nextDay),
          ),
        )
        .leftJoin(locations, eq(attendances.locationId, locations.id))
        .where(eq(users.role, "employee"))
        .orderBy(asc(users.name));

      // Get employees who didn't check in
      const checkedInIds = dailyRecords.map((r) => r.employee.id);

      const absentEmployees = await db
        .select({
          id: users.id,
          nip: users.nip,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(
          and(
            eq(users.role, "employee"),
            checkedInIds.length > 0
              ? sql`${users.id} NOT IN (${checkedInIds.join(",")})`
              : undefined,
          ),
        );

      return c.json({
        success: true,
        data: {
          date: date,
          present: {
            count: dailyRecords.length,
            employees: dailyRecords,
          },
          absent: {
            count: absentEmployees.length,
            employees: absentEmployees,
          },
          summary: {
            total_employees: dailyRecords.length + absentEmployees.length,
            attendance_rate: Math.round(
              (dailyRecords.length /
                (dailyRecords.length + absentEmployees.length)) *
                100,
            ),
          },
        },
      });
    } catch (error) {
      console.error("Get daily report error:", error);
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
