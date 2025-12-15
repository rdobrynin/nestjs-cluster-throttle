# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release features

## [1.0.0] - 2025-12-15

### Added
- ✨ Cluster-ready rate limiting with Redis support
- 💾 In-memory storage for single-instance applications
- 🎯 Multiple rate limiting strategies:
    - Fixed-window algorithm
    - Token-bucket algorithm
    - Sliding-window algorithm
- 🎨 Decorator-based API (`@RateLimit`, `@SkipRateLimit`)
- ⚙️ Highly configurable options:
    - Custom key generators
    - Conditional skipping
    - Custom error handlers
    - Flexible time windows and limits
- 🔒 Fail-open strategy for storage failures
- 📊 Rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
- 🔄 Async configuration support with `forRootAsync`
- 🧪 Comprehensive test coverage
- 📖 Complete documentation and examples

### Features
- **Global Guards**: Automatic rate limiting for all routes
- **Route-specific Limits**: Override global limits per route
- **Redis Integration**: Full Redis support with Lua scripts for atomic operations
- **Memory Store**: Efficient in-memory storage with automatic cleanup
- **TypeScript**: Full TypeScript support with type definitions
- **NestJS Integration**: Seamless integration with NestJS dependency injection

### Technical Details
- Uses ioredis for Redis connections
- Implements Lua scripts for atomic Redis operations
- Automatic script reloading on Redis restart
- Graceful degradation on storage failures
- Memory cleanup for expired entries

### Documentation
- Comprehensive README with examples
- Publishing guide for NPM
- TypeScript type definitions
- JSDoc comments for all public APIs

[Unreleased]: https://github.com/your-username/nestjs-cluster-throttle/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/your-username/nestjs-cluster-throttle/releases/tag/v1.0.0
