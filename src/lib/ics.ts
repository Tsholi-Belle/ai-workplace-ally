// Minimal ICS (RFC 5545) parser & writer.
// - Parses VEVENT blocks, unfolds long lines, decodes common escapes.
// - Supports DATE / DATE-TIME (TZID treated as local; UTC marked with Z).
// - Expands RRULE recurrences (FREQ DAILY/WEEKLY/MONTHLY/YEARLY,
//   INTERVAL, BYDAY, UNTIL, COUNT) into the next N days of instances.

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
  /** Set when this event is one expanded instance of a recurring series. */
  recurrence?: {
    seriesUid: string;
    /** ISO occurrence date for this instance. */
    occurrence: string;
    rule: string;
  };
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

function escapeText(v: string): string {
  return v
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function parseIcsDate(value: string): string {
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

// ---------- RRULE expansion ----------

type RRule = {
  freq?: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval: number;
  count?: number;
  until?: Date;
  byday?: string[]; // MO TU WE TH FR SA SU
};

function parseRRule(raw: string): RRule {
  const out: RRule = { interval: 1 };
  for (const seg of raw.split(";")) {
    const [k, v] = seg.split("=");
    if (!k || !v) continue;
    switch (k.toUpperCase()) {
      case "FREQ":
        if (["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(v))
          out.freq = v as RRule["freq"];
        break;
      case "INTERVAL":
        out.interval = Math.max(1, parseInt(v, 10) || 1);
        break;
      case "COUNT":
        out.count = parseInt(v, 10) || undefined;
        break;
      case "UNTIL": {
        const iso = parseIcsDate(v);
        if (iso) out.until = new Date(iso);
        break;
      }
      case "BYDAY":
        out.byday = v.split(",").map((d) => d.slice(-2).toUpperCase());
        break;
    }
  }
  return out;
}

const DAY_MAP: Record<string, number> = {
  SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
};

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}
function addYears(d: Date, n: number): Date {
  const r = new Date(d);
  r.setFullYear(r.getFullYear() + n);
  return r;
}

const MAX_INSTANCES = 200;

function expandRRule(start: Date, rule: RRule, horizon: Date): Date[] {
  if (!rule.freq) return [start];
  const out: Date[] = [];
  const ceiling = rule.until && rule.until < horizon ? rule.until : horizon;
  const interval = rule.interval;
  let yielded = 0;

  const push = (d: Date) => {
    if (d > ceiling) return false;
    if (rule.count && yielded >= rule.count) return false;
    out.push(d);
    yielded++;
    return out.length < MAX_INSTANCES;
  };

  if (rule.freq === "DAILY") {
    let cur = new Date(start);
    while (cur <= ceiling) {
      if (!push(cur)) break;
      cur = addDays(cur, interval);
    }
  } else if (rule.freq === "WEEKLY") {
    const days = rule.byday?.length
      ? rule.byday.map((d) => DAY_MAP[d]).filter((n) => n !== undefined)
      : [start.getDay()];
    // Anchor at the start of the week containing `start` (using Sunday=0).
    let weekStart = addDays(start, -start.getDay());
    while (weekStart <= ceiling) {
      for (const dow of days.sort((a, b) => a - b)) {
        const occ = new Date(weekStart);
        occ.setDate(weekStart.getDate() + dow);
        occ.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), 0);
        if (occ < start) continue;
        if (!push(occ)) return out;
      }
      weekStart = addDays(weekStart, 7 * interval);
    }
  } else if (rule.freq === "MONTHLY") {
    let cur = new Date(start);
    while (cur <= ceiling) {
      if (!push(cur)) break;
      cur = addMonths(cur, interval);
    }
  } else if (rule.freq === "YEARLY") {
    let cur = new Date(start);
    while (cur <= ceiling) {
      if (!push(cur)) break;
      cur = addYears(cur, interval);
    }
  }
  return out;
}

// ---------- Parser ----------

export interface ParseIcsOptions {
  /** Expand recurring rules up to this many days ahead (default 90). */
  recurrenceHorizonDays?: number;
}

export function parseIcs(input: string, opts: ParseIcsOptions = {}): IcsEvent[] {
  const horizonDays = opts.recurrenceHorizonDays ?? 90;
  const horizon = addDays(new Date(), horizonDays);
  const lines = unfold(input);
  const events: IcsEvent[] = [];
  let cur: (IcsEvent & { _rrule?: string }) | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      cur = { attendees: [] };
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur) {
        if (cur._rrule && cur.start) {
          const startDate = new Date(cur.start);
          const rule = parseRRule(cur._rrule);
          const occurrences = expandRRule(startDate, rule, horizon);
          const seriesUid = cur.uid ?? crypto.randomUUID();
          for (const occ of occurrences) {
            const offsetMs = occ.getTime() - startDate.getTime();
            const endIso = cur.end
              ? new Date(new Date(cur.end).getTime() + offsetMs).toISOString()
              : undefined;
            events.push({
              ...cur,
              uid: `${seriesUid}#${occ.toISOString()}`,
              start: occ.toISOString(),
              end: endIso,
              recurrence: {
                seriesUid,
                occurrence: occ.toISOString(),
                rule: cur._rrule,
              },
            });
          }
        } else {
          const { _rrule: _, ...rest } = cur;
          events.push(rest);
        }
      }
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
      case "RRULE":
        cur._rrule = value;
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

// ---------- Writer: "Add to my calendar" ----------

export interface IcsMeetingInput {
  uid: string;
  title: string;
  startsAt: string; // ISO
  durationMinutes?: number;
  joinUrl?: string;
  location?: string;
  description?: string;
  attendees?: string[];
  organizer?: string;
}

function toIcsDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
  );
}

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let i = 0;
  while (i < line.length) {
    chunks.push((i === 0 ? "" : " ") + line.slice(i, i + 73));
    i += 73;
  }
  return chunks.join("\r\n");
}

export function buildIcsForMeeting(m: IcsMeetingInput): string {
  const start = toIcsDate(m.startsAt);
  if (!start) throw new Error("Meeting has no valid start time.");
  const end = toIcsDate(
    new Date(
      new Date(m.startsAt).getTime() + (m.durationMinutes ?? 30) * 60_000,
    ).toISOString(),
  );
  const now = toIcsDate(new Date().toISOString());

  const descParts: string[] = [];
  if (m.description) descParts.push(m.description);
  if (m.joinUrl) descParts.push(`Join: ${m.joinUrl}`);
  const description = descParts.join("\n\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Workplace Ally//Meetings//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${m.uid}@workplace-ally`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeText(m.title || "Meeting")}`,
    description ? `DESCRIPTION:${escapeText(description)}` : "",
    m.location ? `LOCATION:${escapeText(m.location)}` : "",
    m.joinUrl ? `URL:${m.joinUrl}` : "",
    m.organizer ? `ORGANIZER;CN=${escapeText(m.organizer)}:mailto:${m.organizer}` : "",
    ...(m.attendees ?? []).map(
      (a) => `ATTENDEE;CN=${escapeText(a)};RSVP=TRUE:mailto:${a}`,
    ),
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean) as string[];

  return lines.map(foldLine).join("\r\n") + "\r\n";
}
