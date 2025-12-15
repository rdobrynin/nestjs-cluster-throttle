import { Module, Global } from '@nestjs/common';
import { RateLimitCoreModule } from './rate-limit-core.module';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { RateLimitOptions } from './interfaces/rate-limit-options.interface';

@Global()
@Module({})
export class RateLimitModule {
    static forRoot(options: RateLimitOptions) {
        return {
            module: RateLimitModule,
            imports: [RateLimitCoreModule.forRoot(options)],
            providers: [
                {
                    provide: 'APP_GUARD',
                    useClass: RateLimitGuard,
                },
            ],
            exports: [RateLimitCoreModule],
        };
    }

    static forRootAsync(options: {
        imports?: any[];
        useFactory: (...args: any[]) => Promise<RateLimitOptions> | RateLimitOptions;
        inject?: any[];
    }) {
        return {
            module: RateLimitModule,
            imports: [
                ...(options.imports || []),
                {
                    module: RateLimitCoreModule,
                    providers: [
                        {
                            provide: 'RATE_LIMIT_OPTIONS',
                            useFactory: options.useFactory,
                            inject: options.inject || [],
                        },
                    ],
                },
            ],
            providers: [
                {
                    provide: 'APP_GUARD',
                    useClass: RateLimitGuard,
                },
            ],
            exports: [RateLimitCoreModule],
        };
    }
}
