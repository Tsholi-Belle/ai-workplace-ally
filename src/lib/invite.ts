// Self-contained meeting invites — encoded entirely in the URL hash fragment.
// The hash never reaches the server, so no backend infrastructure is needed.

export interface InvitePayload {
  v: 1;
  title: string;
  joinUrl: string;
  startsAt: string;
  platform: string;
  notes?: string;
  attendees?: { name: string; role: "owner" | "editor" | "viewer" }[];
  invitedBy?: string;
  /** Stable id for de-duplication across multiple "accepts" of the same link. */
  iid: string;
}

function b64urlEncode(s: string): string {
  // Encode UTF-8 → base64 → URL-safe.
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeInvite(payload: InvitePayload): string {
  return b64urlEncode(JSON.stringify(payload));
}

export function decodeInvite(token: string): InvitePayload | null {
  try {
    const obj = JSON.parse(b64urlDecode(token)) as InvitePayload;
    if (!obj || obj.v !== 1 || !obj.title) return null;
    return obj;
  } catch {
    return null;
  }
}

export function buildInviteUrl(origin: string, payload: InvitePayload): string {
  return `${origin}/invite#${encodeInvite(payload)}`;
}
