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

6. Branch & commit discipline:
- Mỗi phần việc phải bắt đầu trên một nhánh mới, tên nhánh ngắn gọn và bám theo chủ đề thay đổi.
- Hoàn tất một phần việc độc lập thì commit ngay phần đó với message rõ ràng.
- Không gộp nhiều thay đổi không liên quan vào cùng một commit.

7. UI text phải đi qua i18n:
- Mọi thay đổi liên quan text giao diện phải cập nhật qua hệ i18n.
- Không hard-code text mới trong UI nếu module đó đã dùng i18n.
- Khi thêm hoặc đổi key dịch, phải cập nhật đồng bộ các locale liên quan.

8. Security hygiene:
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

## 8) Web UI Style Baseline (Reuse For New Pages)

Mục tiêu: giữ một visual language nhất quán khi phát triển các trang mới trong `apps/web`.

Layout:
- Ưu tiên bố cục rõ hierarchy, kiểu SaaS thực dụng: header gọn, content chia khối, khoảng trắng đều.
- Trang form/auth: card làm trọng tâm, desktop có thể split 2 cột, mobile giữ 1 cột.
- Trang dashboard/data: sidebar là trục điều hướng chính, content theo panel/card.

Color system:
- Dùng token trung tính từ `apps/web/app/assets/css/main.css` (OKLCH variables: `background`, `muted`, `card`, `sidebar`, `border`).
- Giữ palette nhẹ và tương phản rõ; tránh gradient/accent quá mạnh nếu chưa có yêu cầu branding.
- Light/dark mode phải bám token, hạn chế hard-code màu riêng lẻ.

Components & spacing:
- Ưu tiên `shadcn-nuxt` components + Tailwind utility classes.
- Style nền tảng: border nhẹ, radius vừa, typography rõ ràng, ít trang trí.
- Dùng spacing nhất quán theo scale phổ biến (`p-4/p-6`, `gap-4/gap-6`), tránh nhảy scale ngẫu nhiên.

Responsive & motion:
- Mobile-first, tránh vỡ layout và overflow.
- Animation chỉ dùng cho state cần thiết (sidebar/collapsible/dropdown), tránh motion dư.

I18n:
- Mọi text trên giao diện như heading, button, empty state, toast, modal, placeholder, validation message phải đi qua i18n.
- Nếu thêm màn hình mới trong `apps/web`, chuẩn bị key dịch ngay từ đầu thay vì hard-code text tạm.
- Nếu đổi wording hiện có, cập nhật đồng bộ key dịch và rà lại các locale liên quan.

Component research:
- Nếu cần mở rộng UI cho trang mới, ưu tiên dùng `shadcn-vue MCP` để research component/pattern trước khi tự custom.
- Chỉ viết component mới khi không có lựa chọn phù hợp từ hệ `shadcn`.

## 9) Environment Setup

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

## 10) Common Workflows

### Start local dev

```bash
bun install
bun run db:start
bun run db:push
bun run dev
```

### Start a new task

1. Tạo một nhánh mới theo chủ đề thay đổi trước khi bắt đầu.
2. Giữ phạm vi nhánh bám sát một nhóm thay đổi rõ ràng.
3. Sau khi hoàn tất phần việc, commit ngay phần đó với message dễ hiểu.

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

### Update UI with i18n

1. Thêm hoặc cập nhật key dịch trước khi nối text vào component.
2. Dùng key i18n cho label, button, toast, modal, empty state, placeholder, và validation message.
3. Đồng bộ mọi locale đang được hỗ trợ trước khi hoàn tất task.

## 11) Commands

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

## 12) Error Handling

API layer:
- Throw `ORPCError` với code phù hợp (`BAD_REQUEST`, `NOT_FOUND`, `UNAUTHORIZED`, ...).

Database layer:
- Bắt lỗi Prisma khi cần map sang domain error.
- Không swallow lỗi.

Frontend layer:
- Dùng error state từ TanStack Query.
- Không nuốt lỗi silent trong UI logic.

## 13) Definition of Done

Trước khi kết thúc task:
1. `bun run check-types` pass với phần code bị tác động.
2. Nếu đổi DB schema: đã chạy `db:generate` và `db:migrate`/`db:push`.
3. Nếu đổi API contract: client usage liên quan đã được cập nhật.
4. Nếu có thay đổi UI: các key i18n và locale liên quan đã cập nhật đầy đủ, không để text mới bị hard-code sai hệ i18n.
5. Phần việc nằm trên đúng nhánh theo chủ đề và đã được commit thành một nhóm thay đổi rõ ràng.
6. Không lộ secrets trong source/log/docs.
7. Chỉ sửa trong phạm vi yêu cầu, không refactor lan rộng.

## 14) Quick Troubleshooting

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
