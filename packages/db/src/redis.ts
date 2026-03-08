import Redis from "ioredis";
import type { RedisOptions } from "ioredis";

import { env } from "@NewsFlow/env/server";

const REDIS_UNAVAILABLE_CODES = ["ECONNREFUSED", "ENOTFOUND"] as const;

const parseRedisConnection = (): RedisOptions => {
  const redisUrl = new URL(env.REDIS_URL);
  const dbIndex = redisUrl.pathname.length > 1 ? Number(redisUrl.pathname.slice(1)) : undefined;

  return {
    host: redisUrl.hostname,
    port: redisUrl.port ? Number(redisUrl.port) : 6379,
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    db: Number.isFinite(dbIndex) ? dbIndex : undefined,
    ...(redisUrl.protocol === "rediss:" ? { tls: {} } : {}),
  };
};

function createRedisErrorHandler(context: string) {
  let hasLoggedConnectionRefusal = false;

  return (error: Error) => {
    const isRedisUnavailable = REDIS_UNAVAILABLE_CODES.some((code) =>
      error.message.includes(code)
    );

    if (isRedisUnavailable) {
      if (hasLoggedConnectionRefusal) {
        return;
      }

      hasLoggedConnectionRefusal = true;
      console.warn(`Redis is unavailable for ${context}. Expected at ${env.REDIS_URL}.`);
      return;
    }

    console.warn(`Redis error (${context}): ${error.message}`);
  };
}

export const createRedisConnection = (context = "default") => {
  const connection = new Redis(env.REDIS_URL, {
    ...parseRedisConnection(),
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      if (times >= 3) {
        return null;
      }

      return Math.min(times * 200, 1_000);
    },
    reconnectOnError: (err) => {
      console.warn("Redis reconnect on error:", err.message);
      return err.message.includes("READONLY");
    },
  });

  connection.on("ready", () => {
    console.log(`Redis connected for ${context}`);
  });
  connection.on("error", createRedisErrorHandler(context));

  return connection;
};

export const redisConnection: RedisOptions = {
  ...parseRedisConnection(),
  lazyConnect: true,
  maxRetriesPerRequest: null,
};
