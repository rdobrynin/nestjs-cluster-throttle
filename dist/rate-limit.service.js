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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitService = void 0;
const common_1 = require("@nestjs/common");
let RateLimitService = class RateLimitService {
    constructor(store, moduleOptions) {
        this.store = store;
        this.moduleOptions = moduleOptions;
        this.defaultOptions = {
            windowMs: 15 * 60 * 1000,
            max: 100,
            clusterMode: false,
            statusCode: 429,
            message: 'Too Many Requests',
        };
        if (moduleOptions) {
            this.defaultOptions = { ...this.defaultOptions, ...moduleOptions };
        }
    }
    async checkRateLimit(request, options) {
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
    generateKey(request, options) {
        if (options.keyGenerator) {
            return options.keyGenerator(request);
        }
        const ip = request.ip ||
            request.connection?.remoteAddress ||
            request.socket?.remoteAddress ||
            request.info?.remoteAddress ||
            'unknown';
        const method = request.method;
        const path = request.route?.path || request.url;
        return `${ip}:${method}:${path}`;
    }
    async resetKey(key) {
        await this.store.resetKey(key);
    }
    async resetAll() {
        await this.store.resetAll();
    }
};
exports.RateLimitService = RateLimitService;
exports.RateLimitService = RateLimitService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('RATE_LIMIT_STORE')),
    __param(1, (0, common_1.Optional)()),
    __param(1, (0, common_1.Inject)('RATE_LIMIT_OPTIONS')),
    __metadata("design:paramtypes", [Object, Object])
], RateLimitService);
//# sourceMappingURL=rate-limit.service.js.map