---
name: orpc-hono
description: LifeOS oRPC + Hono guidance. Use when defining type-safe API contracts, wiring oRPC into the Hono backend, creating shared RPC clients for apps/web, or organizing packages/rpc contracts between the API and frontend.
---

# oRPC + Hono

No official Codex `SKILL.md` was found for oRPC. This LifeOS skill is a small project-local guide based on official oRPC documentation.

## Official Sources

- oRPC LLM index: https://orpc.dev/llms.txt
- oRPC docs: https://orpc.unnoq.com/docs
- Hono adapter: https://orpc.unnoq.com/docs/adapters/hono
- Monorepo setup: https://orpc.unnoq.com/docs/best-practices/monorepo-setup

Use official docs as the authority for exact APIs and package imports.

When working on LifeOS oRPC code, start from `https://orpc.dev/llms.txt` to find the current canonical documentation page, then load only the relevant page. The highest-priority pages for this repo are:

- `/docs/adapters/hono.md`
- `/docs/best-practices/monorepo-setup.md`
- `/docs/integrations/better-auth.md`
- `/docs/integrations/tanstack-query.md`
- `/docs/client/client-side.md`
- `/docs/client/error-handling.md`
- `/docs/contract-first/define-contract.md`
- `/docs/contract-first/implement-contract.md`

## Package Boundaries

- Put shared contracts, routers, and client helpers in `packages/rpc`.
- Mount the oRPC server integration from `apps/api`.
- Consume typed clients from `apps/web`.
- Keep database access in `packages/db` and business/domain types in `packages/domain`.

## Workflow

1. Inspect installed `@orpc/*` versions before writing code.
2. Define contracts and routers in `packages/rpc` only when they are shared by app and API.
3. Wire Hono adapter code inside `apps/api`; do not make `packages/rpc` depend on Hono runtime concerns unless unavoidable.
4. Export public RPC types from `packages/rpc` so the frontend can consume them without importing API internals.
5. Add integration tests once real endpoints exist.

## LifeOS Defaults

- Treat oRPC as the typed boundary between the LifeOS app and API.
- Prefer explicit routers by domain area, such as people, homes, trips, documents, projects, and goals.
- Avoid exposing database table shapes directly through RPC responses.
