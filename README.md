# Learning Astra

AI-powered training, knowledge and support platform for SastaSundar ("SastaSundar Learning Dashboard").
Created by Sourav Gupta.

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
