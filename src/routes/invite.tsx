import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Calendar, CheckCircle2, ExternalLink, Inbox, Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { decodeInvite, type InvitePayload } from "@/lib/invite";

export const Route = createFileRoute("/invite")({
  head: () => ({
    meta: [
      { title: "Meeting invite — Workplace Ally" },
      { name: "description", content: "Accept a meeting invite shared with you." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvitePage,
});

const MEETINGS_KEY = "wpa:meetings:list";
const NOTIF_KEY = "wpa:meetings:notifications";
const ACTIVE_KEY = "wpa:meetings:active";

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

function InvitePage() {
  const navigate = useNavigate();
  const [payload, setPayload] = useState<InvitePayload | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    setPayload(decodeInvite(hash));
  }, []);

  const meetingId = useMemo(
    () => (payload ? `invite:${payload.iid}` : ""),
    [payload],
  );

  const accept = () => {
    if (!payload) return;
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
    // Push in-app notification (consumed by the bell in MeetingsManager).
    const notes = readJson<Array<unknown>>(NOTIF_KEY, []);
    localStorage.setItem(
      NOTIF_KEY,
      JSON.stringify(
        [
          {
            id: crypto.randomUUID(),
            meetingId,
            title: `Invite accepted: ${payload.title}`,
            body: payload.invitedBy ? `Shared by ${payload.invitedBy}` : "Added to your meetings.",
            ts: Date.now(),
            read: false,
            kind: "info",
          },
          ...notes,
        ].slice(0, 50),
      ),
    );
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(meetingId));
    setAccepted(true);
    toast.success("Added to your meetings");
  };

  if (!payload) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title="Meeting invite"
          description="Open the link you were sent to view the invite."
          icon={<Inbox className="h-5 w-5" />}
        />
        <Card className="shadow-card">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            This invite link is missing or invalid. Ask the sender for a fresh link.
          </CardContent>
        </Card>
      </div>
    );
  }

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
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> {fmt(payload.startsAt)}
            </span>
            {payload.platform && (
              <Badge variant="outline" className="text-[10px]">
                {payload.platform}
              </Badge>
            )}
          </div>

          {payload.notes && (
            <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-sm whitespace-pre-wrap">
              {payload.notes}
            </div>
          )}

          {payload.attendees && payload.attendees.length > 0 && (
            <div className="text-sm">
              <p className="text-xs text-muted-foreground mb-1">Attendees</p>
              <div className="flex flex-wrap gap-1.5">
                {payload.attendees.map((a, i) => (
                  <Badge key={`${a.name}-${i}`} variant="outline" className="text-[11px]">
                    {a.name} · {a.role}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {payload.joinUrl && (
              <Button asChild className="gradient-primary text-primary-foreground hover:opacity-90">
                <a href={payload.joinUrl} target="_blank" rel="noopener noreferrer">
                  <Video className="mr-1 h-4 w-4" /> Join meeting
                  <ExternalLink className="ml-1 h-3 w-3 opacity-70" />
                </a>
              </Button>
            )}
            {accepted ? (
              <Button
                variant="outline"
                onClick={() => navigate({ to: "/meetings" })}
              >
                <CheckCircle2 className="mr-1 h-4 w-4 text-emerald-500" /> Open in Workplace Ally
              </Button>
            ) : (
              <Button variant="outline" onClick={accept}>
                <Inbox className="mr-1 h-4 w-4" /> Add to my meetings
              </Button>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground pt-2 border-t border-border/40">
            Invite details are encoded in the link itself — nothing about this meeting is stored on
            our servers until you add it to your account.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
