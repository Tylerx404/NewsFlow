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
    subscriptions: {
      list: (
        query: string,
        tier: "all" | "free" | "basic" | "pro" | "max",
        status: string,
        billingInterval: "all" | "monthly" | "yearly",
        cancelAtPeriodEnd: "all" | "true" | "false"
      ) =>
        [
          "dashboard",
          "admin",
          "subscriptions",
          "list",
          query || "",
          tier,
          status || "all",
          billingInterval,
          cancelAtPeriodEnd,
        ] as const,
    },
    feeds: {
      metrics: () => ["dashboard", "admin", "feeds", "metrics"] as const,
      list: (
        query: string,
        isEnabled: "all" | "true" | "false",
        hasErrors: "all" | "true" | "false",
        isStale: "all" | "true" | "false",
        hasExtractionFailures: "all" | "true" | "false"
      ) =>
        [
          "dashboard",
          "admin",
          "feeds",
          "list",
          query || "",
          isEnabled,
          hasErrors,
          isStale,
          hasExtractionFailures,
        ] as const,
      detail: (feedId: string) =>
        ["dashboard", "admin", "feeds", "detail", feedId] as const,
    },
    operations: {
      overview: () => ["dashboard", "admin", "operations", "overview"] as const,
    },
    aiUsage: {
      overview: (days: number) =>
        ["dashboard", "admin", "ai-usage", "overview", days] as const,
      listEvents: (
        provider: string,
        model: string,
        status: "all" | "SUCCESS" | "FAILED",
        userQuery: string,
        startedAt: string,
        endedAt: string,
        limit: number
      ) =>
        [
          "dashboard",
          "admin",
          "ai-usage",
          "events",
          provider || "all",
          model || "all",
          status,
          userQuery || "",
          startedAt || "none",
          endedAt || "none",
          limit,
        ] as const,
      userUsage: (userId: string, days: number) =>
        ["dashboard", "admin", "ai-usage", "user-usage", userId, days] as const,
      configs: (
        provider: string,
        model: string,
        userQuery: string,
        isEnabled: "all" | "true" | "false"
      ) =>
        [
          "dashboard",
          "admin",
          "ai-usage",
          "configs",
          provider || "all",
          model || "all",
          userQuery || "",
          isEnabled,
        ] as const,
    },
    systemOps: {
      overview: () => ["dashboard", "admin", "system-ops", "overview"] as const,
      stripeConfig: () => ["dashboard", "admin", "system-ops", "stripe-config"] as const,
      oauthConfig: () => ["dashboard", "admin", "system-ops", "oauth-config"] as const,
      queueJobs: (
        queueName: "all" | "rss-fetch" | "content-extract",
        states: string[],
        limit: number
      ) =>
        [
          "dashboard",
          "admin",
          "system-ops",
          "queue-jobs",
          queueName,
          states.join(","),
          limit,
        ] as const,
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
    billingHistory: (limit: number) =>
      ["dashboard", "subscription", "billing-history", limit] as const,
  },
};
