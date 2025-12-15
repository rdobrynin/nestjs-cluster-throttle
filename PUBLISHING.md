# Publishing Guide - NPM Publishing Guide

## Preparation for First Publication

### 1. Create an account on npmjs.com

If you don't have an account yet:
```bash
npm adduser
# or
npm login
```

Enter your details:
- Username
- Password
- Email (will public)

### 2. Check the package name

Ensure the name `nestjs-cluster-throttle` is available:
```bash
npm search nestjs-cluster-throttle
```

If the name is taken, change it in `package.json`:
```json
{
  "name": "@your-scope/nestjs-cluster-throttle"
}
```

### 3. Update project information

In `package.json` update:
- `author.email` - your email
- `repository.url` - URL GitHub repository
- `bugs.url` - URL page issues
- `homepage` - URL page home

Example:
```json
{
  "author": {
    "name": "Your Name",
    "email": "your.email@example.com"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/rdobrynin/nestjs-cluster-throttle.git"
  }
}
```

## Publishing Process

### Step 1: Prepare the code

```bash
# Install dependencies
npm install

# Run tests
npm test

# Check linting
npm run lint

# Build the project
npm run build
```

### Step 2: Check package contents

View what will be published:
```bash
npm pack --dry-run
```

Or create a test archive:
```bash
npm pack
# Проверьте содержимое nestjs-cluster-throttle-1.0.0.tgz
tar -tzf nestjs-cluster-throttle-1.0.0.tgz
```

### Step 3: Versioning

Follow [Semantic Versioning](https://semver.org/):

```bash
# Patch (1.0.0 -> 1.0.1) - bug fixes
npm version patch

# Minor (1.0.0 -> 1.1.0) - new features, backwards compatible
npm version minor

# Major (1.0.0 -> 2.0.0) - breaking changes
npm version major
```

Or set the version manually:
```bash
npm version 1.0.0
```

### Step 4: Test publication (optional)

Use Verdaccio for local testing:

```bash
# Install Verdaccio
npm install -g verdaccio

# Start local registry
verdaccio

# In another terminal
npm adduser --registry http://localhost:4873
npm publish --registry http://localhost:4873
```

### Step 5: Publish to NPM

```bash
# Make sure you are logged in
npm whoami

# Publish
npm publish

# For scoped packages with public access
npm publish --access public
```

### Step 6: Verify publication

```bash
# Check on npmjs.com
open https://www.npmjs.com/package/nestjs-cluster-throttle

# Or install the package
npm install nestjs-cluster-throttle
```

## Automation via GitHub Actions

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to NPM

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Publish to NPM
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Setup:
1. Get a token on npmjs.com: Account → Access Tokens → Generate New Token (Automation)
2. Add the token to GitHub: Settings → Secrets → New repository secret (NPM_TOKEN)
3. Create a release on GitHub - the package will be published automatically

## Updating the Package

### Publishing a patch (bug fixes)

```bash
# 1. Make changes
# 2. Commit changes
git add .
git commit -m "fix: исправление бага X"

# 3. Update version
npm version patch

# 4. Publish
npm publish

# 5. Push with tags
git push && git push --tags
```

### Publishing new functionality

```bash
git add .
git commit -m "feat: added new strategy X"
npm version minor
npm publish
git push && git push --tags
```

### Publishing breaking changes

```bash
git add .
git commit -m "feat!: changed API for method X"
npm version major
npm publish
git push && git push --tags
```

## Beta/Alpha Versions

For testing new features:

```bash
# Set a pre-release version
npm version 2.0.0-beta.1

# Publish with a tag
npm publish --tag beta

# Users can install like this:
npm install nestjs-cluster-throttle@beta
```

## Unpublishing

⚠️ **Important**: Can only be done within 72 hours of publication!

```bash
# Unpublish a specific version
npm unpublish nestjs-cluster-throttle@1.0.0

# Unpublish the entire package (not recommended)
npm unpublish nestjs-cluster-throttle --force
```

## Deprecation

Mark a version as deprecated:

```bash
npm deprecate nestjs-cluster-throttle@1.0.0 "Please update to version 2.0.0"
```

## Pre-publication Checklist

- [ ] All tests pass (`npm test`)
- [ ] Code builds without errors (`npm run build`)
- [ ] README.md is up to date
- [ ] CHANGELOG.md is updated (if exists)
- [ ] Version in package.json is correct
- [ ] Git tag is created
- [ ] All changes are committed
- [ ] Repository URL and author are updated
- [ ] Package contents checked (`npm pack --dry-run`)
- [ ] ou are logged into NPM (`npm whoami`)

## Recommendations

### 1. Use semantic-release

Automates versioning and publishing:

```bash
npm install --save-dev semantic-release
```

### 2. Add badges to README

```markdown
[![npm version](https://badge.fury.io/js/nestjs-cluster-throttle.svg)](https://badge.fury.io/js/nestjs-cluster-throttle)
[![npm downloads](https://img.shields.io/npm/dm/nestjs-cluster-throttle.svg)](https://www.npmjs.com/package/nestjs-cluster-throttle)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
```

### 3. Create CHANGELOG.md

Use [conventional-changelog](https://github.com/conventional-changelog/conventional-changelog):

```bash
npm install --save-dev conventional-changelog-cli
npx conventional-changelog -p angular -i CHANGELOG.md -s
```

### 4. Configure .npmrc locally

Create `.npmrc` in the home directory:
```
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
```

## Monitoring

After publication, monitor:
- Download statistics: https://npm-stat.com/
- Issues on GitHub
- Questions in Discussions
- Dependency updates via Dependabot

## Useful Commands

```bash
# Package information
npm info nestjs-cluster-throttle

# Version history
npm view nestjs-cluster-throttle versions

# Dependencies
npm view nestjs-cluster-throttle dependencies

# List owners
npm owner ls nestjs-cluster-throttle

# Add an owner
npm owner add username nestjs-cluster-throttle

# Download statistics
npm view nestjs-cluster-throttle downloads
```

## Troubleshooting

### Error: "You do not have permission to publish"

```bash
# Check if you are logged in
npm whoami

# Re-login
npm logout
npm login
```

### Error: "Package name too similar to existing package"

Change the package name or use a scope:
```json
{
  "name": "@yourname/nestjs-cluster-throttle"
}
```

### Error: "Version already exists"

```bash
# Update the version
npm version patch
npm publish
```

## Support

If issues arise:
- [NPM Support](https://www.npmjs.com/support)
- [NPM Documentation](https://docs.npmjs.com/)
- [GitHub Issues](https://github.com/rdobrynin/nestjs-cluster-throttle/issues)
