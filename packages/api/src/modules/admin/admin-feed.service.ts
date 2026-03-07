import { ORPCError } from "@orpc/server";

import prisma from "@NewsFlow/db";
import type { Prisma } from "@NewsFlow/db";
import {
  CONTENT_EXTRACT_JOB,
  QUEUES,
  RSS_FETCH_JOB,
  createQueue,
  type ContentExtractJobData,
  type RssFetchJobData,
} from "@NewsFlow/queue";

import { createAdminAuditLog } from "./admin-audit.service";
import type { ListAdminFeedsInput } from "./admin-feed.schema";

type PrismaClient = typeof prisma;

const rssQueue = createQueue<RssFetchJobData>(QUEUES.RSS_FETCH);
const contentQueue = createQueue<ContentExtractJobData>(QUEUES.CONTENT_EXTRACT);

const adminFeedListSelect = {
  id: true,
  url: true,
  normalizedUrl: true,
  siteUrl: true,
  title: true,
  description: true,
  iconUrl: true,
  language: true,
  isEnabled: true,
  errorCount: true,
  lastError: true,
  lastFetched: true,
  nextFetchAt: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      subscriptions: true,
      articles: true,
    },
  },
} satisfies Prisma.FeedSourceSelect;

const adminFeedDetailSelect = {
  ...adminFeedListSelect,
  articles: {
    select: {
      id: true,
      title: true,
      link: true,
      pubDate: true,
      contentExtracted: true,
      extractionAttempts: true,
      lastExtractionError: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ pubDate: "desc" }, { id: "desc" }],
    take: 10,
  },
} satisfies Prisma.FeedSourceSelect;

type AdminFeedListRecord = Prisma.FeedSourceGetPayload<{
  select: typeof adminFeedListSelect;
}>;

function buildAdminFeedWhere(input: ListAdminFeedsInput): Prisma.FeedSourceWhereInput {
  const andFilters: Prisma.FeedSourceWhereInput[] = [];
  const now = new Date();

  if (input.query) {
    andFilters.push({
      OR: [
        { title: { contains: input.query, mode: "insensitive" } },
        { url: { contains: input.query, mode: "insensitive" } },
        { normalizedUrl: { contains: input.query, mode: "insensitive" } },
      ],
    });
  }

  if (input.isEnabled !== undefined) {
    andFilters.push({ isEnabled: input.isEnabled });
  }

  if (input.hasErrors !== undefined) {
    andFilters.push(
      input.hasErrors
        ? {
            OR: [{ errorCount: { gt: 0 } }, { lastError: { not: null } }],
          }
        : {
            AND: [{ errorCount: 0 }, { lastError: null }],
          }
    );
  }

  if (input.isStale !== undefined) {
    andFilters.push(
      input.isStale
        ? {
            OR: [{ nextFetchAt: null }, { nextFetchAt: { lte: now } }],
          }
        : {
            nextFetchAt: { gt: now },
          }
    );
  }

  if (input.hasExtractionFailures !== undefined) {
    andFilters.push(
      input.hasExtractionFailures
        ? {
            articles: {
              some: {
                lastExtractionError: { not: null },
              },
            },
          }
        : {
            articles: {
              none: {
                lastExtractionError: { not: null },
              },
            },
          }
    );
  }

  if (input.cursor) {
    const cursorCreatedAt = new Date(input.cursor.createdAt);

    andFilters.push({
      OR: [
        { createdAt: { lt: cursorCreatedAt } },
        {
          createdAt: cursorCreatedAt,
          id: { lt: input.cursor.id },
        },
      ],
    });
  }

  if (andFilters.length === 0) {
    return {};
  }

  return {
    AND: andFilters,
  };
}

async function getExtractionFailureCounts(
  db: Pick<PrismaClient, "sourceArticle">,
  feedSourceIds: string[]
) {
  if (feedSourceIds.length === 0) {
    return new Map<string, number>();
  }

  const grouped = await db.sourceArticle.groupBy({
    by: ["feedSourceId"],
    where: {
      feedSourceId: {
        in: feedSourceIds,
      },
      lastExtractionError: {
        not: null,
      },
    },
    _count: {
      _all: true,
    },
  });

  return new Map(grouped.map((item) => [item.feedSourceId, item._count._all]));
}

function mapAdminFeedListItem(
  feed: AdminFeedListRecord,
  extractionFailureCount: number
) {
  return {
    id: feed.id,
    url: feed.url,
    normalizedUrl: feed.normalizedUrl,
    siteUrl: feed.siteUrl,
    title: feed.title,
    description: feed.description,
    iconUrl: feed.iconUrl,
    language: feed.language,
    isEnabled: feed.isEnabled,
    errorCount: feed.errorCount,
    lastError: feed.lastError,
    lastFetched: feed.lastFetched,
    nextFetchAt: feed.nextFetchAt,
    subscriptionCount: feed._count.subscriptions,
    articleCount: feed._count.articles,
    extractionFailureCount,
    createdAt: feed.createdAt,
    updatedAt: feed.updatedAt,
  };
}

export async function listAdminFeeds(db: PrismaClient, input: ListAdminFeedsInput) {
  const feeds = await db.feedSource.findMany({
    where: buildAdminFeedWhere(input),
    take: input.limit + 1,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: adminFeedListSelect,
  });

  let nextCursor:
    | {
        id: string;
        createdAt: string;
      }
    | undefined;

  if (feeds.length > input.limit) {
    const nextItem = feeds.pop();

    if (nextItem) {
      nextCursor = {
        id: nextItem.id,
        createdAt: nextItem.createdAt.toISOString(),
      };
    }
  }

  const extractionFailureCounts = await getExtractionFailureCounts(
    db,
    feeds.map((feed) => feed.id)
  );

  return {
    items: feeds.map((feed) =>
      mapAdminFeedListItem(feed, extractionFailureCounts.get(feed.id) ?? 0)
    ),
    nextCursor,
  };
}

export async function getAdminFeedDetail(db: PrismaClient, feedSourceId: string) {
  const feed = await db.feedSource.findUnique({
    where: { id: feedSourceId },
    select: adminFeedDetailSelect,
  });

  if (!feed) {
    return null;
  }

  const extractionFailureCounts = await getExtractionFailureCounts(db, [feed.id]);
  const recentFailures = await db.sourceArticle.findMany({
    where: {
      feedSourceId,
      lastExtractionError: {
        not: null,
      },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 10,
    select: {
      id: true,
      title: true,
      extractionAttempts: true,
      lastExtractionError: true,
      updatedAt: true,
    },
  });

  return {
    ...mapAdminFeedListItem(feed, extractionFailureCounts.get(feed.id) ?? 0),
    recentArticles: feed.articles.map((article) => ({
      id: article.id,
      title: article.title,
      link: article.link,
      pubDate: article.pubDate,
      contentExtracted: article.contentExtracted,
      extractionAttempts: article.extractionAttempts,
      lastExtractionError: article.lastExtractionError,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
    })),
    recentFailures: recentFailures
      .filter((article) => article.lastExtractionError)
      .map((article) => ({
        sourceArticleId: article.id,
        title: article.title,
        extractionAttempts: article.extractionAttempts,
        lastExtractionError: article.lastExtractionError as string,
        updatedAt: article.updatedAt,
      })),
  };
}

interface AdminFeedMutationContext {
  adminUserId: string;
}

interface UpdateAdminFeedEnabledParams extends AdminFeedMutationContext {
  feedSourceId: string;
  isEnabled: boolean;
}

interface RetryAdminFeedFetchParams extends AdminFeedMutationContext {
  feedSourceId: string;
}

interface RetryAdminFeedExtractionParams extends AdminFeedMutationContext {
  feedSourceId: string;
}

interface RetryAdminArticleExtractionParams extends AdminFeedMutationContext {
  sourceArticleId: string;
}

export async function updateAdminFeedEnabled(
  db: PrismaClient,
  input: UpdateAdminFeedEnabledParams
) {
  const existingFeed = await db.feedSource.findUnique({
    where: { id: input.feedSourceId },
    select: { id: true, isEnabled: true },
  });

  if (!existingFeed) {
    return null;
  }

  if (existingFeed.isEnabled === input.isEnabled) {
    throw new ORPCError("BAD_REQUEST", {
      message: input.isEnabled
        ? "Feed source is already enabled."
        : "Feed source is already disabled.",
    });
  }

  await db.$transaction(async (tx) => {
    await tx.feedSource.update({
      where: { id: input.feedSourceId },
      data: {
        isEnabled: input.isEnabled,
        nextFetchAt: input.isEnabled ? new Date() : null,
      },
    });

    await createAdminAuditLog(tx, {
      adminUserId: input.adminUserId,
      action: "FEED_SOURCE_ENABLED_UPDATED",
      targetType: "FEED_SOURCE",
      targetId: input.feedSourceId,
      metadata: {
        previous: {
          isEnabled: existingFeed.isEnabled,
        },
        next: {
          isEnabled: input.isEnabled,
        },
      },
    });
  });

  return getAdminFeedDetail(db, input.feedSourceId);
}

export async function retryAdminFeedFetch(
  db: PrismaClient,
  input: RetryAdminFeedFetchParams
) {
  const existingFeed = await db.feedSource.findUnique({
    where: { id: input.feedSourceId },
    select: { id: true },
  });

  if (!existingFeed) {
    return null;
  }

  await rssQueue.add(
    RSS_FETCH_JOB,
    {
      feedSourceId: input.feedSourceId,
      force: true,
    },
    {
      jobId: `rss-fetch-${input.feedSourceId}`,
    }
  );

  await db.$transaction(async (tx) => {
    await tx.feedSource.update({
      where: { id: input.feedSourceId },
      data: {
        nextFetchAt: new Date(),
      },
    });

    await createAdminAuditLog(tx, {
      adminUserId: input.adminUserId,
      action: "FEED_SOURCE_FETCH_RETRIED",
      targetType: "FEED_SOURCE",
      targetId: input.feedSourceId,
      metadata: {
        next: {
          queued: true,
        },
      },
    });
  });

  return {
    queued: true,
    feedSourceId: input.feedSourceId,
  };
}

export async function retryAdminFeedExtraction(
  db: PrismaClient,
  input: RetryAdminFeedExtractionParams
) {
  const existingFeed = await db.feedSource.findUnique({
    where: { id: input.feedSourceId },
    select: { id: true },
  });

  if (!existingFeed) {
    return null;
  }

  const articles = await db.sourceArticle.findMany({
    where: {
      feedSourceId: input.feedSourceId,
      OR: [
        {
          lastExtractionError: {
            not: null,
          },
        },
        {
          contentExtracted: false,
          content: null,
        },
      ],
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      link: true,
    },
    take: 100,
  });

  if (articles.length === 0) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Feed source has no articles waiting for extraction.",
    });
  }

  await contentQueue.addBulk(
    articles.map((article) => ({
      name: CONTENT_EXTRACT_JOB,
      data: {
        sourceArticleId: article.id,
        url: article.link,
      },
      opts: {
        jobId: `content-extract-${article.id}`,
      },
    }))
  );

  await createAdminAuditLog(db, {
    adminUserId: input.adminUserId,
    action: "FEED_SOURCE_EXTRACTION_RETRIED",
    targetType: "FEED_SOURCE",
    targetId: input.feedSourceId,
    metadata: {
      next: {
        queuedCount: articles.length,
      },
    },
  });

  return {
    queued: true,
    feedSourceId: input.feedSourceId,
    queuedCount: articles.length,
  };
}

export async function retryAdminArticleExtraction(
  db: PrismaClient,
  input: RetryAdminArticleExtractionParams
) {
  const article = await db.sourceArticle.findUnique({
    where: { id: input.sourceArticleId },
    select: {
      id: true,
      feedSourceId: true,
      link: true,
    },
  });

  if (!article) {
    return null;
  }

  await contentQueue.add(
    CONTENT_EXTRACT_JOB,
    {
      sourceArticleId: article.id,
      url: article.link,
    },
    {
      jobId: `content-extract-${article.id}`,
    }
  );

  await createAdminAuditLog(db, {
    adminUserId: input.adminUserId,
    action: "SOURCE_ARTICLE_EXTRACTION_RETRIED",
    targetType: "SOURCE_ARTICLE",
    targetId: article.id,
    metadata: {
      next: {
        queued: true,
      },
    },
  });

  return {
    queued: true,
    feedSourceId: article.feedSourceId,
    sourceArticleId: article.id,
  };
}
