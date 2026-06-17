import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRightLeft,
  Check,
  Copy,
  FolderOpen,
  Languages,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
type Formatting = "preserve" | "plain" | "polish";

type Project = {
  id: string;
  name: string;
  targetLanguage: string;
  tone: Tone;
  formatting: Formatting;
  glossary: string;
  input: string;
  output: string;
  updatedAt: number;
};

const DEFAULT_PROJECT: Omit<Project, "id" | "name" | "updatedAt"> = {
  targetLanguage: "Spanish",
  tone: "faithful",
  formatting: "preserve",
  glossary: "",
  input: "",
  output: "",
};

const makeProject = (name: string, base?: Partial<Project>): Project => ({
  id: crypto.randomUUID(),
  name,
  ...DEFAULT_PROJECT,
  ...base,
  updatedAt: Date.now(),
});

const FORMATTING_LABEL: Record<Formatting, string> = {
  preserve: "Preserve formatting",
  plain: "Plain text",
  polish: "Polish phrasing",
};

export function Translator() {
  const [projects, setProjects] = useLocalStorage<Project[]>(
    "wpa:translate:projects",
    [makeProject("Default")],
  );
  const [activeId, setActiveId] = useLocalStorage<string>(
    "wpa:translate:active",
    "",
  );

  // Ensure there's always at least one project + a valid active id.
  useEffect(() => {
    if (projects.length === 0) {
      const p = makeProject("Default");
      setProjects([p]);
      setActiveId(p.id);
      return;
    }
    if (!projects.some((p) => p.id === activeId)) {
      setActiveId(projects[0].id);
    }
  }, [projects, activeId, setProjects, setActiveId]);

  const active =
    projects.find((p) => p.id === activeId) ?? projects[0] ?? makeProject("Default");

  const updateActive = (patch: Partial<Project>) => {
    setProjects((list) =>
      list.map((p) =>
        p.id === active.id ? { ...p, ...patch, updatedAt: Date.now() } : p,
      ),
    );
  };

  const [newName, setNewName] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const addProject = () => {
    const name = newName.trim() || `Project ${projects.length + 1}`;
    // Carry over the current prefs so the new project starts from the same style.
    const p = makeProject(name, {
      targetLanguage: active.targetLanguage,
      tone: active.tone,
      formatting: active.formatting,
      glossary: active.glossary,
    });
    setProjects([...projects, p]);
    setActiveId(p.id);
    setNewName("");
    toast.success(`Created "${name}"`);
  };

  const renameProject = () => {
    const name = renameValue.trim();
    if (!name) return;
    updateActive({ name });
    setRenameOpen(false);
  };

  const removeProject = () => {
    if (projects.length === 1) {
      toast.error("Keep at least one project.");
      return;
    }
    const remaining = projects.filter((p) => p.id !== active.id);
    setProjects(remaining);
    setActiveId(remaining[0].id);
    toast.success(`Deleted "${active.name}"`);
  };

  const run = useServerFn(translateText);
  const mutation = useMutation({
    mutationFn: async () =>
      run({
        data: {
          input: active.input.trim(),
          targetLanguage: active.targetLanguage,
          tone: active.tone,
          formatting: active.formatting,
          glossary: active.glossary || undefined,
        },
      }),
    onSuccess: (res) => updateActive({ output: res.text }),
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Translation failed";
      toast.error(msg);
    },
  });

  const handleRun = () => {
    if (!active.input.trim()) {
      toast.error("Enter some text to translate first.");
      return;
    }
    mutation.mutate();
  };

  const handleSwap = () => {
    if (!active.output) return;
    updateActive({ input: active.output, output: "" });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(active.output);
    toast.success("Translation copied");
  };

  const charCount = active.input.length;
  const summary = useMemo(
    () =>
      `${active.targetLanguage} · ${active.tone} · ${FORMATTING_LABEL[active.formatting]}`,
    [active.targetLanguage, active.tone, active.formatting],
  );

  return (
    <div className="space-y-4">
      {/* Project bar */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div className="flex flex-wrap items-center gap-2">
            <FolderOpen className="h-4 w-4 text-primary-glow" />
            <CardTitle className="text-base">Project</CardTitle>
            <Select value={active.id} onValueChange={setActiveId}>
              <SelectTrigger className="h-9 w-[200px]">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover
              open={renameOpen}
              onOpenChange={(o) => {
                setRenameOpen(o);
                if (o) setRenameValue(active.name);
              }}
            >
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Rename project">
                  <Pencil className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">
                    Rename project
                  </label>
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && renameProject()}
                    autoFocus
                  />
                  <div className="flex justify-end">
                    <Button size="sm" onClick={renameProject}>
                      <Check className="mr-1 h-3.5 w-3.5" />
                      Save
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="icon"
              onClick={removeProject}
              aria-label="Delete project"
              disabled={projects.length === 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addProject()}
              placeholder="New project name"
              className="h-9 w-[180px]"
            />
            <Button variant="outline" size="sm" onClick={addProject}>
              <Plus className="mr-1 h-4 w-4" />
              New
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            Preferences below are saved to <span className="font-medium">{active.name}</span>.
            Current style: {summary}.
          </p>
        </CardContent>
      </Card>

      {/* Style preferences */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-primary-glow" />
            <CardTitle className="text-base">Style</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={active.targetLanguage}
              onValueChange={(v) => updateActive({ targetLanguage: v })}
            >
              <SelectTrigger className="h-9 w-[200px]" aria-label="Target language">
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
            <Select
              value={active.tone}
              onValueChange={(v) => updateActive({ tone: v as Tone })}
            >
              <SelectTrigger className="h-9 w-[140px]" aria-label="Tone">
                <SelectValue placeholder="Tone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="faithful">Faithful</SelectItem>
                <SelectItem value="formal">Formal</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={active.formatting}
              onValueChange={(v) => updateActive({ formatting: v as Formatting })}
            >
              <SelectTrigger className="h-9 w-[180px]" aria-label="Formatting">
                <SelectValue placeholder="Formatting" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="preserve">Preserve formatting</SelectItem>
                <SelectItem value="plain">Plain text</SelectItem>
                <SelectItem value="polish">Polish phrasing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <label className="text-xs text-muted-foreground">
            Glossary (optional) — locked term translations, one per line
          </label>
          <Textarea
            value={active.glossary}
            onChange={(e) => updateActive({ glossary: e.target.value })}
            placeholder={`e.g.\nWorkplace Ally = Workplace Ally\ndashboard = panel de control`}
            className="mt-1 min-h-[80px] resize-y font-mono text-xs"
          />
        </CardContent>
      </Card>

      {/* Translate panes */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Source text</CardTitle>
            <MicButton
              onAppend={(chunk) =>
                updateActive({
                  input: (active.input ? active.input + " " : "") + chunk,
                })
              }
            />
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={active.input}
              onChange={(e) => updateActive({ input: e.target.value })}
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
                  onClick={() => updateActive({ input: "", output: "" })}
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
            <CardTitle className="text-base">{active.targetLanguage}</CardTitle>
            {active.output && (
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
            {!active.output && !mutation.isPending && (
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
            {active.output && !mutation.isPending && (
              <Textarea
                value={active.output}
                onChange={(e) => updateActive({ output: e.target.value })}
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
