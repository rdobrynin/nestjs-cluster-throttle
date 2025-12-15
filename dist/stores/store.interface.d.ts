export interface RateLimitStore {
    increment(key: string, windowMs: number): Promise<{
        count: number;
        resetTime: Date;
    }>;
    decrement(key: string): Promise<void>;
    resetKey(key: string): Promise<void>;
    resetAll(): Promise<void>;
}
//# sourceMappingURL=store.interface.d.ts.map