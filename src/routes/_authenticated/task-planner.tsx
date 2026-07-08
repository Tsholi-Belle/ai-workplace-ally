import { createFileRoute } from "@tanstack/react-router";
import { ListChecks } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { TaskPlanner } from "@/components/task-planner/task-planner";
import { FeatureInstructions } from "@/components/feature-instructions";

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
      <FeatureInstructions
        featureKey="task-planner"
        title="How the Task Planner works"
        steps={[
          "Create a project and give it a name and optional deadline.",
          "Add members by email to invite them, or add placeholder names for people without accounts.",
          "Assign each member a colour so tasks are easy to scan at a glance.",
          "Create tasks, assign them to a member, set a due date, and move them through To do → In progress → Done.",
          "Track overall progress from the project header — overdue tasks turn red, soon-due turn amber.",
        ]}
        tips={[
          "Invited users receive an invitation they can accept from the bell icon.",
          "Only project members can see the project's tasks and details.",
        ]}
      />
      <TaskPlanner />
    </div>
  );
}
