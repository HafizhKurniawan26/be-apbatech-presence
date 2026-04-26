// src/routes/attendance.route.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { AttendanceController } from "../controllers/attendance.controller";
import { authMiddleware, requireRole } from "../middleware/auth";
import {
  scanQRSchema,
  historyQuerySchema,
} from "../validators/attendance.validator";
import type { Env } from "../db";
import { validateQRScan } from "../validators/qr.validator";

const attendanceRoute = new Hono<{ Bindings: Env }>();

attendanceRoute.use("*", authMiddleware);

attendanceRoute.post(
  "/check-in",
  requireRole(["employee"]),
  AttendanceController.checkIn,
);

attendanceRoute.post(
  "/check-out",
  requireRole(["employee"]),
  AttendanceController.checkOut,
);

attendanceRoute.get(
  "/active",
  requireRole(["employee"]),
  AttendanceController.getActiveAttendance,
);

// QR Scan (support check-in & check-out)
attendanceRoute.post(
  "/scan-qr",
  requireRole(["employee"]),
  validateQRScan,
  AttendanceController.scanQRWithPhoto,
);

attendanceRoute.get(
  "/history",
  requireRole(["employee"]),
  zValidator("query", historyQuerySchema),
  AttendanceController.history,
);

attendanceRoute.get(
  "/today-status",
  requireRole(["employee"]),
  AttendanceController.todayStatus,
);

export { attendanceRoute };
