// src/db/index.ts
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import { D1Database, KVNamespace, R2Bucket } from "@cloudflare/workers-types";

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  MY_BUCKET: R2Bucket; // Tambahkan R2 bucket
  JWT_SECRET: string;
  R2_PUBLIC_URL: string; // URL public bucket (optional)
  // Hapus Cloudinary variables
  // CLOUDINARY_CLOUD_NAME: string;
  // CLOUDINARY_API_KEY: string;
  // CLOUDINARY_API_SECRET: string;
  // CLOUDINARY_UPLOAD_PRESET: string;
  FIREBASE_SERVER_KEY: string;
}

export const createDb = (d1Database: D1Database) => {
  return drizzle(d1Database, { schema });
};

export type DbClient = ReturnType<typeof createDb>;
export type Transaction = Parameters<Parameters<DbClient["transaction"]>[0]>[0];
