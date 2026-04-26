// src/services/fcm.service.ts
import { createDb, type Env } from "../db";
import { fcmTokens } from "../db/schema";
import { eq } from "drizzle-orm";

interface FCMNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

interface FCMAccessTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export class FCMService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(private env: Env) {}

  private async getAccessToken(): Promise<string> {
    // Check if token is still valid (with 5 min buffer)
    if (this.accessToken && Date.now() < this.tokenExpiry - 300000) {
      return this.accessToken;
    }

    const jwt = await this.generateJWT();
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get FCM access token: ${error}`);
    }

    const data = (await response.json()) as FCMAccessTokenResponse;
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + data.expires_in * 1000;

    return this.accessToken;
  }

  private async generateJWT(): Promise<string> {
    const header = {
      alg: "RS256",
      typ: "JWT",
    };

    const now = Math.floor(Date.now() / 1000);
    const claim = {
      iss: this.env.FIREBASE_CLIENT_EMAIL,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    };

    const privateKey = this.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");

    // Convert PEM to CryptoKey
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    const pemContents = privateKey
      .replace(pemHeader, "")
      .replace(pemFooter, "")
      .replace(/\s/g, "");

    const binaryKey = Uint8Array.from(atob(pemContents), (c) =>
      c.charCodeAt(0),
    );

    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: { name: "SHA-256" },
      },
      false,
      ["sign"],
    );

    const encoder = new TextEncoder();
    const encodedHeader = encoder.encode(JSON.stringify(header));
    const encodedClaim = encoder.encode(JSON.stringify(claim));

    const base64Header = btoa(String.fromCharCode(...encodedHeader))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const base64Claim = btoa(String.fromCharCode(...encodedClaim))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const signatureInput = `${base64Header}.${base64Claim}`;
    const signature = await crypto.subtle.sign(
      { name: "RSASSA-PKCS1-v1_5" },
      cryptoKey,
      encoder.encode(signatureInput),
    );

    const base64Signature = btoa(
      String.fromCharCode(...new Uint8Array(signature)),
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    return `${signatureInput}.${base64Signature}`;
  }

  async sendToUser(
    userId: number,
    payload: FCMNotificationPayload,
  ): Promise<{ success: number; failure: number }> {
    const db = createDb(this.env.DB);

    // Get user's FCM tokens
    const tokens = await db
      .select({ token: fcmTokens.token })
      .from(fcmTokens)
      .where(eq(fcmTokens.userId, userId));

    if (tokens.length === 0) {
      console.log(`No FCM tokens found for user ${userId}`);
      return { success: 0, failure: 0 };
    }

    const results = await Promise.allSettled(
      tokens.map(({ token }) => this.sendToToken(token, payload)),
    );

    const success = results.filter((r) => r.status === "fulfilled").length;
    const failure = results.filter((r) => r.status === "rejected").length;

    return { success, failure };
  }

  async sendToToken(
    token: string,
    payload: FCMNotificationPayload,
  ): Promise<void> {
    const accessToken = await this.getAccessToken();

    const message = {
      message: {
        token: token,
        notification: {
          title: payload.title,
          body: payload.body,
          ...(payload.imageUrl && { image: payload.imageUrl }),
        },
        data: payload.data || {},
        android: {
          priority: "high",
          notification: {
            sound: "default",
            channelId: "presensi_channel",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
      },
    };

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${this.env.FIREBASE_PROJECT_ID}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      },
    );

    if (!response.ok) {
      const error = await response.json();

      // Remove invalid token
      if (error.error?.details?.[0]?.errorCode === "UNREGISTERED") {
        const db = createDb(this.env.DB);
        await db.delete(fcmTokens).where(eq(fcmTokens.token, token));
        console.log(`Removed invalid FCM token: ${token}`);
      }

      throw new Error(`FCM send failed: ${JSON.stringify(error)}`);
    }
  }

  async sendToMultipleUsers(
    userIds: number[],
    payload: FCMNotificationPayload,
  ): Promise<{ success: number; failure: number }> {
    const results = await Promise.allSettled(
      userIds.map((userId) => this.sendToUser(userId, payload)),
    );

    const summary = results.reduce(
      (acc, result) => {
        if (result.status === "fulfilled") {
          acc.success += result.value.success;
          acc.failure += result.value.failure;
        } else {
          acc.failure += 1;
        }
        return acc;
      },
      { success: 0, failure: 0 },
    );

    return summary;
  }

  async sendToTopic(
    topic: string,
    payload: FCMNotificationPayload,
  ): Promise<void> {
    const accessToken = await this.getAccessToken();

    const message = {
      message: {
        topic: topic,
        notification: {
          title: payload.title,
          body: payload.body,
          ...(payload.imageUrl && { image: payload.imageUrl }),
        },
        data: payload.data || {},
        android: {
          priority: "high",
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
            },
          },
        },
      },
    };

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${this.env.FIREBASE_PROJECT_ID}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`FCM topic send failed: ${JSON.stringify(error)}`);
    }
  }
}

// Singleton instance per request
export const createFCMService = (env: Env) => new FCMService(env);
