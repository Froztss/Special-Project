# Backend Implementation Plan — 5 Groups, Multiple Tasks Each

Session goal: implement the **whole backend** for the [SRS](./SRS.md) — the JSON REST API under `/api` (SRS §6.2) on Express 5 + TypeScript with MySQL. Frontend work (child view, TTS, drag-and-drop, timers) is out of scope for this plan.

Groups run in dependency order: **1 → 2 → 3 → 4 → 5**. Tasks within a group are ordered too. Each group is one committable feature group (NFR-MAIN-03); tick tasks off as they land.

## Stack decisions

| Concern | Choice | SRS basis |
| --- | --- | --- |
| Database driver | `mysql2` (promise pool, parameterized queries only) | NFR-SEC-02 |
| Validation | `zod`, schemas shared via `packages/shared` | FR-AUTH-02, NFR-SEC-03 |
| Password hashing | `bcrypt` | FR-AUTH-03, NFR-SEC-01 |
| Sessions | `jsonwebtoken`, secret in env, 8 h expiry | FR-AUTH-04, NFR-SEC-01 |
| API tests | `vitest` + `supertest` | §9.2, NFR-SEC-06 |
| Config | `dotenv`, `.env.example` kept current, `.env` git-ignored | NFR-SEC-05 |

---

## Group 1 — Database foundation & API plumbing

- [x] **1.1 MySQL connection module** — `mysql2/promise` pool configured by env (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`); add vars to `apps/api/.env.example`; verify connectivity at startup and expose a DB check on `/api/health`. (NFR-SEC-02/05, NFR-REL-01)
- [x] **1.2 Schema script** — `schema.sql` with all §7.1 tables (`users`, `children`, `activities`, `schedules`, `tasks`, `picture_cards`, `settings`); unique `users.email`; unique `(child_id, schedule_date)`; FK cascades child → schedules → tasks and child → custom cards (§7.2); `npm run db:schema`.
- [x] **1.3 Seed script** — idempotent seeds: activity library with icons/categories (FR-SCH-01), default picture cards in Food / Emotions / Activities / Needs (FR-COMM-02), three demo children with sample schedules (§2.6); `npm run db:seed`.
- [x] **1.4 Uniform error handling** — central error middleware returning `{ "error": "message" }` with the §6.2 status codes (400/401/403/404/409/500); async route wrapper so rejections reach it; keep the existing JSON 404.
- [x] **1.5 Validation & CORS setup** — zod installed, shared schema home in `packages/shared`, a parse-or-400 middleware/helper for route bodies and queries; `cors` restricted to the configured frontend origin (NFR-SEC-03/04).

**Group exit criteria:** schema + seeds apply cleanly on local MySQL; API boots with DB connectivity reported; every error uses the uniform shape; validation and CORS plumbing ready for feature routes.

## Group 2 — Authentication & account (AUTH)

- [ ] **2.1 User data access** — parameterized queries: insert user, find by email, find by id; `password_hash` never leaves the data layer. (§7.3, NFR-SEC-02)
- [ ] **2.2 Register endpoint** — `POST /api/auth/register`: zod validation (required name, valid email, password ≥ 8, role in `caregiver`/`ot`/`sped_teacher`); bcrypt hash; 409 on duplicate email. (FR-AUTH-01/02/03)
- [ ] **2.3 Login endpoint** — `POST /api/auth/login`: verify credentials, return JWT signed with `JWT_SECRET`, 8 h expiry; generic 401 on bad credentials. (FR-AUTH-04, NFR-SEC-01)
- [ ] **2.4 Auth middleware** — `requireAuth`: verify Bearer token, 401 on missing/invalid/expired, attach user to request; applied to every non-public route. (FR-AUTH-05/07)
- [ ] **2.5 Current-user endpoint** — `GET /api/auth/me`: id, name, email, role only. (FR-AUTH-05)
- [ ] **2.6 Auth tests** — register/login/me happy path; weak input and duplicate email rejected; protected routes reject missing/expired tokens. (§9.2)

**Group exit criteria:** register → login → me works end to end; all non-public routes require a valid token; logout needs no server state (client clears token, FR-AUTH-06).

## Group 3 — Child profiles & activity library (CHILD)

- [ ] **3.1 Child data access** — ownership-scoped queries: every read/write filters by the authenticated `user_id`. (FR-CHILD-06, §7.3)
- [ ] **3.2 List & create** — `GET /api/children` (own only); `POST /api/children` with name, age, delay_domain, optional notes, predefined avatar. (FR-CHILD-01/02/05)
- [ ] **3.3 Read & update** — `GET, PUT /api/children/:id` with ownership checks; another user's child returns 404. (FR-CHILD-03/06)
- [ ] **3.4 Delete with cascade** — `DELETE /api/children/:id`; FK cascades remove schedules, tasks and custom cards. (FR-CHILD-04)
- [ ] **3.5 Activity library endpoint** — `GET /api/activities` serving the seeded library. (FR-SCH-01)
- [ ] **3.6 Isolation tests** — user B cannot list, read, edit or delete user A's children; cascade delete verified. (NFR-SEC-06)

**Group exit criteria:** full child CRUD works through the API with data isolation proven by tests.

## Group 4 — Schedules & tasks (SCH + TASK)

> **Status note:** Group 4 is implemented ahead of Groups 1–3 and runs on temporary mocks in `apps/api/src/mocks/` (Bearer token = mock user id; in-memory children/activities/schedules/tasks). Swap in the real JWT `requireAuth` and MySQL data access when Groups 1–3 land; route handlers, zod schemas and tests stay as they are. The 4.7 restart-persistence check is a `todo` test until the real DB exists.

- [x] **4.1 Schedule read** — `GET /api/schedules?childId=&date=` returning the schedule with tasks ordered by `position`; ownership via the child. (FR-SCH-02, FR-TASK-05)
- [x] **4.2 Schedule create & copy** — `POST /api/schedules` for child + date (409 on duplicate date); optional `copyFrom` date duplicates that day's tasks. (FR-SCH-02/09)
- [x] **4.3 Schedule update & delete** — `PUT, DELETE /api/schedules/:id` with ownership checks.
- [x] **4.4 Task add & edit** — `POST /api/tasks` (library activity or custom name + predefined icon, FR-SCH-08); `PUT /api/tasks/:id` for optional `start_time` (HH:MM), `duration_min`, and `position` reordering. (FR-SCH-04/05)
- [x] **4.5 Task remove** — `DELETE /api/tasks/:id` with ownership through the schedule's child. (FR-SCH-06)
- [x] **4.6 Complete & undo** — `PATCH /api/tasks/:id/complete`: set `done` + `completed_at` timestamp; undo returns to `pending` and clears it. (FR-TASK-01–04)
- [x] **4.7 Schedule/task tests** — create → add → reorder → complete → undo flow; duplicate-date 409; cross-user access rejected; state survives a server restart *(restart check deferred — see note)*. (NFR-REL-01, NFR-SEC-06)

**Group exit criteria:** the full schedule/task lifecycle works via API, ordered and timestamped, with ownership enforced at every step.

## Group 5 — Cards, progress, settings & hardening

- [ ] **5.1 Card listing** — `GET /api/cards?childId=` returning shared defaults plus that child's custom cards, grouped by category. (FR-COMM-01/02)
- [ ] **5.2 Custom card management** — `POST /api/cards` (label, category, predefined icon); `DELETE /api/cards/:id` for own custom cards only; hide support. (FR-COMM-06/07)
- [ ] **5.3 Progress endpoint** — `GET /api/progress/:childId?range=7d`: today's done/total/percentage, per-day completion for the last 7 days, recent completions with date/time. (FR-PROG-01–03)
- [ ] **5.4 Settings & profile** — get/update `font_size`, `contrast`, `sound_on` (persisted in DB); edit own profile name. (FR-SET-01/05)
- [ ] **5.5 Full API test suite** — vitest + supertest across all §6.2 endpoints: status codes, validation failures, and cross-user isolation on children, schedules, tasks and cards; test DB setup/teardown. (§9.2, NFR-SEC-06)
- [ ] **5.6 Docs & acceptance pass** — README setup steps incl. MySQL, complete `.env.example` (NFR-MAIN-02); verify MVP acceptance items 1–6 (§9.1) through the API alone.

**Group exit criteria:** every §6.2 endpoint implemented and tested; the backend alone satisfies SRS §9.1 items 1–6; docs complete.

---

## Explicitly not backend work

TTS and sentence bar (FR-COMM-03/04/05/08), countdown timers and sound cues (FR-TASK-06/07), child view UI and exit PIN (FR-CHD-*), drag-and-drop (FR-SCH-03), theme/font-size rendering (FR-SET-02/03/04) — all client-side; the backend only stores and serves their data.