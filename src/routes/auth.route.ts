// src/routes/auth.route.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { AuthController } from "../controllers/auth.controller";
import { authMiddleware, requireRole } from "../middleware/auth";
import {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  refreshTokenSchema,
} from "../validators/auth.validator";
import type { Env } from "../db";
import { seedAdminUser, seedLocations } from "../utils/seeder";

const authRoute = new Hono<{ Bindings: Env }>();

// Public routes
authRoute.post("/login", zValidator("json", loginSchema), AuthController.login);

authRoute.post(
  "/refresh",
  zValidator("json", refreshTokenSchema),
  AuthController.refresh,
);

authRoute.get("/seed", async (c) => {
  await seedAdminUser(c.env);
  await seedLocations(c.env);

  return c.json({ message: "Seeder executed" });
});

// Protected routes
authRoute.post("/logout", authMiddleware, AuthController.logout);

authRoute.get("/profile", authMiddleware, AuthController.profile);

authRoute.post(
  "/change-password",
  authMiddleware,
  zValidator("json", changePasswordSchema),
  AuthController.changePassword,
);

// Admin only routes
authRoute.post(
  "/register",
  authMiddleware,
  requireRole(["admin"]),
  zValidator("json", registerSchema),
  AuthController.register,
);

export { authRoute };
