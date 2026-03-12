FROM oven/bun:1.3.5 AS base

WORKDIR /app

FROM base AS pruner
COPY . .
RUN bun x turbo prune --scope=web --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN bun install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
ARG NUXT_PUBLIC_SITE_URL=http://localhost:3001
ARG NUXT_PUBLIC_SERVER_URL=http://localhost:3000
ARG DATABASE_URL=postgresql://postgres:password@postgres:5432/NewsFlow
ENV NUXT_PUBLIC_SITE_URL=${NUXT_PUBLIC_SITE_URL}
ENV NUXT_PUBLIC_SERVER_URL=${NUXT_PUBLIC_SERVER_URL}
RUN DATABASE_URL=${DATABASE_URL} bun run --cwd packages/db db:generate
RUN bun x turbo run build --filter=web

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3001
COPY --from=installer /app/apps/web/.output ./.output

EXPOSE 3001

CMD ["bun", ".output/server/index.mjs"]
