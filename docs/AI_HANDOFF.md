# Nova project handoff

This file is the starting brief for the next developer or AI assistant. Read it, [`README.md`](../README.md), the complete [`BEGINNER_GUIDE.md`](BEGINNER_GUIDE.md), and [`CLAUDE.md`](../CLAUDE.md) before editing. Treat the user’s next instructions as the task; this file documents the current code and known gaps, not permission to deploy or spend money.

## Product

Nova is a Persian, right-to-left learning platform for students, teachers, and admins. It currently includes Python and English courses. The browser UI is a vanilla JavaScript application. The server is Node.js, and PostgreSQL is the intended persistent database. OpenRouter provides the AI model API; Cloudinary is the current demo media provider.

## Folder map

```text
public/                 Browser-only files; safe to serve publicly
  index.html            App shell
  app.js                UI, navigation, browser-side demo state
  styles.css            Visual design and responsive styles
api/                    Backend request handlers
  auth/                 Login, current-session, logout
  activity/             Study-time and quiz endpoints
  [...path].js          Shared Vercel Function entry for AI/media endpoints
lib/                    Shared backend logic
  database.js           PostgreSQL pool and TLS policy
  sessions.js           HttpOnly cookie sessions
  passwords.js          Password hashing
  authorization.js      Server-side identity/role checks
  demo-auth.js          Local-only demo accounts and gate
  media-storage.js      Provider-neutral media interface
  media-providers/      Provider-specific media code (Cloudinary now)
db/schema.sql           PostgreSQL tables and constraints
scripts/                Migration, initial-admin bootstrap, deployment preflight check
test/                   Security and architecture tests
docs/                   Handoff and operational documentation
server.js               Local/Node-host entry point and AI/media route dispatch
```

## Local development

Use Node.js 20.19 or later, work from this project folder, copy `.env.example` to `.env`, then run `npm install` and `npm run dev`. Open `http://127.0.0.1:3002`. The review-only accounts are documented in the README. They must never be enabled in production. `npm test` runs the automated suite; `npm run build` type-checks and produces Vite assets in `dist`.

Keep `.env` private. `.gitignore` excludes it. Share `.env.example`, never `.env`, screenshots that reveal secrets, or pasted API/database credentials. Do not add credentials to `public/`, source control, logs, or AI prompts.

## Backend and security rules

- The browser is untrusted. Derive identity and role from the server session; never accept a client-supplied role as authorization.
- Keep database access, API keys, signed upload credentials, and provider secrets in server-only environment variables.
- Use parameterized SQL, password hashing, HttpOnly session cookies, same-origin checks on mutations, TLS for hosted database connections, and least-privilege roles.
- Production must have `NOVA_DEMO_MODE=false`, `NODE_ENV=production`, a real `DATABASE_URL`, TLS enabled, and strong, unique admin credentials. Never ship demo passwords as real user accounts.
- `public/` contains only files intended to be downloaded by a visitor. The server allowlists three static paths; preserve that rule if adding assets.
- Never automatically publish AI-generated lessons. Teacher drafts must be reviewed and explicitly published by an authorized teacher/admin.
- Store media bytes in a media provider, not PostgreSQL. PostgreSQL stores IDs, URLs, ownership, lesson links, and moderation state.

## Current state and known gaps

- Login, sessions, roles, study-time API, quiz API, media API, and PostgreSQL schema foundations exist.
- The shared AI endpoint accepts a course subject and lesson context. Tutor and teacher prompts distinguish English from Python; both use the same OpenRouter integration. The course chooser appears before login, and the selected course controls the demo lesson data and course-specific tools.
- The PostgreSQL `courses` table includes subject, target language, instruction language, and level metadata so English and Python can share one course model. The demo course/lesson catalog is still seeded in browser demo data; add reviewed server-side course/lesson seeding and CRUD before production use.
- Course/lesson editing, approved teacher references, student completion/progress, and some analytics still use browser-side demo state; do not claim that all app data persists to PostgreSQL.
- Database lesson/quiz content must be seeded/synced before server-side quiz submission can work. A hosted database has not been connected or migrated by this project handoff.
- Admin account management/password reset workflows are not fully database-backed.
- Cloudinary is the only implemented media upload adapter. Local demo metadata/review can be held in ignored `data/media.json`; hosted media metadata uses PostgreSQL. An alternative provider requires its own adapter and browser upload protocol.
- `server.js` exports a shared request handler: `npm start` wraps it in a local Node server for Liara-style hosting, and `api/[...path].js` exposes AI/media routes to Vercel Functions. Existing auth, quiz, study, and health handlers are explicit Vercel functions. This is an adaptation that still needs a Vercel preview deployment and environment/database validation; do not call it deployment-certified.
- AI calls require `OPENROUTER_API_KEY` on the server, and outbound access/model availability must be checked from the eventual host.
- The student Knowledge Twin and teacher sandbox suggestion use the same OpenRouter integration. Knowledge estimates are provisional and currently stored in browser local storage only; they are not shared across devices or persisted in PostgreSQL yet. Read [`KNOWLEDGE_TWIN_OVERVIEW.md`](KNOWLEDGE_TWIN_OVERVIEW.md) for scope and limitations.
- Local demo sessions are stored in memory and disappear when the server restarts. They are not persistent accounts.
- The in-app `راهنما` button is available throughout authenticated pages and describes the current role’s pages and demo limits.
- `npm run deploy:check` checks production variable presence without printing values. It is a configuration preflight only; it does not contact PostgreSQL or certify product readiness.

## Safe order for continuing after database selection

1. Confirm the chosen Node host, PostgreSQL provider, database region, and whether app-to-database traffic can use a private network/TLS.
2. Configure a separate staging database and add its connection string to the host’s private environment settings. Do not paste it into chat.
3. Run `npm run db:migrate` once against staging, then create the first admin with `npm run db:bootstrap-admin` using temporary environment variables. Remove the bootstrap password afterward.
4. Implement and verify persistence for courses, modules, lessons/content blocks, teacher guidance/sources, quiz definitions/attempts, progress, and user administration. Plan a reviewed import for demo course data; database connection does not import browser localStorage automatically.
5. Verify role boundaries, login/logout, data persistence after refresh/restart, quiz scoring, AI context, media moderation, backups, and restore on staging before production.
6. Keep the Cloudinary demo adapter separate from any future Iranian provider implementation. Test the selected host’s network access to OpenRouter and the media provider.

## Instructions for an AI continuing the project

Before coding, inspect the relevant files and report the exact workflow/data currently involved. Make small changes that preserve the local demo. Do not invent database credentials or provider details. Never read, print, or commit `.env`; ask the owner to place secrets in private environment settings. Do not deploy, run migrations against production, or modify live services unless explicitly requested. When done, summarize changed files, manual setup still required, checks actually performed, and known limitations.
