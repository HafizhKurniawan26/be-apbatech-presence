// src/controllers/auth.controller.ts
import { Context } from "hono";
import { createDb, type Env } from "../db";
import { users, fcmTokens } from "../db/schema";
import { eq, or } from "drizzle-orm";
import { CryptoHelper } from "../utils/crypto.helper";
import type {
  LoginInput,
  RegisterInput,
  ChangePasswordInput,
} from "../validators/auth.validator";

export class AuthController {
  /**
   * Login user
   */
  static async login(c: Context<{ Bindings: Env }>) {
    const body = await c.req.json<LoginInput>();
    const db = createDb(c.env.DB);
    const cryptoHelper = new CryptoHelper(c.env);

    try {
      // Cari user berdasarkan email ATAU NIP
      const [user] = await db
        .select()
        .from(users)
        .where(
          or(eq(users.email, body.identifier), eq(users.nip, body.identifier)),
        )
        .limit(1);

      if (!user) {
        return c.json(
          {
            success: false,
            message: "Invalid email/NIP or password",
          },
          401,
        );
      }

      // Verify password
      const isPasswordValid = await cryptoHelper.verifyPassword(
        body.password,
        user.password,
      );

      if (!isPasswordValid) {
        return c.json(
          {
            success: false,
            message: "Invalid email/NIP or password",
          },
          401,
        );
      }

      // Generate tokens
      const accessToken = await cryptoHelper.generateJWT({
        id: user.id,
        email: user.email,
        role: user.role as "admin" | "employee",
        name: user.name,
      });

      const refreshToken = await cryptoHelper.generateRefreshToken(user.id);

      // Register FCM token if provided
      if (body.fcm_token) {
        try {
          const existingToken = await db
            .select()
            .from(fcmTokens)
            .where(eq(fcmTokens.token, body.fcm_token))
            .limit(1);

          if (existingToken.length === 0) {
            await db.insert(fcmTokens).values({
              userId: user.id,
              token: body.fcm_token,
            });
          }
        } catch (error) {
          console.error("Failed to register FCM token:", error);
        }
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      return c.json({
        success: true,
        message: "Login successful",
        data: {
          user: userWithoutPassword,
          tokens: {
            access_token: accessToken,
            refresh_token: refreshToken,
            token_type: "Bearer",
            expires_in: 24 * 60 * 60,
          },
        },
      });
    } catch (error) {
      console.error("Login error:", error);
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
   * Register new user (admin only)
   */
  static async register(c: Context<{ Bindings: Env }>) {
    const body = await c.req.json<RegisterInput>();
    const db = createDb(c.env.DB);
    const cryptoHelper = new CryptoHelper(c.env);

    try {
      // Check if NIP already exists
      const [existingNip] = await db
        .select()
        .from(users)
        .where(eq(users.nip, body.nip))
        .limit(1);

      if (existingNip) {
        return c.json(
          {
            success: false,
            message: "NIP already registered",
            errors: { nip: ["NIP already exists"] },
          },
          400,
        );
      }

      // Check if email already exists
      const [existingEmail] = await db
        .select()
        .from(users)
        .where(eq(users.email, body.email))
        .limit(1);

      if (existingEmail) {
        return c.json(
          {
            success: false,
            message: "Email already registered",
            errors: { email: ["Email already exists"] },
          },
          400,
        );
      }

      // Hash password
      const hashedPassword = await cryptoHelper.hashPassword(body.password);

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          nip: body.nip,
          name: body.name,
          email: body.email,
          password: hashedPassword,
          role: body.role,
        })
        .returning();

      // Remove password from response
      const { password, ...userWithoutPassword } = newUser;

      return c.json(
        {
          success: true,
          message: "User registered successfully",
          data: userWithoutPassword,
        },
        201,
      );
    } catch (error) {
      console.error("Registration error:", error);
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
   * Refresh access token
   */
  static async refresh(c: Context<{ Bindings: Env }>) {
    const body = await c.req.json<{ refresh_token: string }>();
    const cryptoHelper = new CryptoHelper(c.env);
    const db = createDb(c.env.DB);

    try {
      const payload = await cryptoHelper.verifyJWT(body.refresh_token);

      if (!payload || payload.type !== "refresh") {
        return c.json(
          {
            success: false,
            message: "Invalid refresh token",
          },
          401,
        );
      }

      // Get user data
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.id))
        .limit(1);

      if (!user) {
        return c.json(
          {
            success: false,
            message: "User not found",
          },
          401,
        );
      }

      // Generate new access token
      const accessToken = await cryptoHelper.generateJWT({
        id: user.id,
        email: user.email,
        role: user.role as "admin" | "employee",
        name: user.name,
      });

      return c.json({
        success: true,
        data: {
          access_token: accessToken,
          token_type: "Bearer",
          expires_in: 24 * 60 * 60,
        },
      });
    } catch (error) {
      console.error("Token refresh error:", error);
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
   * Logout user
   */
  static async logout(c: Context<{ Bindings: Env }>) {
    const user = c.get("user");
    const body = await c.req.json<{ fcm_token?: string }>();
    const db = createDb(c.env.DB);

    try {
      // Remove FCM token if provided
      if (body.fcm_token) {
        await db.delete(fcmTokens).where(eq(fcmTokens.token, body.fcm_token));
      }

      return c.json({
        success: true,
        message: "Logout successful",
      });
    } catch (error) {
      console.error("Logout error:", error);
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
   * Change password
   */
  static async changePassword(c: Context<{ Bindings: Env }>) {
    const user = c.get("user");
    const body = await c.req.json<ChangePasswordInput>();
    const db = createDb(c.env.DB);
    const cryptoHelper = new CryptoHelper(c.env);

    try {
      // Get current user data
      const [currentUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      if (!currentUser) {
        return c.json(
          {
            success: false,
            message: "User not found",
          },
          404,
        );
      }

      // Verify current password
      const isPasswordValid = await cryptoHelper.verifyPassword(
        body.current_password,
        currentUser.password,
      );

      if (!isPasswordValid) {
        return c.json(
          {
            success: false,
            message: "Current password is incorrect",
          },
          400,
        );
      }

      // Hash new password
      const hashedPassword = await cryptoHelper.hashPassword(body.new_password);

      // Update password
      await db
        .update(users)
        .set({
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      return c.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      console.error("Change password error:", error);
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
   * Get current user profile
   */
  static async profile(c: Context<{ Bindings: Env }>) {
    const user = c.get("user");
    const db = createDb(c.env.DB);

    try {
      const [userData] = await db
        .select({
          id: users.id,
          nip: users.nip,
          name: users.name,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      if (!userData) {
        return c.json(
          {
            success: false,
            message: "User not found",
          },
          404,
        );
      }

      return c.json({
        success: true,
        data: userData,
      });
    } catch (error) {
      console.error("Get profile error:", error);
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
