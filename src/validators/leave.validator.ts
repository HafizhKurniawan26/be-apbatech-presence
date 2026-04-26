// src/validators/leave.validator.ts
import { z } from "zod";

export const createLeaveRequestSchema = z
  .object({
    type: z.enum(["cuti", "izin", "sakit"], {
      errorMap: () => ({ message: "Type must be: cuti, izin, or sakit" }),
    }),
    start_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: "Invalid start date format",
    }),
    end_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: "Invalid end date format",
    }),
    reason: z
      .string()
      .min(10, "Reason must be at least 10 characters")
      .max(500),
  })
  .refine(
    (data) => {
      const start = new Date(data.start_date);
      const end = new Date(data.end_date);
      return end >= start;
    },
    {
      message: "End date must be after or equal to start date",
      path: ["end_date"],
    },
  )
  .refine(
    (data) => {
      const start = new Date(data.start_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return start >= today;
    },
    {
      message: "Start date cannot be in the past",
      path: ["start_date"],
    },
  );

export const updateLeaveStatusSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  rejection_reason: z.string().optional(),
});

export const leaveHistoryQuerySchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  type: z.enum(["cuti", "izin", "sakit"]).optional(),
  month: z.coerce.number().min(1).max(12).optional(),
  year: z.coerce.number().min(2020).max(2030).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
export type UpdateLeaveStatusInput = z.infer<typeof updateLeaveStatusSchema>;
export type LeaveHistoryQueryInput = z.infer<typeof leaveHistoryQuerySchema>;
