import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitService } from '../rate-limit.service';
export declare class RateLimitGuard implements CanActivate {
    private reflector;
    private rateLimitService;
    constructor(reflector: Reflector, rateLimitService: RateLimitService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
//# sourceMappingURL=rate-limit.guard.d.ts.map