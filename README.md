# Workplace Ally

[![CI & Build Verification](https://github.com/Tsholi-Belle/ai-workplace-ally/actions/workflows/ci.yml/badge.svg)](https://github.com/Tsholi-Belle/ai-workplace-ally/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Google Cloud Free Tier](https://img.shields.io/badge/Google%20Cloud-Free%20Tier-4285F4.svg?logo=google-cloud&logoColor=white)](https://cloud.google.com/free)
[![POPIA Compliant](https://img.shields.io/badge/POPIA-Compliant-emerald.svg)](https://inforegulator.org.za)

**Workplace Ally** is a modern, privacy-focused web application designed to help working professionals automate repetitive tasks, manage projects, and collaborate with AI assistance — built on **Google Cloud Free Tier** and fully compliant with South Africa's **Protection of Personal Information Act (POPIA, Act 4 of 2013)**.

---

## Google Cloud Free Tier Architecture

- **Serverless Compute:** [Google Cloud Run](https://cloud.google.com/run) — 2 million free requests/month, 360,000 vCPU-seconds, 180,000 GiB-seconds free.
- **Authentication:** [Firebase Auth / Google Identity Platform](https://firebase.google.com/docs/auth) — 50,000 monthly active users (MAU) completely free (Email/Password, Google Sign-In, GitHub Sign-In).
- **Database:** [Google Cloud Firestore](https://firebase.google.com/docs/firestore) — 1 GiB storage, 50,000 reads/day, 20,000 writes/day free.
- **File Storage:** [Google Cloud Storage / Firebase Storage](https://firebase.google.com/docs/storage) — 5 GiB free storage for meeting files and transcripts.
- **Regional POPIA Compliance:** Provisioned in `africa-south1` (Johannesburg, South Africa) or `europe-west1` with full data sovereignty.

---

## Key Features

### 1. Collaborative Task Planner

- **Project Workspaces:** Create, edit, track deadlines, and organize tasks across teams on Google Cloud Firestore.
- **Visual Kanban Status Pipeline:** Move tasks smoothly through `To Do` → `In Progress` → `Done`.
- **AI Task Action Planner:** Convert high-level project goals into prioritized, dated tasks with one click.
- **Rich Task Details:** Custom categories, priority tags (`Urgent`, `High`, `Medium`, `Low`), assignee color-coding, and due date reminders.
- **Search & Filtering:** Real-time keyword search and category/priority filters.

### 2. POPIA & Data Protection Compliance

- **Data Subject Access Request (POPIA §23):** 1-click self-service export of all personal information, tasks, and project history as a structured JSON file.
- **Right to Erasure (POPIA §24):** Permanent account and data destruction with cascade deletion.
- **Informed Consent Management (POPIA §11):** Non-intrusive consent prompts and privacy preference toggles.
- **Transparent POPIA Policy:** Full disclosure of the 8 lawful processing conditions, Information Officer contact details, and Information Regulator of South Africa complaint avenues.

### 3. Meetings & Transcripts

- **Meeting Notes Summarizer:** Converts notes and transcripts into clean executive summaries and action items.
- **Direct Integrations:** Works with Google Meet, Zoom, MS Teams, and ICS calendar imports.
- **Voice Dictation:** Hands-free speech-to-text input.

### 4. Multilingual Translation & Research

- **South African Official Languages:** PanSALB-standard translation into isiZulu, isiXhosa, Sesotho, Sepedi, Setswana, Afrikaans, Tshivenda, Xitsonga, and SA English.
- **AI Research Assistant:** Structured briefing documents with multi-perspective analysis.

---

## Tech Stack

- **Framework & Routing:** [TanStack Start](https://tanstack.com/start) / React 19 / Vite
- **Cloud Backend:** Google Cloud Run + Firebase Auth + Google Cloud Firestore
- **AI Integration:** [Vercel AI SDK](https://sdk.vercel.ai/) with GitHub Models, Google Gemini, and OpenAI
- **Styling & UI:** Tailwind CSS v4, Radix UI, Lucide React

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Tsholi-Belle/ai-workplace-ally.git
cd ai-workplace-ally
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure your Google Cloud / Firebase credentials and AI key:

- **Firebase Project ID:** `VITE_FIREBASE_PROJECT_ID="your-project-id"`
- **AI Provider:** `GITHUB_TOKEN="ghp_your_token"` or `GEMINI_API_KEY="your_gemini_key"`

### 4. Run Development Server

```bash
npm run dev
```

### 5. Build for Production

```bash
npm run build
npm run preview
```

---

## Deploying to Google Cloud Run (Free Tier)

Deploy to Google Cloud with a single command using Cloud Build:

```bash
chmod +x deploy-gcp.sh
./deploy-gcp.sh
```

Or deploy directly via `gcloud`:

```bash
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/ai-workplace-ally
gcloud run deploy ai-workplace-ally \
  --image gcr.io/YOUR_PROJECT_ID/ai-workplace-ally \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1
```

---

## Responsible AI Policy

AI outputs may be inaccurate. Workplace Ally is designed with human-in-the-loop accountability — all summaries, schedules, and generated tasks remain editable by the user before execution.
