import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { AiWorkspace } from "@/components/ai-workspace";
import { FeatureInstructions } from "@/components/feature-instructions";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "AI Research Assistant — Workplace Ally" },
      { name: "description", content: "Get balanced briefings on any workplace research question." },
    ],
  }),
  component: ResearchPage,
});

function ResearchPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="AI Research Assistant"
        description="Ask a question or describe a topic. AI returns a structured briefing with key points, perspectives, and open questions."
        icon={<Search className="h-5 w-5" />}
      />
      <FeatureInstructions
        featureKey="research"
        title="How the Research Assistant works"
        steps={[
          "Type a question or paste a topic in the left panel — be as specific as you can.",
          "Click Research. AI returns a briefing with key points, different perspectives, and open questions.",
          "Edit, copy, or regenerate the briefing as needed.",
        ]}
        tips={[
          "Ask comparison questions (X vs Y) to get side-by-side trade-offs.",
          "Follow up by refining the prompt and regenerating for a deeper dive.",
        ]}
      />
      <AiWorkspace
        kind="research"
        inputLabel="Research question or topic"
        inputPlaceholder="e.g. What are the trade-offs between hybrid and fully remote work for engineering teams?"
        ctaLabel="Research"
        examples={[
          {
            label: "OKRs vs KPIs",
            value: "Compare OKRs and KPIs for a 50-person SaaS company. Which is better and why?",
          },
          {
            label: "AI policy basics",
            value: "What should a mid-sized company include in its first internal AI usage policy?",
          },
        ]}
      />
    </div>
  );
}
