import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { AiWorkspace } from "@/components/ai-workspace";
import { FeatureInstructions } from "@/components/feature-instructions";

export const Route = createFileRoute("/meeting-notes")({
  head: () => ({
    meta: [
      { title: "Meeting Notes Summariser — Workplace Ally" },
      { name: "description", content: "Turn raw meeting notes into clean summaries with action items." },
    ],
  }),
  component: MeetingNotesPage,
});

function MeetingNotesPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Meeting Notes Summariser"
        description="Paste raw meeting notes or a transcript. AI returns a clean summary with decisions, action items, and follow-ups."
        icon={<FileText className="h-5 w-5" />}
      />
      <FeatureInstructions
        featureKey="meeting-notes"
        title="How to summarise meeting notes"
        steps={[
          "Paste your raw notes or transcript into the left panel — the messier the better, AI will clean it up.",
          "Click Summarise. The AI returns a structured summary with decisions, action items, and follow-ups.",
          "Use Edit to tweak the output, Copy to grab it, or Regenerate for a fresh take.",
        ]}
        tips={[
          "Use the microphone button to dictate notes instead of typing.",
          "Try the sample standup to see the expected input shape.",
        ]}
      />
      <AiWorkspace
        kind="meeting-notes"
        inputLabel="Raw notes or transcript"
        inputPlaceholder="Paste your meeting notes or transcript here…"
        ctaLabel="Summarise"
        examples={[
          {
            label: "Sample standup",
            value: `Standup — Tuesday\nAlice: shipped login fix, working on profile page next.\nBob: blocked on API spec, needs Carol's review by Thursday.\nCarol: will review API spec Wed AM. Concerned about Q3 roadmap deadline.\nDecided: push the launch from Sept 15 to Sept 22.\nFollow up: Bob to send updated estimate, Alice to demo profile page Friday.`,
          },
        ]}
      />
    </div>
  );
}
