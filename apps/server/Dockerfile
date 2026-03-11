FROM oven/bun:1.3.5

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile
ARG DATABASE_URL=postgresql://postgres:password@postgres:5432/NewsFlow
ENV DATABASE_URL=${DATABASE_URL}
RUN bun x turbo run db:generate --filter=@NewsFlow/db
RUN bun x turbo run build --filter=server

ENV NODE_ENV=production

WORKDIR /app/apps/server

EXPOSE 3000

CMD ["bun", "run", "start"]
