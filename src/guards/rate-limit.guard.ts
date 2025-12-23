import {
    Injectable,
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitService } from '../rate-limit.service';
import { GeoService } from '../geo/geo.service';
import { RATE_LIMIT_METADATA } from '../decorators/rate-limit.decorator';
import { SKIP_RATE_LIMIT_METADATA } from '../decorators/skip-rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private rateLimitService: RateLimitService,
        @Optional() private geoService?: GeoService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();

        // Проверяем, нужно ли пропустить rate limiting
        const skipRateLimit = this.reflector.getAllAndOverride<boolean>(SKIP_RATE_LIMIT_METADATA, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (skipRateLimit) {
            return true;
        }

        // Получаем настройки из декоратора
        const options = this.reflector.getAllAndOverride(RATE_LIMIT_METADATA, [
            context.getHandler(),
            context.getClass(),
        ]);

        // Проверка geo-блокировки
        if (this.geoService && options?.geoLocation) {
            const ip = this.getClientIp(request);

            try {
                const geoCheck = await this.geoService.isCountryAllowed(
                    ip,
                    options.geoLocation.allowedCountries,
                    options.geoLocation.blockedCountries,
                );

                if (!geoCheck.allowed) {
                    // Вызываем callback если есть
                    if (options.geoLocation.onGeoBlock) {
                        options.geoLocation.onGeoBlock(
                            ip,
                            geoCheck.countryCode || 'Unknown',
                            request,
                        );
                    }

                    throw new HttpException(
                        options.geoLocation.message ||
                            `Access denied for country: ${geoCheck.country || geoCheck.countryCode}`,
                        options.geoLocation.statusCode || HttpStatus.FORBIDDEN,
                    );
                }
            } catch (error) {
                if (error instanceof HttpException) {
                    throw error;
                }
                // Fail-open: если geo-проверка не удалась, продолжаем
                console.error('Geo-location check failed:', error);
            }
        }

        // Проверка rate limit
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

    private getClientIp(request: any): string {
        return (
            request.ip ||
            request.connection?.remoteAddress ||
            request.socket?.remoteAddress ||
            request.info?.remoteAddress ||
            'unknown'
        );
    }
}
