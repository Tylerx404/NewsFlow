FROM oven/bun:1.3.5

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile
RUN bun x turbo run build --filter=worker

ENV NODE_ENV=production

WORKDIR /app/apps/worker

CMD ["bun", "run", "start"]
