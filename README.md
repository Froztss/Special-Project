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

### Child profiles and activity library (temporary mocks)

Group 3 currently shares the in-memory data and mock authentication used by schedules/tasks. Use `Authorization: Bearer 1` for Alice (children Mia and Leo) or `Authorization: Bearer 2` for Bob (child Ava). These tokens are development fixtures, not JWTs. All changes reset when the server restarts. Group 1 provides the database foundation; these feature routes still need MySQL integration, JWT authentication from Group 2, and custom-card cascade verification. The mock users/children are separate from MySQL seed records. See [the backend plan](docs/BACKEND_TASKS.md).

| Method and path | Response |
| --- | --- |
| `GET /api/children` | `200`, array of the caller's children (empty array if none) |
| `POST /api/children` | `201`, created child |
| `GET /api/children/:id` | `200`, owned child |
| `PUT /api/children/:id` | `200`, updated child; accepts a nonempty partial update |
| `DELETE /api/children/:id` | `200`, `{ "success": true }`; removes mock schedules and their tasks |
| `GET /api/activities` | `200`, array of shared activities with `id`, `name`, `icon`, `category` |

All six endpoints require authentication. Missing/invalid tokens return `401`; invalid input returns `400`; missing or another user's child returns the same `404`. Errors use `{ "error": "message" }`. Ownership comes from authentication; client-supplied ids, ownership and timestamps are rejected in child bodies. Deletion confirmation belongs in the frontend.

Example create body:

```json
{ "name": "Sam", "age": 5, "delay_domain": "speech", "notes": "Likes music", "avatar": "🐼" }
```

The current validation choices are: trimmed name (1–100 characters), integer age (0–120), delay domain (`speech`, `motor`, `cognitive`, `social`, `general`), optional notes (up to 2,000 characters, or `null` to clear), and an optional avatar (`🦊`, `🐼`, `🐰`, `🐻`, `🐱`, `🐶`; defaults to `🦊` on create). A partial update preserves omitted fields. Shared TypeScript contracts are in [the shared package](packages/shared/src/index.ts); runtime schemas live in [the shared schemas](packages/shared/src/schemas.ts).

Run API tests with `npm run test -w @starter/api`. The suite covers child CRUD, validation, cross-user isolation, actual mock schedule/task removal, and use of newly created children and library activities in schedules. The MySQL/custom-card cascade and restart persistence checks are explicitly deferred.

### Adding features

Add API routes under `apps/api/src/routes`, UI components under `apps/web/src/components`, and shared contracts and Zod schemas under `packages/shared/src`. Use shared schemas at API boundaries to validate user input.

## Deployment

Serve `apps/web/dist` using a static host and run the API with `npm start`. Configure a reverse proxy to forward `/api` to the backend on the same origin. For separate origins, set `VITE_API_BASE_URL` before building the frontend and configure explicit CORS permissions on the API. Vite environment variables are public build-time values; keep secrets in the backend environment.
