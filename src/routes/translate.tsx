import { createFileRoute } from "@tanstack/react-router";
import { Languages } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Translator } from "@/components/translator";
import { FeatureInstructions } from "@/components/feature-instructions";

export const Route = createFileRoute("/translate")({
  head: () => ({
    meta: [
      { title: "AI Translator — Workplace Ally" },
      {
        name: "description",
        content:
          "Translate text into 20+ languages with tone control. Preserves Markdown, code, and formatting.",
      },
    ],
  }),
  component: TranslatePage,
});

function TranslatePage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="AI Translator"
        description="Translate text into 20+ languages. Pick a tone and preserve formatting, names, and code."
        icon={<Languages className="h-5 w-5" />}
      />
      <FeatureInstructions
        featureKey="translate"
        title="How to translate text"
        steps={[
          "Paste or type the text you want to translate in the source panel.",
          "Choose a target language and a tone (formal, casual, etc.).",
          "Click Translate — Markdown, code blocks, names, and formatting are preserved.",
        ]}
        tips={[
          "Switch tones without re-typing to see how the message shifts.",
          "Copy the result straight into email, docs, or chat.",
        ]}
      />
      <Translator />
    </div>
  );
}
