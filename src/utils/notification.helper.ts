// src/utils/notification.helper.ts
import { createFCMService } from "../services/fcm.service";
import type { Env } from "../db";

export interface NotificationTemplates {
  attendanceSuccess: (
    userName: string,
    time: string,
  ) => {
    title: string;
    body: string;
  };
  attendanceLate: (
    userName: string,
    time: string,
  ) => {
    title: string;
    body: string;
  };
  leaveApproved: (
    startDate: string,
    endDate: string,
  ) => {
    title: string;
    body: string;
  };
  leaveRejected: (reason?: string) => {
    title: string;
    body: string;
  };
  newLeaveRequest: (
    userName: string,
    type: string,
  ) => {
    title: string;
    body: string;
  };
  qrCodeGenerated: (
    locationName: string,
    type: string,
  ) => {
    title: string;
    body: string;
  };
}

export const notificationTemplates: NotificationTemplates = {
  attendanceSuccess: (userName: string, time: string) => ({
    title: "✅ Presensi Berhasil",
    body: `Hai ${userName}, presensi Anda tercatat pada pukul ${time}`,
  }),
  attendanceLate: (userName: string, time: string) => ({
    title: "⚠️ Presensi Terlambat",
    body: `Hai ${userName}, Anda tercatat terlambat pada pukul ${time}`,
  }),
  leaveApproved: (startDate: string, endDate: string) => ({
    title: "✅ Pengajuan Cuti Disetujui",
    body: `Pengajuan cuti Anda untuk periode ${startDate} - ${endDate} telah disetujui`,
  }),
  leaveRejected: (reason?: string) => ({
    title: "❌ Pengajuan Cuti Ditolak",
    body: reason
      ? `Pengajuan cuti Anda ditolak. Alasan: ${reason}`
      : "Pengajuan cuti Anda ditolak",
  }),
  newLeaveRequest: (userName: string, type: string) => ({
    title: "📋 Pengajuan Cuti Baru",
    body: `${userName} mengajukan ${type}. Segera periksa untuk approval`,
  }),
  qrCodeGenerated: (locationName: string, type: string) => ({
    title: `📱 QR Code ${type === "check_in" ? "Check-in" : "Check-out"} Ready`,
    body: `QR Code untuk ${type === "check_in" ? "presensi masuk" : "presensi pulang"} di ${locationName} telah tersedia. Silakan scan dalam 60 detik.`,
  }),
};

export class NotificationHelper {
  private fcmService: ReturnType<typeof createFCMService>;

  constructor(private env: Env) {
    this.fcmService = createFCMService(env);
  }

  async sendAttendanceNotification(
    userId: number,
    userName: string,
    status: "ontime" | "late",
    checkInTime: Date,
  ) {
    const timeStr = checkInTime.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const template =
      status === "ontime"
        ? notificationTemplates.attendanceSuccess(userName, timeStr)
        : notificationTemplates.attendanceLate(userName, timeStr);

    return this.fcmService.sendToUser(userId, {
      ...template,
      data: {
        type: "attendance",
        status,
        timestamp: checkInTime.toISOString(),
      },
    });
  }

  async sendCheckoutNotification(
    userId: number,
    userName: string,
    checkOutTime: Date,
    workingHours: number,
  ) {
    const timeStr = checkOutTime.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return this.fcmService.sendToUser(userId, {
      title: "✅ Check-Out Berhasil",
      body: `Check-out berhasil pada pukul ${timeStr}. Total jam kerja: ${workingHours.toFixed(1)} jam`,
      data: {
        type: "checkout",
        working_hours: workingHours.toString(),
        timestamp: checkOutTime.toISOString(),
      },
    });
  }

  async sendLeaveRequestNotificationToAdmin(
    adminIds: number[],
    userName: string,
    leaveType: string,
    details?: {
      // Add optional details parameter
      start_date?: string;
      end_date?: string;
      total_days?: number;
      reason?: string;
      request_id?: number;
    },
  ) {
    const template = notificationTemplates.newLeaveRequest(
      userName,
      leaveType,
      details,
    );

    return this.fcmService.sendToMultipleUsers(adminIds, {
      ...template,
      data: {
        type: "leave_request",
        action: "review",
        leave_type: leaveType,
        ...(details?.request_id && {
          request_id: details.request_id.toString(),
        }),
        ...(details?.start_date && { start_date: details.start_date }),
        ...(details?.end_date && { end_date: details.end_date }),
        ...(details?.total_days && {
          total_days: details.total_days.toString(),
        }),
        timestamp: new Date().toISOString(),
      },
    });
  }

  async sendNotification(
    userId: number,
    payload: {
      title: string;
      body: string;
      data?: Record<string, string>;
    },
  ) {
    return this.fcmService.sendToUser(userId, {
      title: payload.title,
      body: payload.body,
      data: payload.data,
    });
  }

  async sendLeaveStatusNotification(
    userId: number,
    status: "approved" | "rejected",
    startDate: Date,
    endDate: Date,
    reason?: string,
  ) {
    const formatDate = (date: Date) =>
      date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

    const template =
      status === "approved"
        ? notificationTemplates.leaveApproved(
            formatDate(startDate),
            formatDate(endDate),
          )
        : notificationTemplates.leaveRejected(reason);

    return this.fcmService.sendToUser(userId, {
      ...template,
      data: {
        type: "leave_status",
        status,
      },
    });
  }

  async broadcastQRGenerated(locationName: string, type: string = "check_in") {
    const template = notificationTemplates.qrCodeGenerated(locationName, type);

    return this.fcmService.sendToTopic("attendance_qr", {
      ...template,
      data: {
        type: "qr_generated",
        qr_type: type,
        location: locationName,
        timestamp: new Date().toISOString(),
        action: "scan_qr",
      },
    });
  }
}
