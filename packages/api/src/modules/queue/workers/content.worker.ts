import { extract } from '@extractus/article-extractor';
import db from '@NewsFlow/db';
import type { ContentExtractJobData } from '../jobs/content-extract.job';

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
        'User-Agent': 'NewsFlow/1.0',
      },
    } as any);

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