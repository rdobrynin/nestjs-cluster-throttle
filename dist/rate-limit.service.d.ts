import { RateLimitStore } from './stores/store.interface';
import { RateLimitOptions } from './interfaces/rate-limit-options.interface';
export declare class RateLimitService {
    private store;
    private moduleOptions?;
    private defaultOptions;
    constructor(store: RateLimitStore, moduleOptions?: RateLimitOptions | undefined);
    checkRateLimit(request: any, options?: Partial<RateLimitOptions>): Promise<{
        allowed: boolean;
        limit: number;
        remaining: number;
        resetTime: Date;
        key?: undefined;
    } | {
        allowed: boolean;
        limit: number;
        remaining: number;
        resetTime: Date;
        key: string;
    }>;
    private generateKey;
    resetKey(key: string): Promise<void>;
    resetAll(): Promise<void>;
}
//# sourceMappingURL=rate-limit.service.d.ts.map