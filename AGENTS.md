# AGENTS.md for NewsFlow

Agent guide for working in this repo. Keep changes scoped, type-safe, and aligned with the existing monorepo boundaries.

## Project map

- `apps/web`: Nuxt 4 frontend
- `apps/server`: Express 5 server, auth routes, oRPC, API reference
- `apps/worker`: separate worker process for BullMQ runner/scheduler
- `packages/api`: API modules, schemas, services, routers
- `packages/auth`: Better Auth setup and related helpers
- `packages/db`: Prisma schema, migrations, Postgres/Redis access
- `packages/env`: validated env for server and web
- `packages/queue`: queue schemas, processors, scheduler, runner
- `packages/config`: shared TypeScript config

## Core rules

- Use `bun` commands. Do not switch the repo to `npm` or `yarn`.
- Keep logic in the package that owns it. Avoid crossing boundaries casually.
- Internal package dependencies should use `workspace:*`.
- Read environment variables through `@NewsFlow/env/server` or `@NewsFlow/env/web`.
- Do not move queue runner startup into `apps/server`; worker runtime stays separate.
- Avoid `any` unless there is a clear reason. Prefer Zod schemas and inferred types.
- Do not commit secrets or log raw tokens, API keys, or credentials.

## Change patterns

### API

- API modules usually follow `*.schema.ts`, `*.service.ts`, `*.router.ts`.
- Wire module routers through `packages/api/src/routers/index.ts`.
- Use `publicProcedure` for public routes and `protectedProcedure` for authenticated routes.
- Convert business-facing API errors to `ORPCError` at the boundary.

### Database

- Change Prisma models under `packages/db/prisma/schema`.
- After schema changes, run `bun run db:generate`.
- Use `bun run db:migrate` for real migrations and `bun run db:push` only for prototyping.
- Do not delete migration history unless the task explicitly calls for it.

### Queue

- Update job schema, processor, and enqueue/dequeue call sites together.
- Worker bootstrap lives in `apps/worker/src/index.ts` via `startJobRunner()`.

### Web

- Preserve the current UI language unless the task asks for a redesign.
- Any new or changed user-facing text should go through i18n and update the locale files in `apps/web/i18n/locales`.

## Common commands

```bash
bun install
bun run db:start
bun run dev
bun run dev:web
bun run dev:server
bun run dev:worker
bun run check-types
bun run build
bun run db:generate
bun run db:migrate
bun run db:push
```

## Working style

- Prefer focused branches and grouped commits for independent work.
- Use clear names and early returns.
- Add comments for constraints or intent, not for obvious mechanics.
- Avoid broad refactors, mass formatting, or dependency churn unless requested.

## Done checklist

- The change stays within task scope.
- Relevant type/build checks pass for the affected area.
- DB, env, API contract, queue, or i18n follow-up changes are updated when applicable.
- No secrets or sensitive logs were introduced.
