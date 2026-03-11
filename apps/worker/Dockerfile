FROM oven/bun:1.3.5

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile
ARG DATABASE_URL=postgresql://postgres:password@postgres:5432/NewsFlow
ENV DATABASE_URL=${DATABASE_URL}
RUN bun run --cwd packages/db db:generate
RUN bun x turbo run build --filter=worker

ENV NODE_ENV=production

WORKDIR /app/apps/worker

CMD ["bun", "run", "start"]
