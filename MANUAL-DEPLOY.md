# Nova Vercel manual deployment package

This source package preserves Nova's existing API and PostgreSQL-backed data layer. It contains no `.env` file, provider credential, database password, Vercel project link, or installed dependencies.

## Before deployment

The Vercel project needs private environment variables before sign-in and data-backed features can work:

- `NODE_ENV=production`
- `NOVA_DEMO_MODE=false`
- `DATABASE_URL` with the PostgreSQL connection string from the database provider
- `DATABASE_SSL=require`
- `OPENROUTER_API_KEY` and `OPENROUTER_MODEL=nvidia/nemotron-3-ultra-550b-a55b`
- `MEDIA_PROVIDER=cloudinary`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`

Optional values: `CLOUDINARY_FOLDER`, `OPENROUTER_HTTP_REFERER`, and `OPENROUTER_APP_TITLE`.

Add them in Vercel Project Settings → Environment Variables. Never put secret values in source files, `VITE_*` variables, or a public repository. Do not enable demo accounts on a public deployment. The dashboard's student, teacher, and admin statistics are clearly labelled sample data; they are not database records or usable passwords.

If a database is not connected yet, the frontend can be previewed but login, session persistence, student progress, and other database-backed API features will not work on Vercel. The local demo's in-memory data is not a substitute for persistent serverless sessions.

## Deploy from this source package

1. Extract the ZIP into a folder on your computer.
2. Install Node.js 20.19 or newer.
3. Open PowerShell in the extracted project folder and run `npm ci`.
4. Sign in with the Vercel CLI and link this folder to your Vercel project by running `npx vercel`. On first use, choose your Vercel team and the project (or create one).
5. Set the private environment variables listed above in the Vercel dashboard. Configure Preview and Production separately; use a separate non-production database for previews.
6. Run `npx vercel` to create a preview deployment. Check the build, `/api/health`, authentication, AI requests, and an approved Cloudinary video upload/playback flow.
7. Once those checks pass, run `npx vercel --prod` to publish the production deployment.

This project uses `npm run build`, Vite's `dist` output, and the API function in `api/[...path].js`. Uploading only the built `dist` folder would omit the backend and is not a working deployment of this app.

## Database setup

Vercel does not create or migrate the database automatically. Connect a PostgreSQL database, apply `db/schema.sql` from a secure local environment using `npm run db:migrate`, seed the sample course rows with `npm run db:seed:courses` if desired, and provision a real first admin account before using live authentication. See `docs/DEPLOY_SUPABASE_VERCEL.md` for the detailed sequence.

`npm run deploy:check` checks required production environment settings without printing their values. It does not test database reachability or prove that provider credentials work.
