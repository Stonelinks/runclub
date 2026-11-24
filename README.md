# Run Club Route Planner

A web app for planning running and cycling routes on an interactive map.

## Features

- Place waypoints on a MapLibre GL map to build routes
- Automatic route calculation between waypoints via OSRM (foot and cycling profiles)
- Elevation profiles with gain/loss stats from Open-Meteo
- Drag-to-reorder and delete waypoints
- Save, edit, and delete routes
- Distance and elevation stats displayed in miles/feet

## Tech Stack

- **Runtime:** [Bun](https://bun.sh) (server, bundler, test runner)
- **Backend:** [Hono](https://hono.dev) + [Prisma](https://www.prisma.io) (SQLite)
- **Frontend:** React 19, React Router, [MapLibre GL](https://maplibre.org), Tailwind CSS
- **Validation:** Zod
- **Language:** TypeScript (strict mode)

## Getting Started

Prerequisites: [Bun](https://bun.sh) v1+

```bash
bun install
bunx prisma migrate dev
bun run dev
```

The app runs at http://localhost:3000.

## Docker

```bash
docker compose up --build
```

This builds the app and runs it on port 8711 with a persistent SQLite volume.

## Testing

```bash
# Unit and integration tests
bun test

# Single test file
bun test tests/unit/geo.test.ts

# E2E tests (Playwright, requires the dev server or starts one automatically)
bunx playwright test

# Mobile-only E2E (Pixel 7 emulation, e2e/mobile.spec.ts)
bunx playwright test --project=mobile-chromium
```

## Linting

```bash
bun run check          # Biome lint + TypeScript type check
bunx biome check --write .  # Autofix lint issues
```

## API Endpoints

All routes are under `/api/routes`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/routes` | List all routes |
| POST | `/api/routes` | Create a route |
| GET | `/api/routes/:id` | Get a single route |
| PUT | `/api/routes/:id` | Update a route |
| DELETE | `/api/routes/:id` | Delete a route |
| POST | `/api/routes/elevation` | Get elevation data for a LineString geometry |
