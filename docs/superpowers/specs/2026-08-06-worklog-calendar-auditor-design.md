# Worklog Calendar Auditor — Design

**Date:** 2026-08-06  
**Status:** Approved  
**Repo:** jira-assistant (greenfield)

## Problem

Need a personal localhost web app to connect to Jira Cloud via OAuth and audit my own worklogs visually for any date range (up to ~3 months), similar in spirit to jiraassistant.com but scoped to view-only calendar audit.

## Goals

- Connect to Jira Cloud with OAuth 2.0 (3LO)
- Pick a from/to date range (max 93 days)
- See a calendar covering that range with hours per day
- Expand a day to see worklogs (issue key, summary, time, comment)
- Clean, calm, Google Calendar–like UI (clear hierarchy, lots of space, one primary action)

## Non-goals (v1)

- Create / edit / delete worklogs
- Other users’ worklogs, team reports, Tempo
- Multi-user hosting, cloud deploy, browser extension
- Gap rules vs daily hour targets
- Marketplace distribution

## Decisions

| Topic        | Choice                                           |
| ------------ | ------------------------------------------------ |
| Jira         | Cloud only                                       |
| Access       | View / audit only                                |
| Navigation   | Date-range picker first → calendar for that span |
| Day cell     | Total hours + expandable worklog list            |
| Hosting      | Personal localhost only                          |
| Architecture | Vite + React UI + small Node API                 |
| OAuth grant  | Resource (site-restricted)                       |
| Distribution | Not sharing (private app)                        |
| Max range    | 93 days                                          |
| Timezone     | Browser local timezone                           |
| Week start   | Monday                                           |

## Architecture

```text
Browser (Vite + React :5173)     Local API (Node + Hono :8888)
─────────────────────────────    ──────────────────────────────
Connect ───────────────────────► GET /auth/jira → Atlassian
                                 GET /auth/callback → session cookie
Calendar ◄───────────────────── GET /api/me
Day detail ◄─────────────────── GET /api/worklogs?from=&to=
                                 (proxies Jira Cloud REST)
Logout ──────────────────────── POST /api/logout
```

### Repo layout

- `apps/web` — Vite + React + TypeScript UI
- `apps/api` — Hono (or Express) OAuth, session, Jira proxy
- Root `yarn` workspaces; `yarn dev` runs both
- Secrets in root `.env` (gitignored); `.env.example` committed without secrets

### Boundaries

- Client secret and refresh token never exposed to the browser
- Session: httpOnly cookie, `SameSite=Lax`
- API is the only Jira caller

## OAuth & session

1. Atlassian OAuth 2.0 (3LO) app, Resource grant, Not sharing
2. Callback: `http://localhost:8888/auth/callback` (exact match)
3. Scopes (read-only): `read:jira-work`, `read:jira-user`, `offline_access` (confirm against current Atlassian docs at implement time)
4. Flow: `/auth/jira` → consent → `/auth/callback` exchanges code → `accessible-resources` → store `cloudId` + tokens in server session → redirect to web origin
5. CSRF: validate OAuth `state`
6. Expired access token: refresh once; failure → 401 → UI reconnects
7. Logout clears session

### Required `.env` (root)

```bash
ATLASSIAN_CLIENT_ID=
ATLASSIAN_CLIENT_SECRET=
ATLASSIAN_REDIRECT_URI=http://localhost:8888/auth/callback
SESSION_SECRET=
API_PORT=8888
WEB_ORIGIN=http://localhost:5173
```

## Worklog data flow

`GET /api/worklogs?from=YYYY-MM-DD&to=YYYY-MM-DD`

1. Validate session, `from ≤ to`, span ≤ 93 days
2. JQL: issues with `worklogAuthor = currentUser()` and `worklogDate` in range
3. Paginate issue search
4. For each issue, fetch worklogs; keep author = current user and local calendar day in range
5. Group by local `YYYY-MM-DD` (timezone from `X-Timezone` or `tz` query)
6. Return day-keyed payload

### Response shape

```ts
{
  from: string;
  to: string;
  totalSeconds: number;
  days: Record<
    string,
    {
      totalSeconds: number;
      worklogs: Array<{
        id: string;
        issueKey: string;
        issueSummary: string;
        started: string;
        timeSpentSeconds: number;
        comment: string | null;
      }>;
    }
  >;
}
```

Also: `GET /api/me` → display name, account id, site name.

## UI

### Screens

1. **Disconnected** — product name, short subtitle, “Connect to Jira”
2. **Connected** — header (site, user, Logout) + range controls + summary + calendar + day detail

### Calendar

- Default range: start of current month → today
- Apply validates span ≤ 93 days inline
- Mon–Sun week grid for days in range
- Day cell: date + hours (or em dash if zero); subtle intensity by hours
- Click day → side panel: issue key (link to Jira), summary, time, comment, start time
- Loading / empty / error states; keep prior calendar on validation error

### Visual language (Google-like)

- Light surface, quiet chrome, one blue primary (`#1a73e8`-class)
- Clear typography hierarchy; generous whitespace
- No decorative cards, heatmaps-as-product, or dashboard clutter
- Desktop-first; usable on narrow widths without mobile-first polish

## Errors

| Case                     | Behavior                              |
| ------------------------ | ------------------------------------- |
| OAuth cancel / bad state | Message + stay disconnected           |
| No Cloud site            | Clear error after callback            |
| Refresh fail             | 401 → Connect again                   |
| Invalid / overlong range | 400 + inline UI hint; keep prior data |
| Jira 429                 | Short backoff then user-facing retry  |
| Partial fetch failure    | Fail whole request; retry             |
| Empty comment            | Show “No comment”                     |

Never log tokens or secrets.

## Testing

- Unit: range validation, day grouping, duration formatting
- API: mocked Jira client; 401 without session; 400 bad query
- Manual: connect/logout, default month, custom range, day expand, over-93 rejection, reconnect after revoke

## Success criteria

- Local `yarn dev` → Connect → see own worklogs on a range calendar
- Day expand matches Jira for sampled days
- Secrets never in git or browser storage
