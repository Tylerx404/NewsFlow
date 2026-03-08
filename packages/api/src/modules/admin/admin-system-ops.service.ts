import { ORPCError } from "@orpc/server";

import {
  buildStripeConfigUpdateData,
  getStripeConfigRecord,
  maskStripeConfigRecord,
} from "@NewsFlow/auth/stripe-config";
import prisma from "@NewsFlow/db";
import {
  CONTENT_EXTRACT_JOB,
  HEARTBEAT_KEYS,
  QUEUES,
  RSS_FETCH_JOB,
  createQueue,
  readHeartbeat,
  type ContentExtractJobData,
  type RssFetchJobData,
} from "@NewsFlow/queue";

import { createAdminAuditLog } from "./admin-audit.service";
import type {
  AdminQueueJobState,
  AdminQueueName,
  ListAdminQueueJobsInput,
  RetryAdminQueueJobInput,
  TriggerAdminContentExtractInput,
  TriggerAdminFeedFetchInput,
  UpdateAdminStripeConfigInput,
} from "./admin-system-ops.schema";

type PrismaClient = typeof prisma;

type QueueJobRecord = {
  id: string | number | null;
  name: string;
  attemptsMade: number;
  failedReason: string | null;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
  opts: {
    attempts?: number;
  };
  data: unknown;
  getState: () => Promise<string>;
  retry: () => Promise<void>;
};

let rssQueue: ReturnType<typeof createQueue<RssFetchJobData>> | null = null;
let contentQueue: ReturnType<typeof createQueue<ContentExtractJobData>> | null = null;

function getRssQueue() {
  if (!rssQueue) {
    rssQueue = createQueue<RssFetchJobData>(QUEUES.RSS_FETCH);
  }

  return rssQueue;
}

function getContentQueue() {
  if (!contentQueue) {
    contentQueue = createQueue<ContentExtractJobData>(QUEUES.CONTENT_EXTRACT);
  }

  return contentQueue;
}

function getQueueEntries() {
  return [
    {
      queueName: QUEUES.RSS_FETCH as AdminQueueName,
      queue: getRssQueue(),
    },
    {
      queueName: QUEUES.CONTENT_EXTRACT as AdminQueueName,
      queue: getContentQueue(),
    },
  ] as const;
}

function getQueueEntry(queueName: AdminQueueName) {
  const entry = getQueueEntries().find((item) => item.queueName === queueName);

  if (!entry) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Unsupported queue name.",
    });
  }

  return entry;
}

function mapTimestamp(value: number | undefined) {
  if (!value) {
    return null;
  }

  return new Date(value);
}

function sanitizeQueueJobPayload(
  queueName: AdminQueueName,
  payload: unknown
): {
  feedSourceId?: string;
  sourceArticleId?: string;
  url?: string;
  force?: boolean;
} | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const source = payload as Record<string, unknown>;

  if (queueName === QUEUES.RSS_FETCH) {
    return {
      feedSourceId:
        typeof source.feedSourceId === "string" ? source.feedSourceId : undefined,
      force: source.force === true ? true : undefined,
    };
  }

  return {
    sourceArticleId:
      typeof source.sourceArticleId === "string"
        ? source.sourceArticleId
        : undefined,
    url: typeof source.url === "string" ? source.url : undefined,
  };
}

function mapQueueJob(
  queueName: AdminQueueName,
  state: AdminQueueJobState,
  job: QueueJobRecord
) {
  return {
    jobId: String(job.id ?? ""),
    queueName,
    name: job.name,
    state,
    attemptsMade: job.attemptsMade,
    maxAttempts: job.opts.attempts ?? null,
    failedReason: job.failedReason ?? null,
    timestamp: new Date(job.timestamp),
    processedOn: mapTimestamp(job.processedOn),
    finishedOn: mapTimestamp(job.finishedOn),
    payload: sanitizeQueueJobPayload(queueName, job.data),
  };
}

async function listQueueJobsInternal(input: ListAdminQueueJobsInput) {
  const selectedQueues = input.queueName
    ? [getQueueEntry(input.queueName)]
    : [...getQueueEntries()];

  const jobsByQueue = await Promise.all(
    selectedQueues.map(async ({ queueName, queue }) => {
      const jobsByState = await Promise.all(
        input.states.map(async (state) => {
          const jobs = (await queue.getJobs(
            [state],
            0,
            Math.max(0, input.limit - 1),
            true
          )) as QueueJobRecord[];

          return jobs.map((job) => mapQueueJob(queueName, state, job));
        })
      );

      return jobsByState.flat();
    })
  );

  return jobsByQueue
    .flat()
    .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
    .slice(0, input.limit);
}

export async function getAdminSystemOpsOverview(db: PrismaClient) {
  const now = new Date();

  const [workerHeartbeat, rssHeartbeat, contentHeartbeat, queueCounts, staleFeedCount, extractionBacklogCount, recentFailedJobs] =
    await Promise.all([
      readHeartbeat(HEARTBEAT_KEYS.worker),
      readHeartbeat(HEARTBEAT_KEYS.scheduler.rss),
      readHeartbeat(HEARTBEAT_KEYS.scheduler.content),
      Promise.all(
        getQueueEntries().map(async ({ queueName, queue }) => {
          const counts = await queue.getJobCounts(
            "waiting",
            "active",
            "failed",
            "delayed",
            "completed"
          );

          return {
            queueName,
            waiting: counts.waiting ?? 0,
            active: counts.active ?? 0,
            failed: counts.failed ?? 0,
            delayed: counts.delayed ?? 0,
            completed: counts.completed ?? 0,
          };
        })
      ),
      db.feedSource.count({
        where: {
          isEnabled: true,
          subscriptions: {
            some: {
              isActive: true,
            },
          },
          OR: [
            {
              nextFetchAt: null,
            },
            {
              nextFetchAt: {
                lte: now,
              },
            },
          ],
        },
      }),
      db.sourceArticle.count({
        where: {
          contentExtracted: false,
          content: null,
          extractionAttempts: {
            lt: 3,
          },
          feedSource: {
            isEnabled: true,
            subscriptions: {
              some: {
                isActive: true,
              },
            },
          },
        },
      }),
      listQueueJobsInternal({
        states: ["failed"],
        limit: 10,
      }),
    ]);

  const failedJobCount = queueCounts.reduce((total, queueCount) => {
    return total + queueCount.failed;
  }, 0);

  return {
    runtime: {
      worker: {
        state: workerHeartbeat.state,
        lastSeenAt: workerHeartbeat.lastSeenAt,
        ageMs: workerHeartbeat.ageMs,
      },
      rssScheduler: {
        state: rssHeartbeat.state,
        lastSeenAt: rssHeartbeat.lastSeenAt,
        ageMs: rssHeartbeat.ageMs,
      },
      contentScheduler: {
        state: contentHeartbeat.state,
        lastSeenAt: contentHeartbeat.lastSeenAt,
        ageMs: contentHeartbeat.ageMs,
      },
    },
    queues: queueCounts,
    failedJobCount,
    staleFeedCount,
    extractionBacklogCount,
    recentFailedJobs,
  };
}

export async function getAdminStripeConfig(
  db: Pick<PrismaClient, "stripeConfig">
) {
  const record = await getStripeConfigRecord(db);
  return maskStripeConfigRecord(record);
}

interface UpdateAdminStripeConfigParams extends UpdateAdminStripeConfigInput {
  adminUserId: string;
}

export async function updateAdminStripeConfig(
  db: PrismaClient,
  input: UpdateAdminStripeConfigParams
) {
  const existing = await getStripeConfigRecord(db);
  const nextData = await buildStripeConfigUpdateData({
    ...input,
    updatedByUserId: input.adminUserId,
  });

  const changedFields = Object.keys(nextData).filter(
    (field) => field !== "updatedByUserId" && field !== "updatedAt"
  );
  const nextPublishableKey =
    typeof nextData.publishableKey === "string" || nextData.publishableKey === null
      ? nextData.publishableKey
      : existing?.publishableKey ?? null;
  const nextSecretKeyState =
    typeof nextData.secretKeyEncrypted === "string"
      ? "present"
      : existing?.secretKeyEncrypted
        ? "present"
        : "missing";
  const nextWebhookSecretState =
    typeof nextData.webhookSecretEncrypted === "string"
      ? "present"
      : existing?.webhookSecretEncrypted
        ? "present"
        : "missing";

  await db.$transaction(async (tx) => {
    await tx.stripeConfig.upsert({
      where: { id: "default" },
      update: nextData,
      create: {
        id: "default",
        ...nextData,
      },
    });

    await createAdminAuditLog(tx, {
      adminUserId: input.adminUserId,
      action: "SYSTEM_OPS_STRIPE_CONFIG_UPDATED",
      targetType: "SYSTEM_CONFIG",
      targetId: "stripe",
      metadata: {
        previous: {
          changedFields: changedFields.join(",") || undefined,
          publishableKey: existing?.publishableKey ? "present" : "missing",
          secretKey: existing?.secretKeyEncrypted ? "present" : "missing",
          webhookSecret: existing?.webhookSecretEncrypted ? "present" : "missing",
        },
        next: {
          changedFields: changedFields.join(",") || undefined,
          publishableKey: nextPublishableKey ? "present" : "missing",
          secretKey: nextSecretKeyState,
          webhookSecret: nextWebhookSecretState,
        },
      },
    });
  });

  return getAdminStripeConfig(db);
}

export async function listAdminQueueJobs(
  _db: PrismaClient,
  input: ListAdminQueueJobsInput
) {
  return {
    items: await listQueueJobsInternal(input),
  };
}

interface RetryAdminQueueJobParams extends RetryAdminQueueJobInput {
  adminUserId: string;
}

export async function retryAdminQueueJob(
  db: PrismaClient,
  input: RetryAdminQueueJobParams
) {
  const queueEntry = getQueueEntry(input.queueName);
  const job = (await queueEntry.queue.getJob(input.jobId)) as QueueJobRecord | null;

  if (!job) {
    return null;
  }

  const jobState = await job.getState();

  if (jobState !== "failed") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Only failed jobs can be retried.",
    });
  }

  await job.retry();

  const resolvedJobId = String(job.id ?? input.jobId);

  await createAdminAuditLog(db, {
    adminUserId: input.adminUserId,
    action: "SYSTEM_OPS_JOB_RETRIED",
    targetType: "QUEUE_JOB",
    targetId: `${input.queueName}:${resolvedJobId}`,
    metadata: {
      reason: input.reason ?? null,
      previous: {
        queueName: input.queueName,
        state: jobState,
      },
      next: {
        queueName: input.queueName,
        state: "waiting",
      },
    },
  });

  return {
    queued: true,
    queueName: input.queueName,
    jobId: resolvedJobId,
  };
}

interface TriggerAdminFeedFetchParams extends TriggerAdminFeedFetchInput {
  adminUserId: string;
}

export async function triggerAdminFeedFetch(
  db: PrismaClient,
  input: TriggerAdminFeedFetchParams
) {
  const existingFeed = await db.feedSource.findUnique({
    where: {
      id: input.feedSourceId,
    },
    select: {
      id: true,
    },
  });

  if (!existingFeed) {
    return null;
  }

  const jobId = `rss-fetch-${input.feedSourceId}`;

  await getRssQueue().add(
    RSS_FETCH_JOB,
    {
      feedSourceId: input.feedSourceId,
      force: true,
    },
    {
      jobId,
    }
  );

  await createAdminAuditLog(db, {
    adminUserId: input.adminUserId,
    action: "SYSTEM_OPS_FEED_FETCH_TRIGGERED",
    targetType: "FEED_SOURCE",
    targetId: input.feedSourceId,
    metadata: {
      reason: input.reason ?? null,
      next: {
        queueName: QUEUES.RSS_FETCH,
        jobId,
        feedSourceId: input.feedSourceId,
      },
    },
  });

  return {
    queued: true,
    queueName: QUEUES.RSS_FETCH,
    jobId,
  };
}

interface TriggerAdminContentExtractParams extends TriggerAdminContentExtractInput {
  adminUserId: string;
}

export async function triggerAdminContentExtract(
  db: PrismaClient,
  input: TriggerAdminContentExtractParams
) {
  const article = await db.sourceArticle.findUnique({
    where: {
      id: input.sourceArticleId,
    },
    select: {
      id: true,
      link: true,
    },
  });

  if (!article) {
    return null;
  }

  const jobId = `content-extract-${article.id}`;

  await getContentQueue().add(
    CONTENT_EXTRACT_JOB,
    {
      sourceArticleId: article.id,
      url: article.link,
    },
    {
      jobId,
    }
  );

  await createAdminAuditLog(db, {
    adminUserId: input.adminUserId,
    action: "SYSTEM_OPS_CONTENT_EXTRACT_TRIGGERED",
    targetType: "SOURCE_ARTICLE",
    targetId: article.id,
    metadata: {
      reason: input.reason ?? null,
      next: {
        queueName: QUEUES.CONTENT_EXTRACT,
        jobId,
        sourceArticleId: article.id,
      },
    },
  });

  return {
    queued: true,
    queueName: QUEUES.CONTENT_EXTRACT,
    jobId,
  };
}
