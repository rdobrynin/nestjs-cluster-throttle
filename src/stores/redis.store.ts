import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { RateLimitStore } from './store.interface';

@Injectable()
export class RedisStore implements RateLimitStore, OnModuleDestroy {
    private client: Redis;
    private scriptSha: string | null = null;
    private readonly LUA_SCRIPT = `
    local key = KEYS[1]
    local window = tonumber(ARGV[1])
    local max = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])
    
    local clearBefore = now - window
    redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)
    
    local requestCount = redis.call('ZCARD', key)
    
    if requestCount < max then
        redis.call('ZADD', key, now, now)
        redis.call('EXPIRE', key, math.ceil(window / 1000) + 1)
        return {0, requestCount + 1}
    end
    
    return {1, requestCount}
  `;

    constructor(private options: any) {
        this.client = new Redis({
            host: options.redisOptions?.host || 'localhost',
            port: options.redisOptions?.port || 6379,
            password: options.redisOptions?.password,
            db: options.redisOptions?.db || 0,
            keyPrefix: options.redisOptions?.keyPrefix || 'rate-limit:',
            enableReadyCheck: options.redisOptions?.enableReadyCheck !== false,
            retryStrategy: (times: number) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            maxRetriesPerRequest: 3,
        });

        this.loadScript();

        this.client.on('error', (error) => {
            console.error('Redis connection error:', error);
        });

        this.client.on('ready', () => {
            console.log('Redis connection established');
        });
    }

    private async loadScript(): Promise<void> {
        try {
            // @ts-ignore
            this.scriptSha = await this.client.script('LOAD', this.LUA_SCRIPT);
        } catch (error) {
            console.error('Failed to load Lua script:', error);
            this.scriptSha = null;
        }
    }

    async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: Date }> {
        const now = Date.now();
        const max = this.options.max;

        let result: [number, number];

        try {
            if (this.scriptSha) {
                // Используем evalsha если скрипт загружен
                result = (await this.client.evalsha(
                    this.scriptSha,
                    1,
                    key,
                    windowMs.toString(),
                    max.toString(),
                    now.toString(),
                )) as [number, number];
            } else {
                // Используем eval если скрипт не загружен
                result = (await this.client.eval(
                    this.LUA_SCRIPT,
                    1,
                    key,
                    windowMs.toString(),
                    max.toString(),
                    now.toString(),
                )) as [number, number];
            }
        } catch (error: any) {
            // Если скрипт не найден (например, после перезапуска Redis), загружаем его снова
            if (error.message && error.message.includes('NOSCRIPT')) {
                await this.loadScript();
                return this.increment(key, windowMs);
            }
            throw error;
        }

        const [blocked, count] = result;

        const ttl = await this.client.ttl(key);
        const resetTime = new Date(now + (ttl > 0 ? ttl * 1000 : windowMs));

        return {
            count: parseInt(count.toString(), 10),
            resetTime,
        };
    }

    async decrement(key: string): Promise<void> {
        const now = Date.now();
        await this.client.zremrangebyscore(key, now, now);
    }

    async resetKey(key: string): Promise<void> {
        await this.client.del(key);
    }

    async resetAll(): Promise<void> {
        const pattern = `${this.options.redisOptions?.keyPrefix || 'rate-limit:'}*`;
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
            const keysWithoutPrefix = keys.map((k) =>
                k.replace(this.options.redisOptions?.keyPrefix || 'rate-limit:', ''),
            );
            await this.client.del(...keysWithoutPrefix);
        }
    }

    async disconnect(): Promise<void> {
        await this.client.quit();
    }

    async onModuleDestroy(): Promise<void> {
        await this.disconnect();
    }
}
