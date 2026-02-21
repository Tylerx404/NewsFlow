# NewsFlow - Claude Guide

Tài liệu này là hướng dẫn làm việc cho Claude/Coding Agents trong repo `NewsFlow`.
Mục tiêu: sửa đúng chỗ, giữ type safety, và tránh phá luồng monorepo.

## 1) Project Snapshot

NewsFlow là Turborepo monorepo với:
- Frontend: Nuxt 4 (`apps/web`)
- Backend: Express 5 + oRPC (`apps/server`)
- Worker process: BullMQ runner/scheduler (`apps/worker`)
- Business logic/API contracts: `packages/api`
- Auth: Better Auth (`packages/auth`)
- Data layer: Prisma + PostgreSQL (`packages/db`)
- Queue layer: BullMQ + Redis (`packages/queue`)
- Env validation: `packages/env`

## 2) Repo Map

```text
NewsFlow/
├── apps/
│   ├── web/                 # Nuxt app
│   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── layouts/
│   │   │   └── lib/
│   │   └── server/
│   ├── server/              # Express server entry
│       └── src/index.ts
│   └── worker/              # Queue worker entry
│       └── src/index.ts
├── packages/
│   ├── api/                 # oRPC procedures + modules
│   ├── auth/                # Better Auth setup
│   ├── db/                  # Prisma schema, migrations, client
│   ├── env/                 # env schema validation
│   ├── queue/               # BullMQ jobs/scheduler/runner
│   └── config/              # shared tsconfig
└── turbo.json
```

## 3) Non-Negotiable Rules

1. Type safety first:
- Ưu tiên Zod + `z.infer`.
- Tránh `any`; nếu cần linh hoạt thì dùng `unknown`.

2. Respect package boundaries:
- Auth logic ở `packages/auth`.
- DB access ở `packages/db`.
- API contracts/handlers ở `packages/api`.
- Queue orchestration ở `packages/queue`.

3. Workspace protocol:
- Internal dependencies luôn dùng `workspace:*`.

4. Env validation:
- Server env: `@NewsFlow/env/server`.
- Web env: `@NewsFlow/env/web`.
- Không bypass schema validation.

5. Database-first changes:
- Sửa schema qua Prisma.
- Không dùng SQL tay trừ khi có yêu cầu cụ thể.

6. Security hygiene:
- Không commit secrets.
- Validate toàn bộ input ở boundary.
- Không log token/api key/credential thô.

## 4) API Architecture Pattern

Trong `packages/api/src/modules/*`, ưu tiên pattern:
- `*.schema.ts`: Zod schema + types
- `*.service.ts`: business logic
- `*.router.ts`: oRPC procedure wiring

Router tổng tại `packages/api/src/routers/index.ts`:
- expose router theo namespace (`aiConfig`, `feed`, `article`, `ai`)
- có thể giữ alias flat tạm thời cho legacy clients, phải đồng bộ với router gốc

Procedure levels:
- `publicProcedure`: route công khai
- `protectedProcedure`: route bắt buộc authenticated session

Business errors:
- Dùng `ORPCError` (không dùng generic throw string/error mơ hồ).

## 5) Server Runtime Notes

Trong `apps/server/src/index.ts`:
- Better Auth route: `/api/auth{/*path}`
- RPC endpoint prefix: `/rpc`
- API reference prefix: `/api-reference`

Worker runtime:
- Job runner được khởi động ở `apps/worker/src/index.ts` qua `startJobRunner()`.
- Dùng `bun run dev:worker` để chạy worker riêng khi phát triển local.

Không đổi các prefix trên nếu chưa có yêu cầu rõ.

## 6) Queue Pattern

`packages/queue` gồm:
- `schema.ts`: định nghĩa job names + payload schema
- `service.ts`: queue/worker factory + processors
- `scheduler.ts`: lịch enqueue jobs
- `runner.ts`: bootstrap worker/scheduler lifecycle

Khi thêm/đổi job:
- Cập nhật schema + processor + nơi enqueue đồng bộ.
- Đảm bảo lifecycle idempotent (không start scheduler lặp, stop phải close queue/worker sạch).

## 7) Code Style & Presentation

Naming:
- Files TS: `kebab-case.ts`
- Vue components: `PascalCase.vue`
- Schemas: hậu tố `Schema`
- Constants: `UPPER_SNAKE_CASE`
- Functions/variables: `camelCase`, tên theo domain

Readability:
- Ưu tiên early return.
- Tránh hàm quá dài; tách helper theo từng bước.
- Mỗi block xử lý một mục tiêu rõ ràng.

Comments:
- Chỉ comment phần "vì sao".
- Tránh comment mô tả điều hiển nhiên.

Imports:
- Thứ tự: external -> `@NewsFlow/*` -> local files.
- Tránh circular dependency.

## 8) Environment Setup

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

Server env chính:
- `DATABASE_URL`
- `REDIS_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `CORS_ORIGIN`
- `AI_KEY_ENCRYPTION_SECRET`

Web env chính:
- `NUXT_PUBLIC_SERVER_URL`

## 9) Common Workflows

### Start local dev

```bash
bun install
bun run db:start
bun run db:push
bun run dev
```

### Add new API endpoint

1. Tạo/sửa module trong `packages/api/src/modules/*`.
2. Định nghĩa input/output schema bằng Zod.
3. Triển khai logic trong service.
4. Expose procedure trong router.
5. Merge router vào `packages/api/src/routers/index.ts`.

### Database changes

```bash
# Sau khi sửa Prisma schema
bun run db:generate
bun run db:migrate
```

Prototype nhanh (không tạo migration file):

```bash
bun run db:push
```

### Add Nuxt UI/shadcn component

```bash
cd apps/web
bunx shadcn-vue add button card input
```

## 10) Commands

```bash
# Dev
bun run dev
bun run dev:web
bun run dev:server
bun run dev:worker

# Build / types
bun run build
bun run check-types

# Database
bun run db:start
bun run db:stop
bun run db:down
bun run db:push
bun run db:migrate
bun run db:generate
bun run db:studio
```

Quy ước: dùng `bun`, không dùng `npm`/`yarn`.

## 11) Error Handling

API layer:
- Throw `ORPCError` với code phù hợp (`BAD_REQUEST`, `NOT_FOUND`, `UNAUTHORIZED`, ...).

Database layer:
- Bắt lỗi Prisma khi cần map sang domain error.
- Không swallow lỗi.

Frontend layer:
- Dùng error state từ TanStack Query.
- Không nuốt lỗi silent trong UI logic.

## 12) Definition of Done

Trước khi kết thúc task:
1. `bun run check-types` pass với phần code bị tác động.
2. Nếu đổi DB schema: đã chạy `db:generate` và `db:migrate`/`db:push`.
3. Nếu đổi API contract: client usage liên quan đã được cập nhật.
4. Không lộ secrets trong source/log/docs.
5. Chỉ sửa trong phạm vi yêu cầu, không refactor lan rộng.

## 13) Quick Troubleshooting

Port conflict:
```bash
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

Prisma client out-of-sync:
```bash
bun run db:generate
```

DB container issues:
```bash
bun run db:down
bun run db:start
```
