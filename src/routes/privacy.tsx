import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Lock, FileText, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy & POPIA Notice — Workplace Ally" },
      {
        name: "description",
        content:
          "Privacy Policy and South African POPIA (Protection of Personal Information Act) compliance notice for Workplace Ally.",
      },
      { property: "og:title", content: "Privacy Policy & POPIA Notice — Workplace Ally" },
      {
        property: "og:description",
        content:
          "How Workplace Ally handles your data in compliance with South African POPIA and global privacy standards.",
      },
      { property: "og:type", content: "article" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const updated = "18 August 2026";
  return (
    <article className="mx-auto max-w-4xl space-y-8 py-4 text-sm leading-relaxed text-foreground">
      {/* Header */}
      <header className="space-y-3 border-b border-border/60 pb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Shield className="h-3.5 w-3.5" /> POPIA & Privacy Compliance Notice
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Privacy Policy & POPIA Notice
        </h1>
        <p className="text-sm text-muted-foreground">
          Last updated: {updated} · In compliance with the South African Protection of Personal
          Information Act (Act 4 of 2013).
        </p>
      </header>

      {/* Overview box */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" /> Commitment to Data Privacy & Protection
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
          Workplace Ally ("we", "us", "our") is dedicated to safeguarding your personal information
          and respecting your privacy rights under the South African{" "}
          <strong>Protection of Personal Information Act, 2013 (POPIA)</strong>, the{" "}
          <strong>Promotion of Access to Information Act, 2000 (PAIA)</strong>, and international
          data protection standards.
        </p>
      </div>

      {/* Section 1 */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. Responsible Party & Information Officer</h2>
        <p>
          For the purposes of POPIA, the <strong>Responsible Party</strong> determining the purpose
          and means of processing your personal information is Workplace Ally.
        </p>
        <div className="rounded-lg border border-border bg-card/40 p-4 text-xs sm:text-sm space-y-1">
          <p>
            <strong>Information Officer:</strong> Kgomotso Lekganyane (Data Protection & Compliance
            Lead)
          </p>
          <p>
            <strong>Email for POPIA requests & DSARs:</strong>{" "}
            <a href="mailto:privacy@workplace-ally.app" className="text-primary underline">
              privacy@workplace-ally.app
            </a>
          </p>
          <p>
            <strong>Physical / Postal Address:</strong> Johannesburg, Gauteng, South Africa
          </p>
        </div>
      </section>

      {/* Section 2 */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. Categories of Personal Information We Process</h2>
        <p>In terms of Section 1 of POPIA, we process the following personal information:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Account Identifiers:</strong> Email address, full name / display name, profile
            avatar URL, and authentication identifiers (including Google OAuth user ID where used).
          </li>
          <li>
            <strong>Workplace Content & Task Data:</strong> Projects, task titles, task
            descriptions, deadlines, categories, team member colour assignments, and project
            invitation metadata.
          </li>
          <li>
            <strong>Meeting Data & Transcripts:</strong> Meeting dates, attendees, calendar event
            titles, meeting notes, audio dictation transcripts, and AI-generated summaries.
          </li>
          <li>
            <strong>Technical & Security Telemetry:</strong> Log timestamps, IP address (for
            fraud/security detection), device type, and encrypted session tokens.
          </li>
        </ul>
      </section>

      {/* Section 3 */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          3. Purpose and Lawful Basis for Processing (POPIA Section 11 & 13)
        </h2>
        <p>We process your personal information only for explicitly defined, lawful purposes:</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border/80 bg-background/50 p-3 space-y-1">
            <h3 className="font-medium text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Contract Fulfillment
            </h3>
            <p className="text-xs text-muted-foreground">
              To deliver core features: synchronizing tasks, managing team projects, scheduling
              meetings, and generating requested translations and briefings.
            </p>
          </div>
          <div className="rounded-lg border border-border/80 bg-background/50 p-3 space-y-1">
            <h3 className="font-medium text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Explicit Consent (POPIA §11)
            </h3>
            <p className="text-xs text-muted-foreground">
              To process notes and prompts via AI assistance, and send reminders. You may adjust or
              withdraw consent at any time in Settings.
            </p>
          </div>
          <div className="rounded-lg border border-border/80 bg-background/50 p-3 space-y-1">
            <h3 className="font-medium text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Security & Accountability (§19)
            </h3>
            <p className="text-xs text-muted-foreground">
              To protect against unauthorized multi-tenant access, maintain Row Level Security, and
              prevent abuse.
            </p>
          </div>
          <div className="rounded-lg border border-border/80 bg-background/50 p-3 space-y-1">
            <h3 className="font-medium text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Legal Compliance
            </h3>
            <p className="text-xs text-muted-foreground">
              To fulfill legal and regulatory obligations under South African laws, including
              record-keeping requirements.
            </p>
          </div>
        </div>
      </section>

      {/* Section 4 */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">4. AI Data Processing & Data Minimization</h2>
        <p>
          When you use AI-assisted tools in Workplace Ally (e.g. Meeting Notes Summaries, AI Task
          Breakdown, Research Briefings, and Multilingual Translation):
        </p>
        <ul className="list-disc space-y-1.5 pl-6">
          <li>
            <strong>No Model Training:</strong> Your input prompts, meeting transcripts, and project
            data are <strong>NOT</strong> used to train public or foundation AI models.
          </li>
          <li>
            <strong>Data Minimization:</strong> Only the specific text required to generate your
            output is transmitted to the inference gateway over TLS encryption.
          </li>
          <li>
            <strong>Ephemeral Processing:</strong> AI gateways process inference requests
            ephemerally and do not retain your content for third-party advertising or commercial
            resale.
          </li>
        </ul>
      </section>

      {/* Section 5 */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">5. Cross-Border Data Transfers (POPIA Section 72)</h2>
        <p>
          To provide high-availability cloud database storage and state-of-the-art AI model
          capabilities, personal information may be transferred to and processed by our secure
          infrastructure operators (including Supabase, Google Cloud, and AI inference gateways)
          located outside South Africa.
        </p>
        <p>
          In accordance with <strong>Section 72 of POPIA</strong>, all cross-border recipients are
          subject to laws, binding corporate rules, or agreements that provide an adequate level of
          data protection substantially similar to the conditions for lawful processing under POPIA.
        </p>
      </section>

      {/* Section 6 */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">6. Your Data Subject Rights under POPIA</h2>
        <p>As a data subject under POPIA, you have the following enforceable rights:</p>
        <div className="space-y-2">
          <div className="rounded-lg border border-border p-3">
            <h3 className="font-semibold text-foreground">Right of Access (Section 23)</h3>
            <p className="text-xs text-muted-foreground mt-1">
              You have the right to confirm what personal information we hold about you and receive
              a copy. You can instantly execute a self-service{" "}
              <strong>Data Subject Access Request (DSAR)</strong> by clicking "Export All My Data"
              in your{" "}
              <Link to="/settings" className="text-primary underline">
                Settings
              </Link>
              .
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <h3 className="font-semibold text-foreground">
              Right to Rectification (Section 24(1)(a))
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              You can correct or update your profile name, email, task details, and project data
              directly within the application at any time.
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <h3 className="font-semibold text-foreground">
              Right to Erasure / Destruction (Section 24(1)(b))
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              You have the right to request the permanent deletion or destruction of your personal
              information. You can execute a complete, irreversible account purge via the "Delete My
              Account & Data" tool in{" "}
              <Link to="/settings" className="text-primary underline">
                Settings
              </Link>
              .
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <h3 className="font-semibold text-foreground">
              Right to Object to Processing (Section 11(3))
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              You may object on reasonable grounds to the processing of your personal information,
              or withdraw consent for AI processing and marketing at any time.
            </p>
          </div>
        </div>
      </section>

      {/* Section 7 */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          7. Information Security Safeguards (POPIA Section 19)
        </h2>
        <p>
          We implement rigorous technical and organizational measures to secure the integrity and
          confidentiality of personal information:
        </p>
        <ul className="list-disc space-y-1.5 pl-6">
          <li>
            <strong>Row Level Security (RLS):</strong> Database-level access control guarantees that
            users can only view their own projects and projects to which they have been explicitly
            invited.
          </li>
          <li>
            <strong>Cryptographic Protection:</strong> All data in transit is encrypted using TLS
            1.3/HTTPS. Sensitive tokens and credentials are securely hashed.
          </li>
          <li>
            <strong>Data Breach Incident Protocol:</strong> In the event of a security compromise
            involving personal information, we will notify the Information Regulator and affected
            data subjects in accordance with <strong>Section 22 of POPIA</strong>.
          </li>
        </ul>
      </section>

      {/* Section 8 */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          8. Lodging a Complaint with the Information Regulator
        </h2>
        <p>
          If you believe your personal information has been handled in violation of POPIA, you have
          the right to lodge a complaint with the South African Information Regulator:
        </p>
        <div className="rounded-lg border border-border bg-card/40 p-4 text-xs sm:text-sm space-y-1">
          <p>
            <strong>The Information Regulator (South Africa)</strong>
          </p>
          <p>JD House, 27 Stiemens Street, Braamfontein, Johannesburg, 2001</p>
          <p>PO Box 31533, Braamfontein, Johannesburg, 2017</p>
          <p>
            <strong>Complaints email:</strong>{" "}
            <a href="mailto:complaints.IR@justice.gov.za" className="text-primary underline">
              complaints.IR@justice.gov.za
            </a>
          </p>
          <p>
            <strong>General enquiries:</strong>{" "}
            <a href="mailto:inforeg@justice.gov.za" className="text-primary underline">
              inforeg@justice.gov.za
            </a>
          </p>
          <p>
            <strong>Website:</strong>{" "}
            <a
              href="https://inforegulator.org.za"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline inline-flex items-center gap-1"
            >
              https://inforegulator.org.za <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      </section>

      {/* Footer link */}
      <div className="flex items-center justify-between border-t border-border/60 pt-6">
        <Link to="/" className="text-sm font-medium text-primary hover:underline">
          ← Back to Workspace
        </Link>
        <Link to="/settings" className="text-sm font-medium text-primary hover:underline">
          Manage Privacy Settings & Export Data →
        </Link>
      </div>
    </article>
  );
}
