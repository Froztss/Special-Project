# Full-stack TypeScript starter

An npm workspace with React + Vite, Express, and a shared types package. Requires Node.js 22.12+ and npm.

```text
apps/
  api/
    src/
      routes/health.ts   # GET /api/health
      app.ts            # Express application
      server.ts         # Environment, listener, shutdown
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
    src/index.ts        # Shared contracts (type-only imports)
    tsconfig.json
package.json
tsconfig.base.json
```

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:5173. The API listens on http://localhost:3001. Vite proxies `/api` requests to the backend. Defaults work without environment files; copy each app's `.env.example` to `.env` to customize. On PowerShell systems that block npm.ps1, use `npm.cmd` instead of `npm`.

## Commands

- `npm run dev`: run both apps with automatic reload.
- `npm run typecheck`: check every workspace.
- `npm run build`: compile the API and build the frontend.
- `npm start`: run the compiled API after building.
- `npm run preview -w @starter/web`: preview the frontend build locally (no development API proxy).

## Extend the template

Add API routes under `apps/api/src/routes`, UI components under `apps/web/src/components`, and shared contracts under `packages/shared/src`. Shared exports are types only; use `import type`. Add runtime validation at API boundaries when introducing user input. No database or authentication provider is assumed.

## Deployment

Serve `apps/web/dist` using a static host and run the API with `npm start`. Configure a reverse proxy to forward `/api` to the backend on the same origin. For separate origins, set `VITE_API_BASE_URL` before building the frontend and configure explicit CORS permissions on the API. Vite environment variables are public build-time values; keep secrets in the backend environment.
