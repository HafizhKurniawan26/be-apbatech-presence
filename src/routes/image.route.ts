// src/routes/image.route.ts
import { Hono } from "hono";
import type { Env } from "../db";
import { R2Service } from "../services/r2.service";

const imageRoute = new Hono<{ Bindings: Env }>();

/**
 * GET /images/* - Serve image from R2
 * Ini yang menggantikan akses langsung ke R2/CDN
 * Mirip dengan cara kerja Cloudinary
 */
imageRoute.get("/*", async (c) => {
  try {
    // Dapatkan path lengkap setelah /images/
    const key = c.req.path.replace("/api/images/", "");

    if (!key) {
      return c.json({ error: "File key is required" }, 400);
    }

    // Decode URL-encoded key
    const decodedKey = decodeURIComponent(key);

    console.log(`🖼️ Serving image: ${decodedKey}`);

    // Gunakan R2Service untuk mengambil file
    const r2Service = new R2Service(c.env, c.req.url);
    const file = await r2Service.getFile(decodedKey);

    if (!file) {
      console.log(`❌ Image not found: ${decodedKey}`);
      return c.json({ error: "File not found" }, 404);
    }

    // Set cache headers (1 tahun untuk image)
    c.header("Cache-Control", "public, max-age=31536000, immutable");
    c.header("Content-Type", file.contentType);
    c.header("Content-Length", file.size.toString());

    // Optional: Add CORS for development
    if (process.env.NODE_ENV === "development") {
      c.header("Access-Control-Allow-Origin", "*");
    }

    // Return file stream
    return new Response(file.body, {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving image:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export { imageRoute };
