import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe,
  Inbox,
  Link2,
  Loader2,
  LogIn,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { decodeInvite, type InvitePayload } from "@/lib/invite";
import { recordInviteEvent } from "@/lib/invite-tracking";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/invite")({
  head: () => ({
    meta: [
      { title: "Meeting invite — Workplace Ally" },
      { name: "description", content: "Preview and accept a meeting invite shared with you." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvitePage,
});

const MEETINGS_KEY = "wpa:meetings:list";
const NOTIF_KEY = "wpa:meetings:notifications";
const ACTIVE_KEY = "wpa:meetings:active";

type Status = "loading" | "ready" | "invalid" | "accepted" | "error";

interface StoredNotification {
  id: string;
  meetingId?: string;
  title: string;
  body: string;
  ts: number;
  read: boolean;
  kind: "reminder" | "follow-up" | "info" | "invite";
  invitePending?: boolean;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function fmt(iso: string) {
  if (!iso) return "No time set";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function tzInfo(iso: string): { zone: string; offset: string; relative: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "local";
  const parts = new Intl.DateTimeFormat(undefined, {
    timeZoneName: "short",
  }).formatToParts(d);
  const offset = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  const diffMs = d.getTime() - Date.now();
  const rel = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const abs = Math.abs(diffMs);
  const relative =
    abs < 60_000
      ? "just now"
      : abs < 3_600_000
        ? rel.format(Math.round(diffMs / 60_000), "minute")
        : abs < 86_400_000
          ? rel.format(Math.round(diffMs / 3_600_000), "hour")
          : rel.format(Math.round(diffMs / 86_400_000), "day");
  return { zone, offset, relative };
}

function InvitePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<Status>("loading");
  const [payload, setPayload] = useState<InvitePayload | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [accepting, setAccepting] = useState(false);

  const meetingId = useMemo(
    () => (payload ? `invite:${payload.iid}` : ""),
    [payload],
  );

  // Decode the invite hash + log an open event + queue a "pending invite"
  // entry in the recipient's bell.
  useEffect(() => {
    const hash =
      typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    if (!hash) {
      setStatus("invalid");
      return;
    }
    const decoded = decodeInvite(hash);
    if (!decoded) {
      setStatus("invalid");
      return;
    }
    setPayload(decoded);
    const mid = `invite:${decoded.iid}`;

    // Already accepted previously? Skip queueing a duplicate pending entry.
    const meetings = readJson<Array<{ id: string }>>(MEETINGS_KEY, []);
    const alreadyAccepted = meetings.some((m) => m.id === mid);

    recordInviteEvent(mid, "open");

    if (!alreadyAccepted) {
      const notes = readJson<StoredNotification[]>(NOTIF_KEY, []);
      const already = notes.some(
        (n) => n.meetingId === mid && n.kind === "invite" && n.invitePending,
      );
      if (!already) {
        const item: StoredNotification = {
          id: crypto.randomUUID(),
          meetingId: mid,
          title: `Pending invite: ${decoded.title}`,
          body: decoded.invitedBy
            ? `Shared by ${decoded.invitedBy}. Open to accept.`
            : "Open to accept and add to your meetings.",
          ts: Date.now(),
          read: false,
          kind: "invite",
          invitePending: true,
        };
        localStorage.setItem(
          NOTIF_KEY,
          JSON.stringify([item, ...notes].slice(0, 50)),
        );
      }
    }

    setStatus(alreadyAccepted ? "accepted" : "ready");
  }, []);

  const accept = () => {
    if (!payload) return;
    if (!user) {
      // Public preview is fine, but accepting requires an account so the
      // meeting can be attached to their bell + notifications.
      const back = window.location.pathname + window.location.hash;
      navigate({ to: "/auth", search: { redirect: back } as never });
      return;
    }
    setAccepting(true);
    try {
      const list = readJson<Array<{ id: string }>>(MEETINGS_KEY, []);
      if (!list.some((m) => m.id === meetingId)) {
        const m = {
          id: meetingId,
          title: payload.title,
          platform: payload.platform || "other",
          joinUrl: payload.joinUrl || "",
          startsAt: payload.startsAt || "",
          attendees: payload.attendees ?? [],
          notes: payload.notes ?? "",
          summary: "",
          source: "manual" as const,
          createdAt: Date.now(),
        };
        localStorage.setItem(MEETINGS_KEY, JSON.stringify([m, ...list]));
      }

      // Convert the pending bell entry into an accepted one and add a
      // fresh info notification with a jump target.
      const notes = readJson<StoredNotification[]>(NOTIF_KEY, []);
      const withoutPending = notes.filter(
        (n) => !(n.meetingId === meetingId && n.kind === "invite" && n.invitePending),
      );
      const accepted: StoredNotification = {
        id: crypto.randomUUID(),
        meetingId,
        title: `Invite accepted: ${payload.title}`,
        body: payload.invitedBy
          ? `Shared by ${payload.invitedBy}. Click to jump to the meeting.`
          : "Added to your meetings. Click to open.",
        ts: Date.now(),
        read: false,
        kind: "invite",
        invitePending: false,
      };
      localStorage.setItem(
        NOTIF_KEY,
        JSON.stringify([accepted, ...withoutPending].slice(0, 50)),
      );
      localStorage.setItem(ACTIVE_KEY, JSON.stringify(meetingId));
      recordInviteEvent(meetingId, "accept");
      setStatus("accepted");
      toast.success("Added to your meetings", {
        description: "Open it from the meetings workspace.",
        action: {
          label: "Open now",
          onClick: () => navigate({ to: "/meetings" }),
        },
      });
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong.");
      toast.error("Couldn't accept invite. Try again.");
    } finally {
      setAccepting(false);
    }
  };

  // ------- Render states -------

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title="Meeting invite"
          description="Decoding your invite…"
          icon={<Inbox className="h-5 w-5" />}
        />
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p>Preparing your invite preview…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "invalid" || !payload) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title="Meeting invite"
          description="Open the link you were sent to view the invite."
          icon={<Inbox className="h-5 w-5" />}
        />
        <Card className="shadow-card border-destructive/40">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-sm font-medium">This invite link is missing or invalid.</p>
            <p className="text-xs text-muted-foreground">
              Ask the sender for a fresh link — invite payloads are encoded in the URL, so a
              truncated copy/paste will break them.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tz = tzInfo(payload.startsAt);
  const isAccepted = status === "accepted";

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="You're invited"
        description={
          payload.invitedBy
            ? `${payload.invitedBy} shared a meeting with you.`
            : "Someone shared a meeting with you."
        }
        icon={<Inbox className="h-5 w-5" />}
      />
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" /> {payload.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Explicit summary block: time, timezone, join link */}
          <div className="grid gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm sm:grid-cols-2">
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" /> When
              </p>
              <p>{fmt(payload.startsAt)}</p>
              {tz && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> {tz.relative}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
                <Globe className="h-3.5 w-3.5" /> Time zone
              </p>
              <p>{tz ? `${tz.zone} (${tz.offset})` : "—"}</p>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
                <Link2 className="h-3.5 w-3.5" /> Join link
              </p>
              {payload.joinUrl ? (
                <a
                  href={payload.joinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-primary hover:underline"
                >
                  {payload.joinUrl}
                </a>
              ) : (
                <p className="text-muted-foreground">No join link on this invite.</p>
              )}
              {payload.platform && (
                <Badge variant="outline" className="mt-1 text-[10px]">
                  {payload.platform}
                </Badge>
              )}
            </div>
          </div>

          {payload.notes && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Agenda</p>
              <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-sm whitespace-pre-wrap">
                {payload.notes}
              </div>
            </div>
          )}

          {payload.attendees && payload.attendees.length > 0 && (
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> Attendees
              </p>
              <div className="flex flex-wrap gap-1.5">
                {payload.attendees.map((a, i) => (
                  <Badge key={`${a.name}-${i}`} variant="outline" className="text-[11px]">
                    {a.name} · {a.role}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Status banners */}
          {isAccepted && (
            <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
              <div>
                <p className="font-medium">Invite accepted</p>
                <p className="text-xs text-muted-foreground">
                  Added to your meetings — jump in from the button below.
                </p>
              </div>
            </div>
          )}
          {status === "error" && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
              <div>
                <p className="font-medium">Couldn't accept invite</p>
                <p className="text-xs text-muted-foreground">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            {payload.joinUrl && (
              <Button asChild className="gradient-primary text-primary-foreground hover:opacity-90">
                <a href={payload.joinUrl} target="_blank" rel="noopener noreferrer">
                  <Video className="mr-1 h-4 w-4" /> Join meeting
                  <ExternalLink className="ml-1 h-3 w-3 opacity-70" />
                </a>
              </Button>
            )}

            {isAccepted ? (
              <Button variant="outline" onClick={() => navigate({ to: "/meetings" })}>
                <CheckCircle2 className="mr-1 h-4 w-4 text-emerald-500" /> Open in Workplace Ally
              </Button>
            ) : authLoading ? (
              <Button variant="outline" disabled>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Checking sign-in…
              </Button>
            ) : user ? (
              <Button variant="outline" onClick={accept} disabled={accepting}>
                {accepting ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Inbox className="mr-1 h-4 w-4" />
                )}
                Add to my meetings
              </Button>
            ) : (
              <Button variant="outline" asChild>
                <Link
                  to="/auth"
                  search={
                    {
                      redirect:
                        typeof window !== "undefined"
                          ? window.location.pathname + window.location.hash
                          : "/invite",
                    } as never
                  }
                >
                  <LogIn className="mr-1 h-4 w-4" /> Sign in to accept
                </Link>
              </Button>
            )}
          </div>

          {!user && !authLoading && !isAccepted && (
            <p className="text-[11px] text-muted-foreground">
              You can preview any invite without an account. Accepting requires a free sign-in so
              the meeting can be added to your workspace and reminders.
            </p>
          )}

          <p className="text-[11px] text-muted-foreground pt-2 border-t border-border/40">
            Invite details are encoded in the link itself — nothing about this meeting is stored on
            our servers until you add it to your account.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
