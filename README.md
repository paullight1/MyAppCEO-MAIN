# MyAppCEO

Standalone repository for the MyAppCEO platform. Three deployable apps plus the
shared database and type definitions they all agree on.

```
.
├── myappceo/    # Web app — React 19 + Vite + Tailwind (port 3004)
├── admin/       # Admin panel — React 19 + Vite + Tailwind (port 3003)
├── backend/     # API — NestJS + Drizzle (port 3001)
├── packages/
│   └── types/   # Shared TypeScript contracts (ApiResponse, DashboardOverview, …)
└── supabase/    # Migrations and schema for the shared Postgres database
```

Each app has its own `package.json`, lockfile, and `node_modules` — they are
installed and deployed independently. The root `package.json` only delegates.

## Setup

```bash
npm run install:all          # installs backend, admin, and myappceo
```

Then copy the env templates and fill them in:

```bash
cp myappceo/.env.example myappceo/.env
cp admin/.env.example admin/.env
# backend/.env is not committed — see backend/README.md for required keys
```

## Running

```bash
npm run dev            # web app        → http://localhost:3004
npm run dev:admin      # admin panel    → http://localhost:3003
npm run dev:backend    # NestJS API     → http://localhost:3001
```

Both frontends proxy `/api` to `VITE_API_PROXY_TARGET` (default `:3001`) in dev,
so run the backend alongside them for API-backed features.

## Building

```bash
npm run build          # myappceo → myappceo/dist
npm run build:admin    # admin    → admin/dist
npm run build:backend  # backend  → backend/dist (entry: dist/backend/src/main.js)
npm run typecheck      # tsc --noEmit across both frontends
```

## How the three relate

- **Web and admin share one Supabase project and one backend.** There is no
  separate admin key — admin capability comes from the signed-in user's role,
  enforced by RLS and `utils/adminRoles.ts`.
- **The admin panel is not reachable from the web app's routes.** The web
  sidebar links out to `VITE_ADMIN_URL` (defaults to `http://localhost:3003`)
  for users whose role grants admin access.
- **`packages/types` is imported by relative path** from both the frontends and
  the backend. It is source-only TypeScript, not a built package.
