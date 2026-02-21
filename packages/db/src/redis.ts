import Redis from "ioredis";
import type { RedisOptions } from "ioredis";

import { env } from "@NewsFlow/env/server";

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

export const createRedisConnection = () => {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    reconnectOnError: (err) => {
      console.warn("Redis reconnect on error:", err.message);
      return err.message.includes("READONLY");
    },
  });
};

export const redisConnection: RedisOptions = parseRedisConnection();
