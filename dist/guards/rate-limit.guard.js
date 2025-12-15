"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const rate_limit_service_1 = require("../rate-limit.service");
const rate_limit_decorator_1 = require("../decorators/rate-limit.decorator");
const skip_rate_limit_decorator_1 = require("../decorators/skip-rate-limit.decorator");
let RateLimitGuard = class RateLimitGuard {
    constructor(reflector, rateLimitService) {
        this.reflector = reflector;
        this.rateLimitService = rateLimitService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const skipRateLimit = this.reflector.getAllAndOverride(skip_rate_limit_decorator_1.SKIP_RATE_LIMIT_METADATA, [context.getHandler(), context.getClass()]);
        if (skipRateLimit) {
            return true;
        }
        const options = this.reflector.getAllAndOverride(rate_limit_decorator_1.RATE_LIMIT_METADATA, [context.getHandler(), context.getClass()]);
        try {
            const result = await this.rateLimitService.checkRateLimit(request, options);
            if (!result.allowed) {
                response.setHeader('X-RateLimit-Limit', result.limit);
                response.setHeader('X-RateLimit-Remaining', result.remaining);
                response.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime.getTime() / 1000));
                throw new common_1.HttpException(options?.message || 'Too Many Requests', options?.statusCode || common_1.HttpStatus.TOO_MANY_REQUESTS);
            }
            response.setHeader('X-RateLimit-Limit', result.limit);
            response.setHeader('X-RateLimit-Remaining', result.remaining);
            response.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime.getTime() / 1000));
            return true;
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            return true;
        }
    }
};
exports.RateLimitGuard = RateLimitGuard;
exports.RateLimitGuard = RateLimitGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        rate_limit_service_1.RateLimitService])
], RateLimitGuard);
//# sourceMappingURL=rate-limit.guard.js.map