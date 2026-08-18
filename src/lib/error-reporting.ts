/**
 * Standard application error logger.
 * Safely logs client-side runtime errors.
 */
export function reportAppError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") {
    console.error("[SSR Error]", error, context);
    return;
  }
  console.error("[Client Error]", error, {
    route: window.location.pathname,
    timestamp: new Date().toISOString(),
    ...context,
  });
}
