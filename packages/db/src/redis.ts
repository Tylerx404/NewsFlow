import Redis from 'ioredis';
import { env } from '@NewsFlow/env/server';

export const createRedisConnection = () => {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    reconnectOnError: (err) => {
      console.warn('Redis reconnect on error:', err.message);
      return err.message.includes('READONLY');
    },
  });
};

export const redisConnection = {
  host: 'localhost',
  port: 6379,
};