"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var RateLimitCoreModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitCoreModule = void 0;
const common_1 = require("@nestjs/common");
const rate_limit_service_1 = require("./rate-limit.service");
const redis_store_1 = require("./stores/redis.store");
const memory_store_1 = require("./stores/memory.store");
let RateLimitCoreModule = RateLimitCoreModule_1 = class RateLimitCoreModule {
    static forRoot(options) {
        const storeProvider = {
            provide: 'RATE_LIMIT_STORE',
            useFactory: () => {
                if (options.clusterMode || options.redisOptions) {
                    return new redis_store_1.RedisStore(options);
                }
                return new memory_store_1.MemoryStore(options.windowMs);
            },
        };
        const optionsProvider = {
            provide: 'RATE_LIMIT_OPTIONS',
            useValue: options,
        };
        return {
            module: RateLimitCoreModule_1,
            providers: [
                storeProvider,
                optionsProvider,
                rate_limit_service_1.RateLimitService,
            ],
            exports: [rate_limit_service_1.RateLimitService, 'RATE_LIMIT_OPTIONS'],
        };
    }
    static forRootAsync(options) {
        const storeProvider = {
            provide: 'RATE_LIMIT_STORE',
            useFactory: async (...args) => {
                const rateLimitOptions = await options.useFactory(...args);
                if (rateLimitOptions.clusterMode || rateLimitOptions.redisOptions) {
                    return new redis_store_1.RedisStore(rateLimitOptions);
                }
                return new memory_store_1.MemoryStore(rateLimitOptions.windowMs);
            },
            inject: options.inject || [],
        };
        const optionsProvider = {
            provide: 'RATE_LIMIT_OPTIONS',
            useFactory: options.useFactory,
            inject: options.inject || [],
        };
        return {
            module: RateLimitCoreModule_1,
            imports: options.imports || [],
            providers: [
                optionsProvider,
                storeProvider,
                rate_limit_service_1.RateLimitService,
            ],
            exports: [rate_limit_service_1.RateLimitService, 'RATE_LIMIT_OPTIONS'],
        };
    }
};
exports.RateLimitCoreModule = RateLimitCoreModule;
exports.RateLimitCoreModule = RateLimitCoreModule = RateLimitCoreModule_1 = __decorate([
    (0, common_1.Module)({})
], RateLimitCoreModule);
//# sourceMappingURL=rate-limit-core.module.js.map