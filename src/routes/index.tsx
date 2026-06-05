import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, ListChecks, Search, MessageSquare, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AiDisclaimer } from "@/components/ai-disclaimer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Workplace Productivity Assistant" },
      { name: "description", content: "Your AI-powered workplace command center." },
    ],
  }),
  component: Dashboard,
});

const features = [
  {
    title: "Meeting Notes Summarizer",
    description: "Turn raw notes or transcripts into clean summaries with decisions and action items.",
    icon: FileText,
    url: "/meeting-notes",
  },
  {
    title: "AI Task Planner",
    description: "Convert goals into a prioritized plan with time blocks and a clear next action.",
    icon: ListChecks,
    url: "/task-planner",
  },
  {
    title: "AI Research Assistant",
    description: "Get balanced briefings with key points, perspectives, and open questions.",
    icon: Search,
    url: "/research",
  },
  {
    title: "AI Chatbot",
    description: "Conversational helper for drafting, brainstorming, and quick workplace answers.",
    icon: MessageSquare,
    url: "/chat",
  },
] as const;

function Dashboard() {
  return (
    <div className="mx-auto max-w-6xl">
      <section className="relative mb-10 overflow-hidden rounded-2xl border border-border/60 gradient-subtle p-8 shadow-card">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-primary-glow/20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="h-3 w-3 text-primary-glow" />
            Powered by Lovable AI
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            Automate the busywork.
            <br />
            <span className="bg-gradient-to-r from-primary-glow to-primary bg-clip-text text-transparent">
              Focus on the work that matters.
            </span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
            A modern AI workspace for professionals — summarize meetings, plan your week, research
            topics, and chat with an AI assistant. All in one place.
          </p>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {features.map((f) => (
          <Link key={f.url} to={f.url} className="group">
            <Card className="h-full shadow-card transition-all hover:border-primary/50 hover:shadow-elegant">
              <CardHeader>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg gradient-primary text-primary-foreground shadow-elegant">
                  <f.icon className="h-5 w-5" />
                </div>
                <CardTitle className="flex items-center justify-between text-lg">
                  {f.title}
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary-glow" />
                </CardTitle>
                <CardDescription>{f.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Open tool →
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <AiDisclaimer />
      </div>
    </div>
  );
}
