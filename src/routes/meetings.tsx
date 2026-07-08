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
      <MeetingsManager />
    </div>
  );
}
