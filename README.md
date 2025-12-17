# nestjs-cluster-throttle

Cluster-ready rate limiting module for NestJS with Redis support and multiple rate limiting strategies.

## Features

- 🚀 **Cluster-ready** - Works seamlessly in clustered environments
- 🔴 **Redis support** - Distributed rate limiting with Redis
- 💾 **Memory storage** - In-memory storage for single-instance applications
- 🎯 **Flexible strategies** - Support for fixed-window, token-bucket, and sliding-window algorithms
- 🎨 **Decorator-based** - Easy-to-use decorators for route protection
- 🌍 **Geo-blocking** - IP-based country restrictions with multiple providers (internal, IP-API, custom)
- ⚙️ **Highly configurable** - Customize limits, windows, and behavior
- 🔒 **Type-safe** - Written in TypeScript with full type support
- 🛡️ **Fail-open strategy** - Gracefully handles storage failures

## Installation

```bash
npm install nestjs-cluster-throttle ioredis
# or
yarn add nestjs-cluster-throttle ioredis
```

## Quick Start

### Basic Usage (In-Memory)

```typescript
import { Module } from '@nestjs/common';
import { RateLimitModule } from 'nestjs-cluster-throttle';

@Module({
  imports: [
    RateLimitModule.forRoot({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    }),
  ],
})
export class AppModule {}
```

### Redis-based (Cluster Mode)

```typescript
import { Module } from '@nestjs/common';
import { RateLimitModule } from 'nestjs-cluster-throttle';

@Module({
  imports: [
    RateLimitModule.forRoot({
      windowMs: 15 * 60 * 1000,
      max: 100,
      clusterMode: true,
      redisOptions: {
        host: 'localhost',
        port: 6379,
        password: 'your-password', // optional
        db: 0,
        keyPrefix: 'rate-limit:',
      },
    }),
  ],
})
export class AppModule {}
```

### Async Configuration

```typescript
import { Module } from '@nestjs/common';
import { RateLimitModule } from 'nestjs-cluster-throttle';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    RateLimitModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        windowMs: configService.get('RATE_LIMIT_WINDOW_MS'),
        max: configService.get('RATE_LIMIT_MAX'),
        clusterMode: true,
        redisOptions: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## Usage in Controllers

### Route-specific Rate Limiting

```typescript
import { Controller, Get } from '@nestjs/common';
import { RateLimit } from 'nestjs-cluster-throttle';

@Controller('api')
export class ApiController {
  @Get('limited')
  @RateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: 'Too many requests from this IP',
    statusCode: 429,
  })
  limitedEndpoint() {
    return { message: 'This endpoint is rate limited' };
  }

  @Get('public')
  publicEndpoint() {
    return { message: 'This endpoint uses global rate limits' };
  }
}
```

### Skip Rate Limiting

```typescript
import { Controller, Get } from '@nestjs/common';
import { SkipRateLimit } from 'nestjs-cluster-throttle';

@Controller('api')
export class ApiController {
  @Get('health')
  @SkipRateLimit()
  healthCheck() {
    return { status: 'ok' };
  }
}
```

## Advanced Configuration

### Custom Key Generator

Use custom logic to generate rate limit keys:

```typescript
RateLimitModule.forRoot({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (request) => {
    // Rate limit by user ID instead of IP
    return request.user?.id || request.ip;
  },
})
```

### Skip Requests Conditionally

```typescript
RateLimitModule.forRoot({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (request) => {
    // Skip rate limiting for admin users
    return request.user?.role === 'admin';
  },
})
```

### Custom Handler

```typescript
RateLimitModule.forRoot({
  windowMs: 15 * 60 * 1000,
  max: 100,
  handler: (request, response) => {
    // Custom handling when rate limit is exceeded
    response.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: response.getHeader('X-RateLimit-Reset'),
    });
  },
})
```

### Skip Successful Requests

Only count failed requests towards the rate limit:

```typescript
RateLimitModule.forRoot({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skipSuccessfulRequests: true,
})
```

## Geo-blocking (IP-based Country Restrictions)

### Basic Geo-blocking

Block or allow specific countries:

```typescript
import { Controller, Get } from '@nestjs/common';
import { RateLimit } from 'nestjs-cluster-throttle';

@Controller('api')
export class ApiController {
  @Get('us-only')
  @RateLimit({
    windowMs: 60000,
    max: 100,
    geoLocation: {
      allowedCountries: ['US', 'CA'], // Only US and Canada
      message: 'This service is only available in North America',
      statusCode: 403,
    },
  })
  usOnlyEndpoint() {
    return { message: 'Welcome, North American user!' };
  }

  @Get('block-countries')
  @RateLimit({
    windowMs: 60000,
    max: 100,
    geoLocation: {
      blockedCountries: ['CN', 'RU'], // Block specific countries
      message: 'Access denied from your country',
    },
  })
  restrictedEndpoint() {
    return { message: 'Access granted' };
  }
}
```

### Geo Providers

Choose from multiple geo-location providers:

```typescript
RateLimitModule.forRoot({
  windowMs: 60000,
  max: 100,
  geoLocation: {
    provider: 'ip-api', // Options: 'internal', 'ip-api', 'custom'
    allowedCountries: ['US', 'GB', 'DE'],
  },
})
```

#### Available Providers

1. **internal** (default) - Basic IP range checking, good for testing
2. **ip-api** - Free service from ip-api.com (45 req/min limit)
3. **custom** - Bring your own provider

### Custom Geo Provider

```typescript
import { GeoLocationProvider, GeoLocationResult } from 'nestjs-cluster-throttle';

class MyGeoProvider implements GeoLocationProvider {
  async lookup(ip: string): Promise<GeoLocationResult | null> {
    // e.g., MaxMind GeoIP2, IPStack, etc.
    return {
      country: 'United States',
      countryCode: 'US',
      city: 'New York',
      lat: 40.7128,
      lon: -74.0060,
    };
  }
}

RateLimitModule.forRoot({
  windowMs: 60000,
  max: 100,
  geoLocation: {
    provider: 'custom',
    customProvider: new MyGeoProvider(),
    allowedCountries: ['US'],
  },
})
```

### Geo-block Callback

Get notified when a request is geo-blocked:

```typescript
@RateLimit({
  windowMs: 60000,
  max: 100,
  geoLocation: {
    blockedCountries: ['XX'],
    onGeoBlock: (ip, country, request) => {
      console.log(`Blocked request from ${country} (${ip})`);
      // Log to analytics, notify admin, etc.
    },
  },
})
```

### Global Geo-blocking

Apply geo-restrictions globally:

```typescript
RateLimitModule.forRoot({
  windowMs: 60000,
  max: 100,
  geoLocation: {
    provider: 'ip-api',
    blockedCountries: ['XX', 'YY'],
    message: 'Service not available in your region',
  },
})
```


## Rate Limiting Strategies

### Fixed Window (Default)

```typescript
RateLimitModule.forRoot({
  windowMs: 60 * 1000,
  max: 100,
  strategy: 'fixed-window',
})
```

### Token Bucket

```typescript
RateLimitModule.forRoot({
  windowMs: 60 * 1000,
  max: 100,
  strategy: 'token-bucket',
  burstCapacity: 150, // Allow bursts up to 150 requests
  fillRate: 100, // Refill 100 tokens per windowMs
})
```

### Sliding Window

```typescript
RateLimitModule.forRoot({
  windowMs: 60 * 1000,
  max: 100,
  strategy: 'sliding-window',
})
```

## Programmatic Usage

Inject `RateLimitService` to check rate limits programmatically:

```typescript
import { Injectable } from '@nestjs/common';
import { RateLimitService } from 'nestjs-cluster-throttle';

@Injectable()
export class MyService {
  constructor(private rateLimitService: RateLimitService) {}

  async checkLimit(request: any) {
    const result = await this.rateLimitService.checkRateLimit(request, {
      windowMs: 60 * 1000,
      max: 10,
    });

    if (!result.allowed) {
      throw new Error('Rate limit exceeded');
    }

    return result;
  }

  async resetUserLimit(userId: string) {
    await this.rateLimitService.resetKey(userId);
  }

  async resetAllLimits() {
    await this.rateLimitService.resetAll();
  }
}
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `windowMs` | number | `900000` (15 min) | Time window in milliseconds |
| `max` | number | `100` | Maximum number of requests per window |
| `message` | string | `'Too Many Requests'` | Error message when limit is exceeded |
| `statusCode` | number | `429` | HTTP status code when limit is exceeded |
| `skipSuccessfulRequests` | boolean | `false` | Skip successful requests in counting |
| `keyGenerator` | function | IP-based | Function to generate rate limit key |
| `skip` | function | `undefined` | Function to conditionally skip rate limiting |
| `handler` | function | `undefined` | Custom handler for rate limit exceeded |
| `clusterMode` | boolean | `false` | Enable Redis for cluster mode |
| `redisOptions` | object | `{}` | Redis connection options |
| `strategy` | string | `'fixed-window'` | Rate limiting strategy |
| `burstCapacity` | number | `undefined` | Burst capacity for token-bucket |
| `fillRate` | number | `undefined` | Fill rate for token-bucket |

### Redis Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `host` | string | `'localhost'` | Redis host |
| `port` | number | `6379` | Redis port |
| `password` | string | `undefined` | Redis password |
| `db` | number | `0` | Redis database number |
| `keyPrefix` | string | `'rate-limit:'` | Key prefix for Redis |
| `enableReadyCheck` | boolean | `true` | Enable ready check |

## Response Headers

When rate limiting is active, the following headers are set:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when the rate limit resets

## Testing

```typescript
import { Test } from '@nestjs/testing';
import { RateLimitModule, RateLimitService } from 'path'
```

## 🧑‍💻 Contributing
We love contributions! Found a bug or have an idea? Open an issue or submit a PR.

---

## 📜 License
This project is licensed under the MIT License. See the LICENSE file for details.
