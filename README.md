# Velozity Client Project Dashboard

A real-time project and task dashboard for Velozity Global Solutions.

## Stack

- React, TypeScript, Vite
- Node.js, Express, Socket.IO
- PostgreSQL 16 and Prisma 6
- JWT access tokens and HttpOnly refresh-token cookies
- `node-cron` overdue processing

## Structure

- `apps/api`: Express API, Prisma schema/migrations/seed, Socket.IO server, scheduler
- `apps/web`: React dashboard and API/Socket.IO clients
- `docker-compose.yml`: local PostgreSQL

## Prerequisites and Setup

Use Node.js 20+, npm, and Docker Desktop.

```powershell
docker compose up -d
npm install
npm run prisma:generate -w apps/api
npm exec -w apps/api prisma migrate deploy
npm run prisma:seed -w apps/api
```

The local API environment is in `apps/api/.env`. It uses PostgreSQL on `localhost:5433`, API port `4000`, and frontend port `5173`. Never use the development secrets in production.

## Run

```powershell
npm run dev -w apps/api
npm run dev -w apps/web
```

Or run both workspaces with `npm run dev`.

Demo accounts use password `Password123!`:

- `admin@velozity.com`
- `priya@velozity.com` and `rahul@velozity.com` (PM)
- `amit@velozity.com`, `neha@velozity.com`, `vikram@velozity.com`, `sneha@velozity.com` (Developer)

## API and Authorization

Authentication endpoints are under `/api/auth`. Projects, tasks, dashboard summaries, and notifications are under `/api/projects`, `/api/tasks`, `/api/dashboard`, and `/api/notifications`. Admins can access all records. PMs can access their owned projects and tasks. Developers can access and update only assigned tasks. Authorization is enforced by the API and Socket.IO server, not the frontend.

Task queries support `status`, `priority`, `projectId`, `fromDate`, and `toDate`. Notifications are user-scoped and support listing, unread counts, mark-one-read, and mark-all-read.

## Realtime and Scheduled Work

Socket.IO authenticates with the JWT, enforces project-room access, emits task and notification events, tracks unique online users, and sends the latest 20 relevant activities after connection for offline catch-up. The overdue job runs every five minutes, marks eligible tasks once, records `TASK_OVERDUE`, and emits `task:overdue`.

Presence is in memory and is suitable for one API instance only. Horizontal scaling requires Redis or another shared store and a Socket.IO adapter.

## Schema and Limitations

The schema contains users, role-scoped projects, tasks, activities, notifications, refresh tokens, and persisted task-overdue state. Access tokens are held in frontend memory; refresh tokens are hashed in PostgreSQL and sent as HttpOnly cookies. There is no shared presence store, background queue, or production secret management in this assessment build.

## Verification

```powershell
Invoke-WebRequest http://localhost:4000/health
npm run build -w apps/api
npm run build -w apps/web
```

For manual verification, log in as Admin, PM, and Developer; test project/task visibility and status updates; create an assigned task; move a task to `IN_REVIEW`; mark notifications read; reconnect Socket.IO for catch-up; and confirm unauthorized API and project-room requests return `403`.

## Architecture Explanation

The application uses a small workspace monorepo so the browser and API can evolve independently while sharing a single local database. Express owns authentication, validation, role authorization, relational queries, notifications, and dashboard aggregation. Prisma keeps database access explicit and provides migrations for schema changes such as the persisted overdue flag. Access tokens are short-lived JWTs held in browser memory, while refresh tokens are hashed in PostgreSQL and transported only through an HttpOnly cookie. Socket.IO authenticates the same access token and applies the same project visibility rules before allowing room membership or event delivery. Task mutations write their activity and notification records before emitting events, so reconnecting clients can request a bounded activity catch-up rather than relying on polling. A cron job processes overdue tasks independently of page traffic and uses the flag to avoid duplicate activity records. The dashboard consumes API-filtered task data and URL query parameters, keeping authorization and filtering decisions on the server. In-memory presence is intentionally simple for the assessment and must be replaced with Redis-backed presence for multiple API instances.
