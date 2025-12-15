import {
    Injectable,
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitService } from '../rate-limit.service';
import { RATE_LIMIT_METADATA } from '../decorators/rate-limit.decorator';
import { SKIP_RATE_LIMIT_METADATA } from '../decorators/skip-rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private rateLimitService: RateLimitService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();

        const skipRateLimit = this.reflector.getAllAndOverride<boolean>(SKIP_RATE_LIMIT_METADATA, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (skipRateLimit) {
            return true;
        }

        const options = this.reflector.getAllAndOverride(RATE_LIMIT_METADATA, [
            context.getHandler(),
            context.getClass(),
        ]);

        try {
            const result = await this.rateLimitService.checkRateLimit(request, options);

            if (!result.allowed) {
                // Устанавливаем заголовки
                response.setHeader('X-RateLimit-Limit', result.limit);
                response.setHeader('X-RateLimit-Remaining', result.remaining);
                response.setHeader(
                    'X-RateLimit-Reset',
                    Math.ceil(result.resetTime.getTime() / 1000),
                );

                throw new HttpException(
                    options?.message || 'Too Many Requests',
                    options?.statusCode || HttpStatus.TOO_MANY_REQUESTS,
                );
            }

            // Устанавливаем заголовки для успешного запроса
            response.setHeader('X-RateLimit-Limit', result.limit);
            response.setHeader('X-RateLimit-Remaining', result.remaining);
            response.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime.getTime() / 1000));

            return true;
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            // В случае ошибки хранилища, разрешаем запрос (fail-open strategy)
            return true;
        }
    }
}
