import { Injectable, Inject, Optional } from '@nestjs/common';
import { RateLimitStore } from './stores/store.interface';
import { RateLimitOptions } from './interfaces/rate-limit-options.interface';

@Injectable()
export class RateLimitService {
    private defaultOptions: RateLimitOptions = {
        windowMs: 15 * 60 * 1000,
        max: 100,
        clusterMode: false,
        statusCode: 429,
        message: 'Too Many Requests',
    };

    constructor(
        @Inject('RATE_LIMIT_STORE') private store: RateLimitStore,
        @Optional() @Inject('RATE_LIMIT_OPTIONS') private moduleOptions?: RateLimitOptions,
    ) {
        if (moduleOptions) {
            this.defaultOptions = { ...this.defaultOptions, ...moduleOptions };
        }
    }

    async checkRateLimit(request: any, options?: Partial<RateLimitOptions>) {
        const mergedOptions = { ...this.defaultOptions, ...options };

        const key = this.generateKey(request, mergedOptions);

        if (mergedOptions.skip && mergedOptions.skip(request)) {
            return {
                allowed: true,
                limit: mergedOptions.max,
                remaining: mergedOptions.max,
                resetTime: new Date(Date.now() + mergedOptions.windowMs),
            };
        }

        const result = await this.store.increment(key, mergedOptions.windowMs);

        const remaining = Math.max(0, mergedOptions.max - result.count);
        const allowed = result.count <= mergedOptions.max;

        return {
            allowed,
            limit: mergedOptions.max,
            remaining,
            resetTime: result.resetTime,
            key,
        };
    }

    private generateKey(request: any, options: RateLimitOptions): string {
        if (options.keyGenerator) {
            return options.keyGenerator(request);
        }

        const ip =
            request.ip ||
            request.connection?.remoteAddress ||
            request.socket?.remoteAddress ||
            request.info?.remoteAddress ||
            'unknown';

        const method = request.method;
        const path = request.route?.path || request.url;

        return `${ip}:${method}:${path}`;
    }

    async resetKey(key: string): Promise<void> {
        await this.store.resetKey(key);
    }

    async resetAll(): Promise<void> {
        await this.store.resetAll();
    }
}
