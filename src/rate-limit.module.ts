import { Module, Global, DynamicModule } from '@nestjs/common';
import { RateLimitCoreModule } from './rate-limit-core.module';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { RateLimitOptions } from './interfaces/rate-limit-options.interface';

@Global()
@Module({})
export class RateLimitModule {
    static forRoot(options: RateLimitOptions): DynamicModule {
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
    }): DynamicModule {
        return {
            module: RateLimitModule,
            imports: [...(options.imports || []), RateLimitCoreModule.forRootAsync(options)],
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
