export interface DiscoverFeed {
  title: string;
  url: string;
  description: string | null;
  category: string | null;
  language: string | null;
  siteUrl: string | null;
}

export const DISCOVER_FEEDS: DiscoverFeed[] = [
  {
    title: "TechCrunch",
    url: "https://techcrunch.com/feed/",
    description: "Startup and technology news.",
    category: "technology",
    language: "en",
    siteUrl: "https://techcrunch.com",
  },
  {
    title: "The Verge",
    url: "https://www.theverge.com/rss/index.xml",
    description: "Tech, science, art, and culture.",
    category: "technology",
    language: "en",
    siteUrl: "https://www.theverge.com",
  },
  {
    title: "Ars Technica",
    url: "https://feeds.arstechnica.com/arstechnica/index",
    description: "Original news and in-depth technology analysis.",
    category: "technology",
    language: "en",
    siteUrl: "https://arstechnica.com",
  },
  {
    title: "BBC World",
    url: "http://feeds.bbci.co.uk/news/world/rss.xml",
    description: "World news from BBC.",
    category: "world",
    language: "en",
    siteUrl: "https://www.bbc.com/news",
  },
  {
    title: "NPR News",
    url: "https://feeds.npr.org/1001/rss.xml",
    description: "National Public Radio latest stories.",
    category: "news",
    language: "en",
    siteUrl: "https://www.npr.org",
  },
  {
    title: "Wired",
    url: "https://www.wired.com/feed/rss",
    description: "Ideas and innovation stories.",
    category: "technology",
    language: "en",
    siteUrl: "https://www.wired.com",
  },
  {
    title: "MIT Technology Review",
    url: "https://www.technologyreview.com/feed/",
    description: "Independent journalism about technology.",
    category: "technology",
    language: "en",
    siteUrl: "https://www.technologyreview.com",
  },
  {
    title: "Smashing Magazine",
    url: "https://www.smashingmagazine.com/feed/",
    description: "Web design and frontend engineering.",
    category: "development",
    language: "en",
    siteUrl: "https://www.smashingmagazine.com",
  },
  {
    title: "Hacker News",
    url: "https://hnrss.org/frontpage",
    description: "Top stories from Hacker News.",
    category: "development",
    language: "en",
    siteUrl: "https://news.ycombinator.com",
  },
  {
    title: "VnExpress - Khoa hoc",
    url: "https://vnexpress.net/rss/khoa-hoc.rss",
    description: "Tin tuc khoa hoc cong nghe.",
    category: "technology",
    language: "vi",
    siteUrl: "https://vnexpress.net",
  },
  {
    title: "Tuoi Tre - Cong nghe",
    url: "https://tuoitre.vn/rss/nhip-song-so.rss",
    description: "Tin cong nghe va doi song so.",
    category: "technology",
    language: "vi",
    siteUrl: "https://tuoitre.vn",
  },
];
