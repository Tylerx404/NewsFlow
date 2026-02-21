# AGENTS Guide for NewsFlow

Tài liệu này định nghĩa cách coding agents làm việc trong repo `NewsFlow`.
Mục tiêu: thay đổi đúng phạm vi, giữ type safety, và đảm bảo code dễ maintain.

## 1) Kiến trúc repo

- `apps/web`: Nuxt 4 frontend.
- `apps/server`: Express 5 server, mount oRPC và OpenAPI reference.
- `packages/api`: business logic và router/procedure cho API.
- `packages/auth`: cấu hình Better Auth.
- `packages/db`: Prisma client, schema/migrations, kết nối Postgres/Redis.
- `packages/env`: validate env cho server/web.
- `packages/queue`: BullMQ scheduler/worker cho RSS và content extraction.
- `packages/config`: shared TypeScript config.

## 2) Nguyên tắc cốt lõi

- Type-safe mặc định: dùng TypeScript + Zod, hạn chế tối đa `any`.
- Đúng boundary package: auth ở `packages/auth`, data ở `packages/db`, API ở `packages/api`, queue ở `packages/queue`.
- Internal dependency phải dùng `workspace:*`.
- Env phải qua schema của `@NewsFlow/env/server` hoặc `@NewsFlow/env/web`.
- Thay đổi DB phải đi qua Prisma schema/migration, không SQL tay nếu không có yêu cầu rõ.
- Không commit secret; dữ liệu nhạy cảm phải được xử lý an toàn (ví dụ mã hóa API key).

## 3) Quy ước tổ chức code

### API module structure

- Mỗi module trong `packages/api/src/modules/*` nên có:
- `*.schema.ts`: Zod schemas + types (`z.infer`).
- `*.service.ts`: business logic tái sử dụng.
- `*.router.ts`: procedure wiring, auth, gọi service.
- Router tổng nằm ở `packages/api/src/routers/index.ts`.
- Route public dùng `publicProcedure`, route auth dùng `protectedProcedure`.
- Lỗi nghiệp vụ trả về bằng `ORPCError`.

### Naming conventions

- TS files: `kebab-case.ts`.
- Vue components: `PascalCase.vue`.
- Schema names: hậu tố `Schema` (ví dụ `createAiConfigSchema`).
- Type/interface: `PascalCase`.
- Constant: `UPPER_SNAKE_CASE`.
- Variable/function: `camelCase`, dùng tên theo domain, tránh tên mơ hồ.

### Import và dependency

- Ưu tiên tái sử dụng qua `@NewsFlow/*`.
- Thứ tự import: external -> workspace packages -> local files.
- Tránh circular dependencies giữa packages.

## 4) Phong cách trình bày code

- Ưu tiên early return để giảm nesting.
- Hàm nên ngắn, mỗi hàm xử lý một mục tiêu rõ ràng.
- Tên hàm theo mẫu action + target (ví dụ `encryptApiKey`, `setDefaultConfig`).
- Chỉ comment phần "vì sao", không comment điều hiển nhiên.
- Với logic nghiệp vụ quan trọng, ghi rõ ràng constraint gần đoạn code đó.

## 5) Error handling và logging

- Không dùng `catch` rỗng, không nuốt lỗi.
- Convert lỗi thành `ORPCError` ở boundary API khi phù hợp.
- Không log secrets (token, apiKey, raw credential).
- Log theo context thực thi (ví dụ `userId`, `feedId`, `jobId`) để dễ trace.
- Tránh log trùng nhiều tầng cho cùng một lỗi.

## 6) Workflow theo loại thay đổi

### A. API contract/business logic

- Cập nhật đồng bộ `schema -> service -> router`.
- Nếu đổi contract, kiểm tra điểm gọi ở `apps/web`.
- Giữ backward compatibility nếu endpoint đã dùng ở client.

### B. Database

- Sửa schema trong `packages/db/prisma/schema`.
- Chạy `bun run db:generate`.
- Chạy `bun run db:migrate` (hoặc `bun run db:push` cho prototyping).
- Không xóa migration history khi chưa có yêu cầu rõ.

### C. Environment variables

- Thêm env mới vào schema tương ứng trong `packages/env`.
- Cập nhật `apps/server/.env.example` hoặc `apps/web/.env.example`.
- Không truy cập env trực tiếp nếu đã có layer validate.

### D. Queue/jobs

- Nếu thêm job mới: cập nhật schema job, processor, scheduler/runner.
- Nếu đổi tên queue/job: cập nhật đồng bộ tất cả nơi enqueue/dequeue.

## 7) Lệnh chuẩn

```bash
bun install
bun run db:start
bun run db:push
bun run dev
```

```bash
bun run dev:web
bun run dev:server
bun run build
bun run check-types
bun run db:migrate
bun run db:generate
bun run db:studio
bun run db:stop
bun run db:down
```

Quy ước: dùng `bun`, không dùng `npm`/`yarn`.

## 8) Definition of Done

- Đã sửa đúng phạm vi task, không refactor lan ngoài yêu cầu.
- `bun run check-types` pass với phần code bị tác động.
- Nếu có thay đổi DB/env/API contract, các phần liên quan đã cập nhật đầy đủ.
- Không để lộ secret trong code, logs, docs.
- Code mới nhất quán style với module hiện hữu.

## 9) Không làm

- Không thêm dependency trùng vai trò khi đã có package nội bộ.
- Không đổi cấu trúc monorepo hoặc rename package nếu chưa được yêu cầu.
- Không format/chỉnh style hàng loạt ngoài phạm vi task.
- Không tự ý xóa dữ liệu/migration/history.
