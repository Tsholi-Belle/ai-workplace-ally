import { ShieldAlert } from "lucide-react";

export function AiDisclaimer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-start gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground ${className}`}
    >
      <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-glow" />
      <span>
        AI-generated content may contain inaccuracies. Review carefully before sharing, especially
        for decisions, names, dates, or sensitive workplace topics.
      </span>
    </div>
  );
}
