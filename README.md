# Nova

Nova is a Persian RTL Python-and-English learning demo with a Node.js server and a PostgreSQL backend foundation. The production login now uses database users and secure server sessions. PostgreSQL stores login/session records, study-time heartbeats, and media metadata; Cloudinary stores the demo video files.

The front end now uses the provided Figma Make React design. For local setup and the Supabase/Vercel deployment checklist, read [`docs/DEPLOY_SUPABASE_VERCEL.md`](docs/DEPLOY_SUPABASE_VERCEL.md). For the complete beginner guide to student, teacher, and admin pages plus the existing backend status, read [`docs/BEGINNER_GUIDE.md`](docs/BEGINNER_GUIDE.md). For another developer or AI continuing the work, read [`docs/AI_HANDOFF.md`](docs/AI_HANDOFF.md).

## Folder map

- `src/` — Figma React frontend (`App.tsx`, `index.css`, `main.tsx`).
- `dist/` — generated Vite frontend build; never edit by hand.
- `public/` — static assets and the legacy prototype. Never put secrets or server-only code here.
- `api/` — server API handlers for login, sessions, quiz, and study activity.
- `lib/` — shared backend services: database, authorization, password hashing, sessions, demo auth, and media adapters.
- `db/` — PostgreSQL schema.
- `scripts/` — database migration and one-time admin setup.
- `test/` — automated checks for backend/security foundations.
- `docs/` — project handoff and operational notes.
- `CLAUDE.md` — project instructions automatically useful when continuing in Claude Code.
- `server.js` — local/Node host entry point; serves only the allowlisted files in `public/` and dispatches API requests.
- `scripts/deploy-check.js` — verifies production settings are present without printing secrets. It does not connect to the database or certify feature readiness.

## Local setup

Requirements: Node.js 20.19 or newer. PostgreSQL is required for persistent accounts and production mode; the temporary local demo mode below works without it.

### Local demo accounts (no database)

For a review demo only, copy `.env.example` to `.env`, leave `DATABASE_URL` blank, and set `NOVA_DEMO_MODE=true`. Run `npm run dev`, then open `http://127.0.0.1:3002`.

| Role | Username | Password |
| --- | --- | --- |
| Student | `student` | `learn123` |
| Teacher | `teacher` | `teach123` |
| Admin | `admin` | `admin123` |

These accounts are development-only, held in server memory, and are disabled when `NODE_ENV=production`, when deployed to Vercel, or when a real database URL is configured. Never use these demo passwords for real accounts.

1. Copy `.env.example` to `.env` in this project folder.
2. Set `DATABASE_URL` to a PostgreSQL connection string and leave `DATABASE_SSL=require` for hosted databases. Do not paste credentials into chat or frontend code.
3. Set `BOOTSTRAP_ADMIN_USERNAME`, `BOOTSTRAP_ADMIN_NAME`, and `BOOTSTRAP_ADMIN_PASSWORD` temporarily in `.env`.
4. In this folder, run:

   ```powershell
   npm install
   npm run build
   npm run db:migrate
   npm run db:bootstrap-admin
   ```

5. Remove the three `BOOTSTRAP_ADMIN_*` values from `.env`, then run `npm start`. The built app is served on the configured `PORT` (default 3000).

In database mode, the initial admin is created only by the one-time bootstrap command. User provisioning/reset screens still need to be moved to server-side database APIs before a real launch.

## Staging configuration

The Node server can be deployed as a staging preview before PostgreSQL is attached. This confirms the server and login screen/static assets load; it does not expose signed-in role pages or backend actions. Set `NODE_ENV=production` and `NOVA_DEMO_MODE=false` on every hosted app; without `DATABASE_URL`, login and saved backend operations remain unavailable and `/api/health` reports `previewOnly: true`. For staging with a database, set the database and integration secrets in the host’s private environment settings, run `npm run deploy:check`, then run the schema migration and one-time admin bootstrap. Remove the bootstrap password immediately afterward. `npm run deploy:check` checks variable presence and secure settings only; it does not connect to PostgreSQL or prove the whole product is ready.

## Current backend work

- Database login, role-bearing server sessions, logout, same-origin checks, password hashing, and login throttling use PostgreSQL. The server binds to localhost for development and all interfaces in production.
- AI, media signing, media upload registration, and media review check the session role on the server. Hosted media metadata/moderation uses PostgreSQL; local demo mode can use ignored `data/media.json` so the Cloudinary upload/review/playback flow works without a database.
- Study time is recorded as authenticated foreground heartbeats, capped per request. Teacher/admin analytics can read per-student study time and quiz aggregates from PostgreSQL. Quiz submissions are checked against a published database quiz and scored server-side; each lesson must first be synced to a `lessons.external_key` matching its UI key (such as `l2-1`) and have a published quiz row.
- A first-login walkthrough highlights different navigation and features for students, teachers, and admins. Completion is remembered in that browser.
- The database uses standard PostgreSQL. The shared Node request handler supports Liara-style `npm start` hosting and has a Vercel catch-all Function for AI/media endpoints, alongside explicit auth/activity functions. This provides a migration path; a hosted preview and provider-specific environment/database setup still need validation.

## Media provider migration

Cloudinary is the configured demo adapter (`MEDIA_PROVIDER=cloudinary`). Cloudinary credentials stay on the server; uploads use signed, chunked transfers, with a 500 MB UI cap subject to the Cloudinary account's own limits. With local demo mode enabled and no database configured, media metadata and teacher/admin review status are stored in the ignored `data/media.json` file so the upload-review-student playback flow can be demonstrated locally. Hosted mode uses PostgreSQL for media metadata. The database records a provider slug, provider asset ID, URL, lesson key, moderation status, and metadata; the registration path now uses the adapter's playback URL and generic provider ID.

`lib/media-storage.js` defines the adapter boundary. To move to an Iranian S3-compatible object store or video platform, a provider adapter still needs to implement upload-intent creation/signing, asset validation, deletion, and playback URL generation, and the upload UI must use that provider's upload/resume protocol. Cloudinary remains the only implemented upload adapter; setting `MEDIA_PROVIDER` to another name does not switch providers by itself. PostgreSQL stores media references, not the video bytes.

The Node entry point now exports the same request handler for local Liara-style Node hosting and the Vercel catch-all API function at `api/[...path].js`. Vercel's existing explicit auth, quiz, study, and health functions remain separate. This is deployment plumbing, not a deployment certification: Vercel requires production environment variables and PostgreSQL, demo accounts are intentionally disabled there, and hosted preview behavior still needs to be checked on the selected plan. Liara can start the app with `npm start` and its runtime `PORT`.

## What remains before production

This work is not a finished backend or deployment-ready release. Lesson/course builder content, teacher guidance and approved AI sources, and general student completion/progress are still primarily browser-side demo data. Admin user creation/role changes and password resets also need database-backed endpoints and UI wiring. The lesson/quiz content has not been seeded into PostgreSQL, and we have not run migrations against your provider database or verified OpenRouter/Cloudinary connectivity from a hosted Iranian environment.

Next deployment steps: choose the Node host and managed PostgreSQL plan, configure private environment variables in the provider dashboard, run the migration and bootstrap once, then finish and test the remaining database-backed app workflows before inviting real students. Keep staging and production databases separate and test backup restoration before launch.
