# RSS Background Jobs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement production-grade BullMQ + Redis job queue system for automated RSS feed fetching and content extraction in NewsFlow.

**Architecture:** Background job processing using BullMQ with Redis persistence, cron scheduling every 30-60 minutes, dedicated workers for RSS parsing and content extraction, comprehensive error handling and monitoring.

**Tech Stack:** BullMQ, Redis, Node Cron, rss-parser, @extractus/article-extractor, Prisma, TypeScript, Bun runtime.

---

### Task 1: Environment Setup & Dependencies

**Files:**
- Modify: `packages/env/src/server.ts`
- Modify: `packages/api/package.json`
- Modify: `packages/db/docker-compose.yml`

**Step 1: Add Redis environment variables**

Add Redis URL validation to `packages/env/src/server.ts`:

```typescript
REDIS_URL: z.string().url().default('redis://localhost:6379'),
```

**Step 2: Install BullMQ and Redis dependencies**

Update `packages/api/package.json` dependencies:

```json
{
  "dependencies": {
    "bullmq": "^5.69.3",
    "ioredis": "^5.9.3",
    "node-cron": "^4.2.1"
  }
}
```

**Step 3: Add Redis service to docker-compose**

Update `packages/db/docker-compose.yml` to add Redis service:

```yaml
services:
  redis:
    image: redis
    container_name: NewsFlow-redis
    ports:
      - "6379:6379"
    volumes:
      - NewsFlow_redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  NewsFlow_postgres_data:
  NewsFlow_redis_data:
```

**Step 4: Install dependencies**

Run: `bun install`

**Step 5: Start Redis container**

Run: `bun run db:start`

**Step 6: Verify Redis connection**

Run: `docker exec NewsFlow-redis redis-cli ping`
Expected: PONG

**Step 7: Commit environment setup**

```bash
git add packages/env/src/server.ts packages/api/package.json packages/db/docker-compose.yml
git commit -m "feat: add Redis environment and BullMQ dependencies"
```

---

### Task 2: Redis Connection Factory

**Files:**
- Create: `packages/db/src/redis.ts`

**Step 1: Write Redis connection factory**

Create `packages/db/src/redis.ts`:

```typescript
import Redis from 'ioredis';
import { env } from '@NewsFlow/env';

export const createRedisConnection = () => {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    lazyConnect: true,
    reconnectOnError: (err) => {
      console.warn('Redis reconnect on error:', err.message);
      return err.message.includes('READONLY');
    },
  });
};

export const redisConnection = {
  host: 'localhost',
  port: 6379,
};
```

**Step 2: Export Redis factory from db package**

Update `packages/db/src/index.ts` to export Redis connection:

```typescript
export * from './redis';
```

**Step 3: Verify TypeScript compilation**

Run: `bun run check-types`
Expected: No errors

**Step 4: Commit Redis connection factory**

```bash
git add packages/db/src/redis.ts packages/db/src/index.ts
git commit -m "feat: add Redis connection factory"
```

---

### Task 3: Database Schema Migration

**Files:**
- Modify: `packages/db/prisma/schema/app.prisma`

**Step 1: Add job tracking fields to Feed model**

Update `packages/db/prisma/schema/app.prisma`:

```prisma
model Feed {
  id          String    @id @default(cuid())
  userId      String
  url         String
  siteUrl     String?
  title       String
  description String?
  category    String?
  iconUrl     String?
  language    String?
  isActive    Boolean   @default(true)
  lastFetched DateTime?
  // Job tracking fields
  lastError   String?   // Last RSS fetch error message
  errorCount  Int       @default(0) // Consecutive error count
  nextFetchAt DateTime? // Scheduled next fetch time
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  articles    Article[]
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, url])
  @@index([userId])
  @@index([nextFetchAt]) // Index for scheduled jobs
  @@map("feed")
}
```

**Step 2: Add extraction tracking fields to Article model**

Update Article model in same file:

```prisma
model Article {
  id               String   @id @default(cuid())
  feedId           String
  guid             String
  title            String
  link             String
  author           String?
  pubDate          DateTime
  content          String?
  excerpt          String?
  image            String?
  categories       String[]
  read             Boolean  @default(false)
  saved            Boolean  @default(false)
  contentExtracted Boolean  @default(false)
  // Content extraction tracking
  extractionAttempts Int      @default(0) // Number of extraction attempts
  lastExtractionError String? // Last extraction error
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  feed             Feed     @relation(fields: [feedId], references: [id], onDelete: Cascade)

  @@unique([feedId, guid])
  @@index([feedId, pubDate(sort: Desc)])
  @@index([contentExtracted]) // Index for extraction jobs
  @@map("article")
}
```

**Step 3: Generate Prisma client**

Run: `bun run db:generate`
Expected: Client generated successfully

**Step 4: Create and run migration**

Run: `bun run db:migrate create add-job-tracking-fields`
Expected: Migration file created

Run: `bun run db:push`
Expected: Schema updated

**Step 5: Verify schema changes**

Run: `bun run db:studio`
Expected: Can open Prisma Studio and see new fields

**Step 6: Commit schema changes**

```bash
git add packages/db/prisma/schema/app.prisma
git commit -m "feat: add job tracking fields to Feed and Article models"
```

---

### Task 4: Queue Module Infrastructure

**Files:**
- Create: `packages/api/src/modules/queue/index.ts`
- Create: `packages/api/src/modules/queue/jobs/rss-fetch.job.ts`
- Create: `packages/api/src/modules/queue/jobs/content-extract.job.ts`

**Step 1: Create job definitions**

Create `packages/api/src/modules/queue/jobs/rss-fetch.job.ts`:

```typescript
export interface RssFetchJobData {
  feedId: string;
  userId: string;
  force?: boolean;
}

export const RSS_FETCH_JOB = 'rss-fetch';
```

Create `packages/api/src/modules/queue/jobs/content-extract.job.ts`:

```typescript
export interface ContentExtractJobData {
  articleId: string;
  url: string;
}

export const CONTENT_EXTRACT_JOB = 'content-extract';
```

**Step 2: Create queue module index**

Create `packages/api/src/modules/queue/index.ts`:

```typescript
import { Queue, Worker, QueueScheduler } from 'bullmq';
import { redisConnection } from '@NewsFlow/db';

// Queue names
export const QUEUES = {
  RSS_FETCH: 'rss-fetch',
  CONTENT_EXTRACT: 'content-extract',
} as const;

// Create queue factory
export const createQueue = (name: string) => {
  return new Queue(name, {
    connection: redisConnection,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  });
};

// Create worker factory
export const createWorker = (name: string, processor: any) => {
  return new Worker(name, processor, {
    connection: redisConnection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  });
};

// Create scheduler for delayed jobs
export const createScheduler = (name: string) => {
  return new QueueScheduler(name, {
    connection: redisConnection,
  });
};
```

**Step 3: Export queue module**

Update `packages/api/src/index.ts` to export queue module:

```typescript
export * from './modules/queue';
```

**Step 4: Verify TypeScript compilation**

Run: `bun run check-types`
Expected: No errors

**Step 5: Commit queue infrastructure**

```bash
git add packages/api/src/modules/queue/
git commit -m "feat: create queue module infrastructure with job definitions"
```

---

### Task 5: RSS Worker Implementation

**Files:**
- Create: `packages/api/src/modules/queue/workers/rss.worker.ts`
- Create: `packages/api/src/modules/queue/workers/index.ts`

**Step 1: Implement RSS worker**

Create `packages/api/src/modules/queue/workers/rss.worker.ts`:

```typescript
import Parser from 'rss-parser';
import { db } from '@NewsFlow/db';
import { RssFetchJobData } from '../jobs/rss-fetch.job';

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media:content'],
      ['media:thumbnail', 'media:thumbnail'],
    ],
  },
});

export const rssFetchProcessor = async (job: { data: RssFetchJobData }) => {
  const { feedId, userId, force = false } = job.data;

  try {
    // Get feed with last fetch time
    const feed = await db.feed.findUnique({
      where: { id: feedId, userId },
    });

    if (!feed) {
      throw new Error(`Feed ${feedId} not found for user ${userId}`);
    }

    // Fetch RSS feed
    const feedData = await parser.parseURL(feed.url);

    // Update feed metadata
    await db.feed.update({
      where: { id: feedId },
      data: {
        title: feedData.title || feed.title,
        description: feedData.description || feed.description,
        siteUrl: feedData.link || feed.siteUrl,
        lastFetched: new Date(),
        lastError: null,
        errorCount: 0,
        nextFetchAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      },
    });

    // Process new articles
    const existingGuids = new Set(
      (await db.article.findMany({
        where: { feedId },
        select: { guid: true },
      })).map(a => a.guid)
    );

    const newArticles = [];
    for (const item of feedData.items || []) {
      if (!item.guid && !item.link) continue;
      const guid = item.guid || item.link!;

      if (!force && existingGuids.has(guid)) continue;

      const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();

      newArticles.push({
        feedId,
        guid,
        title: item.title || 'Untitled',
        link: item.link!,
        author: item.creator || item.author,
        pubDate,
        content: item.content || item['content:encoded'],
        excerpt: item.summary || item.description,
        categories: item.categories || [],
      });
    }

    // Bulk insert new articles
    if (newArticles.length > 0) {
      await db.article.createMany({
        data: newArticles,
        skipDuplicates: true,
      });
    }

    return {
      feedId,
      newArticlesCount: newArticles.length,
      totalItems: feedData.items?.length || 0,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update feed error tracking
    await db.feed.update({
      where: { id: feedId },
      data: {
        lastError: errorMessage,
        errorCount: { increment: 1 },
        nextFetchAt: new Date(Date.now() + 60 * 60 * 1000), // Retry in 1 hour on error
      },
    });

    throw error;
  }
};
```

**Step 2: Create workers index**

Create `packages/api/src/modules/queue/workers/index.ts`:

```typescript
import { createWorker, QUEUES } from '../index';
import { rssFetchProcessor } from './rss.worker';

// RSS Fetch Worker
export const rssWorker = createWorker(QUEUES.RSS_FETCH, rssFetchProcessor);

// Worker lifecycle management
export const startWorkers = () => {
  console.log('Starting RSS workers...');

  rssWorker.on('completed', (job) => {
    console.log(`RSS job ${job.id} completed:`, job.returnvalue);
  });

  rssWorker.on('failed', (job, err) => {
    console.error(`RSS job ${job.id} failed:`, err.message);
  });
};

export const stopWorkers = async () => {
  console.log('Stopping RSS workers...');
  await rssWorker.close();
};
```

**Step 3: Verify TypeScript compilation**

Run: `bun run check-types`
Expected: No errors

**Step 4: Commit RSS worker**

```bash
git add packages/api/src/modules/queue/workers/
git commit -m "feat: implement RSS fetch worker with feed parsing and article upsert"
```

---

### Task 6: Content Extraction Worker

**Files:**
- Create: `packages/api/src/modules/queue/workers/content.worker.ts`

**Step 1: Implement content extraction worker**

Create `packages/api/src/modules/queue/workers/content.worker.ts`:

```typescript
import { extract } from '@extractus/article-extractor';
import { db } from '@NewsFlow/db';
import { ContentExtractJobData } from '../jobs/content-extract.job';

export const contentExtractProcessor = async (job: { data: ContentExtractJobData }) => {
  const { articleId, url } = job.data;

  try {
    // Get article
    const article = await db.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new Error(`Article ${articleId} not found`);
    }

    if (article.contentExtracted) {
      return { skipped: true, reason: 'Already extracted' };
    }

    // Extract full content
    const extracted = await extract(url, {
      headers: {
        'User-Agent': 'NewsFlow/1.0 (+https://newsflow.app)',
      },
    });

    if (!extracted) {
      throw new Error('Content extraction failed - no content returned');
    }

    // Update article with extracted content
    await db.article.update({
      where: { id: articleId },
      data: {
        content: extracted.content || article.content,
        image: extracted.image || article.image,
        author: extracted.author || article.author,
        contentExtracted: true,
        extractionAttempts: { increment: 1 },
        lastExtractionError: null,
      },
    });

    return {
      articleId,
      extracted: true,
      hasContent: !!extracted.content,
      wordCount: extracted.content?.split(/\s+/).length || 0,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update extraction tracking
    await db.article.update({
      where: { id: articleId },
      data: {
        extractionAttempts: { increment: 1 },
        lastExtractionError: errorMessage,
      },
    });

    // Don't throw - content extraction failures are not critical
    console.warn(`Content extraction failed for ${articleId}: ${errorMessage}`);

    return {
      articleId,
      extracted: false,
      error: errorMessage,
    };
  }
};
```

**Step 2: Update workers index**

Update `packages/api/src/modules/queue/workers/index.ts`:

```typescript
import { createWorker, QUEUES } from '../index';
import { rssFetchProcessor } from './rss.worker';
import { contentExtractProcessor } from './content.worker';

// RSS Fetch Worker
export const rssWorker = createWorker(QUEUES.RSS_FETCH, rssFetchProcessor);

// Content Extract Worker
export const contentWorker = createWorker(QUEUES.CONTENT_EXTRACT, contentExtractProcessor);

// Worker lifecycle management
export const startWorkers = () => {
  console.log('Starting workers...');

  rssWorker.on('completed', (job) => {
    console.log(`RSS job ${job.id} completed:`, job.returnvalue);
  });

  rssWorker.on('failed', (job, err) => {
    console.error(`RSS job ${job.id} failed:`, err.message);
  });

  contentWorker.on('completed', (job) => {
    console.log(`Content extraction job ${job.id} completed:`, job.returnvalue);
  });

  contentWorker.on('failed', (job, err) => {
    console.error(`Content extraction job ${job.id} failed:`, err.message);
  });
};

export const stopWorkers = async () => {
  console.log('Stopping workers...');
  await Promise.all([
    rssWorker.close(),
    contentWorker.close(),
  ]);
};
```

**Step 3: Verify TypeScript compilation**

Run: `bun run check-types`
Expected: No errors

**Step 4: Commit content extraction worker**

```bash
git add packages/api/src/modules/queue/workers/content.worker.ts
git commit -m "feat: implement content extraction worker with @extractus/article-extractor"
```

---

### Task 7: Cron Scheduler

**Files:**
- Create: `packages/api/src/modules/queue/scheduler.ts`

**Step 1: Implement cron scheduler**

Create `packages/api/src/modules/queue/scheduler.ts`:

```typescript
import cron from 'node-cron';
import { db } from '@NewsFlow/db';
import { createQueue, QUEUES } from './index';

const rssQueue = createQueue(QUEUES.RSS_FETCH);
const contentQueue = createQueue(QUEUES.CONTENT_EXTRACT);

export const startScheduler = () => {
  console.log('Starting RSS cron scheduler...');

  // Run every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    try {
      console.log('Running RSS fetch cron job...');

      // Find feeds that need refreshing
      const feedsToRefresh = await db.feed.findMany({
        where: {
          isActive: true,
          OR: [
            { nextFetchAt: null },
            { nextFetchAt: { lte: new Date() } },
          ],
        },
        select: {
          id: true,
          userId: true,
          url: true,
        },
        take: 100, // Limit batch size
      });

      console.log(`Found ${feedsToRefresh.length} feeds to refresh`);

      // Queue RSS fetch jobs
      const jobs = feedsToRefresh.map(feed => ({
        name: 'rss-fetch',
        data: {
          feedId: feed.id,
          userId: feed.userId,
        },
      }));

      await rssQueue.addBulk(jobs);

      console.log(`Queued ${jobs.length} RSS fetch jobs`);

    } catch (error) {
      console.error('RSS cron job failed:', error);
    }
  });

  // Run content extraction every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      console.log('Running content extraction cron job...');

      // Find articles that need content extraction
      const articlesToExtract = await db.article.findMany({
        where: {
          contentExtracted: false,
          content: null,
          extractionAttempts: { lt: 3 }, // Max 3 attempts
        },
        select: {
          id: true,
          link: true,
        },
        take: 50, // Limit batch size
      });

      console.log(`Found ${articlesToExtract.length} articles to extract`);

      // Queue content extraction jobs
      const jobs = articlesToExtract.map(article => ({
        name: 'content-extract',
        data: {
          articleId: article.id,
          url: article.link,
        },
      }));

      await contentQueue.addBulk(jobs);

      console.log(`Queued ${jobs.length} content extraction jobs`);

    } catch (error) {
      console.error('Content extraction cron job failed:', error);
    }
  });
};

export const stopScheduler = () => {
  console.log('Stopping RSS cron scheduler...');
  // Note: node-cron doesn't have a direct stop method
  // Jobs will stop when the process exits
};
```

**Step 2: Update queue module exports**

Update `packages/api/src/modules/queue/index.ts` to export scheduler:

```typescript
export * from './scheduler';
```

**Step 3: Verify TypeScript compilation**

Run: `bun run check-types`
Expected: No errors

**Step 4: Commit cron scheduler**

```bash
git add packages/api/src/modules/queue/scheduler.ts
git commit -m "feat: implement cron scheduler for RSS fetching and content extraction"
```

---

### Task 8: Job Runner Integration

**Files:**
- Create: `packages/api/src/modules/queue/runner.ts`

**Step 1: Create job runner**

Create `packages/api/src/modules/queue/runner.ts`:

```typescript
import { createScheduler, QUEUES } from './index';
import { startWorkers, stopWorkers } from './workers';
import { startScheduler, stopScheduler } from './scheduler';

let isRunning = false;

export const startJobRunner = () => {
  if (isRunning) {
    console.log('Job runner already running');
    return;
  }

  console.log('Starting NewsFlow job runner...');

  try {
    // Start schedulers for delayed jobs
    createScheduler(QUEUES.RSS_FETCH);
    createScheduler(QUEUES.CONTENT_EXTRACT);

    // Start workers
    startWorkers();

    // Start cron scheduler
    startScheduler();

    isRunning = true;
    console.log('Job runner started successfully');

  } catch (error) {
    console.error('Failed to start job runner:', error);
    throw error;
  }
};

export const stopJobRunner = async () => {
  if (!isRunning) {
    console.log('Job runner not running');
    return;
  }

  console.log('Stopping NewsFlow job runner...');

  try {
    // Stop in reverse order
    stopScheduler();
    await stopWorkers();

    isRunning = false;
    console.log('Job runner stopped successfully');

  } catch (error) {
    console.error('Error stopping job runner:', error);
    throw error;
  }
};

export const getJobRunnerStatus = () => ({
  running: isRunning,
  timestamp: new Date().toISOString(),
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down job runner...');
  await stopJobRunner();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down job runner...');
  await stopJobRunner();
  process.exit(0);
});
```

**Step 2: Update queue module exports**

Update `packages/api/src/modules/queue/index.ts`:

```typescript
export * from './runner';
```

**Step 3: Verify TypeScript compilation**

Run: `bun run check-types`
Expected: No errors

**Step 4: Commit job runner**

```bash
git add packages/api/src/modules/queue/runner.ts
git commit -m "feat: create job runner with lifecycle management and graceful shutdown"
```

---

### Task 9: Server Integration

**Files:**
- Modify: `apps/server/src/index.ts`

**Step 1: Integrate job runner into server**

Update `apps/server/src/index.ts` to import and start job runner:

```typescript
import { startJobRunner, getJobRunnerStatus } from '@NewsFlow/api/queue';

// ... existing imports and setup ...

// Start job runner after database connection
startJobRunner();

// Add health check route for workers
app.get('/health/workers', (req, res) => {
  const status = getJobRunnerStatus();
  res.json({
    status: 'ok',
    workers: status,
    timestamp: new Date().toISOString(),
  });
});

// ... rest of server setup ...
```

**Step 2: Test server startup**

Run: `bun run dev:server`
Expected: Server starts without errors, job runner initializes

**Step 3: Test health endpoint**

Run: `curl http://localhost:3001/health/workers`
Expected: JSON response with worker status

**Step 4: Stop server**

Ctrl+C to stop server

**Step 5: Commit server integration**

```bash
git add apps/server/src/index.ts
git commit -m "feat: integrate job runner into server with health check endpoint"
```

---

### Task 10: Testing & Verification

**Files:**
- Test: Manual verification scripts

**Step 1: Create test feed**

Use Prisma Studio or API to create a test feed:
- URL: `https://rss.cnn.com/rss/edition.rss` (or any valid RSS feed)
- User: existing user from database

**Step 2: Test RSS worker manually**

Create a simple test script to queue an RSS job:

```typescript
// test-rss-job.ts
import { createQueue, QUEUES } from '@NewsFlow/api/queue';

const rssQueue = createQueue(QUEUES.RSS_FETCH);

async function testRssJob() {
  const job = await rssQueue.add('rss-fetch', {
    feedId: 'test-feed-id',
    userId: 'test-user-id',
  });

  console.log('Queued job:', job.id);
}

testRssJob();
```

Run: `bun run test-rss-job.ts`
Expected: Job queued successfully

**Step 3: Verify job processing**

Check logs for job completion messages

**Step 4: Test content extraction**

Create a test script for content extraction:

```typescript
// test-content-job.ts
import { createQueue, QUEUES } from '@NewsFlow/api/queue';

const contentQueue = createQueue(QUEUES.CONTENT_EXTRACT);

async function testContentJob() {
  const job = await contentQueue.add('content-extract', {
    articleId: 'test-article-id',
    url: 'https://example.com/article',
  });

  console.log('Queued content job:', job.id);
}

testContentJob();
```

**Step 5: Verify database updates**

Check Prisma Studio for updated feed and article records

**Step 6: Test cron scheduler**

Wait 30+ minutes or manually trigger cron jobs to verify automatic scheduling

**Step 7: Commit test scripts**

```bash
git add test-*.ts
git commit -m "feat: add manual test scripts for RSS and content extraction jobs"
```

---

### Task 11: Production Deployment

**Files:**
- Modify: `packages/db/docker-compose.yml` (if needed)

**Step 1: Update docker-compose for production**

Add environment variables and production Redis config to `packages/db/docker-compose.yml`:

```yaml
services:
  redis:
    environment:
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
```

**Step 2: Update environment validation**

Add Redis password to `packages/env/src/server.ts`:

```typescript
REDIS_PASSWORD: z.string().optional(),
```

**Step 3: Test full system**

Run: `bun run dev`
Expected: All services start, jobs process automatically

**Step 4: Monitor system health**

Check health endpoints and logs for 24 hours of operation

**Step 5: Commit production updates**

```bash
git add packages/env/src/server.ts packages/db/docker-compose.yml
git commit -m "feat: add production Redis configuration and monitoring"
```

---

## Migration & Rollback Plan

**Data Migration:**
1. Run Prisma migration for new fields (safe with defaults)
2. Backfill `nextFetchAt` for existing feeds: `lastFetched + 30 minutes`
3. Reset `errorCount` to 0 for all feeds
4. No data loss - all new fields have safe defaults

**Rollback:**
1. Stop job runner in server
2. Drop new database columns if needed
3. Remove Redis service from docker-compose
4. Revert code changes

**Monitoring:**
- Job success rates should be >99.9%
- Memory usage within container limits
- Redis operations <10ms average
- Zero data loss on restarts

---

Plan complete and saved to `docs/plans/2026-02-20-rss-cron-implementation.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?