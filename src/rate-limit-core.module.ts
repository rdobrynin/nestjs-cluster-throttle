import { DynamicModule, Provider } from '@nestjs/common';
import { RateLimitOptions } from './interfaces/rate-limit-options.interface';
import { RateLimitService } from './rate-limit.service';
import { RedisStore } from './stores/redis.store';
import { MemoryStore } from './stores/memory.store';

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

        return {
            module: RateLimitCoreModule,
            providers: [
                storeProvider,
                RateLimitService,
                {
                    provide: 'RATE_LIMIT_OPTIONS',
                    useValue: options,
                },
            ],
            exports: [RateLimitService],
        };
    }
}
