import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const GATEWAY = "https://connector-gateway.lovable.dev";

function requireKey(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not configured. Connect the integration first.`);
  return v;
}

// ---------- Google Calendar ----------
export const fetchCalendarEvents = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      daysAhead: z.number().int().min(1).max(60).default(14),
    }),
  )
  .handler(async ({ data }) => {
    const lovableKey = requireKey("LOVABLE_API_KEY");
    const connKey = requireKey("GOOGLE_CALENDAR_API_KEY");

    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + data.daysAhead * 86400000).toISOString();

    const url = new URL(
      `${GATEWAY}/google_calendar/calendar/v3/calendars/primary/events`,
    );
    url.searchParams.set("timeMin", timeMin);
    url.searchParams.set("timeMax", timeMax);
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("maxResults", "50");

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connKey,
      },
    });
    if (!res.ok) {
      throw new Error(`Google Calendar error: ${res.status} ${await res.text().catch(() => "")}`);
    }
    const json = (await res.json()) as {
      items?: Array<{
        id: string;
        summary?: string;
        description?: string;
        location?: string;
        hangoutLink?: string;
        htmlLink?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
        attendees?: Array<{ email?: string; displayName?: string }>;
        conferenceData?: {
          entryPoints?: Array<{ entryPointType?: string; uri?: string; label?: string }>;
        };
      }>;
    };

    const items = (json.items ?? []).map((ev) => {
      const start = ev.start?.dateTime ?? ev.start?.date ?? "";
      const end = ev.end?.dateTime ?? ev.end?.date ?? "";
      // Try to find a meeting URL
      let joinUrl =
        ev.hangoutLink ??
        ev.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ??
        "";
      if (!joinUrl) {
        const text = `${ev.description ?? ""} ${ev.location ?? ""}`;
        const match = text.match(
          /https?:\/\/[^\s)<>"']+(zoom\.us|meet\.google\.com|teams\.microsoft\.com|teams\.live\.com|webex\.com|gotomeet\.me|whereby\.com)[^\s)<>"']*/i,
        );
        if (match) joinUrl = match[0];
      }
      return {
        id: ev.id,
        title: ev.summary ?? "(Untitled)",
        description: ev.description ?? "",
        start,
        end,
        joinUrl,
        location: ev.location ?? "",
        attendees: (ev.attendees ?? []).map((a) => a.displayName || a.email || "").filter(Boolean),
      };
    });

    return { events: items };
  });

// ---------- Fireflies ----------
export const fetchFirefliesTranscripts = createServerFn({ method: "POST" })
  .inputValidator(z.object({ limit: z.number().int().min(1).max(50).default(20) }))
  .handler(async ({ data }) => {
    const lovableKey = requireKey("LOVABLE_API_KEY");
    const connKey = requireKey("FIREFLIES_API_KEY");

    const query = `query Transcripts($limit: Int) {
      transcripts(limit: $limit) {
        id
        title
        date
        duration
        transcript_url
        participants
      }
    }`;

    const res = await fetch(`${GATEWAY}/fireflies/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connKey,
      },
      body: JSON.stringify({ query, variables: { limit: data.limit } }),
    });
    if (!res.ok) throw new Error(`Fireflies error: ${res.status} ${await res.text().catch(() => "")}`);
    const json = (await res.json()) as {
      data?: { transcripts?: Array<{
        id: string; title?: string; date?: number; duration?: number;
        transcript_url?: string; participants?: string[];
      }> };
      errors?: Array<{ message: string }>;
    };
    if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
    return { transcripts: json.data?.transcripts ?? [] };
  });

export const fetchFirefliesTranscript = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const lovableKey = requireKey("LOVABLE_API_KEY");
    const connKey = requireKey("FIREFLIES_API_KEY");

    const query = `query Transcript($id: String!) {
      transcript(id: $id) {
        id
        title
        date
        duration
        participants
        summary { overview action_items keywords short_summary }
        sentences { speaker_name text }
      }
    }`;

    const res = await fetch(`${GATEWAY}/fireflies/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connKey,
      },
      body: JSON.stringify({ query, variables: { id: data.id } }),
    });
    if (!res.ok) throw new Error(`Fireflies error: ${res.status} ${await res.text().catch(() => "")}`);
    const json = (await res.json()) as {
      data?: { transcript?: {
        id: string; title?: string; date?: number; duration?: number;
        participants?: string[];
        summary?: { overview?: string; action_items?: string; keywords?: string[]; short_summary?: string };
        sentences?: Array<{ speaker_name?: string; text?: string }>;
      } };
      errors?: Array<{ message: string }>;
    };
    if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
    const t = json.data?.transcript;
    if (!t) throw new Error("Transcript not found");
    const transcriptText = (t.sentences ?? [])
      .map((s) => `${s.speaker_name ?? "Speaker"}: ${s.text ?? ""}`)
      .join("\n");
    return {
      id: t.id,
      title: t.title ?? "",
      participants: t.participants ?? [],
      summary: t.summary ?? null,
      transcript: transcriptText,
    };
  });

// ---------- AI Summarize ----------
export const summarizeMeetingNotes = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      title: z.string().max(200).optional(),
      notes: z.string().min(1).max(40000),
    }),
  )
  .handler(async ({ data }) => {
    const key = requireKey("LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);
    const system = `You are a meticulous meeting notes summariser.
Given raw meeting notes or a transcript, produce a clean Markdown summary with:
## Summary — 2-3 sentence overview
## Key Decisions — bullet list
## Action Items — checklist as "- [ ] Owner — Task — Due"
## Open Questions — bullet list
## Follow-ups — bullet list
Be faithful to the source. Do not invent attendees or commitments.`;
    const prompt = data.title ? `Meeting: ${data.title}\n\n${data.notes}` : data.notes;
    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system,
      prompt,
    });
    return { summary: text };
  });
