export const dashboardQueryKeys = {
  root: () => ["dashboard"] as const,
  admin: {
    users: {
      list: (
        query: string,
        role: "all" | "USER" | "ADMIN",
        status: "all" | "ACTIVE" | "SUSPENDED",
        tier: "all" | "free" | "basic" | "pro" | "max"
      ) =>
        ["dashboard", "admin", "users", "list", query || "", role, status, tier] as const,
      detail: (userId: string) =>
        ["dashboard", "admin", "users", "detail", userId] as const,
    },
  },
  feedSubscriptions: {
    sidebar: (includeInactive: boolean) =>
      ["dashboard", "feed-subscriptions", "sidebar", includeInactive] as const,
    discover: (category?: string) =>
      ["dashboard", "feed-subscriptions", "discover", category ?? "all"] as const,
    stats: (feedSubscriptionId?: string) =>
      ["dashboard", "articles", "stats", feedSubscriptionId ?? "all"] as const,
  },
  articles: {
    list: (
      feedSubscriptionId: string | undefined,
      filter: "all" | "unread" | "saved",
      query: string
    ) =>
      [
        "dashboard",
        "articles",
        "list",
        feedSubscriptionId ?? "all",
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
