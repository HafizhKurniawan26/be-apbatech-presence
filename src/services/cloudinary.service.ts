// src/services/cloudinary.service.ts
import type { Env } from "../db";

export interface CloudinaryUploadResult {
  url: string;
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  created_at: string;
}

export class CloudinaryService {
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly uploadPreset: string;

  constructor(env: Env) {
    this.cloudName = env.CLOUDINARY_CLOUD_NAME;
    this.apiKey = env.CLOUDINARY_API_KEY;
    this.apiSecret = env.CLOUDINARY_API_SECRET;
    this.uploadPreset = env.CLOUDINARY_UPLOAD_PRESET;
  }

  /**
   * Upload file ke Cloudinary
   */
  async uploadImage(
    file: File,
    folder: string = "presensi",
    publicId?: string,
  ): Promise<CloudinaryUploadResult> {
    const formData = new FormData();

    // Convert File ke Blob untuk upload
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: file.type });

    formData.append("file", blob, file.name);
    formData.append("upload_preset", this.uploadPreset);
    formData.append("folder", folder);

    if (publicId) {
      formData.append("public_id", publicId);
    }

    // Tambahkan timestamp dan signature untuk signed upload (opsional)
    // Jika menggunakan unsigned preset, ini tidak diperlukan
    const timestamp = Math.floor(Date.now() / 1000);
    formData.append("timestamp", timestamp.toString());

    const signature = await this.generateSignature({
      folder,
      public_id: publicId,
      timestamp,
      upload_preset: this.uploadPreset,
    });

    if (signature) {
      formData.append("signature", signature);
      formData.append("api_key", this.apiKey);
    }

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Cloudinary upload failed: ${JSON.stringify(error)}`);
    }

    const result = (await response.json()) as CloudinaryUploadResult;

    return {
      url: result.url,
      secure_url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      created_at: result.created_at,
    };
  }

  /**
   * Upload multiple images
   */
  async uploadMultipleImages(
    files: File[],
    folder: string = "presensi",
  ): Promise<CloudinaryUploadResult[]> {
    const uploadPromises = files.map((file) => this.uploadImage(file, folder));
    return Promise.all(uploadPromises);
  }

  /**
   * Delete image dari Cloudinary
   */
  async deleteImage(publicId: string): Promise<boolean> {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await this.generateSignature({
      public_id: publicId,
      timestamp,
    });

    const formData = new FormData();
    formData.append("public_id", publicId);
    formData.append("timestamp", timestamp.toString());
    formData.append("api_key", this.apiKey);
    formData.append("signature", signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`,
      {
        method: "POST",
        body: formData,
      },
    );

    const result = await response.json();
    return result.result === "ok";
  }

  /**
   * Generate signature untuk signed upload
   */
  private async generateSignature(
    params: Record<string, string | number | undefined>,
  ): Promise<string | null> {
    if (!this.apiSecret) {
      return null; // Return null untuk unsigned upload
    }

    // Filter undefined values dan sort by key
    const sortedParams = Object.entries(params)
      .filter(([, value]) => value !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    const signatureString = sortedParams + this.apiSecret;

    // Generate SHA-1 hash
    const encoder = new TextEncoder();
    const data = encoder.encode(signatureString);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);

    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return hashHex;
  }

  /**
   * Generate public ID untuk file
   */
  generatePublicId(userId: number, type: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `presensi/${type}/${userId}_${timestamp}_${random}`;
  }
}
