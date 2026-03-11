import { createHash } from "node:crypto";
import Parser from "rss-parser";

import prisma from "@NewsFlow/db";
import type { Prisma } from "@NewsFlow/db";
import { ORPCError } from "@orpc/server";
import { inferFeedCountry } from "./feed-country-inference.service";

type PrismaClient = typeof prisma;

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "NewsFlow RSS Reader/1.0",
  },
});

export interface FeedSourceMetadata {
  title: string;
  description: string | null;
  siteUrl: string | null;
  iconUrl: string | null;
  language: string | null;
  inferredLanguage: string | null;
  inferredCountryCode: string;
  inferenceConfidence: number | null;
  inferenceSource: "LANG_DETECTION" | "DEFAULT";
  inferredAt: Date;
}

export interface RssItem {
  articleKey: string;
  guid: string | null;
  title: string;
  link: string;
  pubDate: Date;
  excerpt: string | null;
  author: string | null;
  categories: string[];
}

const normalizeUrl = (rawUrl: string) => {
  const parsed = new URL(rawUrl.trim());
  const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
  const normalizedSearch = parsed.searchParams.toString();
  return `${parsed.protocol}//${parsed.host.toLowerCase()}${pathname}${normalizedSearch ? `?${normalizedSearch}` : ""}`;
};

export const normalizeFeedUrl = (rawUrl: string) => normalizeUrl(rawUrl);

const buildArticleKey = (
  guid: string | undefined,
  link: string | undefined,
  title: string | undefined,
  pubDate: Date
) => {
  const normalizedGuid = guid?.trim();
  if (normalizedGuid) {
    return createHash("sha256").update(`guid:${normalizedGuid}`).digest("hex");
  }

  const normalizedLink = link?.trim();
  if (normalizedLink) {
    return createHash("sha256").update(`link:${normalizeUrl(normalizedLink)}`).digest("hex");
  }

  return createHash("sha256")
    .update(`title:${title?.trim() || "untitled"}|pubDate:${pubDate.toISOString()}`)
    .digest("hex");
};

export async function fetchFeedMetadata(url: string): Promise<{
  normalizedUrl: string;
  metadata: FeedSourceMetadata;
  items: RssItem[];
}> {
  try {
    const normalizedUrl = normalizeFeedUrl(url);
    const feed = await parser.parseURL(url);

    const metadata: FeedSourceMetadata = {
      title: feed.title || "Untitled Feed",
      description: feed.description || null,
      siteUrl: feed.link || null,
      iconUrl: feed.image?.url || null,
      language: feed.language || null,
      inferredLanguage: null,
      inferredCountryCode: "GLOBAL",
      inferenceConfidence: null,
      inferenceSource: "DEFAULT",
      inferredAt: new Date(),
    };

    const items: RssItem[] = (feed.items || []).map((item) => {
      const link = item.link || "";
      const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();

      return {
        articleKey: buildArticleKey(item.guid, link, item.title, pubDate),
        guid: item.guid || null,
        title: item.title || "Untitled",
        link,
        pubDate,
        excerpt: item.contentSnippet || item.content?.slice(0, 500) || null,
        author: item.creator || item.author || null,
        categories: item.categories || [],
      };
    });

    const inference = inferFeedCountry({
      title: metadata.title,
      description: metadata.description,
      items: items.slice(0, 5).map((item) => ({
        title: item.title,
        summary: item.excerpt,
      })),
      defaultCountryCode: "GLOBAL",
      sourceUrl: normalizedUrl,
      siteUrl: metadata.siteUrl,
    });

    metadata.inferredLanguage = inference.inferredLanguage;
    metadata.inferredCountryCode = inference.inferredCountryCode;
    metadata.inferenceConfidence = inference.inferenceConfidence;
    metadata.inferenceSource = inference.inferenceSource;
    metadata.inferredAt = inference.inferredAt;

    return { normalizedUrl, metadata, items };
  } catch {
    throw new ORPCError("BAD_REQUEST", {
      message: "Invalid RSS feed URL or unable to fetch feed",
    });
  }
}

export type FeedSubscriptionWithSource = Prisma.FeedSubscriptionGetPayload<{
  include: { feedSource: true };
}>;

export function mapFeedSubscription(subscription: FeedSubscriptionWithSource) {
  return {
    id: subscription.id,
    userId: subscription.userId,
    feedSourceId: subscription.feedSourceId,
    customTitle: subscription.customTitle,
    sourceTitle: subscription.feedSource.title,
    title: subscription.customTitle || subscription.feedSource.title,
    url: subscription.feedSource.url,
    normalizedUrl: subscription.feedSource.normalizedUrl,
    siteUrl: subscription.feedSource.siteUrl,
    description: subscription.feedSource.description,
    category: subscription.category,
    iconUrl: subscription.feedSource.iconUrl,
    language: subscription.feedSource.language,
    isActive: subscription.isActive,
    lastFetched: subscription.feedSource.lastFetched,
    lastError: subscription.feedSource.lastError,
    errorCount: subscription.feedSource.errorCount,
    nextFetchAt: subscription.feedSource.nextFetchAt,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
  };
}

export async function createFeedSubscriptionWithInitialArticles(
  prisma: PrismaClient,
  userId: string,
  url: string
) {
  const normalizedUrl = normalizeFeedUrl(url);

  let feedSource = await prisma.feedSource.findUnique({
    where: { normalizedUrl },
  });

  if (!feedSource) {
    const { metadata, items } = await fetchFeedMetadata(url);

    feedSource = await prisma.$transaction(async (tx) => {
      const source = await tx.feedSource.create({
        data: {
          url,
          normalizedUrl,
          ...metadata,
          lastFetched: new Date(),
          nextFetchAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });

      if (items.length > 0) {
        await tx.sourceArticle.createMany({
          data: items.slice(0, 50).map((item) => ({
            feedSourceId: source.id,
            articleKey: item.articleKey,
            guid: item.guid,
            title: item.title,
            link: item.link,
            author: item.author,
            pubDate: item.pubDate,
            excerpt: item.excerpt,
            categories: item.categories,
          })),
          skipDuplicates: true,
        });
      }

      return source;
    });
  }

  const existingSubscription = await prisma.feedSubscription.findUnique({
    where: {
      userId_feedSourceId: {
        userId,
        feedSourceId: feedSource.id,
      },
    },
  });

  if (existingSubscription) {
    throw new ORPCError("BAD_REQUEST", {
      message: "You have already added this feed",
    });
  }

  return prisma.feedSubscription.create({
    data: {
      userId,
      feedSourceId: feedSource.id,
    },
    include: {
      feedSource: true,
    },
  });
}
