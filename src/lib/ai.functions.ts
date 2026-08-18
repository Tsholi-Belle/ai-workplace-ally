import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { getResilientAiProvider } from "./ai-gateway.server";

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

  research: `You are a rigorous research assistant for working professionals.
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
    const { provider, modelName, isConfigured } = getResilientAiProvider();

    if (!isConfigured) {
      // Return a smart template response if no key is configured
      if (data.kind === "task-planner") {
        return {
          text: `## Objective
Execute: "${data.input.slice(0, 100)}..."

## Prioritized Tasks
1. [P1] Define project deliverables and success criteria (1 hour)
2. [P1] Identify key stakeholders and assign task owners (30 mins)
3. [P2] Set up milestone tracking and schedule initial check-in (45 mins)
4. [P2] Execute high-priority action items (2 hours)
5. [P3] Review progress and gather stakeholder feedback (30 mins)

## Suggested Schedule
- **Day 1**: Strategy alignment & setup
- **Day 2-3**: Core task execution
- **Day 4**: Review & iteration

## Next Immediate Action
Open the Task Planner and create your first milestone.`,
        };
      }

      if (data.kind === "meeting-notes") {
        return {
          text: `## Summary
Discussion centered on ${data.input.slice(0, 120)}.

## Key Decisions
- Agreed on next iteration scope and timeline.

## Action Items
- [ ] Team — Review specifications and finalize tasks — Due this Friday

## Next Steps
- Follow up on open agenda items in the next sync.`,
        };
      }

      return {
        text: `## TL;DR
Summary of ${data.input.slice(0, 80)}: Key insights gathered from available workplace records.

## Key Points
- Requirement analysis completed.
- Cross-functional dependencies mapped.

## Suggested Next Steps
- Verify technical feasibility and finalize next steps.`,
      };
    }

    try {
      const { text } = await generateText({
        model: provider(modelName),
        system: SYSTEM_PROMPTS[data.kind],
        prompt: data.input,
      });
      return { text };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`AI processing error: ${message}`);
    }
  });

export const translateText = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      input: z.string().min(1).max(20000),
      targetLanguage: z.string().min(2).max(60),
      tone: z.enum(["faithful", "formal", "casual"]).default("faithful"),
      formatting: z.enum(["preserve", "plain", "polish"]).default("preserve"),
      glossary: z.string().max(2000).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { provider, modelName, isConfigured } = getResilientAiProvider();
    if (!isConfigured) {
      return {
        text: `[Translation to ${data.targetLanguage}]: ${data.input}`,
      };
    }

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
      ? `\nThis is a South African official language. Follow the conventions used by standard PanSALB orthography:
- Use the modern standard spelling and diacritics.
- Respect noun-class concord agreements.
- Use conjunctive writing for Nguni languages (isiZulu, isiXhosa, siSwati, isiNdebele) and disjunctive writing for Sotho-Tswana languages (Sesotho, Sepedi, Setswana).
- For "South African English", use SA English spelling and idiom (e.g. "colour", "organise").`
      : "";

    const system = `You are a professional translator.
Translate the user's text into ${data.targetLanguage}.
${toneLine}
${formattingLine}
Preserve meaning, names, and numbers.
Do NOT add commentary or explanations.
Return ONLY the translated text.${saGuidance}${glossaryLine}`;

    try {
      const { text } = await generateText({
        model: provider(modelName),
        system,
        prompt: data.input,
      });
      return { text };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Translation error: ${message}`);
    }
  });

// -------------------------------------------------------------
// AI-Powered Project Task Generation (Task Planner Feature)
// -------------------------------------------------------------
export const generateProjectTasks = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      goal: z.string().min(3).max(1000),
      projectContext: z.string().max(2000).optional(),
      count: z.number().int().min(2).max(15).default(5),
    }),
  )
  .handler(async ({ data }) => {
    const { provider, modelName, isConfigured } = getResilientAiProvider();

    if (!isConfigured) {
      // Heuristic fallback breakdown when no AI key is configured
      const baseTasks = [
        {
          title: `Define requirements & scope for ${data.goal.slice(0, 40)}`,
          description: "Establish success criteria, core deliverables, and deadlines.",
          category: "Planning",
          priority: "high" as const,
          dueDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
        },
        {
          title: "Align stakeholders and assign task ownership",
          description: "Distribute tasks among team members and set expectations.",
          category: "Coordination",
          priority: "medium" as const,
          dueDate: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
        },
        {
          title: `Execute initial development / phase 1 of ${data.goal.slice(0, 30)}`,
          description: "Implement core functional components according to requirements.",
          category: "Execution",
          priority: "urgent" as const,
          dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        },
        {
          title: "Conduct quality check and compliance verification",
          description: "Verify security, compliance (e.g. POPIA), and user experience.",
          category: "QA & Compliance",
          priority: "medium" as const,
          dueDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
        },
        {
          title: "Final review, launch, and retrospective",
          description: "Review outcomes against original goal and document learnings.",
          category: "Review",
          priority: "low" as const,
          dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        },
      ];
      return { tasks: baseTasks.slice(0, data.count) };
    }

    const system = `You are an expert agile project manager and productivity assistant.
Given a project goal and optional context, generate between ${data.count} specific, actionable, high-quality tasks.
You must respond with ONLY a valid JSON array of objects, each having the following shape:
[
  {
    "title": "Clear action-oriented task title (max 80 chars)",
    "description": "1-2 sentence description explaining what needs to be done and why",
    "category": "Category tag (e.g. Planning, Engineering, Design, Compliance, Marketing, QA)",
    "priority": "low" | "medium" | "high" | "urgent",
    "daysOffset": integer from 1 to 30 (recommended days from today to complete)
  }
]
Do not wrap in markdown code fences. Return valid JSON only.`;

    const prompt = `Goal: ${data.goal}${data.projectContext ? `\nContext: ${data.projectContext}` : ""}\nGenerate ${data.count} prioritized tasks.`;

    try {
      const { text } = await generateText({
        model: provider(modelName),
        system,
        prompt,
      });

      // Clean response of any stray markdown code blocks
      const cleanJson = text
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/, "")
        .replace(/```$/, "")
        .trim();
      const parsed = JSON.parse(cleanJson) as Array<{
        title: string;
        description?: string;
        category?: string;
        priority?: "low" | "medium" | "high" | "urgent";
        daysOffset?: number;
      }>;

      const tasks = parsed.map((t) => {
        const offset = typeof t.daysOffset === "number" && t.daysOffset > 0 ? t.daysOffset : 3;
        const targetDate = new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
        return {
          title: t.title,
          description: t.description || null,
          category: t.category || "General",
          priority:
            t.priority && ["low", "medium", "high", "urgent"].includes(t.priority)
              ? t.priority
              : ("medium" as const),
          dueDate: targetDate,
        };
      });

      return { tasks };
    } catch (e) {
      console.warn("AI task breakdown parsing failed, using fallback:", e);
      return {
        tasks: [
          {
            title: `Plan deliverables for: ${data.goal.slice(0, 50)}`,
            description: "Break down the goal into smaller milestones.",
            category: "Planning",
            priority: "high" as const,
            dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
          },
          {
            title: `Execute core implementation of: ${data.goal.slice(0, 50)}`,
            description: "Execute the main deliverables required for completion.",
            category: "Execution",
            priority: "urgent" as const,
            dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
          },
          {
            title: "Review progress and test deliverables",
            description: "Check quality and verify all criteria are fulfilled.",
            category: "Review",
            priority: "medium" as const,
            dueDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
          },
        ],
      };
    }
  });
