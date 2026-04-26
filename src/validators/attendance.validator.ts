// src/validators/attendance.validator.ts
import { z } from "zod";

export const checkInSchema = z.object({
  location_id: z.coerce.number().positive("Location ID is required"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  method: z.enum(["gps", "qr_code"]).default("gps"),
});

export const checkOutSchema = z.object({
  attendance_id: z.coerce.number().positive("Attendance ID is required"),
  location_id: z.coerce.number().positive("Location ID is required"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  method: z.enum(["gps", "qr_code"]).default("gps"),
});

export const scanQRSchema = z.object({
  qr_token: z.string().min(10, "Invalid QR token"),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  type: z.enum(["check_in", "check_out"]).default("check_in").optional(),
});

export const historyQuerySchema = z.object({
  month: z.coerce.number().min(1).max(12).optional(),
  year: z.coerce.number().min(2020).max(2030).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export const scanQRWithPhotoSchema = z.object({
  qr_token: z.string().min(10, "Invalid QR token"),
  type: z.enum(["check_in", "check_out"]).default("check_in").optional(),
});

export type scanQRWithPhotoInput = z.infer<typeof scanQRWithPhotoSchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;
export type CheckOutInput = z.infer<typeof checkOutSchema>;
export type ScanQRInput = z.infer<typeof scanQRSchema>;
export type HistoryQueryInput = z.infer<typeof historyQuerySchema>;
