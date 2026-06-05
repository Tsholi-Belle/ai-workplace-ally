import { createFileRoute } from "@tanstack/react-router";
import { ListChecks } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { AiWorkspace } from "@/components/ai-workspace";

export const Route = createFileRoute("/task-planner")({
  head: () => ({
    meta: [
      { title: "AI Task Planner — Workplace Ally" },
      { name: "description", content: "Turn goals into prioritized plans with time blocks." },
    ],
  }),
  component: TaskPlannerPage,
});

function TaskPlannerPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="AI Task Planner"
        description="Describe your goal or paste a list of tasks. AI returns a prioritized action plan with a recommended schedule."
        icon={<ListChecks className="h-5 w-5" />}
      />
      <AiWorkspace
        kind="task-planner"
        inputLabel="Goal or task list"
        inputPlaceholder="e.g. Launch our Q3 marketing campaign in 3 weeks. I need to coordinate design, copy, ads, and analytics."
        ctaLabel="Generate plan"
        examples={[
          {
            label: "Launch a feature",
            value: "Launch a new dark mode feature in 2 weeks. Need design review, engineering, QA, docs, and a launch announcement.",
          },
          {
            label: "Inbox zero day",
            value: "I have 280 unread emails, 4 urgent client threads, and a quarterly report due Friday. Plan my day.",
          },
        ]}
      />
    </div>
  );
}
