# Instructions for Claude Code

Before changing Nova, read [`docs/BEGINNER_GUIDE.md`](docs/BEGINNER_GUIDE.md), [`docs/AI_HANDOFF.md`](docs/AI_HANDOFF.md), and `README.md`.

- The browser app lives in `public/`; server-only code, credentials, and database access must never go there.
- Preserve the explicit static-file allowlist in `server.js` and the server-side role/session checks.
- Never read, print, request, or commit `.env` values. The owner must add secrets through private local/host settings.
- Demo accounts are for local review only. Never enable them on a public host or for real students.
- Do not claim all data is database-backed. Current data persistence gaps are listed in `docs/AI_HANDOFF.md`.
- Do not deploy, run a production migration, or modify live infrastructure unless the owner explicitly asks.
- Keep AI-generated lesson content as an unpublished teacher draft until an authorized teacher/admin reviews and publishes it.
- After a change, report files changed, setup still needed, checks actually performed, and remaining limitations.
