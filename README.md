# LifeOS

LifeOS is a local-first operating system for life: one place where the important parts of a personal world come together.

Instead of scattering information across notes, cloud drives, calendars, messaging apps, and disconnected services, LifeOS models life as a connected graph of meaningful entities: people, homes, trips, documents, projects, finances, memories, goals, and more.

Every entity is first-class. A passport is not just a PDF; it is an object with an expiration date, renewal history, related trips, appointments, and documents. A home is not just an address; it connects to a lease, expenses, utilities, maintenance, and the people who live there.

The product exists to close open loops. Most stress does not come from having too much to do; it comes from unresolved thoughts scattered across the mind and devices. LifeOS captures ideas before they are forgotten, organizes documents where they belong, keeps projects moving with clear next steps, and gives AI real personal context instead of isolated prompts.

## Tech Stack

- Monorepo: Turborepo
- Package manager: pnpm
- Frontend: React + Vite
- Backend: Hono
- RPC: oRPC
- Auth: Better Auth
- Database: PostgreSQL
- ORM: Drizzle
- UI: shadcn/ui, with ReUI as a shadcn-compatible component and workflow source

## Repository Structure

```txt
LifeOS/
  apps/
    web/                 # React + Vite LifeOS client
    api/                 # Hono backend API server

  packages/
    ui/                  # shadcn/ui + ReUI-compatible shared components
    db/                  # Drizzle schema, migrations, Postgres client
    auth/                # Better Auth config and auth helpers
    rpc/                 # oRPC routers/contracts/client helpers
    domain/              # LifeOS graph/entity models
    config/              # Shared tsconfig and future tooling config

  tooling/
    scripts/             # Repo scripts and future maintenance utilities

  docs/
    architecture/         # Architecture notes and decisions

  .codex/
    skills/              # Project-local stack skills and source notes
```

## Why React + Vite

LifeOS is primarily an authenticated, OS-style local-first application. It does not need SEO-friendly public pages as the main product surface, so React + Vite is the simpler default for fast local development and SPA-style interaction.

If LifeOS later needs public marketing pages, documentation, or SEO-focused content, those should be added as a separate app, likely `apps/marketing`, using Astro or another content-oriented framework.

## Package Boundaries

- `apps/web` owns the user-facing LifeOS app.
- `apps/api` owns the local/server API.
- `apps/worker` owns durable background document processing.
- `packages/domain` owns the core LifeOS concepts.
- `packages/db` owns Drizzle schema, migrations, and database access.
- `packages/auth` owns Better Auth setup and session helpers.
- `packages/rpc` owns type-safe API contracts and shared RPC helpers.
- `packages/access` owns the household-membership check used for canonical entities.
- `packages/storage` owns the provider adapter; it currently implements private Cloudflare R2 objects.
- `packages/files` owns upload intent, verification, signed retrieval, deletion, and file audit events.
- `packages/jobs` owns the Postgres-backed job queue and its queue contracts.
- `packages/document-previews` renders PDF first-page images locally without storage or authorization concerns.
- `packages/documents` owns the non-versioned document record workflow on top of entities and files.
- `packages/ui` owns reusable interface components.
- `packages/config` owns shared TypeScript and tooling configuration.

## Project Skills

This repo includes project-local Codex skills in `.codex/skills/` so future implementation work can load stack-specific guidance.

- `turborepo`: official Vercel Turborepo skill source notes.
- `react-vite`: React/Vite guidance, backed by the local React best-practices skill and a community Vite React skill source.
- `shadcn`: shadcn/ui workflow guidance, backed by the official shadcn skill.
- `reui`: ReUI skill installed from the official one-line installer.
- `better-auth`: official Better Auth skill source notes.
- `drizzle-postgres`: Drizzle/PostgreSQL skill source notes.
- `hono`: community Hono skill source notes, marked unofficial.
- `orpc-hono`: LifeOS-specific oRPC + Hono guidance based on official oRPC docs and the official oRPC LLM index at `https://orpc.dev/llms.txt`, because no official oRPC Codex skill was found.

ReUI skill install:

```bash
curl -fsSL https://mcp.reui.io/install | node -
```

The installer was run for this repo. The project keeps the ReUI skill under `.codex/skills/reui` and intentionally does not keep ReUI MCP configuration.

## Development

Install dependencies:

```bash
pnpm install
```

Create the local environment files:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/worker/.env.example apps/worker/.env
cp apps/web/.env.example apps/web/.env
cp packages/auth/.env.example packages/auth/.env
cp packages/db/.env.example packages/db/.env
```

Replace `BETTER_AUTH_SECRET` in `apps/api/.env` and `packages/auth/.env`
with the same high-entropy value. Generate one with:

```bash
openssl rand -base64 32
```

LifeOS expects PostgreSQL at
`postgresql://postgres:test@127.0.0.1:5432/lifeos`. If PostgreSQL is not
already running locally, start the included container:

```bash
docker compose up -d postgres
```

Apply the checked-in Drizzle migrations:

```bash
pnpm --filter @lifeos/db db:migrate
```

After changing a TypeScript schema, generate the migration with Drizzle and
then apply it:

```bash
pnpm --filter @lifeos/db db:generate
pnpm --filter @lifeos/db db:migrate
```

Generated files in `packages/db/drizzle/` are immutable. Never edit migration
SQL or metadata by hand. If generated output is wrong, correct the TypeScript
schema and regenerate; if it has already been applied, generate a follow-up
migration instead. The mandatory agent workflow is recorded in
[`AGENTS.md`](./AGENTS.md).

### Private document storage (Cloudflare R2)

Document originals are never public URLs. The API creates short-lived signed
R2 upload and download URLs only after it has checked canonical entity access.
For PDFs, LifeOS renders and stores a private first-page PNG preview in R2;
image documents use their private original object as the preview. The API
atomically queues PDF work in Postgres after verifying the upload, and
`apps/worker` renders it outside the upload request. The queue is provided by
pg-boss in its vendor-managed `pgboss` schema in the existing LifeOS database;
Redis is not required. Rendering is local and does not use AI.

Configure the same `R2_*` values in `apps/api/.env` and `apps/worker/.env`,
using a token scoped to the private bucket with Object Read and Object Write
permissions. Apply
`tooling/r2/cors.development.json` to the bucket for local direct uploads, and
add the deployed web origin before production. Do not expose any R2 credential
or a public bucket URL through `apps/web`.

Run all dev tasks:

```bash
pnpm dev
```

This starts the web app, API, and background worker. In production the API and
worker must both run, with the worker using the same `DATABASE_URL` and R2
bucket as the API.

Open [http://127.0.0.1:5173/login](http://127.0.0.1:5173/login). The Hono API
runs at `http://127.0.0.1:8787`.

When Better Auth options or plugins change, regenerate its Drizzle schema,
then generate and apply a migration:

```bash
pnpm --filter @lifeos/auth auth:schema
pnpm --filter @lifeos/db db:generate
pnpm --filter @lifeos/db db:migrate
```

`AUTH_EMAIL_MODE=console` prints password-reset links in the API terminal for
local development. Connect a real email provider before production.

Run type checks:

```bash
pnpm typecheck
```
