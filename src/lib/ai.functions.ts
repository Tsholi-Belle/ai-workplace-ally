import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const TaskKind = z.enum(["meeting-notes", "task-planner", "research"]);

const SYSTEM_PROMPTS: Record<z.infer<typeof TaskKind>, string> = {
  "meeting-notes": `You are a meticulous meeting notes summariser for busy professionals.
Given raw meeting notes or a transcript, produce a clean, structured summary in Markdown with:
## Summary — 2-3 sentence executive overview
## Key Decisions — bullet list
## Action Items — checklist with owner (if mentioned) and due date (if mentioned), format: - [ ] Owner — Task — Due
## Open Questions — bullet list
## Follow-ups — bullet list
Be concise, neutral, and faithful to the source. Do not invent attendees or commitments.`,

  "task-planner": `You are an expert productivity coach and project planner.
Given a goal or list of tasks, produce a prioritized action plan in Markdown with:
## Objective — 1 sentence
## Prioritized Tasks — numbered list with priority [P1/P2/P3], estimated time, and a brief why
## Suggested Schedule — a recommended day/week structure with time blocks
## Risks & Dependencies — bullet list
## Next Immediate Action — 1 specific next step the user can take in 5 minutes
Be realistic, specific, and biased toward action.`,

  "research": `You are a rigorous research assistant for working professionals.
Given a research question or topic, produce a structured briefing in Markdown with:
## TL;DR — 2-3 sentence answer
## Background — short context
## Key Points — bullet list of the most important findings
## Different Perspectives — present 2-3 viewpoints where relevant
## Open Questions — what would still need verification
## Suggested Next Steps — what the reader could do or read next
Be balanced and indicate uncertainty. Do not fabricate citations; if you reference sources, mark them as "general knowledge — verify".`,
};

export const runAiTask = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      kind: TaskKind,
      input: z.string().min(1).max(20000),
    }),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const gateway = createLovableAiGatewayProvider(key);
    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: SYSTEM_PROMPTS[data.kind],
      prompt: data.input,
    });

    return { text };
  });

export const translateText = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      input: z.string().min(1).max(20000),
      targetLanguage: z.string().min(2).max(60),
      tone: z.enum(["faithful", "formal", "casual"]).default("faithful"),
    }),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const toneLine =
      data.tone === "formal"
        ? "Use a formal, professional register."
        : data.tone === "casual"
          ? "Use a friendly, conversational register."
          : "Match the tone and register of the source as closely as possible.";

    const system = `You are a professional translator.
Translate the user's text into ${data.targetLanguage}.
${toneLine}
Preserve meaning, names, numbers, code blocks, URLs, and Markdown formatting exactly.
Do NOT add commentary, transliteration, or explanations.
If the source is already in ${data.targetLanguage}, return it unchanged.
Return ONLY the translated text.`;

    const gateway = createLovableAiGatewayProvider(key);
    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system,
      prompt: data.input,
    });

    return { text };
  });
