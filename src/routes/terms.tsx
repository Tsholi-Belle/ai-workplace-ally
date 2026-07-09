import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Workplace Ally" },
      {
        name: "description",
        content: "The terms that apply to your use of Workplace Ally.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 py-4 text-sm leading-relaxed text-foreground">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: 9 July 2026</p>
      </header>
      <p>
        By using Workplace Ally you agree to use the service lawfully, not to attempt to
        access other users' data, and to accept that AI-generated output may contain
        inaccuracies and should be reviewed before use. The service is provided "as is"
        without warranty. We may suspend accounts that violate these terms.
      </p>
      <p>
        Your privacy is covered by our{" "}
        <Link to="/privacy" className="text-primary underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
      <div className="pt-4">
        <Link to="/auth" className="text-primary underline underline-offset-2">
          Back to sign in
        </Link>
      </div>
    </article>
  );
}
