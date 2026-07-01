// Local invite analytics — recorded on whichever browser opens/accepts a
// self-contained invite link. Owner and recipient both write to the same
// localStorage key on their device, so an owner previewing their own invite
// link will see their opens/accepts reflected in the meeting header.
//
// This is intentionally client-only: the invite payload never touches a
// server, so there's no cross-browser aggregation to do.

export type InviteEventKind = "open" | "accept";

export interface InviteEvent {
  kind: InviteEventKind;
  ts: number;
}

export interface InviteStats {
  opens: number;
  accepts: number;
  lastOpenAt?: number;
  lastAcceptAt?: number;
}

const KEY = "wpa:invites:events"; // Record<meetingId, InviteEvent[]>

type Store = Record<string, InviteEvent[]>;

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function write(next: Store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore quota errors
  }
}

export function recordInviteEvent(meetingId: string, kind: InviteEventKind) {
  if (!meetingId) return;
  const store = read();
  const list = store[meetingId] ?? [];
  // De-dupe rapid duplicates from React strict-mode double effects (<2s apart).
  const last = list[list.length - 1];
  if (last && last.kind === kind && Date.now() - last.ts < 2000) return;
  list.push({ kind, ts: Date.now() });
  store[meetingId] = list.slice(-100);
  write(store);
}

export function getInviteStats(meetingId: string): InviteStats {
  const list = read()[meetingId] ?? [];
  const stats: InviteStats = { opens: 0, accepts: 0 };
  for (const ev of list) {
    if (ev.kind === "open") {
      stats.opens += 1;
      stats.lastOpenAt = ev.ts;
    } else if (ev.kind === "accept") {
      stats.accepts += 1;
      stats.lastAcceptAt = ev.ts;
    }
  }
  return stats;
}

// Small pub/sub so components can react to stat changes in the same tab.
// (Storage events don't fire in the tab that wrote them.)
const listeners = new Set<() => void>();

export function subscribeInviteStats(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

function notifyLocal() {
  for (const cb of listeners) cb();
}

// Wrap writers to fan out to local subscribers.
const _origRecord = recordInviteEvent;
export function recordInviteEventNotify(meetingId: string, kind: InviteEventKind) {
  _origRecord(meetingId, kind);
  notifyLocal();
}
