export const dashboardQueryKeys = {
  root: () => ["dashboard"] as const,
  feeds: {
    sidebar: (includeInactive: boolean) =>
      ["dashboard", "feeds", "sidebar", includeInactive] as const,
    discover: (category?: string) =>
      ["dashboard", "feeds", "discover", category ?? "all"] as const,
    stats: (feedId?: string) =>
      ["dashboard", "articles", "stats", feedId ?? "all"] as const,
  },
  articles: {
    list: (
      feedId: string | undefined,
      filter: "all" | "unread" | "saved",
      query: string
    ) =>
      [
        "dashboard",
        "articles",
        "list",
        feedId ?? "all",
        filter,
        query || "",
      ] as const,
    detail: (articleId: string) =>
      ["dashboard", "articles", "detail", articleId] as const,
  },
  ai: {
    configs: () => ["dashboard", "ai", "configs"] as const,
  },
  auth: {
    session: () => ["dashboard", "auth", "session"] as const,
    sessionSummary: () => ["dashboard", "auth", "session-summary"] as const,
    sessions: () => ["dashboard", "auth", "sessions"] as const,
  },
  subscription: {
    current: () => ["dashboard", "subscription", "current"] as const,
  },
};
