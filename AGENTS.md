# LifeOS Repository Instructions

## Module shell conventions

- Keep the person or Family perspective selector in its shared, classic
  position inside `AppHeader`. Module pages must not add a duplicate person
  selector beside their title or content controls.
- Expose the module-wide Actions command as the standard fixed, floating
  bottom-right button with its keyboard shortcut. Do not place the primary
  Actions launcher in the module title row.
- Structure every modal with three bounded regions: a non-scrolling header, a
  content body that owns vertical scrolling when needed, and a non-scrolling
  footer for actions. Never put the dialog-level `overflow-y-auto` on the
  complete modal where it would scroll the header or footer out of view.

## Database migrations

The files under `packages/db/drizzle/` are generated artifacts and are
immutable.

- Never generate a migration manually. Make the TypeScript schema change and
  always let `pnpm --filter @lifeos/db db:generate` create the SQL and metadata.
- Never create, edit, append to, rename, or hand-write a migration SQL file or
  its metadata.
- Never use `drizzle-kit generate --custom` unless the user explicitly requests
  a custom SQL migration.
- Make schema changes only in `packages/db/src/*-schema.ts`, then run
  `pnpm --filter @lifeos/db db:generate`.
- Review generated SQL without modifying it. If a new, unapplied migration is
  wrong, correct the TypeScript schema, reset that uncommitted generated batch,
  and regenerate it with the CLI.
- If a migration has already been applied or shared, fix the schema and generate
  a new follow-up migration. Never rewrite migration history.
- Apply migrations only with `pnpm --filter @lifeos/db db:migrate`.

## Vendor-managed database schemas

The `pgboss` schema is owned exclusively by the pinned `pg-boss` package and
is the sole exception to the Drizzle migration rules above.

- Never model, generate, edit, or remove objects in the `pgboss` schema with
  Drizzle.
- Allow only `pg-boss` itself to create or migrate that schema during queue
  startup.
- Keep every LifeOS-owned table, enum, index, and column in
  `packages/db/src/*-schema.ts` and migrate those objects only through the
  normal Drizzle workflow.
