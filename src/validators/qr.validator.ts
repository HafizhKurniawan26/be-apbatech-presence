import { Context } from "hono";
import { z } from "zod";

// Schema untuk validasi multipart form data
const multipartSchema = z.object({
  qr_token: z.string().min(10, "Invalid QR token"),
  type: z.enum(["check_in", "check_out"]).default("check_in").optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

export const validateQRScan = async (c: Context, next: () => Promise<void>) => {
  const contentType = c.req.header("content-type") || "";

  try {
    // Cek apakah request multipart/form-data
    if (contentType.includes("multipart/form-data")) {
      const formData = await c.req.formData();

      // Extract values from form data
      const qr_token = formData.get("qr_token") as string;
      const type = formData.get("type") as string;
      const latitude = formData.get("latitude");
      const longitude = formData.get("longitude");

      // Validasi dengan Zod
      const validatedData = multipartSchema.parse({
        qr_token,
        type: type || "check_in",
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
      });

      // Simpan data yang sudah divalidasi ke context
      c.set("validatedQRData", validatedData);

      // Simpan juga file photo (akan diambil terpisah di controller)
      const photo = formData.get("photo") as File | null;
      if (photo) {
        c.set("qrPhoto", photo);
      }
    } else {
      // Handle JSON request
      const body = await c.req.json();
      const validatedData = multipartSchema.parse(body);
      c.set("validatedQRData", validatedData);
    }

    await next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          success: false,
          message: "Validation failed",
          errors: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        400,
      );
    }

    return c.json(
      {
        success: false,
        message: "Invalid request format",
      },
      400,
    );
  }
};
