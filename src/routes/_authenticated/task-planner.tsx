import { createFileRoute } from "@tanstack/react-router";
import { ListChecks } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { TaskPlanner } from "@/components/task-planner/task-planner";

export const Route = createFileRoute("/_authenticated/task-planner")({
  head: () => ({
    meta: [
      { title: "Task Planner — Workplace Ally" },
      {
        name: "description",
        content:
          "Organise work into projects with per-member colours, a status pipeline, and deadlines. All data lives on your account.",
      },
    ],
  }),
  component: TaskPlannerPage,
});

function TaskPlannerPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Task Planner"
        description="Projects, per-member colours, status tracking, and deadlines — private to your account, shareable with people you invite."
        icon={<ListChecks className="h-5 w-5" />}
      />
      <TaskPlanner />
    </div>
  );
}
