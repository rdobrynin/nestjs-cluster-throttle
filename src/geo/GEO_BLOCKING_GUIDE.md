# Geo-blocking Guide

Complete guide to IP-based country restrictions in nestjs-cluster-throttle.

## Table of Contents

- [Quick Start](#quick-start)
- [Geo Providers](#geo-providers)
- [Configuration](#configuration)
- [Examples](#examples)
- [Custom Providers](#custom-providers)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Allow Specific Countries

```typescript
import { RateLimit } from 'nestjs-cluster-throttle';

@Get('us-only')
@RateLimit({
    windowMs: 60000,
    max: 100,
    geoLocation: {
        allowedCountries: ['US', 'CA'], // ISO 3166-1 alpha-2 codes
    },
})
usOnlyEndpoint() {
    return { message: 'Hello from North America!' };
}
```

### Block Specific Countries

```typescript
@Get('restricted')
@RateLimit({
    windowMs: 60000,
    max: 100,
    geoLocation: {
        blockedCountries: ['CN', 'RU', 'KP'],
        message: 'Access denied from your country',
        statusCode: 403,
    },
})
```

## Geo Providers

### 1. Internal Provider (Default)

Basic IP range checking. Good for development and testing.

**Pros:**
- No external dependencies
- Fast
- No API limits
- Works offline

**Cons:**
- Limited IP database
- Less accurate
- Only major countries

**Usage:**
```typescript
RateLimitModule.forRoot({
    windowMs: 60000,
    max: 100,
    geoLocation: {
        provider: 'internal',
        allowedCountries: ['US', 'GB'],
    },
})
```

### 2. IP-API Provider

Free service from ip-api.com with good accuracy.

**Pros:**
- Free
- Good accuracy
- Returns detailed info (city, lat/lon, timezone)
- Built-in caching (1 hour)

**Cons:**
- Rate limit: 45 requests/minute
- Requires internet
- Not suitable for high-traffic apps

**Usage:**
```typescript
RateLimitModule.forRoot({
    windowMs: 60000,
    max: 100,
    geoLocation: {
        provider: 'ip-api',
        allowedCountries: ['US', 'CA', 'MX'],
    },
})
```

### 3. Custom Provider

Use your own geo-location service.

**Examples:**
- MaxMind GeoIP2
- IPStack
- IPinfo
- ipdata
- AbstractAPI

**Usage:**
```typescript
import { GeoLocationProvider } from 'nestjs-cluster-throttle';

class MaxMindProvider implements GeoLocationProvider {
    async lookup(ip: string) {
        return {
            country: 'United States',
            countryCode: 'US',
            city: 'San Francisco',
            lat: 37.7749,
            lon: -122.4194,
        };
    }
}

RateLimitModule.forRoot({
    windowMs: 60000,
    max: 100,
    geoLocation: {
        provider: 'custom',
        customProvider: new MaxMindProvider(),
        allowedCountries: ['US'],
    },
})
```

## Configuration

### Global Configuration

Apply geo-restrictions to all routes:

```typescript
RateLimitModule.forRoot({
    windowMs: 60000,
    max: 100,
    geoLocation: {
        provider: 'ip-api',
        blockedCountries: ['XX', 'YY'],
        message: 'Service not available in your region',
        statusCode: 451,
    },
})
```

### Route-specific Configuration

Override global settings per route:

```typescript
@Get('global')
endpoint1() {
    // Uses global geo settings
}

@Get('custom')
@RateLimit({
    windowMs: 60000,
    max: 100,
    geoLocation: {
        allowedCountries: ['US', 'RU', 'EE'], // Overrides global
    },
})
endpoint2() {
    // US only
}
```

### Geo-block Callback

Get notified when requests are blocked:

```typescript
@RateLimit({
    windowMs: 60000,
    max: 100,
    geoLocation: {
        blockedCountries: ['XX'],
        onGeoBlock: (ip, country, request) => {
            console.log(`[GEO-BLOCK] ${country} ${ip} tried to access ${request.url}`);
            
            analytics.track('geo_blocked', {
                ip,
                country,
                url: request.url,
                timestamp: new Date(),
            });
            
            if (request.url.includes('/admin')) {
                notifyAdmin(`Blocked admin access from ${country}`);
            }
        },
    },
})
```

## Examples

### Example 1: EU-only Service

```typescript
@Controller('eu-service')
export class EuServiceController {
    @Get()
    @RateLimit({
        windowMs: 60000,
        max: 100,
        geoLocation: {
            allowedCountries: [
                'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE',
                'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV',
                'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
                'SI', 'ES', 'SE',
            ],
            message: 'This service is only available in the EU',
        },
    })
    getService() {
        return { message: 'Welcome EU user!' };
    }
}
```

### Example 2: Compliance-based Blocking

```typescript
@Controller('api')
export class ComplianceController {
    @Get('data')
    @RateLimit({
        windowMs: 60000,
        max: 100,
        geoLocation: {
            blockedCountries: [
                'KP',
                'IR',
                'SY',
                'CU',
            ],
            message: 'Service unavailable due to compliance restrictions',
            statusCode: 451,
            onGeoBlock: (ip, country, request) => {
                complianceLogger.warn({
                    event: 'blocked_access_sanctioned_country',
                    country,
                    ip,
                    timestamp: new Date(),
                });
            },
        },
    })
    sensitiveData() {
        return { data: 'sensitive info' };
    }
}
```

### Example 3: Progressive Restrictions

```typescript
@Controller('content')
export class ContentController {
    @Get('free')
    freeContent() {
        return { content: 'Free for everyone' };
    }

    @Get('premium')
    @RateLimit({
        windowMs: 60000,
        max: 100,
        geoLocation: {
            allowedCountries: ['US', 'CA', 'GB', 'AU'],
            message: 'Premium content not available in your region',
        },
    })
    premiumContent() {
        return { content: 'Premium content' };
    }

    @Get('exclusive')
    @RateLimit({
        windowMs: 60000,
        max: 50,
        geoLocation: {
            allowedCountries: ['US'],
            message: 'Exclusive US-only content',
        },
    })
    exclusiveContent() {
        return { content: 'Exclusive content' };
    }
}
```

## Custom Providers

### MaxMind GeoIP2 Example

```typescript
import { GeoLocationProvider, GeoLocationResult } from 'nestjs-cluster-throttle';
import maxmind, { CityResponse } from 'maxmind';

export class MaxMindGeoProvider implements GeoLocationProvider {
    private reader: maxmind.Reader<CityResponse>;

    async init() {
        this.reader = await maxmind.open<CityResponse>('./GeoLite2-City.mmdb');
    }

    async lookup(ip: string): Promise<GeoLocationResult | null> {
        try {
            const result = this.reader.get(ip);
            
            if (!result) return null;

            return {
                country: result.country?.names?.en,
                countryCode: result.country?.iso_code,
                city: result.city?.names?.en,
                lat: result.location?.latitude,
                lon: result.location?.longitude,
                timezone: result.location?.time_zone,
            };
        } catch (error) {
            console.error('MaxMind lookup error:', error);
            return null;
        }
    }
}

const provider = new MaxMindGeoProvider();
await provider.init();

RateLimitModule.forRoot({
    geoLocation: {
        provider: 'custom',
        customProvider: provider,
    },
})
```

### IPStack Example

```typescript
export class IPStackProvider implements GeoLocationProvider {
    constructor(private apiKey: string) {}

    async lookup(ip: string): Promise<GeoLocationResult | null> {
        try {
            const response = await fetch(
                `http://api.ipstack.com/${ip}?access_key=${this.apiKey}`
            );
            const data = await response.json();

            return {
                country: data.country_name,
                countryCode: data.country_code,
                region: data.region_name,
                city: data.city,
                lat: data.latitude,
                lon: data.longitude,
            };
        } catch (error) {
            console.error('IPStack error:', error);
            return null;
        }
    }
}
```

## Best Practices

### 1. Choose the Right Provider

- **Development/Testing**: Use `internal` provider
- **Low traffic (<1000 req/day)**: Use `ip-api` provider
- **Production/High traffic**: Use custom provider (MaxMind, IPStack)

### 2. Implement Caching

```typescript
class CachedGeoProvider implements GeoLocationProvider {
    private cache = new Map<string, { result: any; timestamp: number }>();
    private ttl = 3600000;

    constructor(private baseProvider: GeoLocationProvider) {}

    async lookup(ip: string) {
        const cached = this.cache.get(ip);
        if (cached && Date.now() - cached.timestamp < this.ttl) {
            return cached.result;
        }

        const result = await this.baseProvider.lookup(ip);
        this.cache.set(ip, { result, timestamp: Date.now() });
        return result;
    }
}
```

### 3. Handle Private IPs

The library automatically handles private IPs (localhost, 10.x.x.x, 192.168.x.x), marking them as 'XX' (unknown).

### 4. Fail-open Strategy

If geo-location lookup fails, the request is allowed by default. This ensures your service remains available even if geo service is down.

### 5. Logging and Monitoring

```typescript
geoLocation: {
    blockedCountries: ['XX'],
    onGeoBlock: (ip, country, request) => {
        logger.info({ ip, country, url: request.url });
        
        metrics.increment('geo_blocks', { country });
    },
}
```

## Troubleshooting

### Issue: All requests blocked

**Solution**: Check your country codes are correct (ISO 3166-1 alpha-2)

```typescript
// ✅
allowedCountries: ['US', 'GB', 'CA']

// ❌
allowedCountries: ['USA', 'UK', 'Canada']
```

### Issue: Localhost blocked

The internal and ip-api providers automatically handle private IPs. If using custom provider, add check:

```typescript
class MyProvider implements GeoLocationProvider {
    async lookup(ip: string) {
        if (this.isPrivateIP(ip)) {
            return { countryCode: 'XX', country: 'Private' };
        }
        // ... rest of logic
    }

    private isPrivateIP(ip: string): boolean {
        return ip.startsWith('127.') ||
               ip.startsWith('10.') ||
               ip.startsWith('192.168.');
    }
}
```

### Issue: Rate limit errors with ip-api

IP-API has a limit of 45 requests/minute. Solutions:

1. Use caching (built-in, 1 hour TTL)
2. Use MaxMind or another provider
3. Upgrade to ip-api Pro

### Issue: Geo-location not working

Check:
1. GeoModule is imported
2. Provider is set correctly
3. Internet connection (for external providers)
4. API keys (if using paid services)

## Country Codes Reference

Use ISO 3166-1 alpha-2 codes:

| Code | Country |
|------|---------|
| US | United States |
| GB | United Kingdom |
| CA | Canada |
| DE | Germany |
| FR | France |
| JP | Japan |
| CN | China |
| RU | Russia |
| IN | India |
| BR | Brazil |

Full list: https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2

## Support

For issues or questions:
- Check the [main README](../../README.md)
- Open an issue on GitHub

[//]: # (- Review [examples]&#40;./examples&#41;)
