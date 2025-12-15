import { RateLimitStore } from './store.interface';
export declare class MemoryStore implements RateLimitStore {
    private windowMs;
    private storage;
    private intervalId;
    constructor(windowMs: number);
    increment(key: string, windowMs: number): Promise<{
        count: number;
        resetTime: Date;
    }>;
    decrement(key: string): Promise<void>;
    resetKey(key: string): Promise<void>;
    resetAll(): Promise<void>;
    private cleanup;
    onModuleDestroy(): void;
}
//# sourceMappingURL=memory.store.d.ts.map