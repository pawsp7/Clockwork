# Clockwork

A small full-stack **world clock + stopwatch** dashboard.

- **`apps/server`** — Express + TypeScript API that serves DST-correct time for IANA timezones.
- **`apps/web`** — React + Vite dashboard that renders live world clocks and a stopwatch.

The project is an npm workspaces monorepo and runs entirely on the Node.js toolchain (no external services required).

## Requirements

- Node.js >= 20 (Node 22 recommended)
- npm 10+

## Getting started

```bash
npm ci        # install all workspace dependencies
npm run dev   # start the API (:4000) and web app (:5173) together
```

Then open http://localhost:5173. The Vite dev server proxies `/api/*` to the API on port 4000.

### Run the apps individually

```bash
npm run dev:server   # Express API on http://localhost:4000
npm run dev:web      # Vite dev server on http://localhost:5173
```

## Useful scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run API + web together (via `concurrently`). |
| `npm run build` | Type-check + build both apps for production. |
| `npm run typecheck` | Type-check both apps without emitting. |

## API

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/health` | Service health + uptime. |
| GET | `/api/cities` | Catalog of selectable cities with IANA timezones. |
| GET | `/api/time?tz=<IANA>` | Current DST-correct time for a timezone (400 on unknown tz). |

## Cloud Agent environment

`.cursor/environment.json` configures the Cursor Cloud Agent environment: `npm ci` on install and two
terminals (`server`, `web`) that launch the dev servers. The default base image already provides Node 22.
