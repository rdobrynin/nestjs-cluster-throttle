import { OnModuleDestroy } from '@nestjs/common';
import { RateLimitStore } from './store.interface';
export declare class RedisStore implements RateLimitStore, OnModuleDestroy {
    private options;
    private client;
    private scriptSha;
    private readonly LUA_SCRIPT;
    constructor(options: any);
    private loadScript;
    increment(key: string, windowMs: number): Promise<{
        count: number;
        resetTime: Date;
    }>;
    decrement(key: string): Promise<void>;
    resetKey(key: string): Promise<void>;
    resetAll(): Promise<void>;
    disconnect(): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
//# sourceMappingURL=redis.store.d.ts.map