# Nova beginner guide

This guide is for the person reviewing Nova and for the owner setting up a hosted staging copy. It describes the current application honestly: the browser demo works locally, the Node backend has PostgreSQL-backed foundations, and some product workflows still need database integration. Do not put real student records into the local demo or a staging site.

## 1. What Nova is

Nova is a Persian, right-to-left multi-course learning platform. Python and English are selectable before login, and each course uses the same student, teacher, and admin roles with course-specific lessons and AI context. It has three roles:

- **Student:** studies lessons, completes practice and quizzes, sees progress, and asks the lesson-aware AI tutor for help.
- **Teacher:** manages course material, reviews learners’ activity, and uses the AI Studio to create lesson drafts.
- **Admin:** oversees users, course content, reports, and uploaded media.

The demo includes Python (10 modules and 28 lessons) and English (4 modules and 16 lessons). English practice uses short reading/dialogue examples, language exercises, and quizzes; Python includes code examples and a simplified browser exercise checker, not a full Python interpreter.

## 2. Opening the local app

1. Install Node.js 20.19 or later.
2. Open the project folder—the one containing `package.json`—in a terminal.
3. Copy `.env.example` and name the copy `.env` in that same folder. Keep `.env` private.
4. For a local UI review with no database, leave `DATABASE_URL` blank and use `NOVA_DEMO_MODE=true`.
5. Run `npm install`, then `npm run dev`.
6. Open `http://127.0.0.1:3002`. The development command starts the Vite front end and the Node backend together.
7. Sign in with the local-only sample accounts listed in `README.md`.

The server keeps demo sessions in memory; restarting it signs those users out. Some demo content and actions are held in that browser’s local storage. Do not mistake them for data in PostgreSQL.

## 3. What each page does

### Student pages

| Page | What to do there |
| --- | --- |
| Dashboard | Continue the course, see XP/level and streak, and review learning suggestions. Some cards are sample display data. |
| Courses | Choose the Python or English course from the public catalog before login, then open its modules. |
| Course and lesson | Read lesson blocks, view an approved video if available, try the simplified code exercise, and answer the three-question quiz. |
| Progress | Review course completion and quiz chart. Persistent reports require database-backed lesson/quiz data. |
| Knowledge Twin | Explain a concept and apply it to a new situation; Nova uses the existing OpenRouter connection to produce provisional estimates across learning dimensions. In this demo, the result is stored only in the current browser. |
| Yaar AI tutor | Ask about the current lesson and the selected subject. The tutor receives the active course and lesson context. The tutor should use lesson context and teacher-provided approved material; an OpenRouter key and server access are needed. |
| Profile | See XP, level, and achievements. Some achievement values are demo presentation. |

### Teacher pages

| Page | What to do there |
| --- | --- |
| Teacher dashboard | Overview of courses, quiz results, and study-time analytics. Clearly marked sample values are not live class data. |
| Course management | Edit lesson blocks, exercises, and quizzes; attach a video/resource to a lesson. Review drafts before publishing. |
| Students | View learner progress and study activity when real records are in PostgreSQL. |
| Reports | Review quiz and completion analytics when the related course and quiz data have been synchronized to the database. |
| AI Studio | Choose the reference lesson, topic, and level; provide teacher style and approved source material; request a structured lesson draft, including a suggested safe sandbox setup for teacher review. Preview suggestions do not run generated code. Review and edit before publishing. The AI does not publish for you. |

### Admin pages

| Page | What to do there |
| --- | --- |
| Admin dashboard | View a high-level overview; sample figures remain labeled as demo values. |
| User management | In a real system, administrators need database-backed create, disable, role-change, and password-reset actions. The current page’s user-management controls are still demo/local. |
| Course management | Review and manage course material and lesson media. |
| Reports | Review platform-level records after the associated workflows are connected to PostgreSQL. |

After login, a role-specific first-use walkthrough runs. A **راهنما** button in the page header opens a persistent guide for the signed-in role. The guide explains what each page does and identifies demo-only behavior.

## 4. Folder map

```text
public/       Browser UI only: index.html, app.js, styles.css
api/          Login/session, quiz, study-time handlers plus the Vercel catch-all
lib/          PostgreSQL, sessions, authorization, password, AI/media helpers
db/           PostgreSQL schema
scripts/      Migration, initial-admin setup, deployment configuration check
docs/         This guide and the AI handoff brief
test/         Automated security and code-structure checks
server.js     Node server entry point and AI/media route handling
```

Only the allowlisted files in `public/` are served as static files. Never move environment secrets or server code into `public/`.

## 5. Configuration terms

| Variable | Purpose | Where its real value belongs |
| --- | --- | --- |
| `NODE_ENV` | Set to `production` on the hosted app so production cookie/security behavior is used. | Private app environment settings |
| `NOVA_DEMO_MODE` | `true` only for local demo; set `false` on every hosted app. Production startup rejects an explicit `true`. | Private app environment settings |
| `DATABASE_URL` | PostgreSQL connection URL used by server-side code only. | Private app environment settings; never browser code or chat |
| `DATABASE_SSL` | Hosted database transport protection; use `require` or `verify-full`, never `disable` in production. | Private app environment settings |
| `DATABASE_CA_CERT` | Optional provider CA certificate when the database requires certificate verification. | Private app environment settings |
| `OPENROUTER_API_KEY` | Server credential for the tutor and teacher AI Studio. | Private app environment settings |
| `OPENROUTER_MODEL` | AI model identifier. Keep the model setting server-side. | Private app environment settings |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Current demo video upload integration. The API secret must stay server-side. | Private app environment settings |
| `MEDIA_PROVIDER` | Current implemented value is `cloudinary`. Another provider requires a code adapter first. | Private app environment settings |
| `PORT` | Listening port. The Node host usually supplies it; do not hard-code a different production port. | Host runtime or local `.env` |
| `BOOTSTRAP_ADMIN_USERNAME`, `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_PASSWORD` | Temporary values for the one-time initial admin command. | Only during initial database setup; remove immediately after use |

`.env.example` contains names and empty placeholders. `.env` contains actual local secrets and is ignored by `.gitignore`. Never upload `.env`, add it to Git, or paste it into an AI chat. In the cloud, enter secrets in the provider’s private environment/secret settings instead.

## 6. Safe hosted staging setup

For Liara, configure a Node.js app using the project root (the directory containing `package.json`), `npm run build` as its build command, `npm start` as the start command, and Node.js 20.19 or later. The server reads the host-provided `PORT`. For Vercel, `api/[...path].js` provides the same request handler for AI and media routes, while the existing auth, quiz, study-time, and health functions remain separate. The `vercel.json` builds the Vite app into `dist` and sets the AI/media function duration to 60 seconds. These are migration hooks, not proof of a successful hosted deployment: use a PostgreSQL database, enter host secrets privately, and check a Vercel preview deployment on the chosen plan before production.

The full role-based demo should be run locally with `NOVA_DEMO_MODE=true` and `NODE_ENV=development`. Demo accounts are disabled on Vercel and in production. Local demo media metadata/review status can use the ignored `data/media.json` file; Cloudinary still stores the video bytes. Set the Cloudinary variables in the local `.env` if you want to demonstrate video upload. Twin AI needs the OpenRouter key.

For an initial **deployment preview only**, a staging Node app can run with `NODE_ENV=production` and `NOVA_DEMO_MODE=false` before a database is attached. This confirms the host can run the server and show its login screen/static assets; it does not let you sign in to role dashboards or use backend actions. Do not enable demo accounts on a public host. `/api/health` reports `previewOnly: true` when production has no database URL. Do not invite students or enter real data.

When ready to connect staging PostgreSQL:

1. Create a separate staging database. Do not point staging at production data.
2. In the host dashboard, add `DATABASE_URL` from the database connection details, `DATABASE_SSL=require`, and `NOVA_DEMO_MODE=false`. Add OpenRouter/Cloudinary values only if those integrations are enabled. Do not put the database URL in `public/`.
3. Run `npm run deploy:check` in an environment that has the target app’s private variables. It prints pass/missing labels only, never secret values. It checks that configuration is present; it does not connect to the database or prove the product is ready.
4. Run `npm run db:migrate` once against staging to create the schema.
5. Temporarily set `BOOTSTRAP_ADMIN_USERNAME`, `BOOTSTRAP_ADMIN_NAME`, and a strong unique `BOOTSTRAP_ADMIN_PASSWORD` in a trusted environment. Run `npm run db:bootstrap-admin` once, then remove those temporary values and redeploy/restart.
6. Sign in with that new admin account and confirm the server uses the database-backed login.
7. Only after lesson, quiz, course, guidance/source, and progress persistence is implemented should the team migrate reviewed sample content and test the full student/teacher/admin workflows.

If the database provider blocks connections from the developer computer, do not expose the database to the public just to run a command. Use the provider’s private network or a trusted migration runner. Never run the migration command against a production database by accident.

## 7. Pre-deployment security checklist

- Hosted app explicitly has `NODE_ENV=production`, `NOVA_DEMO_MODE=false`, TLS-enabled PostgreSQL, and no bootstrap password left set.
- Demo account credentials are not shared for production and cannot authenticate in production.
- Secrets are stored privately; no real `.env` is in the source archive or version control.
- Database access is restricted to the app/migration runner where provider networking allows it; backups and a restore procedure are confirmed.
- App role is read from the server-side session, not a browser field. Test each student/teacher/admin permission using real database accounts.
- Check login/logout, unauthorized access, AI permissions, media review permissions, and data persistence after refresh/restart.
- Confirm course content and quiz definitions are seeded; the current browser-side sample is not automatically copied into PostgreSQL.
- Confirm OpenRouter and selected media provider are reachable from the actual host.
- Check `/api/health` for configuration flags. A successful health response means the server answered; it is not by itself production sign-off.
- Verify backup restoration and all workflows on staging before deploying to production or entering student data.
