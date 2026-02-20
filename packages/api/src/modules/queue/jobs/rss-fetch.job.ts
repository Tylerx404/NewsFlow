export interface RssFetchJobData {
  feedId: string;
  userId: string;
  force?: boolean;
}

export const RSS_FETCH_JOB = 'rss-fetch';