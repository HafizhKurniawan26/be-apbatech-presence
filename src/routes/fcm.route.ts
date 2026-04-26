// src/routes/fcm.route.ts
import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { createDb, type Env } from "../db";
import { fcmTokens } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";

const fcmRoute = new Hono<{ Bindings: Env }>();

const registerTokenSchema = z.object({
  token: z.string().min(1, "Token is required"),
  device_type: z.enum(["web", "android", "ios"]).optional(),
});

// Register FCM token
fcmRoute.post(
  "/register",
  authMiddleware,
  zValidator("json", registerTokenSchema),
  async (c) => {
    const user = c.get("user");
    const { token } = c.req.valid("json");
    const db = createDb(c.env.DB);

    try {
      // Check if token already exists
      const existing = await db
        .select()
        .from(fcmTokens)
        .where(and(eq(fcmTokens.userId, user.id), eq(fcmTokens.token, token)))
        .limit(1);

      if (existing.length === 0) {
        // Insert new token
        await db.insert(fcmTokens).values({
          userId: user.id,
          token: token,
        });
      }

      return c.json({
        success: true,
        message: "FCM token registered successfully",
      });
    } catch (error) {
      console.error("Failed to register FCM token:", error);
      return c.json(
        {
          success: false,
          message: "Failed to register FCM token",
        },
        500,
      );
    }
  },
);

// Unregister FCM token (on logout)
fcmRoute.post(
  "/unregister",
  authMiddleware,
  zValidator("json", z.object({ token: z.string() })),
  async (c) => {
    const user = c.get("user");
    const { token } = c.req.valid("json");
    const db = createDb(c.env.DB);

    try {
      await db
        .delete(fcmTokens)
        .where(and(eq(fcmTokens.userId, user.id), eq(fcmTokens.token, token)));

      return c.json({
        success: true,
        message: "FCM token unregistered successfully",
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          message: "Failed to unregister FCM token",
        },
        500,
      );
    }
  },
);

export { fcmRoute };
