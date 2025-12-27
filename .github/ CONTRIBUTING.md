# Contributing to nestjs-cluster-throttle

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How to Contribute

### Reporting Bugs

Before creating a bug report:
1. Check if the issue already exists in [GitHub Issues](https://github.com/rdobrynin/nestjs-cluster-throttle/issues)
2. Update to the latest version to see if the issue persists
3. Collect relevant information:
    - Node.js version
    - NestJS version
    - Package version
    - Operating system
    - Steps to reproduce
    - Expected vs actual behavior

Create a detailed bug report with:
- Clear, descriptive title
- Step-by-step reproduction instructions
- Code samples or test cases
- Error messages and stack traces
- Screenshots if applicable

### Suggesting Features

Feature requests are welcome! Please:
1. Check if the feature has been suggested before
2. Explain the use case and benefits
3. Provide examples of how it would be used
4. Consider if it aligns with the project's goals

### Pull Requests

1. **Fork and Clone**
   ```bash
   git clone https://github.com/rdobrynin/nestjs-cluster-throttle.git
   cd nestjs-cluster-throttle
   npm install
   ```

2. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

3. **Make Changes**
    - Write clean, readable code
    - Follow existing code style
    - Add tests for new features
    - Update documentation

4. **Test Your Changes**
   ```bash
   npm run lint
   npm test
   npm run build
   ```

5. **Commit Changes**
   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   ```bash
   git commit -m "feat: add new rate limiting strategy"
   git commit -m "fix: resolve memory leak in store cleanup"
   git commit -m "docs: update README examples"
   ```

   Types:
    - `feat`: New feature
    - `fix`: Bug fix
    - `docs`: Documentation changes
    - `style`: Code style changes (formatting)
    - `refactor`: Code refactoring
    - `test`: Adding or updating tests
    - `chore`: Build process or auxiliary tool changes

6. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a Pull Request on GitHub with:
    - Clear description of changes
    - Link to related issues
    - Screenshots/examples if applicable

## Development Setup

### Prerequisites
- Node.js >= 14.0.0
- npm >= 6.0.0
- Redis (for testing cluster mode)

### Local Development

```bash
# Install dependencies
npm install

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Lint code
npm run lint

# Format code
npm run format

# Build
npm run build
```

### Testing with Redis

```bash
# Start Redis with Docker
docker run -d -p 6379:6379 redis:7-alpine

# Run tests
npm test

# Stop Redis
docker stop $(docker ps -q --filter ancestor=redis:7-alpine)
```

## Code Style

- Use TypeScript for all code
- Follow existing patterns and conventions
- Use 4 spaces for indentation
- Maximum line length: 100 characters
- Use single quotes for strings
- Add trailing commas in multi-line structures
- Use meaningful variable names
- Add JSDoc comments for public APIs

Example:
```typescript
/**
 * Check if a request should be rate limited
 * @param request - HTTP request object
 * @param options - Rate limit configuration
 * @returns Rate limit result with allowed status
 */
async checkRateLimit(
    request: any,
    options?: Partial<RateLimitOptions>,
): Promise<RateLimitResult> {
    // Implementation
}
```

## Testing

- Write unit tests for all new features
- Maintain or improve code coverage
- Test edge cases and error conditions
- Use descriptive test names

Example:
```typescript
describe('RateLimitService', () => {
    describe('checkRateLimit', () => {
        it('should allow requests within limit', async () => {
            // Test implementation
        });

        it('should block requests exceeding limit', async () => {
            // Test implementation
        });
    });
});
```

## Documentation

Update documentation when:
- Adding new features
- Changing APIs
- Fixing bugs that affect usage
- Adding configuration options

Documentation to update:
- README.md - Main documentation
- JSDoc comments - API documentation
- CHANGELOG.md - Version history
- Examples - Usage examples

## Release Process

Maintainers follow this process for releases:

1. Update version in package.json
2. Update CHANGELOG.md
3. Commit changes: `git commit -m "chore: release v1.x.x"`
4. Create tag: `git tag v1.x.x`
5. Push: `git push && git push --tags`
6. Create GitHub release
7. Publish to npm: `npm publish`

## Questions?

- Open a [Discussion](https://github.com/rdobrynin/nestjs-cluster-throttle/discussions)
- Check existing [Issues](https://github.com/rdobrynin/nestjs-cluster-throttle/issues)
- Review [Documentation](https://github.com/rdobrynin/nestjs-cluster-throttle#readme)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
