"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimit = exports.RATE_LIMIT_METADATA = void 0;
const common_1 = require("@nestjs/common");
exports.RATE_LIMIT_METADATA = 'RATE_LIMIT_METADATA';
const RateLimit = (options) => (0, common_1.SetMetadata)(exports.RATE_LIMIT_METADATA, options);
exports.RateLimit = RateLimit;
//# sourceMappingURL=rate-limit.decorator.js.map