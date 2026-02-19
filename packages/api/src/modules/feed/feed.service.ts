import Parser from "rss-parser";
import prisma from "@NewsFlow/db";
import { ORPCError } from "@orpc/server";

type PrismaClient = typeof prisma;

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "NewsFlow RSS Reader/1.0",
  },
});

export interface FeedMetadata {
  title: string;
  description: string | null;
  siteUrl: string | null;
  iconUrl: string | null;
  language: string | null;
}

export interface RssItem {
  guid: string;
  title: string;
  link: string;
  pubDate: Date;
  excerpt: string | null;
  author: string | null;
  categories: string[];
}

export async function fetchFeedMetadata(url: string): Promise<{
  metadata: FeedMetadata;
  items: RssItem[];
}> {
  try {
    const feed = await parser.parseURL(url);

    const metadata: FeedMetadata = {
      title: feed.title || "Untitled Feed",
      description: feed.description || null,
      siteUrl: feed.link || null,
      iconUrl: feed.image?.url || null,
      language: feed.language || null,
    };

    const items: RssItem[] = (feed.items || []).map((item) => ({
      guid: item.guid || item.link || item.title || crypto.randomUUID(),
      title: item.title || "Untitled",
      link: item.link || "",
      pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
      excerpt: item.contentSnippet || item.content?.slice(0, 500) || null,
      author: item.creator || item.author || null,
      categories: item.categories || [],
    }));

    return { metadata, items };
  } catch (error) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Invalid RSS feed URL or unable to fetch feed",
    });
  }
}

export async function createFeedWithArticles(
  prisma: PrismaClient,
  userId: string,
  url: string
) {
  // Check duplicate
  const existing = await prisma.feed.findUnique({
    where: { userId_url: { userId, url } },
  });

  if (existing) {
    throw new ORPCError("BAD_REQUEST", {
      message: "You have already added this feed",
    });
  }

  const { metadata, items } = await fetchFeedMetadata(url);

  // Create feed with articles in transaction
  const feed = await prisma.$transaction(async (tx) => {
    const newFeed = await tx.feed.create({
      data: {
        userId,
        url,
        ...metadata,
        lastFetched: new Date(),
      },
    });

    // Upsert articles
    for (const item of items.slice(0, 50)) { // Limit initial fetch
      await tx.article.upsert({
        where: {
          feedId_guid: { feedId: newFeed.id, guid: item.guid },
        },
        create: {
          feedId: newFeed.id,
          guid: item.guid,
          title: item.title,
          link: item.link,
          author: item.author,
          pubDate: item.pubDate,
          excerpt: item.excerpt,
          categories: item.categories,
        },
        update: {}, // No update on conflict
      });
    }

    return newFeed;
  });

  return feed;
}
