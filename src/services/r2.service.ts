// src/services/r2.service.ts
import type { Env } from "../db";

export interface R2UploadResult {
  url: string;
  key: string;
  size: number;
  etag: string;
  uploadedAt: Date;
}

export interface R2Metadata {
  key: string;
  size?: number;
  etag?: string;
  uploaded?: Date;
  contentType?: string;
  customMetadata?: Record<string, string>;
}

export interface R2ListOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
  delimiter?: string;
}

export interface R2ListResult {
  objects: R2Metadata[];
  truncated: boolean;
  cursor?: string;
  delimitedPrefixes?: string[];
}

export class R2Service {
  private readonly bucket: R2Bucket;
  private readonly publicUrl: string;

  constructor(env: Env) {
    this.bucket = env.MY_BUCKET;

    // Gunakan public URL dari R2 bucket
    // Format: https://{bucket-name}.{account-id}.r2.cloudflarestorage.com
    // atau custom domain jika sudah di-setup
    this.publicUrl =
      env.R2_PUBLIC_URL ||
      "https://pub-9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d.r2.dev";

    console.log("📦 R2Service Initialized:", {
      publicUrl: this.publicUrl,
      hasBucket: !!this.bucket,
    });
  }

  /**
   * Upload file ke Cloudflare R2
   * Return URL public langsung dari R2
   */
  async uploadImage(
    file: File,
    folder: string = "presensi",
    publicId?: string,
  ): Promise<R2UploadResult> {
    try {
      if (!file || file.size === 0) {
        throw new Error("File is empty or invalid");
      }

      const fileExtension = this.getFileExtension(file.type);
      const fileName = publicId
        ? `${folder}/${publicId}.${fileExtension}`
        : `${folder}/${this.generateFileName(file.name)}`;

      console.log(`📤 Uploading to R2: ${fileName}`);
      console.log(`   Size: ${this.formatFileSize(file.size)}`);
      console.log(`   Type: ${file.type}`);

      const arrayBuffer = await file.arrayBuffer();

      // Set public read access via custom metadata or bucket policy
      const uploadResult = await this.bucket.put(fileName, arrayBuffer, {
        httpMetadata: {
          contentType: file.type,
          contentDisposition: `inline; filename="${encodeURIComponent(file.name)}"`,
          cacheControl: "public, max-age=31536000",
        },
        customMetadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          folder: folder,
          fileSize: file.size.toString(),
          mimeType: file.type,
        },
      });

      if (!uploadResult) {
        throw new Error("Upload failed - no response from R2");
      }

      const verifyExists = await this.bucket.head(fileName);
      if (!verifyExists) {
        throw new Error(
          "Upload verification failed - file not found after upload",
        );
      }

      console.log(`✅ File verified in bucket: ${fileName}`);
      console.log(`   ETag: ${uploadResult.etag}`);

      // Generate public URL langsung dari R2
      const url = `${this.publicUrl}/${fileName}`;
      // const url = `${this.publicUrl}/${encodeURIComponent(fileName)}`;
      console.log(`🌐 Public URL (R2 direct): ${url}`);

      return {
        url: url,
        key: fileName,
        size: file.size,
        etag: uploadResult.etag || "",
        uploadedAt: new Date(),
      };
    } catch (error) {
      console.error("❌ R2 upload error:", error);
      throw new Error(
        `Failed to upload to R2: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Upload file dengan akses public
   */
  async uploadPublicImage(
    file: File,
    folder: string = "presensi",
    publicId?: string,
  ): Promise<R2UploadResult> {
    return this.uploadImage(file, folder, publicId);
  }

  /**
   * Get public URL untuk file yang sudah ada
   */
  getPublicUrl(key: string): string {
    // Don't encode the entire key, just return as-is
    return `${this.publicUrl}/${key}`;
  }

  /**
   * Delete file dari R2
   */
  async deleteImage(key: string): Promise<boolean> {
    try {
      if (!key) {
        throw new Error("File key is required");
      }

      console.log(`🗑️ Deleting: ${key}`);
      await this.bucket.delete(key);
      console.log(`✅ Deleted: ${key}`);
      return true;
    } catch (error) {
      console.error(`❌ Delete Failed: ${key}`, error);
      return false;
    }
  }

  /**
   * Delete multiple files
   */
  async deleteMultipleImages(
    keys: string[],
  ): Promise<{ key: string; success: boolean; error?: string }[]> {
    if (!keys || keys.length === 0) {
      return [];
    }

    console.log(`🗑️ Batch Delete: ${keys.length} files`);

    const results = await Promise.allSettled(
      keys.map(async (key) => {
        const success = await this.deleteImage(key);
        return { key, success };
      }),
    );

    return results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        return {
          key: keys[index],
          success: false,
          error: result.reason.message || String(result.reason),
        };
      }
    });
  }

  /**
   * Get file metadata
   */
  async getImageMetadata(key: string): Promise<R2Metadata | null> {
    try {
      if (!key) return null;

      const object = await this.bucket.head(key);

      if (!object) {
        console.log(`❓ File not found: ${key}`);
        return null;
      }

      return {
        key: key,
        size: object.size,
        etag: object.etag,
        uploaded: object.uploaded,
        contentType: object.httpMetadata?.contentType,
        customMetadata: object.customMetadata as
          | Record<string, string>
          | undefined,
      };
    } catch (error) {
      console.error(`❌ Metadata Error: ${key}`, error);
      return null;
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(key: string): Promise<boolean> {
    const metadata = await this.getImageMetadata(key);
    return metadata !== null;
  }

  /**
   * List files in bucket/folder
   */
  async listFiles(options: R2ListOptions = {}): Promise<R2ListResult> {
    try {
      const { prefix, limit = 100, cursor, delimiter } = options;

      console.log(`📋 Listing files:`, { prefix, limit, delimiter });

      const listResult = await this.bucket.list({
        prefix,
        limit,
        cursor,
        delimiter,
      });

      const objects: R2Metadata[] = listResult.objects.map((obj) => ({
        key: obj.key,
        size: obj.size,
        etag: obj.etag,
        uploaded: obj.uploaded,
        contentType: obj.httpMetadata?.contentType,
        customMetadata: obj.customMetadata as
          | Record<string, string>
          | undefined,
      }));

      console.log(
        `📋 Found ${objects.length} files${listResult.truncated ? " (truncated)" : ""}`,
      );

      return {
        objects,
        truncated: listResult.truncated,
        cursor: listResult.cursor,
        delimitedPrefixes: listResult.delimitedPrefixes,
      };
    } catch (error) {
      console.error(`❌ List Error:`, error);
      return {
        objects: [],
        truncated: false,
      };
    }
  }

  /**
   * Copy file ke lokasi baru
   */
  async copyImage(sourceKey: string, destKey: string): Promise<boolean> {
    try {
      console.log(`📋 Copying: ${sourceKey} -> ${destKey}`);

      const sourceObject = await this.bucket.get(sourceKey);
      if (!sourceObject) {
        throw new Error(`Source file not found: ${sourceKey}`);
      }

      const arrayBuffer = await sourceObject.arrayBuffer();

      await this.bucket.put(destKey, arrayBuffer, {
        httpMetadata: sourceObject.httpMetadata,
        customMetadata: sourceObject.customMetadata,
      });

      console.log(`✅ Copied: ${destKey}`);
      return true;
    } catch (error) {
      console.error(`❌ Copy failed: ${sourceKey} -> ${destKey}`, error);
      return false;
    }
  }

  /**
   * Generate unique filename
   */
  private generateFileName(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const extension = this.getFileExtension(originalName);

    const sanitizedName = originalName
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .substring(0, 50);

    return `${timestamp}_${random}_${sanitizedName}.${extension}`;
  }

  /**
   * Get file extension from filename or mime type
   */
  private getFileExtension(fileNameOrType: string): string {
    if (fileNameOrType.includes(".") && !fileNameOrType.includes("/")) {
      const ext = fileNameOrType.split(".").pop()?.toLowerCase();
      if (ext && ext.length <= 5) {
        return ext;
      }
    }

    const mimeMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "image/svg+xml": "svg",
      "image/bmp": "bmp",
      "image/tiff": "tiff",
      "application/pdf": "pdf",
    };

    return mimeMap[fileNameOrType] || "jpg";
  }

  /**
   * Generate public ID untuk file
   */
  generatePublicId(userId: number | string, type: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const sanitizedType = type.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    return `${sanitizedType}_${userId}_${timestamp}_${random}`;
  }

  /**
   * Format file size ke human readable
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    if (!bytes || bytes < 0) return "Invalid size";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Validate file type dan size
   */
  validateFile(
    file: File,
    allowedTypes: string[] = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf",
    ],
    maxSizeMB: number = 5,
  ): { valid: boolean; error?: string } {
    if (!file || file.size === 0) {
      return { valid: false, error: "File is empty or not provided" };
    }

    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type: ${file.type}. Allowed types: ${allowedTypes.join(", ")}`,
      };
    }

    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return {
        valid: false,
        error: `File size (${sizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`,
      };
    }

    return { valid: true };
  }

  /**
   * Generate signed URL untuk temporary access (optional)
   */
  async generateSignedUrl(
    key: string,
    expirySeconds: number = 3600,
  ): Promise<string | null> {
    try {
      // Note: Signed URLs require additional setup with R2
      // This is a placeholder for future implementation
      console.log(
        `🔐 Generating signed URL for: ${key} (expires in ${expirySeconds}s)`,
      );
      return this.getPublicUrl(key);
    } catch (error) {
      console.error(`❌ Signed URL generation failed: ${key}`, error);
      return null;
    }
  }
}
