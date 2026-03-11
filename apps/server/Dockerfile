FROM oven/bun:1.3.5

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile
RUN bun x turbo run build --filter=server

ENV NODE_ENV=production

WORKDIR /app/apps/server

EXPOSE 3000

CMD ["bun", "run", "start"]
