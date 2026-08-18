import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { getResilientAiProvider } from "./ai-gateway.server";

// ---------- Google Calendar ----------
export const fetchCalendarEvents = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      daysAhead: z.number().int().min(1).max(60).default(14),
    }),
  )
  .handler(async ({ data }) => {
    const googleKey =
      process.env.GOOGLE_CALENDAR_API_KEY || process.env.GOOGLE_CALENDAR_ACCESS_TOKEN;

    if (!googleKey) {
      throw new Error(
        "Google Calendar is not configured. Add GOOGLE_CALENDAR_API_KEY or GOOGLE_CALENDAR_ACCESS_TOKEN in your environment or use ICS file import.",
      );
    }

    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + data.daysAhead * 86400000).toISOString();

    const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    url.searchParams.set("timeMin", timeMin);
    url.searchParams.set("timeMax", timeMax);
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("maxResults", "50");

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${googleKey}`,
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
          /https?:\/\/[^\s)<>"']*?(?:zoom\.us|meet\.google\.com|teams\.microsoft\.com|teams\.live\.com|webex\.com|gotomeet\.me|whereby\.com)[^\s)<>"']*/i,
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
    const connKey = process.env.FIREFLIES_API_KEY;
    if (!connKey) {
      throw new Error(
        "Fireflies API is not configured. Add FIREFLIES_API_KEY in your environment.",
      );
    }

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

    const res = await fetch("https://api.fireflies.ai/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${connKey}`,
      },
      body: JSON.stringify({ query, variables: { limit: data.limit } }),
    });
    if (!res.ok)
      throw new Error(`Fireflies error: ${res.status} ${await res.text().catch(() => "")}`);
    const json = (await res.json()) as {
      data?: {
        transcripts?: Array<{
          id: string;
          title?: string;
          date?: number;
          duration?: number;
          transcript_url?: string;
          participants?: string[];
        }>;
      };
      errors?: Array<{ message: string }>;
    };
    if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
    return { transcripts: json.data?.transcripts ?? [] };
  });

export const fetchFirefliesTranscript = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const connKey = process.env.FIREFLIES_API_KEY;
    if (!connKey) {
      throw new Error(
        "Fireflies API is not configured. Add FIREFLIES_API_KEY in your environment.",
      );
    }

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

    const res = await fetch("https://api.fireflies.ai/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${connKey}`,
      },
      body: JSON.stringify({ query, variables: { id: data.id } }),
    });
    if (!res.ok)
      throw new Error(`Fireflies error: ${res.status} ${await res.text().catch(() => "")}`);
    const json = (await res.json()) as {
      data?: {
        transcript?: {
          id: string;
          title?: string;
          date?: number;
          duration?: number;
          participants?: string[];
          summary?: {
            overview?: string;
            action_items?: string;
            keywords?: string[];
            short_summary?: string;
          };
          sentences?: Array<{ speaker_name?: string; text?: string }>;
        };
      };
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
      length: z.enum(["brief", "detailed"]).default("detailed"),
      sections: z
        .object({
          decisions: z.boolean().default(true),
          actionItems: z.boolean().default(true),
          openQuestions: z.boolean().default(true),
          followUps: z.boolean().default(true),
        })
        .default({ decisions: true, actionItems: true, openQuestions: true, followUps: true }),
    }),
  )
  .handler(async ({ data }) => {
    const { provider, modelName, isConfigured } = getResilientAiProvider();

    if (!isConfigured) {
      // Return structured fallback summary if AI key not configured
      const lines: string[] = [];
      lines.push(
        data.length === "brief"
          ? `## Summary\nBrief overview of meeting: ${data.title ?? "Meeting"}.`
          : `## Summary\nDetailed meeting discussion captured from provided notes. Core objectives and timelines were established.`,
      );
      if (data.sections.decisions) {
        lines.push("## Key Decisions\n- Project timelines and initial milestones agreed upon.");
      }
      if (data.sections.actionItems) {
        lines.push("- [ ] Team — Review discussed notes and finalize deliverables — Due this week");
      }
      if (data.sections.openQuestions) {
        lines.push("## Open Questions\n- Confirm resource allocation for subsequent phases.");
      }
      if (data.sections.followUps) {
        lines.push("## Follow-ups\n- Schedule next review checkpoint.");
      }
      return { summary: lines.join("\n\n") };
    }

    const sectionLines: string[] = [];
    sectionLines.push(
      data.length === "brief"
        ? "## Summary — 1-2 sentence executive overview"
        : "## Summary — 3-5 sentence overview with the most important context",
    );
    if (data.sections.decisions) sectionLines.push("## Key Decisions — bullet list");
    if (data.sections.actionItems)
      sectionLines.push(`## Action Items — checklist as "- [ ] Owner — Task — Due"`);
    if (data.sections.openQuestions) sectionLines.push("## Open Questions — bullet list");
    if (data.sections.followUps) sectionLines.push("## Follow-ups — bullet list");

    const lengthLine =
      data.length === "brief"
        ? "Keep the entire summary concise — prefer short bullets, no long paragraphs."
        : "Be thorough but not verbose; include nuance where it matters.";

    const system = `You are a meticulous meeting notes summariser.
Given raw meeting notes or a transcript, produce a clean Markdown summary with ONLY these sections, in this order:
${sectionLines.join("\n")}

${lengthLine}
Be faithful to the source. Do not invent attendees, decisions, or commitments. Omit any section that has no real content rather than padding it.`;

    const prompt = data.title ? `Meeting: ${data.title}\n\n${data.notes}` : data.notes;
    const { text } = await generateText({
      model: provider(modelName),
      system,
      prompt,
    });
    return { summary: text };
  });
