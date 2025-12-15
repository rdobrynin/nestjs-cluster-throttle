import { SetMetadata } from '@nestjs/common';

export const SKIP_RATE_LIMIT_METADATA = 'SKIP_RATE_LIMIT_METADATA';

export const SkipRateLimit = () => SetMetadata(SKIP_RATE_LIMIT_METADATA, true);
