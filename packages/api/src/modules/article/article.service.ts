import { extract } from "@extractus/article-extractor";
import type { PrismaClient } from "@NewsFlow/db";

export async function extractFullContent(
  prisma: PrismaClient,
  articleId: string,
  userId: string
) {
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
    return article;
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
      return article;
    }

    const updated = await prisma.article.update({
      where: { id: articleId },
      data: {
        content: extracted.content,
        excerpt: extracted.description || article.excerpt,
        image: extracted.image || article.image,
        contentExtracted: true,
      },
    });

    return updated;
  } catch (error) {
    // Mark as attempted to avoid repeated failures
    await prisma.article.update({
      where: { id: articleId },
      data: { contentExtracted: true },
    });

    return article;
  }
}
