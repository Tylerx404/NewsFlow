FROM oven/bun:1.3.5

WORKDIR /app

ARG NUXT_PUBLIC_SITE_URL=http://localhost:3001
ARG NUXT_PUBLIC_SERVER_URL=http://localhost:3000
ARG DATABASE_URL=postgresql://postgres:password@postgres:5432/NewsFlow

ENV NUXT_PUBLIC_SITE_URL=${NUXT_PUBLIC_SITE_URL}
ENV NUXT_PUBLIC_SERVER_URL=${NUXT_PUBLIC_SERVER_URL}
ENV DATABASE_URL=${DATABASE_URL}

COPY . .

RUN bun install --frozen-lockfile
RUN bun run --cwd packages/db db:generate
RUN bun x turbo run build --filter=web

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV NITRO_PORT=3001

WORKDIR /app/apps/web

EXPOSE 3001

CMD ["bun", "run", "preview"]
