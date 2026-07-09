import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Workplace Ally" },
      {
        name: "description",
        content:
          "How Workplace Ally collects, uses, stores, and shares your information, including data received from Google OAuth sign-in.",
      },
      { property: "og:title", content: "Privacy Policy — Workplace Ally" },
      {
        property: "og:description",
        content:
          "How Workplace Ally handles your data and complies with Google API Services User Data Policy, including Limited Use.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const updated = "9 July 2026";
  return (
    <article className="mx-auto max-w-3xl space-y-6 py-4 text-sm leading-relaxed text-foreground">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: {updated}</p>
      </header>

      <section className="space-y-2">
        <p>
          Workplace Ally ("we", "us", "the app") helps you summarise meetings, plan tasks,
          translate text, and do research. This policy explains what information we collect
          when you sign in and use the app, how we use it, and the choices you have. By
          creating an account or signing in with Google, you agree to this policy.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">1. Information we collect</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>Account information.</strong> When you sign in with email or with Google,
            we receive your email address, a unique user identifier, and — if you use
            Google — your basic Google profile (name and profile picture).
          </li>
          <li>
            <strong>Content you create.</strong> Meetings, notes, tasks, translations, and
            research queries you save in the app.
          </li>
          <li>
            <strong>Technical data.</strong> Standard log data (IP address, browser, device)
            needed to run the service securely.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">2. How we use Google user data</h2>
        <p>
          If you sign in with Google, we request only the basic scopes needed to
          authenticate you: your Google account email, unique ID, and basic profile
          (name and picture). We use this information solely to:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Create and secure your Workplace Ally account.</li>
          <li>Display your name and picture inside the app.</li>
          <li>Let you sign back in on other devices.</li>
        </ul>
        <p>
          <strong>Limited Use.</strong> Workplace Ally's use and transfer of information
          received from Google APIs adheres to the{" "}
          <a
            className="underline underline-offset-2"
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noreferrer"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. We do not sell Google user data, do
          not use it for advertising, do not use it to train generalised AI/ML models, and
          do not allow humans to read it except (a) with your explicit consent, (b) for
          security investigations, or (c) where required by law.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">3. How we use your content</h2>
        <p>
          Content you create in Workplace Ally is stored so that you can access it across
          devices. When you use an AI feature (summaries, translation, research,
          task planning), the relevant text is sent to our AI model provider strictly to
          generate your response. It is not used to train third-party models and is not
          shared with advertisers.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">4. Sharing</h2>
        <p>
          We do not sell your personal information. We share data only with the service
          providers required to run the app — authentication, database and hosting
          (Lovable Cloud), and the AI model gateway that generates responses — and only
          to the extent needed to deliver the feature you requested.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">5. Retention and deletion</h2>
        <p>
          Your account and content are retained while your account is active. You can
          delete any item from within the app. To delete your entire account and all
          associated data, email us at the address below and we will action the request
          within 30 days. Revoking Workplace Ally's access from your{" "}
          <a
            className="underline underline-offset-2"
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noreferrer"
          >
            Google account permissions page
          </a>{" "}
          will prevent future Google sign-ins but does not by itself delete your
          Workplace Ally account.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">6. Security</h2>
        <p>
          Data is transmitted over HTTPS and stored with row-level access controls so
          that only you (and people you explicitly invite) can see your content.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">7. Children</h2>
        <p>Workplace Ally is not directed to children under 13 and we do not knowingly collect their data.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">8. Changes</h2>
        <p>
          We will update the "Last updated" date at the top of this page when this policy
          changes. Material changes will be highlighted in-app.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">9. Contact</h2>
        <p>
          Questions or deletion requests: <a className="underline underline-offset-2" href="mailto:privacy@workplace-ally.app">privacy@workplace-ally.app</a>.
        </p>
      </section>

      <div className="pt-4">
        <Link to="/auth" className="text-primary underline underline-offset-2">
          Back to sign in
        </Link>
      </div>
    </article>
  );
}
