import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Shield,
  Download,
  Trash2,
  Lock,
  User,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  Sparkles,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { signOut } from "firebase/auth";
import { auth } from "@/integrations/firebase/client";
import {
  getMyProfile,
  updateMyProfile,
  updatePrivacyConsent,
  exportMyPersonalData,
  deleteMyAccountAndData,
} from "@/lib/user.functions";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Privacy & Account Settings — Workplace Ally" },
      {
        name: "description",
        content:
          "Manage your POPIA consent, export your personal data, and control privacy preferences.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const getProfileFn = useServerFn(getMyProfile);
  const updateProfileFn = useServerFn(updateMyProfile);
  const updateConsentFn = useServerFn(updatePrivacyConsent);
  const exportDataFn = useServerFn(exportMyPersonalData);
  const deleteAccountFn = useServerFn(deleteMyAccountAndData);

  const profileQ = useQuery({
    queryKey: ["user-profile"],
    queryFn: () => getProfileFn(),
    enabled: !!user,
  });

  const profile = profileQ.data;

  // Profile Edit State
  const [displayName, setDisplayName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);

  // Consent States
  const [aiConsent, setAiConsent] = useState(true);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [retention, setRetention] = useState("standard");

  // Deletion Modal State
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Sync loaded profile into state
  const handleProfileLoaded = (prof: typeof profile) => {
    if (prof) {
      if (!isEditingName) setDisplayName(prof.display_name ?? "");
      setAiConsent(prof.ai_consent);
      setMarketingConsent(prof.marketing_consent);
      setRetention(prof.data_retention_preference || "standard");
    }
  };

  // Mutations
  const updateProfileMut = useMutation({
    mutationFn: (name: string) => updateProfileFn({ data: { displayName: name } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-profile"] });
      setIsEditingName(false);
      toast.success("Profile updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update profile"),
  });

  const updateConsentMut = useMutation({
    mutationFn: (vars: {
      aiConsent?: boolean;
      marketingConsent?: boolean;
      retention?: "standard" | "minimal" | "extended";
    }) =>
      updateConsentFn({
        data: {
          consented: true,
          aiConsent: vars.aiConsent ?? aiConsent,
          marketingConsent: vars.marketingConsent ?? marketingConsent,
          dataRetentionPreference:
            vars.retention ?? (retention as "standard" | "minimal" | "extended"),
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-profile"] });
      toast.success("Privacy preferences saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save preferences"),
  });

  const exportDataMut = useMutation({
    mutationFn: () => exportDataFn(),
    onSuccess: (data) => {
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `workplace-ally-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Data export downloaded successfully (POPIA §23)");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to generate export"),
  });

  const deleteAccountMut = useMutation({
    mutationFn: () => deleteAccountFn({ data: { confirmationText: "DELETE MY ACCOUNT AND DATA" } }),
    onSuccess: async () => {
      toast.success("Your account and all personal information have been permanently erased.");
      await signOut(auth);
      setDeleteModalOpen(false);
      navigate({ to: "/auth" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Deletion failed"),
  });

  if (authLoading || (user && profileQ.isLoading)) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 py-6">
        <PageHeader
          title="Privacy & Account Settings"
          description="Manage your data protection preferences, POPIA consent, and data portability."
          icon={<Shield className="h-5 w-5" />}
        />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your settings…
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 py-6">
        <PageHeader
          title="Privacy & Account Settings"
          description="Manage your data protection preferences and POPIA compliance."
          icon={<Shield className="h-5 w-5" />}
        />
        <Card className="shadow-card">
          <CardContent className="p-8 text-center space-y-4">
            <Lock className="mx-auto h-10 w-10 text-muted-foreground opacity-60" />
            <h3 className="text-lg font-semibold">Sign in to manage your privacy settings</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Please sign in to view your profile, manage POPIA consent records, export personal
              data, or delete your account.
            </p>
            <Button asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-4">
      <PageHeader
        title="Privacy & Account Settings"
        description="POPIA compliance controls, data subject rights, consent management, and data export."
        icon={<Shield className="h-5 w-5" />}
      />

      {/* 1. Account Profile */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Profile & Account Identifiers
          </CardTitle>
          <CardDescription>
            Your basic personal information stored in accordance with POPIA Section 16 (Information
            Quality).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Email Address</Label>
              <Input value={user.email ?? ""} disabled className="bg-muted/40" />
              <p className="text-[11px] text-muted-foreground">
                Managed by your authentication provider.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Display Name</Label>
              <div className="flex gap-2">
                <Input
                  value={isEditingName ? displayName : (profile?.display_name ?? user.email ?? "")}
                  onChange={(e) => {
                    setIsEditingName(true);
                    setDisplayName(e.target.value);
                  }}
                  placeholder="Your display name"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updateProfileMut.isPending || !displayName.trim()}
                  onClick={() => updateProfileMut.mutate(displayName.trim())}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. POPIA Consent & Privacy Management */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> POPIA Consent & Processing Preferences
              </CardTitle>
              <CardDescription>
                Configure how Workplace Ally processes your personal data under the Protection of
                Personal Information Act.
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle2 className="mr-1 h-3 w-3" /> POPIA Compliant
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/80 bg-background/50 p-4">
            <div className="space-y-0.5">
              <div className="text-sm font-medium flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" /> AI Assistant Processing Consent
              </div>
              <p className="text-xs text-muted-foreground max-w-xl">
                Allow AI model inference to summarize meeting notes, translate text into South
                African official languages, and generate task plans. Data is processed ephemerally
                and never used for model training.
              </p>
            </div>
            <Switch
              checked={profile?.ai_consent ?? aiConsent}
              onCheckedChange={(val) => {
                setAiConsent(val);
                updateConsentMut.mutate({ aiConsent: val });
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/80 bg-background/50 p-4">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Data Retention Preference (POPIA §14)</div>
              <p className="text-xs text-muted-foreground max-w-xl">
                Choose how long your inactive workplace meeting history and completed tasks are
                retained.
              </p>
            </div>
            <Select
              value={profile?.data_retention_preference ?? retention}
              onValueChange={(val: "standard" | "minimal" | "extended") => {
                setRetention(val);
                updateConsentMut.mutate({ retention: val });
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Retention" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minimal">90 Days</SelectItem>
                <SelectItem value="standard">1 Year</SelectItem>
                <SelectItem value="extended">Indefinite</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/80 bg-background/50 p-4">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Product Updates & Communications</div>
              <p className="text-xs text-muted-foreground max-w-xl">
                Receive occasional release notes and productivity tips (opt-in under POPIA Section
                69).
              </p>
            </div>
            <Switch
              checked={profile?.marketing_consent ?? marketingConsent}
              onCheckedChange={(val) => {
                setMarketingConsent(val);
                updateConsentMut.mutate({ marketingConsent: val });
              }}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            For full details on our 8 lawful processing conditions, Information Officer contact
            info, and Information Regulator disclosures, read our{" "}
            <Link to="/privacy" className="text-primary underline">
              POPIA Privacy Notice
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      {/* 3. Data Portability / DSAR Export (POPIA §23) */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileJson className="h-4 w-4 text-primary" /> Data Subject Access Request — Export All
            Data (POPIA §23)
          </CardTitle>
          <CardDescription>
            Download a machine-readable JSON file containing all personal information, projects,
            members, tasks, invites, and notifications stored under your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4 flex-wrap">
          <div className="text-xs text-muted-foreground max-w-md">
            Under Section 23 of POPIA, you have the right to request a complete record of your
            personal data at any time without charge.
          </div>
          <Button
            variant="outline"
            onClick={() => exportDataMut.mutate()}
            disabled={exportDataMut.isPending}
            className="shrink-0"
          >
            {exportDataMut.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export My Personal Data (JSON)
          </Button>
        </CardContent>
      </Card>

      {/* 4. Danger Zone — Right to Erasure / Deletion (POPIA §24) */}
      <Card className="border-destructive/40 bg-destructive/5 shadow-card">
        <CardHeader>
          <CardTitle className="text-base text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Right to Erasure & Account Destruction (POPIA §24)
          </CardTitle>
          <CardDescription>
            Permanently delete your account, projects, tasks, notes, invitations, and all associated
            personal information.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4 flex-wrap">
          <div className="text-xs text-muted-foreground max-w-md">
            This action is <strong>irreversible</strong>. In accordance with POPIA Section 24(1)(b),
            all personal records will be destroyed immediately and cannot be recovered.
          </div>

          <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-1.5 h-4 w-4" /> Delete Account & Data
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" /> Confirm Account Destruction
                </DialogTitle>
                <DialogDescription className="space-y-2 pt-2">
                  <p>
                    Are you sure you want to permanently erase your Workplace Ally account and all
                    associated data?
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This will permanently delete all projects you own, tasks, meeting notes,
                    invites, and profile data.
                  </p>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2 py-3">
                <Label className="text-xs">
                  To confirm, type{" "}
                  <span className="font-mono font-bold text-destructive">
                    DELETE MY ACCOUNT AND DATA
                  </span>{" "}
                  below:
                </Label>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE MY ACCOUNT AND DATA"
                  className="font-mono text-xs"
                />
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setDeleteModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={
                    deleteConfirmText !== "DELETE MY ACCOUNT AND DATA" || deleteAccountMut.isPending
                  }
                  onClick={() => deleteAccountMut.mutate()}
                >
                  {deleteAccountMut.isPending && (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  )}
                  Permanently Erase Everything
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
