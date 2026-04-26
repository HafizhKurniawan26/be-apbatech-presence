// src/routes/leave.route.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { LeaveController } from "../controllers/leave.controller";
import { authMiddleware, requireRole } from "../middleware/auth";
import { leaveHistoryQuerySchema } from "../validators/leave.validator";
import type { Env } from "../db";

const leaveRoute = new Hono<{ Bindings: Env }>();

// All leave routes require authentication
leaveRoute.use("*", authMiddleware);

// Employee routes
leaveRoute.post(
  "/request",
  requireRole(["employee"]),
  LeaveController.createRequest,
);

leaveRoute.get(
  "/history",
  requireRole(["employee"]),
  zValidator("query", leaveHistoryQuerySchema),
  LeaveController.getHistory,
);

leaveRoute.get("/quota", requireRole(["employee"]), LeaveController.checkQuota);

leaveRoute.get("/:id", requireRole(["employee"]), LeaveController.getDetail);

leaveRoute.delete(
  "/:id",
  requireRole(["employee"]),
  LeaveController.cancelRequest,
);

export { leaveRoute };
