# NewsFlow - Project Guidelines

NewsFlow là ứng dụng tin tức được xây dựng với Turborepo monorepo, sử dụng Nuxt cho frontend và Express/oRPC cho backend.

## Quick Navigation

- `apps/web/` - Frontend Nuxt application
- `apps/server/` - Backend Express API với oRPC
- `packages/api/` - API layer & business logic
- `packages/auth/` - Better-Auth configuration
- `packages/db/` - Prisma schema & database queries
- `packages/env/` - Environment variables validation
- `packages/config/` - Shared TypeScript configs

## Core Principles

1. **Type Safety First** - Sử dụng TypeScript strict mode, tận dụng oRPC cho end-to-end type safety
2. **Monorepo Structure** - Mỗi package có trách nhiệm rõ ràng, tránh circular dependencies
3. **Workspace Protocol** - Luôn dùng `workspace:*` cho internal dependencies
4. **Environment Variables** - Validate tất cả env vars qua Zod schema trong `packages/env`
5. **Database First** - Schema changes phải qua Prisma migrations, không direct SQL
6. **Authentication Centralized** - Tất cả auth logic trong `packages/auth`, dùng Better-Auth
7. **API Type Safety** - Mọi API endpoint phải định nghĩa qua oRPC với Zod validation

## Tech Stack

### Frontend (apps/web)
- **Nuxt 4** - Vue framework với SSR/SSG
- **@nuxt/ui 4.4** - UI component library
- **shadcn-vue** - UI component library (thêm vào như alternative)
- **TailwindCSS 4** - Utility-first CSS
- **@tanstack/vue-query** - Data fetching & caching
- **@orpc/client** - Type-safe API client

### Backend (apps/server)
- **Express 5** - Web framework
- **oRPC** - Type-safe RPC framework với OpenAPI
- **Better-Auth** - Authentication solution
- **Bun** - Runtime environment

### Database (packages/db)
- **Prisma 7** - ORM với PostgreSQL adapter
- **PostgreSQL** - Database engine
- **Docker Compose** - Local database container

### Shared
- **TypeScript 5** - Type system
- **Zod** - Schema validation
- **Turborepo** - Monorepo build orchestration

## Project Structure

```
NewsFlow/
├── apps/
│   ├── web/              # Nuxt frontend
│   │   ├── app/          # Nuxt app directory
│   │   │   ├── components/ui/  # shadcn-vue components
│   │   │   └── lib/utils.ts    # cn() utility
│   │   ├── pages/        # Route pages
│   │   ├── components/   # Vue components
│   │   ├── components.json    # shadcn config
│   │   └── nuxt.config.ts
│   └── server/           # Express backend
│       ├── src/
│       │   ├── index.ts  # Entry point
│       │   └── routes/   # API routes
│       └── package.json
├── packages/
│   ├── api/              # Business logic & oRPC procedures
│   ├── auth/             # Better-Auth setup
│   ├── db/               # Prisma schema & client
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── docker-compose.yml
│   │   └── src/index.ts
│   ├── env/              # Environment validation
│   └── config/           # Shared configs (tsconfig, etc)
└── turbo.json            # Turborepo configuration
```

## Workflow Instructions

### Starting Development

```bash
# 1. Install dependencies
bun install

# 2. Start PostgreSQL database
bun run db:start

# 3. Push schema to database
bun run db:push

# 4. Start all apps in dev mode
bun run dev
```

### Making Database Changes

```bash
# 1. Edit packages/db/prisma/schema.prisma
# 2. Generate migration
bun run db:migrate

# 3. For quick prototyping (no migration file)
bun run db:push

# 4. Regenerate Prisma client
bun run db:generate
```

### Adding New API Endpoint

1. Định nghĩa procedure trong `packages/api/src/`
2. Sử dụng Zod cho input/output validation
3. Export procedure qua oRPC router
4. Type safety tự động sync sang frontend

### Adding shadcn-vue Components

```bash
# Thêm component mới
cd apps/web
bunx shadcn-vue add [component-name]

# Ví dụ
bunx shadcn-vue add button card input
```

Sử dụng trong Vue:
```vue
<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Title</CardTitle>
    </CardHeader>
    <CardContent>Content</CardContent>
  </Card>
  <Button variant="default">Click me</Button>
</template>
```

**Lưu ý:** Components được install trong `app/components/ui/`

### Adding New Package

```bash
# 1. Create package directory
mkdir -p packages/new-package/src

# 2. Create package.json với workspace protocol
{
  "name": "@NewsFlow/new-package",
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  }
}

# 3. Add to dependent packages
"@NewsFlow/new-package": "workspace:*"
```

## Common Commands

```bash
# Development
bun run dev              # Start all apps
bun run dev:web          # Start only frontend
bun run dev:server       # Start only backend

# Build
bun run build            # Build all apps
bun run check-types      # Type check all packages

# Database
bun run db:start         # Start PostgreSQL container
bun run db:stop          # Stop container
bun run db:down          # Remove container
bun run db:push          # Push schema changes
bun run db:generate      # Generate Prisma client
bun run db:migrate       # Create migration
bun run db:studio        # Open Prisma Studio

# Server specific
cd apps/server
bun run compile          # Compile to standalone binary
```

## Testing Requirements

- Viết tests cho business logic trong `packages/api`
- Test database queries với Prisma mock
- E2E tests cho critical user flows
- Validate API contracts với oRPC schema

## Error Handling Patterns

### API Errors (oRPC)

```typescript
import { TRPCError } from '@orpc/server'

throw new TRPCError({
  code: 'BAD_REQUEST',
  message: 'Invalid input'
})
```

### Database Errors

```typescript
import { Prisma } from '@prisma/client'

try {
  await db.user.create({ data })
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      // Unique constraint violation
    }
  }
}
```

### Frontend Errors

```typescript
// Sử dụng @tanstack/vue-query error handling
const { error, isError } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers
})
```

## Code Style Guidelines

- Sử dụng `bun` thay vì `npm` hoặc `yarn`
- Import paths: Dùng `@NewsFlow/*` cho workspace packages
- File naming: `kebab-case.ts` cho files, `PascalCase.vue` cho components
- Async/await thay vì promises chains
- Destructure imports: `import { func } from 'module'`
- Tránh `any` type, dùng `unknown` nếu cần

## Environment Variables

Tất cả env vars phải được validate trong `packages/env`:

```typescript
// packages/env/src/index.ts
import { z } from 'zod'

export const env = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  NODE_ENV: z.enum(['development', 'production', 'test'])
}).parse(process.env)
```

## Security Guidelines

- Không commit `.env` files
- Validate tất cả user inputs với Zod
- Sử dụng Better-Auth cho authentication
- Sanitize database queries qua Prisma (tránh raw SQL)
- CORS configuration trong Express server
- Rate limiting cho API endpoints

## Performance Considerations

- Sử dụng Turborepo caching cho builds
- Database indexes cho frequent queries
- Vue Query caching cho API calls
- Lazy load components trong Nuxt
- Optimize Prisma queries (select only needed fields)

## Common Issues

### Port Already in Use
```bash
# Kill process on port 3000/3001
lsof -ti:3000 | xargs kill -9
```

### Prisma Client Out of Sync
```bash
bun run db:generate
```

### Type Errors After Package Update
```bash
bun run check-types
# Fix errors, then rebuild
bun run build
```

### Docker Database Connection Failed
```bash
# Check container status
docker ps
# Restart database
bun run db:down && bun run db:start
```
