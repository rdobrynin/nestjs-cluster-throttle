import { Inject, Injectable } from '@nestjs/common';
import { Cache } from '@nestjs/cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redisClient: Redis,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serializedValue = JSON.stringify(value);
    if (ttl) {
      await this.redisClient.setex(key, ttl, serializedValue);
    } else {
      await this.redisClient.set(key, serializedValue);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redisClient.get(key);
    return value ? JSON.parse(value) : null;
  }

  async del(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.redisClient.keys(pattern);
  }

  async ping(): Promise<string> {
    return this.redisClient.ping();
  }

  async info(section?: string): Promise<string> {
    // @ts-ignore
    return this.redisClient.info(section);
  }

  async getFromCache<T>(key: string): Promise<T | null> {
    // @ts-ignore
    return await this.cacheManager.get<T>(key);
  }

  async setToCache<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  async deleteFromCache(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.getFromCache<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const data = await fetchFn();

    await this.setToCache(key, data, ttl);

    return data;
  }

  async getStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    connectedClients: number;
  }> {
    const info = await this.info();
    const lines = info.split('\r\n');

    let totalKeys = 0;
    let memoryUsage = '0';
    let connectedClients = 0;

    for (const line of lines) {
      if (line.startsWith('db0:')) {
        const keysMatch = line.match(/keys=(\d+)/);
        if (keysMatch) totalKeys = parseInt(keysMatch[1]);
      } else if (line.startsWith('used_memory:')) {
        memoryUsage = line.split(':')[1];
      } else if (line.startsWith('connected_clients:')) {
        connectedClients = parseInt(line.split(':')[1]);
      }
    }

    return {
      totalKeys,
      memoryUsage,
      connectedClients,
    };
  }
}
