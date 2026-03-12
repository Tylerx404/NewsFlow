FROM oven/bun:1.3.5 AS base

WORKDIR /app

FROM base AS pruner
COPY . .
RUN bun x turbo prune --scope=server --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN bun install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
ARG DATABASE_URL=postgresql://postgres:password@postgres:5432/NewsFlow
RUN DATABASE_URL=${DATABASE_URL} bun run --cwd packages/db db:generate
RUN bun x turbo run build --filter=server

FROM installer AS migrator
WORKDIR /app
CMD ["bun", "run", "--cwd", "/app/packages/db", "db:migrate:deploy"]

FROM base AS prod-deps
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN bun install --frozen-lockfile --production

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=installer /app/apps/server/dist ./apps/server/dist

EXPOSE 3000

WORKDIR /app/apps/server
CMD ["bun", "dist/index.mjs"]
