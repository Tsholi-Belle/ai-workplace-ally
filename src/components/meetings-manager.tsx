import { useMemo, useRef, useState } from "react";
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
  Bell,
  BellOff,
  Upload,
  FileDown,
  FileType,
  Settings2,
  Shield,
  X,
  Check,
  Clock,
  History,
  GitCompare,
  CalendarPlus,
  Mail,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { MicButton } from "@/components/mic-button";
import { AiDisclaimer } from "@/components/ai-disclaimer";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  useBrowserNotifications,
  useMeetingReminders,
  type ReminderTarget,
} from "@/hooks/use-notifications";
import {
  fetchCalendarEvents,
  fetchFirefliesTranscript,
  fetchFirefliesTranscripts,
  summarizeMeetingNotes,
} from "@/lib/meetings.functions";
import { parseIcs, detectJoinUrl, buildIcsForMeeting } from "@/lib/ics";
import {
  exportMarkdown,
  exportPdf,
  downloadBlob,
  sanitizeFilename,
  type ExportPayload,
} from "@/lib/meeting-export";
import { diffLines } from "@/lib/diff";

type Platform = "zoom" | "meet" | "teams" | "webex" | "other";
type Role = "owner" | "editor" | "viewer";

interface Attendee {
  name: string;
  role: Role;
}

interface SummaryOptions {
  length: "brief" | "detailed";
  decisions: boolean;
  actionItems: boolean;
  openQuestions: boolean;
  followUps: boolean;
}

interface SummaryHistoryEntry {
  ts: number;
  summary: string;
  options: SummaryOptions;
}

interface Meeting {
  id: string;
  title: string;
  platform: Platform;
  joinUrl: string;
  startsAt: string;
  attendees: Attendee[];
  notes: string;
  summary: string;
  source: "manual" | "google" | "fireflies" | "ics";
  createdAt: number;
  summaryOptions?: SummaryOptions;
  summaryHistory?: SummaryHistoryEntry[];
}

interface NotificationItem {
  id: string;
  meetingId?: string;
  title: string;
  body: string;
  ts: number;
  read: boolean;
  kind: "reminder" | "follow-up" | "info";
}

type DeliveryChannel = "browser" | "in-app" | "email";

const DEFAULT_SUMMARY_OPTIONS: SummaryOptions = {
  length: "detailed",
  decisions: true,
  actionItems: true,
  openQuestions: true,
  followUps: true,
};

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

const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer",
};

const ROLE_COLOR: Record<Role, string> = {
  owner: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  editor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  viewer: "bg-slate-500/15 text-slate-300 border-slate-500/30",
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

function normalizeAttendees(list: unknown): Attendee[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      if (typeof item === "string") return { name: item, role: "viewer" as Role };
      if (item && typeof item === "object" && "name" in item) {
        const obj = item as { name: unknown; role?: unknown };
        const role = obj.role === "owner" || obj.role === "editor" ? obj.role : "viewer";
        return { name: String(obj.name), role };
      }
      return null;
    })
    .filter((a): a is Attendee => !!a && !!a.name);
}

export function MeetingsManager() {
  const [meetings, setMeetingsRaw] = useLocalStorage<Meeting[]>("wpa:meetings:list", []);
  const [activeId, setActiveId] = useLocalStorage<string | null>("wpa:meetings:active", null);
  const [notifications, setNotifications] = useLocalStorage<NotificationItem[]>(
    "wpa:meetings:notifications",
    [],
  );
  const [reminderEnabled, setReminderEnabled] = useLocalStorage<boolean>(
    "wpa:meetings:reminder:enabled",
    true,
  );
  const [reminderMinutes, setReminderMinutes] = useLocalStorage<number>(
    "wpa:meetings:reminder:minutes",
    10,
  );
  const [deliveryChannel, setDeliveryChannel] = useLocalStorage<DeliveryChannel>(
    "wpa:meetings:reminder:channel",
    "browser",
  );
  const [reminderEmail, setReminderEmail] = useLocalStorage<string>(
    "wpa:meetings:reminder:email",
    "",
  );

  // Migration: ensure attendees are objects with roles.
  const setMeetings = (updater: Meeting[] | ((prev: Meeting[]) => Meeting[])) => {
    setMeetingsRaw((prev) => {
      const next = typeof updater === "function" ? (updater as (p: Meeting[]) => Meeting[])(prev) : updater;
      return next.map((m) => ({
        ...m,
        attendees: normalizeAttendees(m.attendees),
        summaryOptions: m.summaryOptions ?? DEFAULT_SUMMARY_OPTIONS,
      }));
    });
  };

  const meetingsNorm = useMemo(
    () =>
      meetings.map((m) => ({
        ...m,
        attendees: normalizeAttendees(m.attendees),
        summaryOptions: m.summaryOptions ?? DEFAULT_SUMMARY_OPTIONS,
      })),
    [meetings],
  );

  // Add form
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [attendees, setAttendees] = useState("");

  const active = useMemo(
    () => meetingsNorm.find((m) => m.id === activeId) ?? null,
    [meetingsNorm, activeId],
  );

  const sorted = useMemo(() => {
    return [...meetingsNorm].sort((a, b) => {
      const at = a.startsAt ? new Date(a.startsAt).getTime() : 0;
      const bt = b.startsAt ? new Date(b.startsAt).getTime() : 0;
      return bt - at;
    });
  }, [meetingsNorm]);

  // -------- Notifications --------
  const { permission, request: requestPerm, notify } = useBrowserNotifications();

  const pushNotification = (n: Omit<NotificationItem, "id" | "ts" | "read">) => {
    const item: NotificationItem = {
      ...n,
      id: crypto.randomUUID(),
      ts: Date.now(),
      read: false,
    };
    setNotifications((prev) => [item, ...prev].slice(0, 50));
  };

  const handleNotify = (title: string, body?: string) => {
    notify(title, body);
    pushNotification({ title, body: body ?? "", kind: "reminder" });
  };

  const upcomingTargets = useMemo<ReminderTarget[]>(
    () =>
      meetingsNorm
        .filter((m) => m.startsAt && new Date(m.startsAt).getTime() > Date.now() - 60_000)
        .map((m) => ({ id: m.id, title: m.title, startsAt: m.startsAt })),
    [meetingsNorm],
  );

  useMeetingReminders(upcomingTargets, reminderMinutes, reminderEnabled, handleNotify);

  const handleToggleReminders = async () => {
    if (!reminderEnabled) {
      const result = await requestPerm();
      if (result === "denied") {
        toast.error("Notifications blocked. Enable them in your browser settings.");
        return;
      }
      if (result === "unsupported") {
        toast.error("This browser doesn't support notifications.");
        return;
      }
      setReminderEnabled(true);
      toast.success("Reminders on");
    } else {
      setReminderEnabled(false);
      toast.success("Reminders off");
    }
  };

  // -------- CRUD --------
  const addMeeting = (m: Omit<Meeting, "id" | "createdAt"> & { id?: string }) => {
    const id = m.id ?? crypto.randomUUID();
    const newM: Meeting = {
      ...m,
      id,
      createdAt: Date.now(),
      attendees: normalizeAttendees(m.attendees),
      summaryOptions: m.summaryOptions ?? DEFAULT_SUMMARY_OPTIONS,
    };
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
        .filter(Boolean)
        .map((name, i) => ({ name, role: i === 0 ? "owner" : "viewer" } as Attendee)),
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

  // -------- Imports --------
  const fetchEvents = useServerFn(fetchCalendarEvents);
  const calendarMut = useMutation({
    mutationFn: async () => fetchEvents({ data: { daysAhead: 14 } }),
    onSuccess: (res) => {
      let added = 0;
      for (const ev of res.events) {
        const id = `gcal:${ev.id}`;
        if (meetingsNorm.some((m) => m.id === id)) continue;
        addMeeting({
          id,
          title: ev.title,
          platform: detectPlatform(ev.joinUrl),
          joinUrl: ev.joinUrl,
          startsAt: ev.start,
          attendees: ev.attendees.map((n, i) => ({ name: n, role: i === 0 ? "owner" : "viewer" })),
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
      toast.error(msg.includes("not configured") ? "Connect Google Calendar first." : msg);
    },
  });

  const fetchFf = useServerFn(fetchFirefliesTranscripts);
  const fetchFfOne = useServerFn(fetchFirefliesTranscript);
  const firefliesMut = useMutation({
    mutationFn: async () => fetchFf({ data: { limit: 20 } }),
    onSuccess: (res) => {
      let added = 0;
      for (const t of res.transcripts) {
        const id = `ff:${t.id}`;
        if (meetingsNorm.some((m) => m.id === id)) continue;
        addMeeting({
          id,
          title: t.title || "Fireflies meeting",
          platform: "other",
          joinUrl: t.transcript_url || "",
          startsAt: t.date ? new Date(t.date).toISOString() : "",
          attendees: (t.participants ?? []).map((n, i) => ({
            name: n,
            role: i === 0 ? "owner" : "viewer",
          })),
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
      toast.error(msg.includes("not configured") ? "Connect Fireflies first." : msg);
    },
  });

  const pullTranscriptMut = useMutation({
    mutationFn: async (id: string) => fetchFfOne({ data: { id } }),
    onSuccess: (res) => {
      if (!active) return;
      const summary = res.summary
        ? [
            res.summary.overview && `## Overview\n${res.summary.overview}`,
            res.summary.short_summary && `## Summary\n${res.summary.short_summary}`,
            res.summary.action_items && `## Action Items\n${res.summary.action_items}`,
            res.summary.keywords?.length && `## Keywords\n${res.summary.keywords.join(", ")}`,
          ]
            .filter(Boolean)
            .join("\n\n")
        : "";
      updateMeeting(active.id, {
        notes: res.transcript || active.notes,
        summary: summary || active.summary,
      });
      toast.success("Transcript pulled");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  // -------- ICS import --------
  const importIcsText = (text: string) => {
    const events = parseIcs(text);
    if (events.length === 0) {
      toast.error("No VEVENT entries found in that ICS data.");
      return;
    }
    let added = 0;
    for (const ev of events) {
      const id = ev.uid ? `ics:${ev.uid}` : `ics:${crypto.randomUUID()}`;
      if (meetingsNorm.some((m) => m.id === id)) continue;
      const join =
        ev.url ||
        detectJoinUrl(`${ev.description ?? ""} ${ev.location ?? ""}`) ||
        (ev.location && /^https?:/.test(ev.location) ? ev.location : "");
      const attendeeList: Attendee[] = [];
      if (ev.organizer) attendeeList.push({ name: ev.organizer, role: "owner" });
      for (const a of ev.attendees) {
        if (!attendeeList.some((x) => x.name === a)) attendeeList.push({ name: a, role: "viewer" });
      }
      addMeeting({
        id,
        title: ev.summary || "(Untitled meeting)",
        platform: detectPlatform(join),
        joinUrl: join,
        startsAt: ev.start ?? "",
        attendees: attendeeList,
        notes: ev.description ? `From invite:\n${ev.description}` : "",
        summary: "",
        source: "ics",
      });
      added++;
    }
    toast.success(
      added ? `Imported ${added} meeting${added > 1 ? "s" : ""} from ICS` : "All events already imported",
    );
  };

  // -------- Summarize --------
  const summarizeFn = useServerFn(summarizeMeetingNotes);
  const summarizeMut = useMutation({
    mutationFn: async (m: Meeting) => {
      const opts = m.summaryOptions ?? DEFAULT_SUMMARY_OPTIONS;
      return summarizeFn({
        data: {
          title: m.title,
          notes: m.notes,
          length: opts.length,
          sections: {
            decisions: opts.decisions,
            actionItems: opts.actionItems,
            openQuestions: opts.openQuestions,
            followUps: opts.followUps,
          },
        },
      });
    },
    onSuccess: (res) => {
      if (!active) return;
      updateMeeting(active.id, { summary: res.summary });
      toast.success("Summary generated");
      pushNotification({
        meetingId: active.id,
        kind: "follow-up",
        title: `Summary ready: ${active.title}`,
        body: "Review action items and follow-ups.",
      });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-4">
      {/* Top toolbar */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <NotificationsPanel
          notifications={notifications}
          unread={unreadCount}
          onMarkAllRead={() =>
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
          }
          onClear={() => setNotifications([])}
          onOpenMeeting={(id) => {
            setActiveId(id);
            setNotifications((prev) =>
              prev.map((n) => (n.meetingId === id ? { ...n, read: true } : n)),
            );
          }}
        />
        <ReminderSettings
          enabled={reminderEnabled}
          minutes={reminderMinutes}
          permission={permission}
          onToggle={handleToggleReminders}
          onMinutesChange={setReminderMinutes}
        />
        <IcsImportDialog onImport={importIcsText} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Sidebar */}
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
                Or use ICS Import above to upload/paste invites.
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
                  No meetings yet.
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
    </div>
  );
}

// ============== Sub-components ==============

function NotificationsPanel({
  notifications,
  unread,
  onMarkAllRead,
  onClear,
  onOpenMeeting,
}: {
  notifications: NotificationItem[];
  unread: number;
  onMarkAllRead: () => void;
  onClear: () => void;
  onOpenMeeting: (id: string) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Bell className="h-4 w-4 mr-1" />
          Notifications
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
          <p className="text-sm font-medium">Notifications</p>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={onMarkAllRead} disabled={!unread}>
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClear} disabled={!notifications.length}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="max-h-96 overflow-auto">
          {notifications.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => n.meetingId && onOpenMeeting(n.meetingId)}
                className={`w-full border-b border-border/40 px-3 py-2.5 text-left transition-colors hover:bg-muted/40 ${
                  !n.read ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${
                      !n.read ? "bg-primary" : "bg-transparent"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(n.ts).toLocaleString()}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ReminderSettings({
  enabled,
  minutes,
  permission,
  onToggle,
  onMinutesChange,
}: {
  enabled: boolean;
  minutes: number;
  permission: string;
  onToggle: () => void;
  onMinutesChange: (m: number) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          {enabled ? <Bell className="h-4 w-4 mr-1" /> : <BellOff className="h-4 w-4 mr-1" />}
          Reminders
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3" align="end">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Browser reminders</Label>
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Remind me before</Label>
          <Select
            value={String(minutes)}
            onValueChange={(v) => onMinutesChange(Number(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 minute</SelectItem>
              <SelectItem value="5">5 minutes</SelectItem>
              <SelectItem value="10">10 minutes</SelectItem>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {permission === "denied" && (
          <p className="text-xs text-amber-400">
            Browser notifications are blocked. Enable them in browser site settings.
          </p>
        )}
        {permission === "unsupported" && (
          <p className="text-xs text-muted-foreground">
            This browser doesn't support notifications.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

function IcsImportDialog({ onImport }: { onImport: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const content = await file.text();
    setText(content);
  };

  const handleImport = () => {
    if (!text.trim()) {
      toast.error("Paste ICS content or upload a file.");
      return;
    }
    onImport(text);
    setText("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-1" /> Import ICS
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import meeting invites (ICS)</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="mr-1 h-4 w-4" /> Upload .ics file
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".ics,text/calendar"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = "";
              }}
            />
            <span className="text-xs text-muted-foreground">or paste below</span>
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="BEGIN:VCALENDAR&#10;…&#10;END:VCALENDAR"
            className="min-h-[220px] font-mono text-xs"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} className="gradient-primary text-primary-foreground">
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

  const payload: ExportPayload = {
    title: meeting.title,
    startsAt: meeting.startsAt,
    platform: PLATFORM_LABEL[meeting.platform],
    joinUrl: meeting.joinUrl,
    attendees: meeting.attendees.map((a) => `${a.name} (${ROLE_LABEL[a.role]})`),
    notes: meeting.notes,
    summary: meeting.summary,
  };

  const opts = meeting.summaryOptions ?? DEFAULT_SUMMARY_OPTIONS;
  const setOpts = (patch: Partial<SummaryOptions>) =>
    onUpdate({ summaryOptions: { ...opts, ...patch } });

  const canEdit = true; // local advisory

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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Export">
                    <Download className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Export</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => exportMarkdown(payload)}>
                    <FileType className="mr-2 h-4 w-4" /> Markdown (.md)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportPdf(payload)}>
                    <FileDown className="mr-2 h-4 w-4" /> PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Join URL</Label>
            <Input
              value={meeting.joinUrl}
              onChange={(e) =>
                onUpdate({ joinUrl: e.target.value, platform: detectPlatform(e.target.value) })
              }
              placeholder="https://…"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">When</Label>
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
        </CardContent>
      </Card>

      {/* Attendees & permissions */}
      <AttendeesCard
        attendees={meeting.attendees}
        onChange={(next) => onUpdate({ attendees: next })}
      />

      {/* Notes */}
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
            readOnly={!canEdit}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SummaryOptionsPopover options={opts} onChange={setOpts} />
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
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={handleCopySummary}>
                <Copy className="mr-1 h-4 w-4" /> Copy
              </Button>
            </div>
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

function SummaryOptionsPopover({
  options,
  onChange,
}: {
  options: SummaryOptions;
  onChange: (patch: Partial<SummaryOptions>) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="mr-1 h-4 w-4" /> Summary options
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3" align="start">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Length</Label>
          <Select
            value={options.length}
            onValueChange={(v) => onChange({ length: v as "brief" | "detailed" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="brief">
                <Clock className="inline h-3 w-3 mr-1" /> Brief
              </SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 pt-2 border-t border-border/40">
          <Label className="text-xs text-muted-foreground">Include sections</Label>
          {(
            [
              ["decisions", "Key Decisions"],
              ["actionItems", "Action Items"],
              ["openQuestions", "Open Questions"],
              ["followUps", "Follow-ups"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <Label className="text-sm">{label}</Label>
              <Switch
                checked={options[key]}
                onCheckedChange={(v) => onChange({ [key]: v } as Partial<SummaryOptions>)}
              />
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AttendeesCard({
  attendees,
  onChange,
}: {
  attendees: Attendee[];
  onChange: (next: Attendee[]) => void;
}) {
  const [newName, setNewName] = useState("");

  const update = (i: number, patch: Partial<Attendee>) => {
    onChange(attendees.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  };
  const remove = (i: number) => onChange(attendees.filter((_, idx) => idx !== i));
  const add = () => {
    const n = newName.trim();
    if (!n) return;
    if (attendees.some((a) => a.name.toLowerCase() === n.toLowerCase())) {
      toast.error("Already in list");
      return;
    }
    onChange([...attendees, { name: n, role: "viewer" }]);
    setNewName("");
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" /> Attendees & permissions
        </CardTitle>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm">
              <Shield className="h-3.5 w-3.5 mr-1" /> About roles
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 text-xs space-y-1.5">
            <p><strong>Owner</strong> — manages the meeting and permissions.</p>
            <p><strong>Editor</strong> — can change details and notes.</p>
            <p><strong>Viewer</strong> — can view only.</p>
            <p className="text-muted-foreground pt-1.5 border-t border-border/40">
              Stored locally for sharing tracking. Cross-user enforcement requires backend auth.
            </p>
          </PopoverContent>
        </Popover>
      </CardHeader>
      <CardContent className="space-y-2">
        {attendees.length === 0 && (
          <p className="text-xs text-muted-foreground py-2">No attendees yet.</p>
        )}
        {attendees.map((a, i) => (
          <div key={`${a.name}-${i}`} className="flex items-center gap-2">
            <Input
              value={a.name}
              onChange={(e) => update(i, { name: e.target.value })}
              className="h-8 text-sm"
            />
            <Select value={a.role} onValueChange={(v) => update(i, { role: v as Role })}>
              <SelectTrigger className="w-28 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className={`text-[10px] hidden sm:inline-flex ${ROLE_COLOR[a.role]}`}>
              {ROLE_LABEL[a.role]}
            </Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(i)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Add attendee by name or email"
            className="h-8 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <Button size="sm" variant="outline" onClick={add}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
