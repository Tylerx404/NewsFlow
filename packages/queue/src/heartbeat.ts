import { createRedisConnection } from "@NewsFlow/db";

const HEARTBEAT_PREFIX = "newsflow:heartbeat";
const DEFAULT_HEARTBEAT_TTL_SECONDS = 90;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 30_000;

let redis: ReturnType<typeof createRedisConnection> | null = null;
let connectPromise: Promise<void> | null = null;

function getRedis() {
  if (!redis) {
    redis = createRedisConnection("heartbeat");
  }

  return redis;
}

export const HEARTBEAT_KEYS = {
  worker: `${HEARTBEAT_PREFIX}:worker`,
  scheduler: {
    rss: `${HEARTBEAT_PREFIX}:scheduler:rss`,
    content: `${HEARTBEAT_PREFIX}:scheduler:content`,
  },
} as const;

export type HeartbeatHealth = "healthy" | "stale" | "offline" | "unknown";

export interface HeartbeatSnapshot {
  key: string;
  state: HeartbeatHealth;
  lastSeenAt: Date | null;
  ageMs: number | null;
  ttlSeconds: number;
}

export interface HeartbeatTicker {
  stop: () => Promise<void>;
}

async function ensureRedisConnected() {
  const client = getRedis();

  if (client.status === "ready") {
    return;
  }

  if (!connectPromise) {
    connectPromise = client.connect().finally(() => {
      connectPromise = null;
    });
  }

  await connectPromise;
}

function computeHeartbeatState(ageMs: number, ttlSeconds: number): HeartbeatHealth {
  const ttlMs = ttlSeconds * 1000;

  if (ageMs <= ttlMs) {
    return "healthy";
  }

  if (ageMs <= ttlMs * 2) {
    return "stale";
  }

  return "offline";
}

export async function writeHeartbeat(
  key: string,
  options?: {
    ttlSeconds?: number;
    now?: Date;
  }
) {
  await ensureRedisConnected();

  const ttlSeconds = options?.ttlSeconds ?? DEFAULT_HEARTBEAT_TTL_SECONDS;
  const now = options?.now ?? new Date();

  await getRedis().set(key, now.toISOString(), "EX", ttlSeconds);
}

export async function clearHeartbeat(key: string) {
  await ensureRedisConnected();
  await getRedis().del(key);
}

export async function readHeartbeat(
  key: string,
  options?: {
    ttlSeconds?: number;
    now?: Date;
  }
): Promise<HeartbeatSnapshot> {
  const ttlSeconds = options?.ttlSeconds ?? DEFAULT_HEARTBEAT_TTL_SECONDS;
  const now = options?.now ?? new Date();

  try {
    await ensureRedisConnected();
    const rawValue = await getRedis().get(key);

    if (!rawValue) {
      return {
        key,
        state: "offline",
        lastSeenAt: null,
        ageMs: null,
        ttlSeconds,
      };
    }

    const lastSeenAt = new Date(rawValue);

    if (Number.isNaN(lastSeenAt.getTime())) {
      return {
        key,
        state: "unknown",
        lastSeenAt: null,
        ageMs: null,
        ttlSeconds,
      };
    }

    const ageMs = Math.max(0, now.getTime() - lastSeenAt.getTime());

    return {
      key,
      state: computeHeartbeatState(ageMs, ttlSeconds),
      lastSeenAt,
      ageMs,
      ttlSeconds,
    };
  } catch {
    return {
      key,
      state: "unknown",
      lastSeenAt: null,
      ageMs: null,
      ttlSeconds,
    };
  }
}

export function startHeartbeatTicker(options: {
  key: string;
  component: string;
  intervalMs?: number;
  ttlSeconds?: number;
}): HeartbeatTicker {
  const intervalMs = options.intervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;
  const ttlSeconds = options.ttlSeconds ?? DEFAULT_HEARTBEAT_TTL_SECONDS;

  const tick = async () => {
    try {
      await writeHeartbeat(options.key, { ttlSeconds });
    } catch {
      console.error("Failed to update heartbeat", {
        component: options.component,
      });
    }
  };

  void tick();

  const interval = setInterval(() => {
    void tick();
  }, intervalMs);

  return {
    stop: async () => {
      clearInterval(interval);

      try {
        await clearHeartbeat(options.key);
      } catch {
        console.error("Failed to clear heartbeat", {
          component: options.component,
        });
      }
    },
  };
}
