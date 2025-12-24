# NestJS 11 Compatibility

## ✅ Full Support for NestJS 9, 10, and 11

`nestjs-cluster-throttle` is fully compatible with NestJS versions 9.x, 10.x, and 11.x.

## Version Support Matrix

| NestJS Version | Supported | Tested | Notes |
|----------------|-----------|--------|-------|
| 11.x           | ✅        | ✅     | Latest - Fully supported |
| 10.x           | ✅        | ✅     | Fully supported |
| 9.x            | ✅        | ✅     | Fully supported |
| 8.x            | ❌        | ❌     | Not supported |

## Node.js Requirements

| Node.js Version | Supported |
|-----------------|-----------|
| 20.x            | ✅ Recommended |
| 18.x            | ✅ Recommended |
| 16.x            | ✅ Supported |
| 14.x            | ⚠️ Minimum |

## Installation

### With NestJS 11

```bash
npm install @nestjs/common@^11.0.0 @nestjs/core@^11.0.0
npm install nestjs-cluster-throttle
```

### With NestJS 10

```bash
npm install @nestjs/common@^10.0.0 @nestjs/core@^10.0.0
npm install nestjs-cluster-throttle
```

### With NestJS 9

```bash
npm install @nestjs/common@^9.0.0 @nestjs/core@^9.0.0
npm install nestjs-cluster-throttle
```

## What's New in NestJS 11

### Breaking Changes That Don't Affect Us

NestJS 11 introduced several changes, but `nestjs-cluster-throttle` is designed to be compatible:

1. ✅ **New Metadata API** - We use standard decorators that work across all versions
2. ✅ **Enhanced Dependency Injection** - Our DI patterns are compatible
3. ✅ **TypeScript 5.3+** - We support latest TypeScript
4. ✅ **reflect-metadata 0.2** - We support both 0.1.x and 0.2.x

### Features We Leverage

1. **Optional Dependencies** - We use `@Optional()` decorator for GeoService
2. **Global Modules** - Our GeoModule is marked as `@Global()`
3. **Dynamic Modules** - We use `forRoot()` and `forRootAsync()` patterns
4. **Metadata Reflection** - We use Reflector for decorator metadata

## Testing Across Versions

We test on all supported NestJS versions in CI/CD:

```yaml
strategy:
  matrix:
    node-version: [16.x, 18.x, 20.x]
    nestjs-version: [9, 10, 11]
```

This ensures compatibility across:
- **3 Node.js versions**
- **3 NestJS versions**
- **= 9 test combinations**

## Migration Guide

### From NestJS 9/10 to 11

No changes needed! Just update your dependencies:

```bash
# Update NestJS
npm install @nestjs/common@^11.0.0 @nestjs/core@^11.0.0

# Update other NestJS packages
npm install @nestjs/platform-express@^11.0.0

# nestjs-cluster-throttle works as-is
```

Your existing code continues to work:

```typescript
import { RateLimitModule } from 'nestjs-cluster-throttle';

@Module({
  imports: [
    RateLimitModule.forRoot({
      windowMs: 60000,
      max: 100,
    }),
  ],
})
export class AppModule {}
```

## Compatibility Features

### 1. Decorator Compatibility

```typescript
// Works across all versions
@RateLimit({
  windowMs: 60000,
  max: 100,
})
```

### 2. Module Pattern Compatibility

```typescript
// forRoot - works across all versions
RateLimitModule.forRoot(options)

// forRootAsync - works across all versions
RateLimitModule.forRootAsync({
  useFactory: () => options,
})
```

### 3. Guard Compatibility

```typescript
// CanActivate interface - stable across versions
export class RateLimitGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // ...
  }
}
```

### 4. Dependency Injection Compatibility

```typescript
// Constructor injection - works across versions
constructor(
  private reflector: Reflector,
  private rateLimitService: RateLimitService,
  @Optional() private geoService?: GeoService,
) {}
```

## TypeScript Version

| TypeScript | NestJS 9 | NestJS 10 | NestJS 11 |
|------------|----------|-----------|-----------|
| 5.3+       | ✅       | ✅        | ✅ Required |
| 5.0-5.2    | ✅       | ✅        | ⚠️ |
| 4.9        | ⚠️       | ❌        | ❌ |

We recommend TypeScript 5.3+ for best compatibility.

## Known Issues

None! The library is fully compatible with all supported NestJS versions.

## Testing Your Migration

After upgrading to NestJS 11:

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run your application
npm run start:dev
```

All features should work identically across versions.

## Continuous Integration

Our CI pipeline tests every commit against:

```
✅ NestJS 9 + Node 16, 18, 20
✅ NestJS 10 + Node 16, 18, 20
✅ NestJS 11 + Node 16, 18, 20
```

See `.github/workflows/ci.yml` for details.

## Support

If you encounter any compatibility issues:

1. Check your NestJS version: `npm list @nestjs/common`
2. Ensure peer dependencies are satisfied
3. Review [migration guide](#migration-guide)
4. Open an issue on GitHub with version details

## Version Guarantees

We guarantee:

- ✅ **Semantic Versioning** - We follow semver strictly
- ✅ **Backward Compatibility** - Within major versions
- ✅ **Forward Compatibility** - Tested with latest NestJS
- ✅ **Long-term Support** - For all supported NestJS versions

## Update Recommendations

### For New Projects
Use NestJS 11 + nestjs-cluster-throttle latest:

```bash
npm install @nestjs/common@^11.0.0 nestjs-cluster-throttle
```

### For Existing Projects
Update NestJS first, then test:

```bash
# Update NestJS
npm update @nestjs/common @nestjs/core

# Test your application
npm test

# nestjs-cluster-throttle should work without changes
```

## API Stability

All public APIs are stable across NestJS versions:

- ✅ `RateLimitModule.forRoot()`
- ✅ `RateLimitModule.forRootAsync()`
- ✅ `@RateLimit()` decorator
- ✅ `@SkipRateLimit()` decorator
- ✅ `RateLimitService`
- ✅ `GeoService`
- ✅ All interfaces and types

## Future Compatibility

We commit to:

1. Supporting the latest 3 major versions of NestJS
2. Testing against pre-release versions
3. Providing migration guides for breaking changes
4. Maintaining backward compatibility within major versions

## Questions?

- **Documentation**: [README.md](./README.md)
- **Issues**: [GitHub Issues](https://github.com/rdobrynin/nestjs-cluster-throttle/issues)
- **Migration Help**: Open a discussion

---

**TL;DR**: nestjs-cluster-throttle works perfectly with NestJS 9, 10, and 11. No code changes needed when upgrading NestJS! 🎉
