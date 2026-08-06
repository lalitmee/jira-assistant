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
6. Copy `.env.example` to `.env` and fill values (`SESSION_SECRET` via `openssl rand -hex 32`).

## Run

```bash
yarn install
yarn dev
```

- Web: http://localhost:5173  
- API: http://localhost:8888  

Open the web URL → **Connect to Jira** → pick a date range → review day totals and worklog details.

## Stack

- `apps/web` — Vite + React
- `apps/api` — Hono (OAuth, session cookie, Jira proxy)
