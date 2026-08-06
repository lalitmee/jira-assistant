# Worklog Calendar Auditor Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Personal localhost app: Jira Cloud OAuth → date-range worklog calendar (view-only) with Google-clean UI.

**Architecture:** Yarn workspaces monorepo — `apps/web` (Vite + React + TS) and `apps/api` (Hono + TypeScript). API owns OAuth 3LO, httpOnly session, and Jira proxy. Web is UI only.

**Tech Stack:** Node 20, Yarn 1 workspaces, Hono, `iron-session` or encrypted cookie session, Vite, React 18, TypeScript, native CSS (no heavy UI kit).

## Global Constraints

- View-only; no worklog writes
- Max date span 93 days
- API port 8888; web 5173; redirect `http://localhost:8888/auth/callback`
- Secrets only in root `.env` (gitignored)
- Google-like UX: light, sparse, primary blue `#1a73e8`, Mon–Sun weeks, browser local TZ
- No fishy code: no token logging, no client-side secrets, no drive-by scope creep

## File map

| Path                         | Responsibility                          |
| ---------------------------- | --------------------------------------- |
| `package.json`               | Workspaces + `dev` script               |
| `.env.example`               | Documented env keys (no secrets)        |
| `apps/api/package.json`      | API deps                                |
| `apps/api/src/index.ts`      | Server entry, CORS, routes              |
| `apps/api/src/env.ts`        | Load + validate env                     |
| `apps/api/src/session.ts`    | Encrypt/decrypt session cookie          |
| `apps/api/src/auth.ts`       | OAuth start/callback/logout             |
| `apps/api/src/jira.ts`       | Jira Cloud client + worklog aggregation |
| `apps/api/src/dates.ts`      | Range validation + day grouping helpers |
| `apps/web/package.json`      | Web deps                                |
| `apps/web/vite.config.ts`    | Dev proxy `/api` + `/auth` → API        |
| `apps/web/src/main.tsx`      | React entry                             |
| `apps/web/src/App.tsx`       | Auth gate + layout                      |
| `apps/web/src/api.ts`        | Fetch helpers                           |
| `apps/web/src/components/*`  | RangeBar, Calendar, DayPanel, Header    |
| `apps/web/src/styles.css`    | Google-clean theme                      |
| `apps/api/src/dates.test.ts` | Unit tests for validation/grouping      |
| `README.md`                  | Run + Atlassian setup                   |

---

### Task 1: Monorepo scaffold + API env/session/OAuth shell

**Files:**

- Create: root `package.json`, `.env.example`, `README.md`
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/src/*` env/session/auth/index
- Create: `apps/web` Vite React TS skeleton + proxy

- [ ] **Step 1:** Create workspace root and API/web packages with `yarn` scripts (`dev`, `dev:api`, `dev:web`)
- [ ] **Step 2:** Implement env loader reading root `.env`; fail fast if required keys missing
- [ ] **Step 3:** Implement sealed session cookie (`session` httpOnly) storing tokens + cloudId + user profile fields
- [ ] **Step 4:** Implement `/auth/jira`, `/auth/callback`, `/api/logout`, `/api/me` (me returns 401 if no session)
- [ ] **Step 5:** Vite proxy `/auth` and `/api` to `http://localhost:8888`
- [ ] **Step 6:** Smoke: `yarn dev` opens web; Connect redirects to Atlassian (manual)

### Task 2: Worklog aggregation API

**Files:**

- Create/modify: `apps/api/src/jira.ts`, `apps/api/src/dates.ts`, route `GET /api/worklogs`
- Test: `apps/api/src/dates.test.ts`

- [ ] **Step 1:** Implement `assertDateRange(from, to)` → max 93 days
- [ ] **Step 2:** Implement Jira search JQL + paginated worklog filter/group by local day
- [ ] **Step 3:** Wire `GET /api/worklogs` with timezone header/query
- [ ] **Step 4:** Token refresh on 401 from Jira once per request chain
- [ ] **Step 5:** Unit-test range validation + grouping with fixed inputs

### Task 3: Google-clean calendar UI

**Files:**

- Create: `apps/web/src/components/Header.tsx`, `RangeBar.tsx`, `CalendarGrid.tsx`, `DayPanel.tsx`
- Modify: `App.tsx`, `styles.css`, `api.ts`

- [ ] **Step 1:** Disconnected + connected shells
- [ ] **Step 2:** Range bar (default month start → today), Apply, total hours
- [ ] **Step 3:** Mon–Sun grid for in-range days; intensity by hours; click → panel
- [ ] **Step 4:** Day panel lists worklogs with Jira issue links
- [ ] **Step 5:** Loading / empty / error / validation UX

### Task 4: First-look verification

- [ ] **Step 1:** `yarn install` && `yarn dev`
- [ ] **Step 2:** Manual OAuth + load current range
- [ ] **Step 3:** Fix blockers only; no scope creep

---

## Spec coverage check

- OAuth + session → Task 1
- Worklogs + 93-day cap → Task 2
- Calendar UI Google-clean → Task 3
- Errors / reconnect → Tasks 1–3
- Testing helpers → Task 2 unit tests + Task 4 manual

## Execution

Inline in this session (user requested first look immediately).
