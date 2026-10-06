# Nova: local demo, Supabase, and Vercel

## Run the redesigned demo locally

1. Install Node.js 20.19 or newer.
2. In this project folder, run `npm install` once.
3. Copy `.env.example` to `.env` and keep `NOVA_DEMO_MODE=true` for the local demo. Add your OpenRouter and Cloudinary values only to `.env`; do not place them in `src/`, `public/`, or any `VITE_*` variable.
4. Run `npm run dev` and open `http://127.0.0.1:3002`.

The command starts Vite for the Figma frontend and the existing Node API server for backend requests. The first course-selection screen appears before login. Demo-role sign-in appears only when the local server reports demo mode enabled.

## Connect a Supabase database

Nova connects to Supabase through its PostgreSQL connection string using the existing private Node backend. It does not use the Supabase browser client or Supabase Auth, and it does not need `SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in the browser.

1. Create a Supabase project and open **Connect** in its dashboard.
2. Copy the **Shared Pooler, Transaction** connection string (port `6543`) for Vercel's serverless functions. Keep its username, project reference, host, and database name exactly as Supabase provides them. URL-encode special characters in the password.
3. Keep the full connection string private. Do not paste it into chat or source files.
4. Apply `db/schema.sql` with `npm run db:migrate` after setting `DATABASE_URL` and `DATABASE_SSL=require` in a private local environment. The migration creates the tables; it does not seed the sample courses or create students/teachers.
5. Create the first admin once with temporary `BOOTSTRAP_ADMIN_USERNAME`, `BOOTSTRAP_ADMIN_NAME`, and `BOOTSTRAP_ADMIN_PASSWORD` values, then run `npm run db:bootstrap-admin`. Remove those temporary values immediately.
6. `DATABASE_SSL=require` enforces encrypted database transport. The Vercel database client pool is capped at one connection per warm function instance.

Supabase's pooler is recommended for horizontally scaled/serverless functions; its transaction mode is on port 6543. See [Supabase: Connect to your database](https://supabase.com/docs/guides/database/connecting-to-postgres) and [Supabase: Connection pooling and limits](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits).

## Deploy to Vercel

1. Push this project to a Git repository and import it into Vercel.
2. Vercel uses `npm run build` and the `dist` output. The API functions stay under `api/` and use the same server handler and PostgreSQL services.
3. Add these values under Vercel **Project Settings → Environment Variables**, for Preview and Production separately:
   - `NODE_ENV=production`
   - `NOVA_DEMO_MODE=false`
   - `DATABASE_URL` (the Supabase transaction-pooler connection string)
   - `DATABASE_SSL=require`
   - `OPENROUTER_API_KEY`
   - `OPENROUTER_MODEL=nvidia/nemotron-3-ultra-550b-a55b`
   - `MEDIA_PROVIDER=cloudinary`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - optional `CLOUDINARY_FOLDER`, `OPENROUTER_HTTP_REFERER`, `OPENROUTER_APP_TITLE`
4. Keep bootstrap variables out of Vercel after the first admin is created. Never prefix server secrets with `VITE_`; those values are intended for browser bundles.
5. Deploy a Preview first. Check `/api/health`, sign in with a real database account, try the AI endpoint, and upload/review/play one test video. Then verify `/api/health` reports database configuration and production mode. A green build alone does not prove provider credentials, database connectivity, or AI/media access work.

Vercel supports Vite builds and functions in one deployment. See [Vercel: Vite](https://vercel.com/docs/frameworks/frontend/vite).

## What still needs real data and workflow work

- Supabase must be provisioned, secrets entered privately, schema migrated, and a first admin created. Those external account steps have not been run from this local project.
- Course, lesson-builder, teacher-guidance, and approved-source editing in this Figma UI are still design/demo data and are not yet wired to database CRUD endpoints. The existing schema has content-related tables, but the UI needs those endpoints and permission tests before production teaching data is entered.
- The displayed reports and sample learner metrics are not live analytics unless they are backed by the existing activity endpoints. Do not treat the illustrative numbers as student records.
- Cloudinary is the only implemented media upload adapter. Moving to an Iranian provider still requires its provider-specific adapter and resumable upload protocol.
- Run `npm run deploy:check`, `npm test`, and `npm run build` before a deployment. The configuration check does not connect to Supabase and does not certify production readiness.
