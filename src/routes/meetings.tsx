import { createFileRoute } from "@tanstack/react-router";
import { Video } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { MeetingsManager } from "@/components/meetings-manager";
import { FeatureInstructions } from "@/components/feature-instructions";

export const Route = createFileRoute("/meetings")({
  head: () => ({
    meta: [
      { title: "Meetings — Workplace Ally" },
      {
        name: "description",
        content:
          "Join Zoom, Google Meet, and Teams meetings, take live notes with voice dictation, and get AI summaries.",
      },
    ],
  }),
  component: MeetingsPage,
});

function MeetingsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Meetings"
        description="Add or import meetings, join with one click, take notes (typed or dictated), and get an AI summary with action items."
        icon={<Video className="h-5 w-5" />}
      />
      <FeatureInstructions
        featureKey="meetings"
        title="How to run a meeting here"
        steps={[
          "Add a meeting with its title, time, and Zoom/Meet/Teams link — or import from your calendar.",
          "When it's time, click Join to open the call in a new tab.",
          "Take live notes in the notes panel — type or tap the mic to dictate.",
          "After the call, generate an AI summary with decisions and action items.",
        ]}
        tips={[
          "Attach files or links to a meeting to keep everything in one place.",
          "Export the summary to share with people who missed it.",
        ]}
      />
      <MeetingsManager />
    </div>
  );
}
