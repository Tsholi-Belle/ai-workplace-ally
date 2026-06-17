import { createFileRoute } from "@tanstack/react-router";
import { Languages } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Translator } from "@/components/translator";

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
      <Translator />
    </div>
  );
}
