import { useEffect, useState } from "react";
import { HelpCircle, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  featureKey: string;
  title: string;
  steps: string[];
  tips?: string[];
}

const STORAGE_PREFIX = "wpa:instructions-hidden:";

export function FeatureInstructions({ featureKey, title, steps, tips }: Props) {
  const key = STORAGE_PREFIX + featureKey;
  const [hydrated, setHydrated] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [dontShow, setDontShow] = useState(false);

  useEffect(() => {
    setHydrated(true);
    try {
      if (window.localStorage.getItem(key) === "1") setHidden(true);
    } catch {
      /* noop */
    }
  }, [key]);

  const dismiss = () => {
    if (dontShow) {
      try {
        window.localStorage.setItem(key, "1");
      } catch {
        /* noop */
      }
    }
    setHidden(true);
  };

  if (!hydrated || hidden) {
    return (
      <div className="mb-4 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground"
          onClick={() => {
            try {
              window.localStorage.removeItem(key);
            } catch {
              /* noop */
            }
            setHidden(false);
            setCollapsed(false);
            setDontShow(false);
          }}
        >
          <HelpCircle className="mr-1 h-3.5 w-3.5" />
          How to use
        </Button>
      </div>
    );
  }

  return (
    <Card className="mb-6 border-primary/30 bg-primary/5 shadow-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md gradient-primary text-primary-foreground shadow-elegant">
              <HelpCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground">Quick guide to get you started</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? "Expand instructions" : "Collapse instructions"}
            >
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismiss}
              aria-label="Dismiss instructions"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!collapsed && (
          <div className="mt-3 space-y-3">
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-foreground/90">
              {steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
            {tips && tips.length > 0 && (
              <div className="rounded-md border border-border/60 bg-background/40 p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tips
                </p>
                <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {tips.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={dontShow}
                  onCheckedChange={(v) => setDontShow(v === true)}
                />
                Do not show this again
              </label>
              <Button size="sm" variant="outline" onClick={dismiss}>
                Got it
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
