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
      formatting: z
        .enum(["preserve", "plain", "polish"])
        .default("preserve"),
      glossary: z.string().max(2000).optional(),
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

    const formattingLine =
      data.formatting === "plain"
        ? "Return plain text only. Strip Markdown, HTML, and code fences; keep paragraph breaks."
        : data.formatting === "polish"
          ? "Preserve structure (Markdown, lists, code blocks, URLs). You may lightly polish phrasing for clarity, but never add or omit information."
          : "Preserve Markdown, lists, code blocks, URLs, line breaks, and whitespace exactly as in the source.";

    const glossaryLine = data.glossary?.trim()
      ? `\nGlossary (use these translations exactly):\n${data.glossary.trim()}`
      : "";

    const SA_LANGUAGES = new Set([
      "Afrikaans",
      "Zulu (isiZulu)",
      "Xhosa (isiXhosa)",
      "Southern Sotho (Sesotho)",
      "Northern Sotho (Sepedi)",
      "Tswana (Setswana)",
      "Swati (siSwati)",
      "Venda (Tshivenda)",
      "Tsonga (Xitsonga)",
      "Ndebele (isiNdebele)",
      "South African English",
    ]);

    const saGuidance = SA_LANGUAGES.has(data.targetLanguage)
      ? `\nThis is a South African official language. Follow the conventions used by Google Translate and the PanSALB-endorsed standard orthography:
- Use the modern standard spelling and diacritics (e.g. Sesotho "ê", "ô"; Tshivenda "ṱ", "ḓ", "ṅ"; Xitsonga "x", "hl"; isiZulu/isiXhosa click letters c/q/x).
- Respect noun-class concord agreements and subject/object concords rather than translating word-for-word from English.
- Use conjunctive writing for the Nguni languages (isiZulu, isiXhosa, siSwati, isiNdebele) and disjunctive writing for the Sotho-Tswana languages (Sesotho, Sepedi, Setswana).
- Prefer widely-understood standard vocabulary over regional dialect; keep loanwords only where they are the established term.
- For "South African English", use SA English spelling and idiom (e.g. "colour", "organise", "robot" for traffic light, "petrol" not "gas").
Match Google Translate's phrasing where it is idiomatic and natural; do not invent words.`
      : "";


    const system = `You are a professional translator.
Translate the user's text into ${data.targetLanguage}.
${toneLine}
${formattingLine}
Preserve meaning, names, and numbers.
Do NOT add commentary, transliteration, or explanations.
If the source is already in ${data.targetLanguage}, return it unchanged.
Return ONLY the translated text.${saGuidance}${glossaryLine}`;

    const gateway = createLovableAiGatewayProvider(key);
    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system,
      prompt: data.input,
    });

    return { text };
  });
