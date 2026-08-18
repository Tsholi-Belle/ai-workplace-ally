import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useServerFn } from "@tanstack/react-start";
import { updatePrivacyConsent } from "@/lib/user.functions";
import { useAuth } from "@/hooks/use-auth";

export function PopiaConsentBanner() {
  const { user } = useAuth();
  const [consented, setConsented] = useLocalStorage<boolean | null>("wpa:popia:consented", null);
  const [visible, setVisible] = useState(false);
  const updateConsentFn = useServerFn(updatePrivacyConsent);

  useEffect(() => {
    // Only show if not previously consented in local storage
    if (consented === null) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, [consented]);

  const handleAccept = async () => {
    setConsented(true);
    setVisible(false);
    if (user) {
      try {
        await updateConsentFn({
          data: {
            consented: true,
            aiConsent: true,
            marketingConsent: false,
          },
        });
      } catch {
        // Silently catch in background if user is guest/offline
      }
    }
  };

  if (!visible || consented === true) return null;

  return (
    <aside
      aria-label="POPIA & Data Privacy Notice"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-2xl animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="rounded-xl border border-primary/40 bg-card/95 p-4 shadow-2xl backdrop-blur-md dark:bg-card/90">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1">
            <h2 className="text-sm font-semibold text-foreground">POPIA & Data Privacy Notice</h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              We process personal information in compliance with South Africa's{" "}
              <strong>Protection of Personal Information Act (POPIA)</strong> to deliver your
              workplace task planner, meetings, and AI features. We never sell your data or train
              foundation models on your content.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button size="sm" onClick={handleAccept} className="h-8 text-xs font-medium">
                Accept & Continue
              </Button>
              <Button asChild size="sm" variant="outline" className="h-8 text-xs font-medium">
                <Link to="/settings" onClick={() => setVisible(false)}>
                  <Settings className="mr-1 h-3.5 w-3.5" />
                  Preferences
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-muted-foreground"
              >
                <Link to="/privacy" onClick={() => setVisible(false)}>
                  Read POPIA Policy
                </Link>
              </Button>
            </div>
          </div>
          <button
            onClick={() => setVisible(false)}
            aria-label="Dismiss banner"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
