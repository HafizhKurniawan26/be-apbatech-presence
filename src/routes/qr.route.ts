// src/routes/qr.route.ts
import { Hono } from "hono";
import { QRController } from "../controllers/qr.controller";
import { authMiddleware, requireRole } from "../middleware/auth";
import type { Env } from "../db";

const qrRoute = new Hono<{ Bindings: Env }>();

// All QR routes require authentication
qrRoute.use("*", authMiddleware);

// Admin only routes
qrRoute.get(
  "/generate/:locationId",
  requireRole(["admin"]),
  QRController.generate,
);

qrRoute.get(
  "/generate-all",
  requireRole(["admin"]),
  QRController.generateForAllLocations,
);

qrRoute.get("/active", requireRole(["admin"]), QRController.listActive);

qrRoute.get("/history", requireRole(["admin"]), QRController.history);

qrRoute.delete("/revoke/:token", requireRole(["admin"]), QRController.revoke);

// Routes untuk semua authenticated users
qrRoute.get("/validate/:token", QRController.validate);

export { qrRoute };
