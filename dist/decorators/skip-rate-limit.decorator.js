"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkipRateLimit = exports.SKIP_RATE_LIMIT_METADATA = void 0;
const common_1 = require("@nestjs/common");
exports.SKIP_RATE_LIMIT_METADATA = 'SKIP_RATE_LIMIT_METADATA';
const SkipRateLimit = () => (0, common_1.SetMetadata)(exports.SKIP_RATE_LIMIT_METADATA, true);
exports.SkipRateLimit = SkipRateLimit;
//# sourceMappingURL=skip-rate-limit.decorator.js.map