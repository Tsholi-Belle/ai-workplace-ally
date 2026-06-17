import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Calendar,
  Plus,
  Video,
  ExternalLink,
  Trash2,
  Sparkles,
  Loader2,
  Download,
  RefreshCw,
  Copy,
  FileText,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MicButton } from "@/components/mic-button";
import { AiDisclaimer } from "@/components/ai-disclaimer";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  fetchCalendarEvents,
  fetchFirefliesTranscript,
  fetchFirefliesTranscripts,
  summarizeMeetingNotes,
} from "@/lib/meetings.functions";

type Platform = "zoom" | "meet" | "teams" | "webex" | "other";

interface Meeting {
  id: string;
  title: string;
  platform: Platform;
  joinUrl: string;
  startsAt: string; // ISO datetime-local string
  attendees: string[];
  notes: string;
  summary: string;
  source: "manual" | "google" | "fireflies";
  createdAt: number;
}

function detectPlatform(url: string): Platform {
  const u = url.toLowerCase();
  if (u.includes("zoom.us")) return "zoom";
  if (u.includes("meet.google.com")) return "meet";
  if (u.includes("teams.microsoft.com") || u.includes("teams.live.com")) return "teams";
  if (u.includes("webex.com")) return "webex";
  return "other";
}

const PLATFORM_LABEL: Record<Platform, string> = {
  zoom: "Zoom",
  meet: "Google Meet",
  teams: "MS Teams",
  webex: "Webex",
  other: "Other",
};

const PLATFORM_COLOR: Record<Platform, string> = {
  zoom: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  meet: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  teams: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  webex: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  other: "bg-muted text-muted-foreground border-border",
};

function fmtDate(iso: string): string {
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

function toLocalInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MeetingsManager() {
  const [meetings, setMeetings] = useLocalStorage<Meeting[]>("wpa:meetings:list", []);
  const [activeId, setActiveId] = useLocalStorage<string | null>("wpa:meetings:active", null);

  // Add form
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [attendees, setAttendees] = useState("");

  const active = useMemo(
    () => meetings.find((m) => m.id === activeId) ?? null,
    [meetings, activeId],
  );

  const sorted = useMemo(() => {
    return [...meetings].sort((a, b) => {
      const at = a.startsAt ? new Date(a.startsAt).getTime() : 0;
      const bt = b.startsAt ? new Date(b.startsAt).getTime() : 0;
      return bt - at;
    });
  }, [meetings]);

  const addMeeting = (m: Omit<Meeting, "id" | "createdAt"> & { id?: string }) => {
    const id = m.id ?? crypto.randomUUID();
    const newM: Meeting = { ...m, id, createdAt: Date.now() };
    setMeetings((prev) => {
      if (prev.some((x) => x.id === id)) return prev;
      return [newM, ...prev];
    });
    setActiveId(id);
    return id;
  };

  const updateMeeting = (id: string, patch: Partial<Meeting>) => {
    setMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const removeMeeting = (id: string) => {
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const handleAdd = () => {
    if (!title.trim()) {
      toast.error("Please enter a meeting title.");
      return;
    }
    addMeeting({
      title: title.trim(),
      platform: detectPlatform(url),
      joinUrl: url.trim(),
      startsAt: startsAt ? new Date(startsAt).toISOString() : "",
      attendees: attendees
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      notes: "",
      summary: "",
      source: "manual",
    });
    setTitle("");
    setUrl("");
    setStartsAt("");
    setAttendees("");
    toast.success("Meeting added");
  };

  // ---- Google Calendar import ----
  const fetchEvents = useServerFn(fetchCalendarEvents);
  const calendarMut = useMutation({
    mutationFn: async () => fetchEvents({ data: { daysAhead: 14 } }),
    onSuccess: (res) => {
      let added = 0;
      for (const ev of res.events) {
        const exists = meetings.some((m) => m.id === `gcal:${ev.id}`);
        if (exists) continue;
        addMeeting({
          id: `gcal:${ev.id}`,
          title: ev.title,
          platform: detectPlatform(ev.joinUrl),
          joinUrl: ev.joinUrl,
          startsAt: ev.start,
          attendees: ev.attendees,
          notes: ev.description ? `From calendar:\n${ev.description}` : "",
          summary: "",
          source: "google",
        });
        added++;
      }
      toast.success(added ? `Imported ${added} meeting${added > 1 ? "s" : ""}` : "No new meetings");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Failed";
      toast.error(
        msg.includes("not configured")
          ? "Connect Google Calendar first via Workspace integrations."
          : msg,
      );
    },
  });

  // ---- Fireflies import ----
  const fetchFf = useServerFn(fetchFirefliesTranscripts);
  const fetchFfOne = useServerFn(fetchFirefliesTranscript);
  const firefliesMut = useMutation({
    mutationFn: async () => fetchFf({ data: { limit: 20 } }),
    onSuccess: (res) => {
      let added = 0;
      for (const t of res.transcripts) {
        const id = `ff:${t.id}`;
        if (meetings.some((m) => m.id === id)) continue;
        addMeeting({
          id,
          title: t.title || "Fireflies meeting",
          platform: "other",
          joinUrl: t.transcript_url || "",
          startsAt: t.date ? new Date(t.date).toISOString() : "",
          attendees: t.participants ?? [],
          notes: "",
          summary: "",
          source: "fireflies",
        });
        added++;
      }
      toast.success(added ? `Imported ${added} transcript${added > 1 ? "s" : ""}` : "No new transcripts");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Failed";
      toast.error(
        msg.includes("not configured")
          ? "Connect Fireflies first via Workspace integrations."
          : msg,
      );
    },
  });

  const pullTranscriptMut = useMutation({
    mutationFn: async (id: string) => fetchFfOne({ data: { id } }),
    onSuccess: (res) => {
      if (!active) return;
      const ffId = active.id.startsWith("ff:") ? active.id.slice(3) : res.id;
      const summary = res.summary
        ? [
            res.summary.overview && `## Overview\n${res.summary.overview}`,
            res.summary.short_summary && `## Summary\n${res.summary.short_summary}`,
            res.summary.action_items && `## Action Items\n${res.summary.action_items}`,
            res.summary.keywords?.length &&
              `## Keywords\n${res.summary.keywords.join(", ")}`,
          ]
            .filter(Boolean)
            .join("\n\n")
        : "";
      updateMeeting(active.id, {
        notes: res.transcript || active.notes,
        summary: summary || active.summary,
      });
      toast.success("Transcript pulled");
      void ffId;
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  // ---- AI summarize ----
  const summarizeFn = useServerFn(summarizeMeetingNotes);
  const summarizeMut = useMutation({
    mutationFn: async (m: Meeting) =>
      summarizeFn({ data: { title: m.title, notes: m.notes } }),
    onSuccess: (res) => {
      if (!active) return;
      updateMeeting(active.id, { summary: res.summary });
      toast.success("Summary generated");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      {/* Sidebar: list + add + integrations */}
      <div className="space-y-4">
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4" /> Add meeting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              placeholder="Title (e.g. Sprint planning)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              placeholder="Join URL (Zoom, Meet, Teams…)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
            <Input
              placeholder="Attendees (comma separated)"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
            />
            <Button
              onClick={handleAdd}
              className="w-full gradient-primary text-primary-foreground hover:opacity-90"
            >
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => calendarMut.mutate()}
              disabled={calendarMut.isPending}
            >
              {calendarMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Calendar className="mr-2 h-4 w-4" />
              )}
              Google Calendar
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => firefliesMut.mutate()}
              disabled={firefliesMut.isPending}
            >
              {firefliesMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Fireflies transcripts
            </Button>
            <p className="text-xs text-muted-foreground">
              Requires the matching workspace integration.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Meetings</CardTitle>
            <span className="text-xs text-muted-foreground">{sorted.length}</span>
          </CardHeader>
          <CardContent className="space-y-1 max-h-[480px] overflow-auto">
            {sorted.length === 0 && (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No meetings yet. Add one or import from Calendar.
              </p>
            )}
            {sorted.map((m) => {
              const isActive = m.id === activeId;
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveId(m.id)}
                  className={`w-full text-left rounded-md border p-2.5 transition-colors ${
                    isActive
                      ? "border-primary/60 bg-primary/5"
                      : "border-border/40 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.title}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(m.startsAt)}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${PLATFORM_COLOR[m.platform]}`}>
                      {PLATFORM_LABEL[m.platform]}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Detail */}
      <div>
        {!active ? (
          <Card className="shadow-card">
            <CardContent className="flex h-[400px] flex-col items-center justify-center text-center gap-2 text-muted-foreground">
              <Video className="h-10 w-10 opacity-50" />
              <p className="text-sm">Select a meeting to take notes, or add a new one.</p>
            </CardContent>
          </Card>
        ) : (
          <MeetingDetail
            meeting={active}
            onUpdate={(patch) => updateMeeting(active.id, patch)}
            onRemove={() => removeMeeting(active.id)}
            onSummarize={() => summarizeMut.mutate(active)}
            summarizing={summarizeMut.isPending}
            onPullTranscript={
              active.id.startsWith("ff:")
                ? () => pullTranscriptMut.mutate(active.id.slice(3))
                : undefined
            }
            pulling={pullTranscriptMut.isPending}
          />
        )}
      </div>
    </div>
  );
}

interface DetailProps {
  meeting: Meeting;
  onUpdate: (patch: Partial<Meeting>) => void;
  onRemove: () => void;
  onSummarize: () => void;
  summarizing: boolean;
  onPullTranscript?: () => void;
  pulling: boolean;
}

function MeetingDetail({
  meeting,
  onUpdate,
  onRemove,
  onSummarize,
  summarizing,
  onPullTranscript,
  pulling,
}: DetailProps) {
  const handleJoin = () => {
    if (!meeting.joinUrl) {
      toast.error("No join URL on this meeting.");
      return;
    }
    window.open(meeting.joinUrl, "_blank", "noopener,noreferrer");
  };

  const handleCopySummary = async () => {
    if (!meeting.summary) return;
    await navigator.clipboard.writeText(meeting.summary);
    toast.success("Summary copied");
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <Input
                value={meeting.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                className="text-base font-semibold border-0 px-0 focus-visible:ring-0 shadow-none h-auto"
              />
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className={PLATFORM_COLOR[meeting.platform]}>
                  {PLATFORM_LABEL[meeting.platform]}
                </Badge>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {fmtDate(meeting.startsAt)}
                </span>
                {meeting.attendees.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {meeting.attendees.length}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-shrink-0 gap-2">
              <Button
                onClick={handleJoin}
                disabled={!meeting.joinUrl}
                className="gradient-primary text-primary-foreground hover:opacity-90"
              >
                <Video className="mr-1 h-4 w-4" /> Join
                <ExternalLink className="ml-1 h-3 w-3 opacity-70" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Join URL</label>
            <Input
              value={meeting.joinUrl}
              onChange={(e) =>
                onUpdate({ joinUrl: e.target.value, platform: detectPlatform(e.target.value) })
              }
              placeholder="https://…"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">When</label>
            <Input
              type="datetime-local"
              value={toLocalInput(meeting.startsAt)}
              onChange={(e) =>
                onUpdate({
                  startsAt: e.target.value ? new Date(e.target.value).toISOString() : "",
                })
              }
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-muted-foreground">Attendees</label>
            <Input
              value={meeting.attendees.join(", ")}
              onChange={(e) =>
                onUpdate({
                  attendees: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              placeholder="Alice, Bob, Carol"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" /> Notes
          </CardTitle>
          <div className="flex items-center gap-1">
            <MicButton
              onAppend={(chunk) =>
                onUpdate({ notes: meeting.notes + (meeting.notes ? " " : "") + chunk })
              }
            />
            {onPullTranscript && (
              <Button variant="ghost" size="sm" onClick={onPullTranscript} disabled={pulling}>
                {pulling ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1 h-4 w-4" />
                )}
                Pull transcript
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={meeting.notes}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            placeholder="Type or dictate your notes during the meeting…"
            className="min-h-[220px] resize-y text-sm leading-relaxed"
          />
          <div className="flex justify-end">
            <Button
              onClick={onSummarize}
              disabled={summarizing || !meeting.notes.trim()}
              className="gradient-primary text-primary-foreground hover:opacity-90"
            >
              {summarizing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Summarising…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" /> AI summary
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {meeting.summary && (
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">AI Summary</CardTitle>
            <Button variant="ghost" size="sm" onClick={handleCopySummary}>
              <Copy className="mr-1 h-4 w-4" /> Copy
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <article className="prose prose-sm prose-invert max-w-none rounded-lg border border-border/60 bg-muted/30 p-4 prose-headings:font-display prose-headings:tracking-tight prose-h2:mt-4 prose-h2:text-base prose-p:text-sm prose-li:text-sm">
              <ReactMarkdown>{meeting.summary}</ReactMarkdown>
            </article>
            <AiDisclaimer />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
