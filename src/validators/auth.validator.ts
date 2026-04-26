// src/validators/auth.validator.ts
import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().min(1, "Email or NIP is required"), // Bisa email atau NIP
  password: z.string().min(6, "Password must be at least 6 characters"),
  fcm_token: z.string().optional(),
});

export const registerSchema = z.object({
  nip: z
    .string()
    .min(3, "NIP must be at least 3 characters")
    .max(50, "NIP must be at most 50 characters")
    .regex(
      /^[A-Za-z0-9.-]+$/,
      "NIP can only contain letters, numbers, dots, and dashes",
    ),
  name: z.string().min(3, "Name must be at least 3 characters").max(255),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "employee"]).default("employee"),
});

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(6),
    new_password: z
      .string()
      .min(6, "New password must be at least 6 characters"),
    confirm_password: z.string().min(6),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  });

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, "Refresh token is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
