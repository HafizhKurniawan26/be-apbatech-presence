// src/index.ts - Final update
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { createDb, type Env } from "./db";
import { authRoute } from "./routes/auth.route";
import { attendanceRoute } from "./routes/attendance.route";
import { fcmRoute } from "./routes/fcm.route";
import { qrRoute } from "./routes/qr.route";
import { leaveRoute } from "./routes/leave.route";
import { adminRoute } from "./routes/admin.route"; // NEW
import { docsRoute } from "./routes/docs.route";

const app = new Hono<{ Bindings: Env }>();

// Middleware global
app.use("*", logger());
app.use("*", prettyJSON());
app.use(
  "*",
  cors({
    origin: ["http://localhost:3000", "https://your-frontend.pages.dev"],
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

// Database middleware
app.use("*", async (c, next) => {
  const db = createDb(c.env.DB);
  c.set("db", db);
  await next();
});

// Health check
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get("/", (c) => {
  return c.json({
    message: "Sistem Presensi Karyawan API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      attendance: "/api/attendance",
      leave: "/api/leave",
      qr: "/api/qr",
      admin: "/api/admin",
      fcm: "/api/fcm",
    },
  });
});

// API Routes
const api = new Hono<{ Bindings: Env }>();

api.route("/auth", authRoute);
api.route("/attendance", attendanceRoute);
api.route("/leave", leaveRoute);
api.route("/qr", qrRoute);
api.route("/admin", adminRoute);
api.route("/fcm", fcmRoute);
app.route("/docs", docsRoute);

app.route("/api", api);

// Global error handler
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json(
    {
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    },
    500,
  );
});

export default app;
