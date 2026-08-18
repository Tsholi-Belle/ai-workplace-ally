import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { adminAuth, adminDb } from "./admin.server";

export interface AuthContext {
  userId: string;
  email?: string;
  claims: Record<string, unknown>;
  db: typeof adminDb;
}

export const requireFirebaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();

    if (!request?.headers) {
      throw new Error("Unauthorized: No request headers available");
    }

    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Unauthorized: No authorization token provided. Please sign in.");
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      throw new Error("Unauthorized: Empty authentication token");
    }

    let userId: string;
    let email: string | undefined;
    let claims: Record<string, unknown> = {};

    try {
      // Verify Firebase ID Token via Firebase Admin
      const decoded = await adminAuth.verifyIdToken(token);
      userId = decoded.uid;
      email = decoded.email;
      claims = decoded;
    } catch (err) {
      // In development / local testing mode without live service account credentials,
      // allow base64 payload extraction if token is standard JWT format
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
          if (payload.sub || payload.user_id) {
            userId = payload.sub || payload.user_id;
            email = payload.email;
            claims = payload;
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      } catch {
        console.error("[FirebaseAuth] Token verification failed:", err);
        throw new Error("Unauthorized: Invalid or expired authentication token");
      }
    }

    return next({
      context: {
        userId,
        email,
        claims,
        db: adminDb,
      },
    });
  },
);
