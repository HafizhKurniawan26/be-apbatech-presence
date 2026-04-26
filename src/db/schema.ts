// src/db/schema.ts
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// Enum untuk role
export const roleEnum = ["admin", "employee"] as const;
export type Role = (typeof roleEnum)[number];

// Enum untuk status attendance
export const attendanceStatusEnum = ["ontime", "late"] as const;
export type AttendanceStatus = (typeof attendanceStatusEnum)[number];

// Enum untuk method attendance
export const attendanceMethodEnum = ["gps", "qr_code"] as const;
export type AttendanceMethod = (typeof attendanceMethodEnum)[number];

// Enum untuk tipe leave
export const leaveTypeEnum = ["cuti", "izin", "sakit"] as const;
export type LeaveType = (typeof leaveTypeEnum)[number];

// Enum untuk status leave
export const leaveStatusEnum = ["pending", "approved", "rejected"] as const;
export type LeaveStatus = (typeof leaveStatusEnum)[number];

// 1. Tabel Users
export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nip: text("nip").notNull().unique(), // NIP sebagai identifier unik
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    role: text("role", { enum: roleEnum }).notNull().default("employee"),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
      () => new Date(),
    ),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    roleIdx: index("users_role_idx").on(table.role),
  }),
);

// 2. Tabel Locations
export const locations = sqliteTable("locations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  radius: integer("radius").notNull().default(100),
  checkInTime: text("check_in_time").notNull(), // Format: "HH:mm"
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

// 3. Tabel FCM Tokens
export const fcmTokens = sqliteTable(
  "fcm_tokens",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
      () => new Date(),
    ),
  },
  (table) => ({
    userIdIdx: index("fcm_user_id_idx").on(table.userId),
  }),
);

// 4. Tabel Attendances
export const attendances = sqliteTable(
  "attendances",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    locationId: integer("location_id")
      .references(() => locations.id)
      .notNull(),
    checkIn: integer("check_in", { mode: "timestamp" }).$defaultFn(
      () => new Date(),
    ),
    checkOut: integer("check_out", { mode: "timestamp" }),
    checkOutLocationId: integer("check_out_location_id").references(
      () => locations.id,
    ),
    checkOutLatitude: real("check_out_latitude"),
    checkOutLongitude: real("check_out_longitude"),
    checkOutPhotoUrl: text("check_out_photo_url"),
    status: text("status", { enum: attendanceStatusEnum }).notNull(),
    method: text("method", { enum: attendanceMethodEnum }).notNull(),
    latitude: real("latitude"),
    longitude: real("longitude"),
    photoUrl: text("photo_url"),
    photoKey: text("photo_key"), // Untuk menyimpan R2 key
    checkOutPhotoKey: text("check_out_photo_key"), // Untuk menyimpan R2 key
    workingHours: real("working_hours"),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
      () => new Date(),
    ),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index("attendances_user_id_idx").on(table.userId),
    checkInIdx: index("attendances_check_in_idx").on(table.checkIn),
    statusIdx: index("attendances_status_idx").on(table.status),
    userCheckInIdx: index("attendances_user_check_in_idx").on(
      table.userId,
      table.checkIn,
    ),
  }),
);

// 5. Tabel Leave Requests
export const leaveRequests = sqliteTable(
  "leave_requests",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    type: text("type", { enum: leaveTypeEnum }).notNull(), // 'cuti', 'izin', 'sakit'
    startDate: integer("start_date", { mode: "timestamp" }).notNull(),
    endDate: integer("end_date", { mode: "timestamp" }).notNull(),
    status: text("status", { enum: leaveStatusEnum })
      .notNull()
      .default("pending"), // 'pending', 'approved', 'rejected'
    reason: text("reason"),
    attachmentUrl: text("attachment_url"),
    attachmentKey: text("attachment_key"), // Untuk menyimpan R2 key
    approvedBy: integer("approved_by").references(() => users.id),
    approvedAt: integer("approved_at", { mode: "timestamp" }),
    rejectionReason: text("rejection_reason"),
    totalDays: integer("total_days"),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
      () => new Date(),
    ),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: index("leave_requests_user_id_idx").on(table.userId),
    statusIdx: index("leave_requests_status_idx").on(table.status),
    dateRangeIdx: index("leave_requests_date_range_idx").on(
      table.startDate,
      table.endDate,
    ),
  }),
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  fcmTokens: many(fcmTokens),
  attendances: many(attendances),
  leaveRequests: many(leaveRequests, { relationName: "leaveRequester" }),
  approvedLeaves: many(leaveRequests, { relationName: "leaveApprover" }),
}));

export const locationsRelations = relations(locations, ({ many }) => ({
  attendances: many(attendances),
}));

export const fcmTokensRelations = relations(fcmTokens, ({ one }) => ({
  user: one(users, {
    fields: [fcmTokens.userId],
    references: [users.id],
  }),
}));

export const attendancesRelations = relations(attendances, ({ one }) => ({
  user: one(users, {
    fields: [attendances.userId],
    references: [users.id],
  }),
  location: one(locations, {
    fields: [attendances.locationId],
    references: [locations.id],
  }),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  user: one(users, {
    fields: [leaveRequests.userId],
    references: [users.id],
    relationName: "leaveRequester",
  }),
  approver: one(users, {
    fields: [leaveRequests.approvedBy],
    references: [users.id],
    relationName: "leaveApprover",
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
export type FcmToken = typeof fcmTokens.$inferSelect;
export type NewFcmToken = typeof fcmTokens.$inferInsert;
export type Attendance = typeof attendances.$inferSelect;
export type NewAttendance = typeof attendances.$inferInsert;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type NewLeaveRequest = typeof leaveRequests.$inferInsert;
