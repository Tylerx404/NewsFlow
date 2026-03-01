import { extract } from "@extractus/article-extractor";
import db from "@NewsFlow/db";
import type { Prisma } from "@NewsFlow/db";

type SourceArticleWithFeedSource = Prisma.SourceArticleGetPayload<{
  include: { feedSource: true };
}>;

type PrismaClient = Pick<typeof db, "sourceArticle">;

export async function extractFullContent(
  prisma: PrismaClient,
  articleId: string,
  userId: string
): Promise<SourceArticleWithFeedSource | null> {
  const article = await prisma.sourceArticle.findFirst({
    where: {
      id: articleId,
      feedSource: {
        subscriptions: {
          some: { userId },
        },
      },
    },
    include: { feedSource: true },
  });

  if (!article) {
    return null;
  }

  if (article.contentExtracted) {
    return article;
  }

  try {
    const extracted = await extract(article.link, {
      descriptionLengthThreshold: 40,
      contentLengthThreshold: 100,
    });

    if (!extracted || !extracted.content) {
      const updated = await prisma.sourceArticle.update({
        where: { id: articleId },
        data: {
          contentExtracted: true,
        },
        include: { feedSource: true },
      });
      return updated;
    }

    const updated = await prisma.sourceArticle.update({
      where: { id: articleId },
      data: {
        content: extracted.content,
        excerpt: extracted.description || article.excerpt,
        image: extracted.image || article.image,
        contentExtracted: true,
      },
      include: { feedSource: true },
    });

    return updated;
  } catch {
    const updated = await prisma.sourceArticle.update({
      where: { id: articleId },
      data: {
        contentExtracted: true,
      },
      include: { feedSource: true },
    });

    return updated;
  }
}
