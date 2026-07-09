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
- `packages/domain` owns the core LifeOS concepts.
- `packages/db` owns Drizzle schema, migrations, and database access.
- `packages/auth` owns Better Auth setup and session helpers.
- `packages/rpc` owns type-safe API contracts and shared RPC helpers.
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

Run all dev tasks:

```bash
pnpm dev
```

Run type checks:

```bash
pnpm typecheck
```
