import { useEffect, useRef, useState, useCallback } from "react";

export type NotificationPermissionState = "default" | "granted" | "denied" | "unsupported";

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermissionState>("default");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as NotificationPermissionState);
  }, []);

  const request = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported" as const;
    if (Notification.permission === "granted" || Notification.permission === "denied") {
      setPermission(Notification.permission as NotificationPermissionState);
      return Notification.permission as NotificationPermissionState;
    }
    const result = await Notification.requestPermission();
    setPermission(result as NotificationPermissionState);
    return result as NotificationPermissionState;
  }, []);

  const notify = useCallback((title: string, body?: string) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    try {
      new Notification(title, { body });
    } catch {
      // ignore
    }
  }, []);

  return { permission, request, notify };
}

export interface ReminderTarget {
  id: string;
  title: string;
  /** ISO timestamp when the meeting starts */
  startsAt: string;
}

/**
 * Schedules a browser notification N minutes before each target's startsAt.
 * Re-schedules whenever targets, offset, or enabled changes.
 */
export function useMeetingReminders(
  targets: ReminderTarget[],
  offsetMinutes: number,
  enabled: boolean,
  notify: (title: string, body?: string) => void,
) {
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const now = Date.now();

    for (const t of targets) {
      if (!t.startsAt) continue;
      const startMs = new Date(t.startsAt).getTime();
      if (Number.isNaN(startMs)) continue;
      const fireAt = startMs - offsetMinutes * 60_000;
      const key = `${t.id}@${fireAt}`;
      if (firedRef.current.has(key)) continue;
      const delay = fireAt - now;
      // Skip if fire time is more than 24h away (re-evaluated when deps change)
      // or already past the meeting start.
      if (delay < -60_000 || delay > 24 * 60 * 60 * 1000) continue;
      // If reminder window passed but meeting hasn't started yet, fire immediately.
      const ms = Math.max(0, delay);
      timers.push(
        setTimeout(() => {
          firedRef.current.add(key);
          notify(
            `Upcoming: ${t.title}`,
            offsetMinutes > 0 ? `Starts in ~${offsetMinutes} min` : "Starting now",
          );
        }, ms),
      );
    }

    return () => {
      for (const id of timers) clearTimeout(id);
    };
  }, [targets, offsetMinutes, enabled, notify]);
}
