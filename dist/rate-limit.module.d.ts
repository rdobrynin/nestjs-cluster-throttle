import { DynamicModule } from '@nestjs/common';
import { RateLimitOptions } from './interfaces/rate-limit-options.interface';
export declare class RateLimitModule {
    static forRoot(options: RateLimitOptions): DynamicModule;
    static forRootAsync(options: {
        imports?: any[];
        useFactory: (...args: any[]) => Promise<RateLimitOptions> | RateLimitOptions;
        inject?: any[];
    }): DynamicModule;
}
//# sourceMappingURL=rate-limit.module.d.ts.map