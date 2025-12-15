import { DynamicModule, Provider, Module } from '@nestjs/common';
import { RateLimitOptions } from './interfaces/rate-limit-options.interface';
import { RateLimitService } from './rate-limit.service';
import { RedisStore } from './stores/redis.store';
import { MemoryStore } from './stores/memory.store';

@Module({})
export class RateLimitCoreModule {
    static forRoot(options: RateLimitOptions): DynamicModule {
        const storeProvider: Provider = {
            provide: 'RATE_LIMIT_STORE',
            useFactory: () => {
                if (options.clusterMode || options.redisOptions) {
                    return new RedisStore(options);
                }
                return new MemoryStore(options.windowMs);
            },
        };

        const optionsProvider: Provider = {
            provide: 'RATE_LIMIT_OPTIONS',
            useValue: options,
        };

        return {
            module: RateLimitCoreModule,
            providers: [
                storeProvider,
                optionsProvider,
                RateLimitService,
            ],
            exports: [RateLimitService, 'RATE_LIMIT_OPTIONS'],
        };
    }

    static forRootAsync(options: {
        imports?: any[];
        useFactory: (...args: any[]) => Promise<RateLimitOptions> | RateLimitOptions;
        inject?: any[];
    }): DynamicModule {
        const storeProvider: Provider = {
            provide: 'RATE_LIMIT_STORE',
            useFactory: async (...args: any[]) => {
                const rateLimitOptions = await options.useFactory(...args);
                if (rateLimitOptions.clusterMode || rateLimitOptions.redisOptions) {
                    return new RedisStore(rateLimitOptions);
                }
                return new MemoryStore(rateLimitOptions.windowMs);
            },
            inject: options.inject || [],
        };

        const optionsProvider: Provider = {
            provide: 'RATE_LIMIT_OPTIONS',
            useFactory: options.useFactory,
            inject: options.inject || [],
        };

        return {
            module: RateLimitCoreModule,
            imports: options.imports || [],
            providers: [
                optionsProvider,
                storeProvider,
                RateLimitService,
            ],
            exports: [RateLimitService, 'RATE_LIMIT_OPTIONS'],
        };
    }
}
