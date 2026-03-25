import { ORPCError } from "@orpc/server";

import {
  AuthSigningKeyConfigError,
  buildAuthSigningKeyConfigUpdateData,
  getAuthSigningKeyConfigRecord,
  getAuthSigningKeyFingerprint,
  maskAuthSigningKeyConfigRecord,
} from "@NewsFlow/auth/auth-signing-key-config";
import {
  buildOAuthConfigUpdateData,
  getOAuthConfigRecord,
  maskOAuthConfigRecord,
} from "@NewsFlow/auth/oauth-config";
import {
  buildSmtpConfigUpdateData,
  getSmtpConfigRecord,
  isSmtpConfigComplete,
  maskSmtpConfigRecord,
} from "@NewsFlow/auth/smtp-config";
import { sendSmtpMail } from "@NewsFlow/auth/smtp-mailer";
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
  SendAdminSmtpTestEmailInput,
  UpdateAdminAuthSigningKeyConfigInput,
  UpdateAdminOAuthConfigInput,
  UpdateAdminSmtpConfigInput,
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

export async function getAdminOAuthConfig(
  db: Pick<PrismaClient, "authConfig">
) {
  const record = await getOAuthConfigRecord(db);
  return maskOAuthConfigRecord(record);
}

export async function getAdminSmtpConfig(
  db: Pick<PrismaClient, "smtpConfig">
) {
  const record = await getSmtpConfigRecord(db);
  return maskSmtpConfigRecord(record);
}

export async function getAdminAuthSigningKeyConfig(
  db: Pick<PrismaClient, "authSigningKeyConfig">
) {
  const record = await getAuthSigningKeyConfigRecord(db);
  return maskAuthSigningKeyConfigRecord(record);
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

interface UpdateAdminOAuthConfigParams extends UpdateAdminOAuthConfigInput {
  adminUserId: string;
}

export async function updateAdminOAuthConfig(
  db: PrismaClient,
  input: UpdateAdminOAuthConfigParams
) {
  const existing = await getOAuthConfigRecord(db);
  const nextData = await buildOAuthConfigUpdateData({
    ...input,
    updatedByUserId: input.adminUserId,
  });

  const changedFields = Object.keys(nextData).filter(
    (field) => field !== "updatedByUserId" && field !== "updatedAt"
  );
  const nextGoogleClientId =
    typeof nextData.googleClientId === "string" || nextData.googleClientId === null
      ? nextData.googleClientId
      : existing?.googleClientId ?? null;
  const nextAppleClientId =
    typeof nextData.appleClientId === "string" || nextData.appleClientId === null
      ? nextData.appleClientId
      : existing?.appleClientId ?? null;
  const nextAppleAppBundleIdentifier =
    typeof nextData.appleAppBundleIdentifier === "string"
      || nextData.appleAppBundleIdentifier === null
      ? nextData.appleAppBundleIdentifier
      : existing?.appleAppBundleIdentifier ?? null;
  const nextGoogleSecretState =
    typeof nextData.googleClientSecretEncrypted === "string"
      ? "present"
      : existing?.googleClientSecretEncrypted
        ? "present"
        : "missing";
  const nextAppleSecretState =
    typeof nextData.appleClientSecretEncrypted === "string"
      ? "present"
      : existing?.appleClientSecretEncrypted
        ? "present"
        : "missing";

  await db.$transaction(async (tx) => {
    await tx.authConfig.upsert({
      where: { id: "default" },
      update: nextData,
      create: {
        id: "default",
        ...nextData,
      },
    });

    await createAdminAuditLog(tx, {
      adminUserId: input.adminUserId,
      action: "SYSTEM_OPS_OAUTH_CONFIG_UPDATED",
      targetType: "SYSTEM_CONFIG",
      targetId: "oauth",
      metadata: {
        previous: {
          changedFields: changedFields.join(",") || undefined,
          googleClientId: existing?.googleClientId ? "present" : "missing",
          googleClientSecret: existing?.googleClientSecretEncrypted ? "present" : "missing",
          appleClientId: existing?.appleClientId ? "present" : "missing",
          appleClientSecret: existing?.appleClientSecretEncrypted ? "present" : "missing",
          appleAppBundleIdentifier: existing?.appleAppBundleIdentifier ? "present" : "missing",
        },
        next: {
          changedFields: changedFields.join(",") || undefined,
          googleClientId: nextGoogleClientId ? "present" : "missing",
          googleClientSecret: nextGoogleSecretState,
          appleClientId: nextAppleClientId ? "present" : "missing",
          appleClientSecret: nextAppleSecretState,
          appleAppBundleIdentifier: nextAppleAppBundleIdentifier ? "present" : "missing",
        },
      },
    });
  });

  return getAdminOAuthConfig(db);
}

interface UpdateAdminSmtpConfigParams extends UpdateAdminSmtpConfigInput {
  adminUserId: string;
}

export async function updateAdminSmtpConfig(
  db: PrismaClient,
  input: UpdateAdminSmtpConfigParams
) {
  const existing = await getSmtpConfigRecord(db);
  const nextData = await buildSmtpConfigUpdateData({
    ...input,
    updatedByUserId: input.adminUserId,
  });

  const changedFields = Object.keys(nextData).filter(
    (field) => field !== "updatedByUserId" && field !== "updatedAt"
  );
  const nextHost =
    typeof nextData.host === "string" || nextData.host === null
      ? nextData.host
      : existing?.host ?? null;
  const nextPort =
    typeof nextData.port === "number" || nextData.port === null
      ? nextData.port
      : existing?.port ?? null;
  const nextUsername =
    typeof nextData.username === "string" || nextData.username === null
      ? nextData.username
      : existing?.username ?? null;
  const nextFromEmail =
    typeof nextData.fromEmail === "string" || nextData.fromEmail === null
      ? nextData.fromEmail
      : existing?.fromEmail ?? null;
  const nextPasswordState =
    typeof nextData.passwordEncrypted === "string"
      ? "present"
      : existing?.passwordEncrypted
        ? "present"
        : "missing";

  await db.$transaction(async (tx) => {
    await tx.smtpConfig.upsert({
      where: { id: "default" },
      update: nextData,
      create: {
        id: "default",
        ...nextData,
      },
    });

    await createAdminAuditLog(tx, {
      adminUserId: input.adminUserId,
      action: "SYSTEM_OPS_SMTP_CONFIG_UPDATED",
      targetType: "SYSTEM_CONFIG",
      targetId: "smtp",
      metadata: {
        previous: {
          changedFields: changedFields.join(",") || undefined,
          host: existing?.host ? "present" : "missing",
          port: existing?.port ? "present" : "missing",
          username: existing?.username ? "present" : "missing",
          password: existing?.passwordEncrypted ? "present" : "missing",
          fromEmail: existing?.fromEmail ? "present" : "missing",
        },
        next: {
          changedFields: changedFields.join(",") || undefined,
          host: nextHost ? "present" : "missing",
          port: nextPort ? "present" : "missing",
          username: nextUsername ? "present" : "missing",
          password: nextPasswordState,
          fromEmail: nextFromEmail ? "present" : "missing",
        },
      },
    });
  });

  return getAdminSmtpConfig(db);
}

interface SendAdminSmtpTestEmailParams extends SendAdminSmtpTestEmailInput {
  adminUserId: string;
}

export async function sendAdminSmtpTestEmail(
  db: PrismaClient,
  input: SendAdminSmtpTestEmailParams
) {
  const smtpRecord = await getSmtpConfigRecord(db);

  if (!isSmtpConfigComplete(smtpRecord)) {
    throw new ORPCError("BAD_REQUEST", {
      message:
        "SMTP is incomplete. Save host, port, username, password, and from email before sending a test email.",
    });
  }

  await sendSmtpMail(
    {
      to: input.toEmail,
      subject: "NewsFlow SMTP test email",
      text: [
        "This is a test email from NewsFlow Admin System Ops.",
        "",
        "If you received this message, the saved SMTP configuration is working.",
      ].join("\n"),
      html: [
        "<p>This is a test email from NewsFlow Admin System Ops.</p>",
        "<p>If you received this message, the saved SMTP configuration is working.</p>",
      ].join(""),
    },
    db
  );

  await createAdminAuditLog(db, {
    adminUserId: input.adminUserId,
    action: "SYSTEM_OPS_SMTP_TEST_EMAIL_SENT",
    targetType: "SYSTEM_CONFIG",
    targetId: "smtp",
    metadata: {
      next: {
        toEmail: input.toEmail,
        host: "present",
        fromEmail: "present",
      },
    },
  });

  return {
    sent: true,
    toEmail: input.toEmail,
  };
}

interface UpdateAdminAuthSigningKeyConfigParams
  extends UpdateAdminAuthSigningKeyConfigInput {
  adminUserId: string;
}

export async function updateAdminAuthSigningKeyConfig(
  db: PrismaClient,
  input: UpdateAdminAuthSigningKeyConfigParams
) {
  const existing = await getAuthSigningKeyConfigRecord(db);
  let nextData: Awaited<
    ReturnType<typeof buildAuthSigningKeyConfigUpdateData>
  >;

  try {
    nextData = await buildAuthSigningKeyConfigUpdateData(
      {
        ...input,
        updatedByUserId: input.adminUserId,
      },
      existing
    );
  } catch (error) {
    if (error instanceof AuthSigningKeyConfigError) {
      throw new ORPCError("BAD_REQUEST", {
        message: error.message,
      });
    }

    throw error;
  }

  const changedFields = Object.keys(nextData).filter(
    (field) =>
      field !== "updatedByUserId" && field !== "updatedAt" && field !== "algorithm"
  );
  const nextPublicKeyPem =
    typeof nextData.publicKeyPem === "string" || nextData.publicKeyPem === null
      ? nextData.publicKeyPem
      : existing?.publicKeyPem ?? null;
  const nextPrivateKeyState =
    typeof nextData.privateKeyPemEncrypted === "string"
      ? "present"
      : nextData.privateKeyPemEncrypted === null
        ? "missing"
        : existing?.privateKeyPemEncrypted
          ? "present"
          : "missing";

  await db.$transaction(async (tx) => {
    await tx.authSigningKeyConfig.upsert({
      where: { id: "default" },
      update: nextData,
      create: {
        id: "default",
        ...nextData,
      },
    });

    await createAdminAuditLog(tx, {
      adminUserId: input.adminUserId,
      action: "SYSTEM_OPS_AUTH_SIGNING_KEY_CONFIG_UPDATED",
      targetType: "SYSTEM_CONFIG",
      targetId: "auth-signing-key",
      metadata: {
        previous: {
          changedFields: changedFields.join(",") || undefined,
          publicKey: existing?.publicKeyPem ? "present" : "missing",
          privateKey: existing?.privateKeyPemEncrypted ? "present" : "missing",
          fingerprint: existing?.publicKeyPem
            ? getAuthSigningKeyFingerprint(existing.publicKeyPem)
            : undefined,
        },
        next: {
          changedFields: changedFields.join(",") || undefined,
          publicKey: nextPublicKeyPem ? "present" : "missing",
          privateKey: nextPrivateKeyState,
          fingerprint: nextPublicKeyPem
            ? getAuthSigningKeyFingerprint(nextPublicKeyPem)
            : undefined,
        },
      },
    });
  });

  return getAdminAuthSigningKeyConfig(db);
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
