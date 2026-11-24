# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A run club route planner — a full-stack app for creating, editing, and viewing cycling/running routes on a map. Users place waypoints on a MapLibre GL map, routes are calculated via OSRM, and elevation data comes from Open-Meteo.

## Commands

- **Dev server:** `bun run dev` (runs on http://localhost:3000)
- **Lint + typecheck:** `bun run check` (runs Biome check + tsc --noEmit)
- **Lint only:** `bunx biome check .` (add `--write` to autofix)
- **Unit/integration tests:** `bun test` (uses Bun's built-in test runner)
- **Single test file:** `bun test tests/unit/geo.test.ts`
- **E2E tests:** `bunx playwright test` (Playwright against localhost:3000)
- **DB migrations:** `bunx prisma migrate dev` (dev), `bunx prisma migrate deploy` (prod)
- **Generate Prisma client:** `bunx prisma generate`

## Architecture

**Runtime:** Bun (server, bundler, test runner). No Vite/webpack — Bun natively serves the HTML entrypoint with Tailwind plugin.

**Server** (`src/server.ts`): Bun.serve routes `/api/*` to Hono and `/*` to the client HTML entrypoint.

**API layer** (`src/api/`): Hono app with CRUD routes at `/api/routes`. Request validation uses Zod schemas from `src/lib/validation.ts`.

**Services** (`src/services/`):
- `route.service.ts` — Prisma CRUD operations for Route model
- `osrm.service.ts` — calls public OSRM API for route geometry between waypoints (foot/bike profiles)
- `elevation.service.ts` — calls Open-Meteo API for elevation data, samples coordinates and batches requests

**Client** (`src/client/`): React 19 SPA with react-router-dom. Key pages: RouteListPage, RouteEditorPage, RouteDetailPage.

**Map integration**: MapLibre GL with `@maplibre/maplibre-gl-directions` for interactive waypoint-based routing. Custom hooks in `src/client/hooks/` manage map state, directions, elevation, and waypoint markers.

**Database**: SQLite via Prisma. Schema in `prisma/schema.prisma`. Single `Route` model stores GeoJSON and waypoints as JSON strings.

**Path aliases**: `@/*` maps to `./src/*` (configured in tsconfig.json).

## Code Style

- Biome for formatting and linting (tabs, not spaces)
- TypeScript strict mode
- File extensions required in imports (e.g., `./foo.ts`, not `./foo`)
