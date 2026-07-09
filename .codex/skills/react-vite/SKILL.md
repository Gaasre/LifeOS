---
name: react-vite
description: React and Vite SPA guidance for LifeOS. Use when creating, reviewing, testing, or refactoring the React + Vite app in apps/web, including component performance, Vite config, SPA routing/deployment, client-side data fetching, and bundle behavior.
---

# React + Vite

Use this skill for the LifeOS `apps/web` application.

## Source Material

- React performance guidance is vendored from the installed `react-best-practices` skill in this folder.
- Vite-specific SPA guidance is vendored from the community `vite-react-best-practices` skill at `references/vite-react-best-practices/`.

The Vite-specific source is community material, not official Vite documentation. Use official Vite docs as the authority when the two conflict.

## Workflow

1. Inspect the current app shape before editing: `apps/web`, package scripts, Vite config, and shared package imports.
2. Prefer React + Vite SPA patterns. Do not introduce Next.js routing, server components, or SSR assumptions into `apps/web`.
3. Use the React rules in `rules/` for component performance and rendering decisions.
4. Read `references/vite-react-best-practices/SKILL.md` when changing Vite config, SPA routing, deployment, environment variables, or build behavior.
5. Use browser testing for visible UI changes when possible.

## LifeOS Defaults

- Treat `apps/web` as an authenticated local-first operating-system surface.
- Keep feature/domain logic out of the app when it belongs in `packages/domain`, `packages/rpc`, or `packages/db`.
- Use `packages/ui` for shared interface primitives and shadcn/ReUI-owned components.
- Use direct imports instead of broad barrel imports when bundle size or tree-shaking matters.
