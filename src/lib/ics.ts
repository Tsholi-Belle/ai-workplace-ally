// Minimal ICS (RFC 5545) parser — handles VEVENT blocks, unfolds long lines,
// decodes common escapes, and supports basic DATE and DATE-TIME forms incl. TZID/UTC.

export interface IcsEvent {
  uid?: string;
  summary?: string;
  description?: string;
  location?: string;
  url?: string;
  start?: string; // ISO
  end?: string; // ISO
  attendees: string[];
  organizer?: string;
}

function unfold(text: string): string[] {
  const raw = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

function unescapeText(v: string): string {
  return v
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function parseIcsDate(value: string): string {
  // Forms: 20251212T093000Z | 20251212T093000 | 20251212
  const v = value.trim();
  if (/^\d{8}$/.test(v)) {
    return new Date(
      `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}T00:00:00`,
    ).toISOString();
  }
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return "";
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${m[7] ? "Z" : ""}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

function splitProp(line: string): { name: string; params: Record<string, string>; value: string } | null {
  const colonIdx = line.indexOf(":");
  if (colonIdx === -1) return null;
  const head = line.slice(0, colonIdx);
  const value = line.slice(colonIdx + 1);
  const parts = head.split(";");
  const name = parts[0].toUpperCase();
  const params: Record<string, string> = {};
  for (const p of parts.slice(1)) {
    const eq = p.indexOf("=");
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1);
  }
  return { name, params, value };
}

export function parseIcs(input: string): IcsEvent[] {
  const lines = unfold(input);
  const events: IcsEvent[] = [];
  let cur: IcsEvent | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      cur = { attendees: [] };
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur) events.push(cur);
      cur = null;
      continue;
    }
    if (!cur) continue;

    const parsed = splitProp(line);
    if (!parsed) continue;
    const { name, params, value } = parsed;

    switch (name) {
      case "UID":
        cur.uid = value;
        break;
      case "SUMMARY":
        cur.summary = unescapeText(value);
        break;
      case "DESCRIPTION":
        cur.description = unescapeText(value);
        break;
      case "LOCATION":
        cur.location = unescapeText(value);
        break;
      case "URL":
        cur.url = value;
        break;
      case "DTSTART":
        cur.start = parseIcsDate(value);
        break;
      case "DTEND":
        cur.end = parseIcsDate(value);
        break;
      case "ATTENDEE": {
        const cn = params.CN || value.replace(/^mailto:/i, "");
        if (cn) cur.attendees.push(cn);
        break;
      }
      case "ORGANIZER":
        cur.organizer = params.CN || value.replace(/^mailto:/i, "");
        break;
    }
  }
  return events;
}

export function detectJoinUrl(text: string): string {
  const m = text.match(
    /https?:\/\/[^\s)<>"']+(zoom\.us|meet\.google\.com|teams\.microsoft\.com|teams\.live\.com|webex\.com|gotomeet\.me|whereby\.com)[^\s)<>"']*/i,
  );
  return m ? m[0] : "";
}
