# Learning Astra

**SastaSundar Learning Dashboard** — a full-stack internal learning & support platform built for a pharmacy
franchise network, so franchise owners and employees can train on a complex compliance system in their own
language, self-serve answers via AI instead of calling support, and get certified — all tracked and reported
end to end.

Built solo, end to end, by [Sourav Gupta](https://github.com/souraavguptaa).

📺 **[Demo video](https://youtu.be/lVr8XEat2fc)** — 4-minute walkthrough of the platform.

## What it does

- **Video training with real anti-cheat enforcement** — server-verified watch time (not just a client-side
  timer), no skipping ahead, auto-pause when the tab loses focus, a visible name/email watermark.
- **AI Support search** — asks a question in plain language (any of 6 supported languages, text or voice),
  gets an answer grounded strictly in real uploaded content via Gemini + pgvector semantic search — never a
  hallucinated free-form answer, with a graceful fallback to a support ticket when nothing matches.
- **Assessments & certificates** — server-graded quizzes gated behind content completion, auto-issued PDF
  certificates with a unique certificate number on first pass.
- **Role-based dashboards** — Super Admin, Admin, Trainer, Franchise Owner, Operator, and Employee each see a
  purpose-built view: training/assessment builders with drag-and-drop ordering and versioning, org & franchise
  management, ticket queues, analytics with Excel/PDF export, gamification (points, badges, leaderboards).
- **Multi-language throughout** — English, Hindi, Bengali, Assamese, Odia, and Hinglish, switchable live.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React (Vite) + TypeScript, TanStack Query, Tailwind CSS, react-i18next |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL (Neon) via Drizzle ORM, with pgvector for semantic search |
| File storage | Cloudflare R2 (presigned direct uploads) |
| AI | Google Gemini API — embeddings + grounded answer generation |
| Mobile | Capacitor (Android) |
| Hosting | Render |

## Structure

- `backend/` — Node.js + Express + TypeScript API, Postgres (Neon) via Drizzle ORM, Cloudflare R2 file storage, Gemini AI.
- `frontend/` — React (Vite) + TypeScript SPA.

## Local setup

1. Copy `backend/.env.example` to `backend/.env` and fill in:
   - `DATABASE_URL` — from your Neon project's connection details
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` — from Cloudflare R2
   - `GEMINI_API_KEY` — from Google AI Studio (aistudio.google.com)
   - `JWT_SECRET`, `JWT_REFRESH_SECRET` — any long random strings
2. Install LibreOffice locally (libreoffice.org) so PPT/Word/Excel → PDF conversion works in dev.
3. From the `learning-astra/` folder: `npm install`
4. Run migrations: `npm run db:migrate`
5. Seed the initial Super Admin: `npm run db:seed`
6. Start both apps: `npm run dev` (backend on :4000, frontend on :5173)
