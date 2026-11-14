# Backend Implementation Plan — 5 Grouped Tasks

Session goal: implement the **whole backend** for the [SRS](./SRS.md) — the JSON REST API under `/api` (SRS §6.2) on Express 5 + TypeScript with MySQL. Frontend work (child view, TTS, drag-and-drop, timers) is out of scope for this plan.

Tasks are listed in dependency order: **1 → 2 → 3 → 4 → 5**. Each group is one committable feature group (NFR-MAIN-03).

## Stack decisions

| Concern | Choice | SRS basis |
| --- | --- | --- |
| Database driver | `mysql2` (promise pool, parameterized queries only) | NFR-SEC-02 |
| Validation | `zod`, schemas shared via `packages/shared` | FR-AUTH-02, NFR-SEC-03 |
| Password hashing | `bcrypt` | FR-AUTH-03, NFR-SEC-01 |
| Sessions | `jsonwebtoken`, secret in env, 8 h expiry | FR-AUTH-04, NFR-SEC-01 |
| API tests | `vitest` + `supertest` (or Postman collection) | §9.2, NFR-SEC-06 |
| Config | `dotenv`, `.env.example` kept current, `.env` git-ignored | NFR-SEC-05 |

## Task 1 — Database foundation & API plumbing

**Scope**

- MySQL connection module (`mysql2/promise` pool) configured by env: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
- `schema.sql` for all §7.1 tables: `users`, `children`, `activities`, `schedules`, `tasks`, `picture_cards`, `settings`.
  - Unique `users.email`; unique `(child_id, schedule_date)` on `schedules`.
  - FK cascades: deleting a child removes its schedules, tasks and custom cards (§7.2).
- Seed script: activity library with icons/categories (FR-SCH-01), default picture cards in Food / Emotions / Activities / Needs (FR-COMM-02), three demo children with sample schedules (§2.6).
- npm scripts to apply schema and seeds (e.g. `db:schema`, `db:seed`).
- Central error handler: every error returns `{ "error": "message" }` with proper status codes (200/201/400/401/403/404/409/500, §6.2).
- CORS restricted to the configured frontend origin (NFR-SEC-04).
- Zod validation helper wired into route handling.

**Exit criteria:** schema + seeds apply cleanly on a local MySQL; API boots and reports DB connectivity; all errors use the uniform shape.

**SRS coverage:** §7, NFR-SEC-02/04/05, NFR-REL-01, NFR-MAIN-01/02.

## Task 2 — Authentication & account (AUTH)

**Scope**

- `POST /api/auth/register` — name, email, password (min 8), role (`caregiver` / `ot` / `sped_teacher`); server-side validation; 409 on duplicate email; bcrypt hash only.
- `POST /api/auth/login` — verify credentials, return signed JWT (8 h expiry).
- `GET /api/auth/me` — current user, never the password hash.
- `requireAuth` middleware protecting every non-public route; 401 for missing/invalid/expired tokens (supports FR-AUTH-07 on the client).
- Logout is client-side token clearing (FR-AUTH-06); no server state needed.

**Exit criteria:** register → login → me flow works; protected routes reject unauthenticated requests; duplicate email and weak input rejected with 400/409.

**SRS coverage:** FR-AUTH-01–07, NFR-SEC-01/03.

## Task 3 — Child profiles & activity library (CHILD)

**Scope**

- `GET /api/children` — only the authenticated user's children (FR-CHILD-06).
- `POST /api/children` — name, age, delay_domain, optional notes, predefined avatar (FR-CHILD-01/05).
- `GET, PUT, DELETE /api/children/:id` — ownership checked on every operation; delete cascades to schedules, tasks, custom cards (FR-CHILD-04).
- `GET /api/activities` — the seeded predefined library (FR-SCH-01).

**Exit criteria:** full CRUD works; isolation verified — user B cannot read, edit or delete user A's children (NFR-SEC-06).

**SRS coverage:** FR-CHILD-01–06, FR-SCH-01.

## Task 4 — Schedules & tasks (SCH + TASK)

**Scope**

- `GET /api/schedules?childId=&date=` — schedule with its ordered tasks; `POST /api/schedules` — one per child per date; `PUT, DELETE /api/schedules/:id`.
- Copy a schedule from another date (FR-SCH-09), e.g. a `copyFrom` date on create.
- `POST /api/tasks` — add activity or custom text activity (name + predefined icon, FR-SCH-08) to a schedule.
- `PUT /api/tasks/:id` — optional `start_time` (HH:MM), `duration_min`, `position` (reorder, FR-SCH-04/05); `DELETE /api/tasks/:id`.
- `PATCH /api/tasks/:id/complete` — mark done with `completed_at` timestamp (FR-TASK-03); undo back to pending (FR-TASK-04).
- Ownership enforced through the child → schedule → task chain on every route.

**Exit criteria:** create / edit / reorder / remove / complete / undo all work via API; completion state persists across server restarts (NFR-REL-01); cross-user access rejected.

**SRS coverage:** FR-SCH-02–09 (API side), FR-TASK-01–05.

## Task 5 — Cards, progress, settings & API test suite

**Scope**

- `GET /api/cards?childId=` — default cards plus that child's custom cards; `POST /api/cards` — label, category, predefined icon (FR-COMM-06); `DELETE /api/cards/:id` — custom cards only; hide support (FR-COMM-07).
- `GET /api/progress/:childId?range=7d` — today's done/total/percentage (FR-PROG-01), per-day completion for the last 7 days (FR-PROG-02), recent completions with date/time (FR-PROG-03).
- Settings persistence (font_size, contrast, sound_on) so settings survive sessions (FR-SET-05); profile name edit (FR-SET-01).
- API test suite covering auth, CRUD, status codes and cross-user data isolation (NFR-SEC-06, §9.2).
- Finalize README setup steps and `.env.example` (NFR-MAIN-02).

**Exit criteria:** every §6.2 endpoint implemented and tested; MVP acceptance items 1–6 (§9.1) demonstrable through the API alone.

**SRS coverage:** FR-COMM-01/02/06/07 (API side), FR-PROG-01–03, FR-SET-01/05, §9.2.

## Explicitly not backend work

TTS and sentence bar (FR-COMM-03/04/05/08), countdown timers and sound cues (FR-TASK-06/07), child view UI and exit PIN (FR-CHD-*), drag-and-drop (FR-SCH-03), theme/font-size rendering (FR-SET-02/03/04) — all client-side; the backend only stores and serves their data.