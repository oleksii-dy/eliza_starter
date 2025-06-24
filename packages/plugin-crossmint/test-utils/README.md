# Test Utilities

This directory contains utility scripts for debugging and validating the CrossMint API integration. These are not part of the test suite but are useful tools for development and troubleshooting.

## Scripts

### debug-api.mjs
Tests various CrossMint API endpoint variations to debug connectivity issues.

### test-corrected-api.mjs
Tests the corrected API endpoints with proper versioning and request formats.

### test-production.mjs
Validates the production API integration without creating actual resources.

### test-real-service.mjs
Tests the real service implementation with minimal dependencies.

## Usage

These scripts can be run directly with Node.js or Bun:

```bash
# Make sure you have CROSSMINT_API_KEY set in your environment
node test-utils/debug-api.mjs
# or with Bun
bun test-utils/debug-api.mjs

node test-utils/test-production.mjs
# or with Bun
bun test-utils/test-production.mjs
```

These are useful for:
- Debugging API connectivity issues
- Validating API key permissions
- Testing endpoint availability
- Verifying service configuration 