// src/routes/admin.route.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { AdminController } from "../controllers/admin.controller";
import { authMiddleware, requireRole } from "../middleware/auth";
import { updateLeaveStatusSchema } from "../validators/leave.validator";
import type { Env } from "../db";

const adminRoute = new Hono<{ Bindings: Env }>();

// All admin routes require authentication and admin role
adminRoute.use("*", authMiddleware);
adminRoute.use("*", requireRole(["admin"]));

// Dashboard
adminRoute.get("/dashboard", AdminController.getDashboard);

// Attendance Recap
adminRoute.get("/rekap", AdminController.getAttendanceRecap);
adminRoute.get("/daily-report", AdminController.getDailyReport);

// Employee Management
adminRoute.get("/employees", AdminController.getEmployees);
adminRoute.get(
  "/employees/:employeeId/report",
  AdminController.getEmployeeReport,
);

// Leave Management
adminRoute.get("/leave-requests", AdminController.getLeaveRequests);
adminRoute.patch(
  "/leave-requests/:id",
  zValidator("json", updateLeaveStatusSchema),
  AdminController.updateLeaveRequest,
);

// Notifications
adminRoute.post("/send-notification", AdminController.sendNotification);
adminRoute.post("/broadcast", AdminController.broadcastNotification);

export { adminRoute };
