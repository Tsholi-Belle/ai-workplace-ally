import { createFileRoute, Link } from "@tanstack/react-router";
import {
  FileText,
  ListChecks,
  Search,
  Languages,
  Video,
  Calendar,
  Clock,
  TrendingUp,
  Users,
  Plus,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FeatureInstructions } from "@/components/feature-instructions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Workplace Ally" },
      { name: "description", content: "Your workplace command center." },
    ],
  }),
  component: Dashboard,
});

const stats = [
  { label: "Meetings this week", placeholder: "0", icon: Video, tint: "bg-[oklch(0.68_0.24_0/0.12)] text-[oklch(0.68_0.24_0)]" },
  { label: "Open tasks", placeholder: "0", icon: ListChecks, tint: "bg-[oklch(0.6_0.2_285/0.12)] text-[oklch(0.6_0.2_285)]" },
  { label: "Notes captured", placeholder: "0", icon: FileText, tint: "bg-[oklch(0.78_0.13_230/0.14)] text-[oklch(0.5_0.16_230)]" },
  { label: "Hours saved", placeholder: "0.0", icon: TrendingUp, tint: "bg-[oklch(0.55_0.18_160/0.12)] text-[oklch(0.5_0.18_160)]" },
] as const;

const quickActions = [
  { title: "New meeting", icon: Video, url: "/meetings" },
  { title: "New note", icon: FileText, url: "/meeting-notes" },
  { title: "Plan tasks", icon: ListChecks, url: "/task-planner" },
  { title: "Research", icon: Search, url: "/research" },
  { title: "Translate", icon: Languages, url: "/translate" },
] as const;

const upcomingPlaceholders = [
  { title: "Meeting title goes here", when: "Day · Time", who: "example@email.com" },
  { title: "Another scheduled meeting", when: "Day · Time", who: "teammate@email.com" },
] as const;

const recentPlaceholders = [
  { title: "Your recent notes will appear here", meta: "Meeting Notes · —", icon: FileText },
  { title: "Your planned tasks will appear here", meta: "Task Planner · —", icon: ListChecks },
  { title: "Your research briefings will appear here", meta: "Research · —", icon: Search },
] as const;

function Dashboard() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Top bar */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Workspace</p>
          <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl" style={{ fontFamily: '"Roboto", sans-serif' }}>Welcome to your workspace</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/meetings">
              <Calendar className="h-4 w-4" />
              Schedule
            </Link>
          </Button>
          <Button asChild size="sm" className="gradient-primary text-primary-foreground shadow-elegant">
            <Link to="/meetings">
              <Plus className="h-4 w-4" />
              New meeting
            </Link>
          </Button>
        </div>
      </div>

      <FeatureInstructions
        featureKey="dashboard"
        title="Welcome to your Workplace Ally"
        steps={[
          "Use Quick actions to jump into meetings, notes, tasks, research, or translation.",
          "Upcoming shows your next meetings; Recent activity shows what you've worked on lately.",
          "Every feature has its own How to use guide — expand it any time from the help button.",
        ]}
        tips={[
          "Your task planner and meetings sync to your account, so they follow you across devices.",
          "Click Do not show this again on any guide to hide it once you're comfortable.",
        ]}
      />

      {/* Stat tiles — empty state placeholders */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="shadow-card opacity-60">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${s.tint} opacity-70`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-semibold tabular-nums text-muted-foreground/70">{s.placeholder}</span>
                </div>
                <p className="truncate text-xs text-muted-foreground/70">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions — these stay interactive so users can get started */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {quickActions.map((a) => (
            <Link
              key={a.url}
              to={a.url}
              className="group flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-3 transition-all hover:border-primary/50 hover:bg-accent/40 hover:shadow-card"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md gradient-primary text-primary-foreground shadow-elegant">
                <a.icon className="h-4 w-4" />
              </div>
              <span className="min-w-0 truncate text-sm font-medium">{a.title}</span>
            </Link>
          ))}
        </CardContent>
      </Card>

      {/* Two-column panels — greyed-out placeholders */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming</CardTitle>
            <Link to="/meetings" className="text-xs text-primary-glow hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingPlaceholders.map((m) => (
              <div
                key={m.title}
                aria-disabled="true"
                className="pointer-events-none flex select-none items-center gap-3 rounded-lg border border-dashed border-border/50 bg-background/20 p-3 opacity-60"
              >
                <span className="h-10 w-1 shrink-0 rounded-full bg-muted-foreground/30" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-muted-foreground/70">{m.title}</p>
                  <p className="flex items-center gap-3 text-xs text-muted-foreground/60">
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{m.when}</span>
                    <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{m.who}</span>
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
              </div>
            ))}
            <p className="pt-1 text-center text-xs text-muted-foreground/70">
              No meetings yet — schedule one to see it here.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentPlaceholders.map((r) => (
              <div
                key={r.title}
                aria-disabled="true"
                className="pointer-events-none flex select-none items-center gap-3 rounded-lg border border-dashed border-border/50 bg-background/20 p-3 opacity-60"
              >
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-muted/60 text-muted-foreground/60">
                  <r.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-muted-foreground/70">{r.title}</p>
                  <p className="truncate text-xs text-muted-foreground/60">{r.meta}</p>
                </div>
              </div>
            ))}
            <p className="pt-1 text-center text-xs text-muted-foreground/70">
              No activity yet — start working to see it here.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
