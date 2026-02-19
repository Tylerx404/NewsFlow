import { extract } from "@extractus/article-extractor";
import type { Prisma } from "@NewsFlow/db";

type ArticleWithFeed = Prisma.ArticleGetPayload<{
  include: { feed: true };
}>;

type PrismaClient = {
  article: Prisma.ArticleDelegate;
};

export async function extractFullContent(
  prisma: PrismaClient,
  articleId: string,
  userId: string
): Promise<ArticleWithFeed | null> {
  // Verify ownership via feed relation
  const article = await prisma.article.findFirst({
    where: {
      id: articleId,
      feed: { userId },
    },
    include: { feed: true },
  });

  if (!article) {
    return null;
  }

  if (article.contentExtracted) {
    return article as ArticleWithFeed;
  }

  try {
    const extracted = await extract(article.link, {
      descriptionLengthThreshold: 40,
      contentLengthThreshold: 100,
    });

    if (!extracted || !extracted.content) {
      // Mark as attempted but failed
      await prisma.article.update({
        where: { id: articleId },
        data: { contentExtracted: true }, // Don't retry
      });
      return article as ArticleWithFeed;
    }

    await prisma.article.update({
      where: { id: articleId },
      data: {
        content: extracted.content,
        excerpt: extracted.description || article.excerpt,
        image: extracted.image || article.image,
        contentExtracted: true,
      },
    });

    const updatedWithFeed = await prisma.article.findFirst({
      where: { id: articleId },
      include: { feed: true },
    });

    return updatedWithFeed as ArticleWithFeed;
  } catch (error) {
    // Mark as attempted to avoid repeated failures
    await prisma.article.update({
      where: { id: articleId },
      data: { contentExtracted: true },
    });

    return article as ArticleWithFeed;
  }
}
