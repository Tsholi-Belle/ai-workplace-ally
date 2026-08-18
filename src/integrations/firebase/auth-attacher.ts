import { createMiddleware } from "@tanstack/react-start";
import { auth } from "./client";

// Global client function middleware: attaches Firebase ID Token to all serverFn RPC requests
export const attachFirebaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    let token: string | undefined;
    if (typeof window !== "undefined" && auth.currentUser) {
      try {
        token = await auth.currentUser.getIdToken();
      } catch (err) {
        console.warn("[FirebaseAuth] Could not retrieve ID token:", err);
      }
    }
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
