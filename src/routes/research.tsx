import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { AiWorkspace } from "@/components/ai-workspace";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "AI Research Assistant — Workplace AI" },
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
