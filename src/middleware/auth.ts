// src/middleware/auth.ts
import { createMiddleware } from "hono/factory";
import { CryptoHelper } from "../utils/crypto.helper";
import type { Env } from "../db";
import type { JWTPayload } from "../utils/crypto.helper";

// Extend Hono's context type
declare module "hono" {
  interface ContextVariableMap {
    user: JWTPayload;
  }
}

/**
 * Middleware untuk memverifikasi JWT token
 */
export const authMiddleware = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json(
        {
          success: false,
          message: "Unauthorized: No token provided",
        },
        401,
      );
    }

    const token = authHeader.substring(7);
    const cryptoHelper = new CryptoHelper(c.env);

    const payload = await cryptoHelper.verifyJWT(token);

    if (!payload) {
      return c.json(
        {
          success: false,
          message: "Unauthorized: Invalid or expired token",
        },
        401,
      );
    }

    // Set user payload to context
    c.set("user", payload);

    await next();
  },
);

/**
 * Helper function untuk membuat role-based middleware
 */
export function requireRole(allowedRoles: Array<"admin" | "employee">) {
  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const user = c.get("user");

    if (!user) {
      return c.json(
        {
          success: false,
          message: "Unauthorized: User not authenticated",
        },
        401,
      );
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json(
        {
          success: false,
          message: "Forbidden: Insufficient permissions",
        },
        403,
      );
    }

    await next();
  });
}

/**
 * Optional auth middleware (doesn't fail if no token)
 */
export const optionalAuthMiddleware = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    const authHeader = c.req.header("Authorization");

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const cryptoHelper = new CryptoHelper(c.env);
      const payload = await cryptoHelper.verifyJWT(token);

      if (payload) {
        c.set("user", payload);
      }
    }

    await next();
  },
);
