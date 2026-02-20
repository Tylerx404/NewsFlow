# RSS Background Jobs Design - Full Production Implementation

## Overview

NewsFlow RSS background job system using BullMQ + Redis for production-grade automated feed fetching and content extraction.

## Date
2026-02-20

## Status
Approved for implementation

## Architecture Overview

The RSS cron system provides production-grade job processing with:
- **BullMQ Queue**: Job persistence and distribution with Redis backend
- **Cron Scheduling**: Periodic feed refresh triggers (30-60 min intervals)
- **Dedicated Workers**: RSS parsing and content extraction processes
- **Monitoring**: Job status tracking, error handling, and health checks

## Database Schema Extensions

### Feed Model Additions
```prisma
model Feed {
  // ... existing fields
  lastError   String?   // Last RSS fetch error message
  errorCount  Int       @default(0) // Consecutive error count
  nextFetchAt DateTime? // Scheduled next fetch time

  @@index([nextFetchAt]) // For efficient scheduled job queries
}
```

### Article Model Additions
```prisma
model Article {
  // ... existing fields
  extractionAttempts Int      @default(0) // Number of extraction attempts
  lastExtractionError String? // Last extraction error

  @@index([contentExtracted]) // For extraction job queries
}
```

## Job Types

### RSS Fetch Job
**Data Structure**: `{ feedId: string, userId: string, force?: boolean }`
- Fetches RSS feed using rss-parser
- Extracts new articles since last fetch
- Updates feed metadata and schedules next fetch
- Handles various RSS formats and edge cases

### Content Extract Job
**Data Structure**: `{ articleId: string, url: string }`
- Uses @extractus/article-extractor for full content
- Cleans HTML and updates article record
- Handles rate limiting and error recovery

## Worker Implementation

### RSS Worker (rss.worker.ts)
- Validates RSS feed format and extracts new articles
- Upserts articles with transaction safety
- Updates feed metadata (lastFetched, error tracking)
- Implements rate limiting to respect feed sources

### Content Worker (content.worker.ts)
- Extracts full article content using @extractus/article-extractor
- Cleans HTML and removes ads/scripts
- Updates article with extracted content
- Tracks extraction attempts and errors

## Scheduling & Error Handling

### Cron Scheduler
- Runs every 30-60 minutes (configurable)
- Queries feeds needing refresh (`nextFetchAt <= now`)
- Queues RSS fetch jobs in batches
- Load balancing across time windows

### Error Handling
- Exponential backoff retry strategy (3 attempts)
- Dead letter queue for persistent failures
- Feed deactivation after 5 consecutive errors
- User notifications for feed issues

### Monitoring
- Job completion metrics and queue depth
- Worker health checks and performance timing
- Structured logging with error context
- Health check endpoints for load balancers

## Implementation Phases

1. **Week 1**: Redis setup and dependencies
2. **Week 2**: Core queue infrastructure
3. **Week 3**: RSS processing workers
4. **Week 4**: Scheduling and error handling
5. **Week 5**: Production deployment and monitoring

## Success Criteria

### Functional
- ✅ RSS feeds refresh automatically every 30-60 minutes
- ✅ New articles appear in user feeds without manual refresh
- ✅ Full content extraction works for supported sites
- ✅ Failed feeds are handled gracefully with retry logic

### Performance
- ✅ Job processing completes within 5 minutes per feed
- ✅ System handles 1000+ feeds concurrently
- ✅ Memory usage stays within container limits
- ✅ Redis operations remain fast (< 10ms avg)

### Reliability
- ✅ 99.9% job success rate
- ✅ Zero data loss on server restarts
- ✅ Proper error logging and alerting
- ✅ Graceful degradation during failures

## Files to Create/Modify

### New Files
- `packages/env/src/redis.ts`
- `packages/api/src/modules/queue/index.ts`
- `packages/api/src/modules/queue/jobs/rss-fetch.job.ts`
- `packages/api/src/modules/queue/jobs/content-extract.job.ts`
- `packages/api/src/modules/queue/workers/rss.worker.ts`
- `packages/api/src/modules/queue/workers/content.worker.ts`
- `packages/api/src/modules/queue/workers/index.ts`
- `packages/api/src/modules/queue/scheduler.ts`
- `packages/api/src/modules/queue/runner.ts`
- `packages/db/src/redis.ts`

### Modified Files
- `packages/env/src/server.ts` (add Redis env vars)
- `packages/api/package.json` (add dependencies)
- `packages/db/prisma/schema/app.prisma` (add job tracking fields)
- `packages/db/docker-compose.yml` (add Redis service)
- `apps/server/src/index.ts` (integrate job runner)

## Dependencies
- `bullmq: "^5.69.3"`
- `ioredis: "^5.9.3"`
- `node-cron: "^4.2.1"`

## Environment Variables
- `REDIS_URL: z.string().url().default('redis://localhost:6379')`

## Migration Strategy
- Create Prisma migration for new schema fields
- Safe defaults: errorCount = 0, extractionAttempts = 0
- Backfill nextFetchAt for existing feeds
- Rollback procedures defined

## Risk Mitigation

### Technical Risks
- Redis connection issues → Connection pooling and retry logic
- Memory leaks → Worker process lifecycle management
- Job duplicates → Idempotent processing with locks
- Rate limiting → Respect RSS source limits

### Operational Risks
- Feed failures → Graceful degradation and notifications
- Performance impact → Background processing isolation
- Data consistency → Transaction safety and rollbacks