# Docker Single-Port Deployment — Design

**Date:** 2026-08-06  
**Status:** Approved

## Goal

Run Worklog Auditor always-on in Docker on a single URL (`http://localhost:8888`) without `yarn dev`, while keeping `yarn dev` for active development.

## Architecture

```
Docker container (restart: unless-stopped)
  Port 8888 → http://localhost:8888

  Hono API
    /auth/*  → OAuth
    /api/*   → worklogs, session
    /*       → Vite production build (SPA fallback)

  Volume: ./.data → /app/.data (session persistence)
  Env:    .env (OAuth secrets)
```

## Files

| File                 | Purpose                                              |
| -------------------- | ---------------------------------------------------- |
| `Dockerfile`         | Multi-stage build: yarn build → Node runtime         |
| `docker-compose.yml` | Port map, env overrides, volume, restart policy      |
| `.dockerignore`      | Exclude node_modules, .git, .data from build context |

## App changes

1. **Session store** — honor `DATA_DIR` env (default: repo `.data/` for dev).
2. **Static web** — when `NODE_ENV=production`, serve `WEB_DIST` (default `apps/web/dist` relative to monorepo layout).
3. **Auth link** — use relative `/auth/jira` instead of hardcoded localhost URL.

## Environment (Docker)

| Variable                 | Value                                 |
| ------------------------ | ------------------------------------- |
| `NODE_ENV`               | `production`                          |
| `API_PORT`               | `8888`                                |
| `WEB_ORIGIN`             | `http://localhost:8888`               |
| `ATLASSIAN_REDIRECT_URI` | `http://localhost:8888/auth/callback` |
| `DATA_DIR`               | `/app/.data`                          |
| `WEB_DIST`               | `/app/web-dist`                       |

Compose `environment` overrides `.env` values that differ from dev (e.g. `WEB_ORIGIN`).

## Usage

```bash
docker compose up -d --build   # first time / after changes
open http://localhost:8888
docker compose logs -f         # optional
docker compose down            # stop
```

## Out of scope

- Remote/cloud deployment
- HTTPS / custom domain
- Dev hot-reload container
