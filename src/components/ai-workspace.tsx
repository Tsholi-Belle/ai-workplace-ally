import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, Copy, RotateCcw, Pencil, Eye } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AiDisclaimer } from "@/components/ai-disclaimer";
import { MicButton } from "@/components/mic-button";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { runAiTask } from "@/lib/ai.functions";

type Kind = "meeting-notes" | "task-planner" | "research";

interface Props {
  kind: Kind;
  inputLabel: string;
  inputPlaceholder: string;
  examples?: { label: string; value: string }[];
  ctaLabel: string;
}

export function AiWorkspace({ kind, inputLabel, inputPlaceholder, examples, ctaLabel }: Props) {
  const [input, setInput] = useLocalStorage<string>(`wpa:${kind}:input`, "");
  const [output, setOutput] = useLocalStorage<string>(`wpa:${kind}:output`, "");
  const [editing, setEditing] = useState(false);

  const runTask = useServerFn(runAiTask);
  const mutation = useMutation({
    mutationFn: async (text: string) => runTask({ data: { kind, input: text } }),
    onSuccess: (res) => {
      setOutput(res.text);
      setEditing(false);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    },
  });

  const handleRun = () => {
    const trimmed = input.trim();
    if (!trimmed) {
      toast.error("Please enter some input first.");
      return;
    }
    mutation.mutate(trimmed);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{inputLabel}</CardTitle>
          <MicButton onAppend={(chunk) => setInput((prev) => (prev ? prev + " " : "") + chunk)} />
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={inputPlaceholder}
            className="min-h-[280px] resize-y font-sans text-sm leading-relaxed"
          />


          {examples && examples.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground self-center">Try:</span>
              {examples.map((ex) => (
                <Button
                  key={ex.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setInput(ex.value)}
                >
                  {ex.label}
                </Button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setInput("");
                setOutput("");
              }}
              disabled={mutation.isPending}
            >
              Clear
            </Button>
            <Button onClick={handleRun} disabled={mutation.isPending} className="gradient-primary text-primary-foreground hover:opacity-90 shadow-elegant">
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {ctaLabel}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">AI Output</CardTitle>
          {output && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => setEditing((v) => !v)}>
                {editing ? <Eye className="mr-1 h-4 w-4" /> : <Pencil className="mr-1 h-4 w-4" />}
                {editing ? "Preview" : "Edit"}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                <Copy className="mr-1 h-4 w-4" />
                Copy
              </Button>
              <Button variant="ghost" size="sm" onClick={handleRun} disabled={mutation.isPending}>
                <RotateCcw className="mr-1 h-4 w-4" />
                Regenerate
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {!output && !mutation.isPending && (
            <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground">
              Output will appear here.
            </div>
          )}
          {mutation.isPending && (
            <div className="flex h-[280px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary-glow" />
              <span>AI is thinking…</span>
            </div>
          )}
          {output && !mutation.isPending && (
            <>
              {editing ? (
                <Textarea
                  value={output}
                  onChange={(e) => setOutput(e.target.value)}
                  className="min-h-[280px] resize-y font-mono text-xs leading-relaxed"
                />
              ) : (
                <article className="prose prose-sm prose-invert max-w-none rounded-lg border border-border/60 bg-muted/30 p-4 prose-headings:font-display prose-headings:tracking-tight prose-h2:mt-4 prose-h2:text-base prose-h3:text-sm prose-p:text-sm prose-li:text-sm prose-strong:text-foreground">
                  <ReactMarkdown>{output}</ReactMarkdown>
                </article>
              )}
              <AiDisclaimer />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
