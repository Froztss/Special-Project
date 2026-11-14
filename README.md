# Full-stack TypeScript starter

An npm workspace with React + Vite, Express, and a shared types package. Requires Node.js 22.12+ and npm.

```text
apps/
  api/
    src/
      db/pool.ts          # MySQL pool and connectivity checks
      lib/errors.ts       # Async routes and API errors
      lib/validate.ts     # Request validation helpers
      routes/health.ts    # GET /api/health
      app.ts              # Express application and CORS
      server.ts           # Environment, listener, shutdown
    scripts/
      schema.ts          # Apply schema.sql
      seed.ts            # Seed library and demo schedules
    schema.sql
    .env.example
    tsconfig.json
  web/
    src/
      lib/api.ts        # Typed API client
      App.tsx
      main.tsx
      styles.css
    .env.example
    index.html
    vite.config.ts
    tsconfig.json
packages/
  shared/
    src/index.ts        # Shared API contracts
    src/schemas.ts      # Shared Zod schemas
    tsconfig.json
package.json
tsconfig.base.json
```

## Run locally

Start MySQL and create the `special_project` database. Copy `apps/api/.env.example` to
`apps/api/.env`, then set your MySQL credentials and the frontend origin:

```sh
npm install
npm run db:schema
npm run db:seed
npm run dev
```

Open http://localhost:5173. The API listens on http://localhost:3001 and verifies its
database connection before starting. Vite proxies `/api` requests to the backend.
Copy `apps/web/.env.example` to `apps/web/.env` only if you need to customize the frontend.
On PowerShell systems that block npm.ps1, use `npm.cmd` instead of `npm`.
The seed-only demo caregiver has no login password; create a normal account to use the API.

## Commands

- `npm run dev`: run both apps with automatic reload.
- `npm run typecheck`: check every workspace.
- `npm run build`: compile shared schemas and the API, then build the frontend.
- `npm run db:schema`: create the database tables (the database itself must already exist).
- `npm run db:seed`: add the activity library, default cards, and demo schedules.
- `npm start`: run the compiled API after building.
- `npm run preview -w @starter/web`: preview the frontend build locally (no development API proxy).

## Extend the template

Add API routes under `apps/api/src/routes`, UI components under `apps/web/src/components`, and shared contracts and Zod schemas under `packages/shared/src`. Use shared schemas at API boundaries to validate user input.

## Deployment

Serve `apps/web/dist` using a static host and run the API with `npm start`. Configure a reverse proxy to forward `/api` to the backend on the same origin. For separate origins, set `VITE_API_BASE_URL` before building the frontend and configure explicit CORS permissions on the API. Vite environment variables are public build-time values; keep secrets in the backend environment.
