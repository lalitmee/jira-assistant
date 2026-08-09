# Worklog Auditor

Personal localhost app to audit your Jira Cloud worklogs on a calendar.

## Setup

1. Create an Atlassian **OAuth 2.0 (3LO)** app ([Developer console](https://developer.atlassian.com/console/myapps/)).
2. Choose **Resource** access (site-restricted). Keep distribution **Not sharing**.
3. Authorization callback URL:

   `http://localhost:8888/auth/callback`

4. Permissions → Jira API → enable scopes used by the app:
   - `read:jira-work`
   - `read:jira-user`
   - `offline_access`
5. Copy Client ID + Secret from Settings.
6. Copy `.env.example` to `.env` and fill in your Atlassian OAuth values.

## Run

```bash
yarn install
yarn dev
```

- Web: http://localhost:5173
- API: http://localhost:8888

Open the web URL → **Connect to Jira** → pick a date range → review day totals and worklog details.

## Production (always-on, no Docker)

Single URL on port 8888 — same as the Docker setup, runs directly on your Mac:

```bash
yarn prod
```

Open **http://localhost:8888** (not 5173 — that is dev-only). Stop `yarn dev` first if it is running.

Or build once, then start:

```bash
yarn build
yarn start:prod
```

- App: http://localhost:8888
- Sessions persist in `./.data`
- Re-run `yarn prod` after code changes (builds automatically)

Run in the background:

```bash
nohup yarn start:prod >> .data/prod.log 2>&1 &
```

Stop with `kill` on that process, or `pkill -f "node apps/api/dist/index.js"`.

## Docker (always-on, single port)

Build and run in the background:

```bash
docker compose up -d --build
```

- App: http://localhost:8888
- OAuth callback stays `http://localhost:8888/auth/callback` (same as `.env.example`)
- Sessions persist in `./.data` on your machine (mounted into the container)

Useful commands:

```bash
docker compose logs -f    # follow logs
docker compose down       # stop
docker compose up -d --build   # rebuild after code changes
```

For active development with hot reload, use `yarn dev` instead.

## Stack

- `apps/web` — Vite + React
- `apps/api` — Hono (OAuth, session cookie, Jira proxy)
