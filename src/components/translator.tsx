import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRightLeft, Copy, Languages, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AiDisclaimer } from "@/components/ai-disclaimer";
import { MicButton } from "@/components/mic-button";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { translateText } from "@/lib/ai.functions";

const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Dutch",
  "Polish",
  "Swedish",
  "Turkish",
  "Arabic",
  "Hindi",
  "Bengali",
  "Chinese (Simplified)",
  "Chinese (Traditional)",
  "Japanese",
  "Korean",
  "Vietnamese",
  "Thai",
  "Indonesian",
  "Russian",
  "Ukrainian",
];

type Tone = "faithful" | "formal" | "casual";

export function Translator() {
  const [input, setInput] = useLocalStorage<string>("wpa:translate:input", "");
  const [output, setOutput] = useLocalStorage<string>("wpa:translate:output", "");
  const [target, setTarget] = useLocalStorage<string>(
    "wpa:translate:target",
    "Spanish",
  );
  const [tone, setTone] = useLocalStorage<Tone>("wpa:translate:tone", "faithful");

  const run = useServerFn(translateText);
  const mutation = useMutation({
    mutationFn: async () =>
      run({ data: { input: input.trim(), targetLanguage: target, tone } }),
    onSuccess: (res) => setOutput(res.text),
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Translation failed";
      toast.error(msg);
    },
  });

  const handleRun = () => {
    if (!input.trim()) {
      toast.error("Enter some text to translate first.");
      return;
    }
    mutation.mutate();
  };

  const handleSwap = () => {
    if (!output) return;
    setInput(output);
    setOutput("");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    toast.success("Translation copied");
  };

  const charCount = input.length;

  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-primary-glow" />
            <CardTitle className="text-base">Translate to</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger className="h-9 w-[200px]">
                <SelectValue placeholder="Target language" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {LANGUAGES.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="Tone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="faithful">Faithful</SelectItem>
                <SelectItem value="formal">Formal</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Source text</CardTitle>
            <MicButton
              onAppend={(chunk) => setInput((p) => (p ? p + " " : "") + chunk)}
            />
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type, paste, or dictate text to translate…"
              className="min-h-[260px] resize-y text-sm leading-relaxed"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {charCount.toLocaleString()} / 20,000
              </span>
              <div className="flex items-center gap-2">
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
                <Button
                  onClick={handleRun}
                  disabled={mutation.isPending}
                  className="gradient-primary text-primary-foreground hover:opacity-90 shadow-elegant"
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Translating…
                    </>
                  ) : (
                    <>
                      <Languages className="mr-2 h-4 w-4" />
                      Translate
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{target}</CardTitle>
            {output && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={handleSwap}>
                  <ArrowRightLeft className="mr-1 h-4 w-4" />
                  Use as source
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  <Copy className="mr-1 h-4 w-4" />
                  Copy
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {!output && !mutation.isPending && (
              <div className="flex h-[260px] items-center justify-center rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground">
                Translation will appear here.
              </div>
            )}
            {mutation.isPending && (
              <div className="flex h-[260px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary-glow" />
                <span>Translating…</span>
              </div>
            )}
            {output && !mutation.isPending && (
              <Textarea
                value={output}
                onChange={(e) => setOutput(e.target.value)}
                className="min-h-[260px] resize-y text-sm leading-relaxed"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <AiDisclaimer />
    </div>
  );
}
