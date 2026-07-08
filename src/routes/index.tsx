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
  { label: "Meetings this week", value: "8", delta: "+2", icon: Video, tint: "bg-[oklch(0.68_0.24_0/0.12)] text-[oklch(0.68_0.24_0)]" },
  { label: "Open tasks", value: "14", delta: "-3", icon: ListChecks, tint: "bg-[oklch(0.6_0.2_285/0.12)] text-[oklch(0.6_0.2_285)]" },
  { label: "Notes captured", value: "27", delta: "+5", icon: FileText, tint: "bg-[oklch(0.78_0.13_230/0.14)] text-[oklch(0.5_0.16_230)]" },
  { label: "Hours saved", value: "6.2", delta: "+1.1", icon: TrendingUp, tint: "bg-[oklch(0.55_0.18_160/0.12)] text-[oklch(0.5_0.18_160)]" },
] as const;

const quickActions = [
  { title: "New meeting", icon: Video, url: "/meetings" },
  { title: "New note", icon: FileText, url: "/meeting-notes" },
  { title: "Plan tasks", icon: ListChecks, url: "/task-planner" },
  { title: "Research", icon: Search, url: "/research" },
  { title: "Translate", icon: Languages, url: "/translate" },
] as const;

const upcoming = [
  { title: "Product sync", when: "Today · 2:00 PM", who: "5 people", color: "bg-[oklch(0.68_0.24_0)]" },
  { title: "Design review", when: "Today · 4:30 PM", who: "3 people", color: "bg-[oklch(0.6_0.2_285)]" },
  { title: "1:1 with Sam", when: "Tomorrow · 10:00 AM", who: "2 people", color: "bg-[oklch(0.78_0.13_230)]" },
] as const;

const recent = [
  { title: "Q3 planning notes", meta: "Meeting Notes · 2h ago", icon: FileText },
  { title: "Onboarding revamp", meta: "Task Planner · yesterday", icon: ListChecks },
  { title: "Competitor landscape", meta: "Research · 2d ago", icon: Search },
] as const;

function Dashboard() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Top bar */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Workspace</p>
          <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl" style={{ fontFamily: '"Roboto", sans-serif' }}>Good to see you back</h1>
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

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="shadow-card">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${s.tint}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-semibold tabular-nums">{s.value}</span>
                  <span className="text-xs font-medium text-muted-foreground">{s.delta}</span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
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

      {/* Two-column panels */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming</CardTitle>
            <Link to="/meetings" className="text-xs text-primary-glow hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.map((m) => (
              <Link
                key={m.title}
                to="/meetings"
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-3 transition-all hover:border-primary/50 hover:bg-accent/30"
              >
                <span className={`h-10 w-1 shrink-0 rounded-full ${m.color}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.title}</p>
                  <p className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{m.when}</span>
                    <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{m.who}</span>
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.map((r) => (
              <div
                key={r.title}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-3"
              >
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-muted text-foreground/70">
                  <r.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.meta}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
