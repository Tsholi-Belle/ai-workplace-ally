// Shared helpers for pending meeting invites surfaced in the notifications
// bell. Kept framework-free so both the sidebar bell and the meetings
// workspace can read/write the same localStorage keys.

export const NOTIF_KEY = "wpa:meetings:notifications";
export const MEETINGS_KEY = "wpa:meetings:list";
export const ACTIVE_KEY = "wpa:meetings:active";
export const DECLINED_KEY = "wpa:invites:declined";

export interface StoredNotification {
  id: string;
  meetingId?: string;
  title: string;
  body: string;
  ts: number;
  read: boolean;
  kind: "reminder" | "follow-up" | "info" | "invite";
  invitePending?: boolean;
}

const CHANGE_EVENT = "wpa:invites:changed";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    // ignore
  }
}

export function readNotifications(): StoredNotification[] {
  return readJson<StoredNotification[]>(NOTIF_KEY, []);
}

export function getPendingInvites(): StoredNotification[] {
  return readNotifications().filter(
    (n) => n.kind === "invite" && n.invitePending && !!n.meetingId,
  );
}

export function getDeclinedIds(): string[] {
  return readJson<string[]>(DECLINED_KEY, []);
}

export function isDeclined(meetingId: string): boolean {
  return getDeclinedIds().includes(meetingId);
}

export function declineInvite(meetingId: string) {
  if (!meetingId) return;
  const notes = readNotifications().filter(
    (n) => !(n.meetingId === meetingId && n.kind === "invite" && n.invitePending),
  );
  writeJson(NOTIF_KEY, notes);

  const declined = getDeclinedIds();
  if (!declined.includes(meetingId)) {
    writeJson(DECLINED_KEY, [meetingId, ...declined].slice(0, 200));
  }
}

export function subscribeInviteChanges(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === NOTIF_KEY || e.key === DECLINED_KEY || e.key === MEETINGS_KEY) cb();
  };
  const onCustom = () => cb();
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onCustom);
  // Fallback poll — useLocalStorage writes don't fire 'storage' in the same tab
  // and callers may bypass writeJson.
  const interval = window.setInterval(cb, 3000);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onCustom);
    window.clearInterval(interval);
  };
}
