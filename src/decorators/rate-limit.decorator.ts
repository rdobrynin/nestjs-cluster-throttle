import { SetMetadata } from '@nestjs/common';
import { RateLimitOptions } from '../interfaces/rate-limit-options.interface';

export const RATE_LIMIT_METADATA = 'RATE_LIMIT_METADATA';

export const RateLimit = (options: RateLimitOptions) =>
    SetMetadata(RATE_LIMIT_METADATA, options);
