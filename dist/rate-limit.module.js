"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var RateLimitModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitModule = void 0;
const common_1 = require("@nestjs/common");
const rate_limit_core_module_1 = require("./rate-limit-core.module");
const rate_limit_guard_1 = require("./guards/rate-limit.guard");
let RateLimitModule = RateLimitModule_1 = class RateLimitModule {
    static forRoot(options) {
        return {
            module: RateLimitModule_1,
            imports: [rate_limit_core_module_1.RateLimitCoreModule.forRoot(options)],
            providers: [
                {
                    provide: 'APP_GUARD',
                    useClass: rate_limit_guard_1.RateLimitGuard,
                },
            ],
            exports: [rate_limit_core_module_1.RateLimitCoreModule],
        };
    }
    static forRootAsync(options) {
        return {
            module: RateLimitModule_1,
            imports: [
                ...(options.imports || []),
                rate_limit_core_module_1.RateLimitCoreModule.forRootAsync(options),
            ],
            providers: [
                {
                    provide: 'APP_GUARD',
                    useClass: rate_limit_guard_1.RateLimitGuard,
                },
            ],
            exports: [rate_limit_core_module_1.RateLimitCoreModule],
        };
    }
};
exports.RateLimitModule = RateLimitModule;
exports.RateLimitModule = RateLimitModule = RateLimitModule_1 = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({})
], RateLimitModule);
//# sourceMappingURL=rate-limit.module.js.map