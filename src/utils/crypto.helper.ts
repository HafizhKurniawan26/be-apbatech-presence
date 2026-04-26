// src/utils/crypto.helper.ts
import type { Env } from "../db";

export interface JWTPayload {
  id: number;
  email: string;
  role: "admin" | "employee";
  name: string;
}

export class CryptoHelper {
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();

  constructor(private env: Env) {}

  /**
   * Hash password menggunakan PBKDF2 (built-in Web Crypto API)
   */
  async hashPassword(password: string): Promise<string> {
    // Generate random salt (16 bytes)
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      this.encoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"],
    );

    // Derive key using PBKDF2
    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"],
    );

    // Export key as raw bits
    const exportedKey = (await crypto.subtle.exportKey(
      "raw",
      key,
    )) as ArrayBuffer;

    // Combine salt + hash and encode as base64
    const combined = new Uint8Array(salt.length + exportedKey.byteLength);
    combined.set(salt, 0);
    combined.set(new Uint8Array(exportedKey), salt.length);

    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Verify password against stored hash
   */
  async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    try {
      // Decode stored hash
      const combined = Uint8Array.from(atob(storedHash), (c) =>
        c.charCodeAt(0),
      );

      // Extract salt (first 16 bytes)
      const salt = combined.slice(0, 16);
      const storedKey = combined.slice(16);

      // Hash the input password with same salt
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        this.encoder.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"],
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: salt,
          iterations: 100000,
          hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"],
      );

      const exportedKey = await crypto.subtle.exportKey("raw", key);
      if (!(exportedKey instanceof ArrayBuffer)) {
        return false;
      }
      const newKey = new Uint8Array(exportedKey);

      // Compare in constant time
      if (storedKey.length !== newKey.length) {
        return false;
      }

      let diff = 0;
      for (let i = 0; i < storedKey.length; i++) {
        diff |= storedKey[i] ^ newKey[i];
      }

      return diff === 0;
    } catch (error) {
      console.error("Password verification error:", error);
      return false;
    }
  }

  /**
   * Generate JWT token
   */
  async generateJWT(payload: JWTPayload): Promise<string> {
    const header = {
      alg: "HS256",
      typ: "JWT",
    };

    const now = Math.floor(Date.now() / 1000);
    const claims = {
      ...payload,
      iat: now,
      exp: now + 24 * 60 * 60, // 24 hours
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedClaims = this.base64UrlEncode(JSON.stringify(claims));
    const signatureInput = `${encodedHeader}.${encodedClaims}`;

    // Create signature using HMAC-SHA256
    const key = await crypto.subtle.importKey(
      "raw",
      this.encoder.encode(this.env.JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      this.encoder.encode(signatureInput),
    );

    const encodedSignature = this.base64UrlEncode(
      String.fromCharCode(...new Uint8Array(signature)),
    );

    return `${signatureInput}.${encodedSignature}`;
  }

  /**
   * Verify and decode JWT token
   */
  async verifyJWT(token: string): Promise<JWTPayload | null> {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        return null;
      }

      const [encodedHeader, encodedClaims, encodedSignature] = parts;
      const signatureInput = `${encodedHeader}.${encodedClaims}`;

      // Verify signature
      const key = await crypto.subtle.importKey(
        "raw",
        this.encoder.encode(this.env.JWT_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"],
      );

      const signature = this.base64UrlDecode(encodedSignature);
      const isValid = await crypto.subtle.verify(
        "HMAC",
        key,
        signature,
        this.encoder.encode(signatureInput),
      );

      if (!isValid) {
        return null;
      }

      // Decode claims
      const claimsJson = this.base64UrlDecodeToString(encodedClaims);
      const claims = JSON.parse(claimsJson);

      // Check expiration
      if (claims.exp && Date.now() >= claims.exp * 1000) {
        return null;
      }

      return {
        id: claims.id,
        email: claims.email,
        role: claims.role,
        name: claims.name,
      };
    } catch (error) {
      console.error("JWT verification error:", error);
      return null;
    }
  }

  /**
   * Generate refresh token (longer expiry)
   */
  async generateRefreshToken(userId: number): Promise<string> {
    const payload = {
      sub: userId.toString(),
      type: "refresh",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
    };

    return this.generateJWT(payload as any);
  }

  /**
   * Generate random token for QR code
   */
  generateRandomToken(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      "",
    );
  }

  private base64UrlEncode(str: string): string {
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  private base64UrlDecode(str: string): Uint8Array {
    str = str.replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4) {
      str += "=";
    }
    return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
  }

  private base64UrlDecodeToString(str: string): string {
    return this.decoder.decode(this.base64UrlDecode(str));
  }
}
