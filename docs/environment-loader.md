# EnvironmentLoader API Documentation

The `EnvironmentLoader` is a centralized environment variable management system for ElizaOS CLI. It provides type-safe access to environment variables with validation, centralized dotenv loading, and plugin-specific validation rules.

## Overview

Phase 2 of the project loading refactor introduces the `EnvironmentLoader` to eliminate scattered `dotenv.config()` calls and provide consistent environment variable access across the CLI.

## Usage

### Basic Usage

```typescript
import { EnvironmentLoader, env } from '../utils/environment-loader';

// Load environment variables (should be called early in application lifecycle)
const loader = EnvironmentLoader.getInstance();
await loader.load();

// Or use the convenience instance
await env.load();

// Access environment variables
const apiKey = env.get('OPENAI_API_KEY');
const logLevel = env.get('LOG_LEVEL');
```

### Advanced Usage

```typescript
// Load from specific .env file
await env.load({ envPath: '/custom/path/.env' });

// Force reload
await env.load({ force: true });

// Get required variables (throws if missing)
const requiredKey = env.getRequired('OPENAI_API_KEY');

// Type-safe accessors
const isDryRun = env.getBoolean('TWITTER_DRY_RUN', false);
const maxRetries = env.getNumber('MAX_RETRIES', 3);

// Character-scoped variables
const aliceConfig = env.getCharacterScoped('alice');
// Returns: { OPENAI_API_KEY: 'alice-key', CUSTOM_SETTING: 'value' }

// Validation
const validation = await env.validate();
if (!validation.success) {
  console.error('Environment validation failed:', validation.errors);
}
```

## API Reference

### EnvironmentLoader Class

#### Static Methods

##### `getInstance(): EnvironmentLoader`
Returns the singleton instance of EnvironmentLoader.

#### Instance Methods

##### `load(options?: LoadOptions): Promise<void>`
Loads environment variables from .env file and process.env.

**Parameters:**
- `options.envPath?: string` - Custom path to .env file
- `options.force?: boolean` - Force reload even if already loaded

**Behavior:**
- Loads .env file using existing CLI utilities
- Merges with process.env (process.env takes precedence)
- Only loads once unless `force: true`

##### `get(key: string): string | undefined`
Gets an environment variable value.

**Returns:** Value or undefined if not set
**Note:** Falls back to process.env if not loaded

##### `getRequired(key: string): string`
Gets a required environment variable value.

**Returns:** Non-empty string value
**Throws:** Error if variable is missing or empty

##### `getBoolean(key: string, defaultValue?: boolean): boolean`
Gets a boolean environment variable value.

**Accepted values:** `'true'`, `'1'`, `'yes'` (case-insensitive) = true
**Default:** `false`

##### `getNumber(key: string, defaultValue?: number): number`
Gets a numeric environment variable value.

**Default:** `0`
**Note:** Returns default for invalid numbers

##### `getCharacterScoped(characterId: string): Record<string, string>`
Gets character-scoped environment variables.

**Pattern:** `CHARACTER.{characterId}.{variableName}`
**Example:** `CHARACTER.alice.OPENAI_API_KEY` → `{ OPENAI_API_KEY: 'value' }`

##### `validate(): Promise<ValidationResult>`
Validates environment variables according to ElizaOS requirements.

**Returns:**
```typescript
interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  hasModelProvider: boolean;
}
```

##### `getAll(includeSensitive?: boolean): Record<string, string | undefined>`
Gets all environment variables with optional filtering.

**Parameters:**
- `includeSensitive: boolean` - Include sensitive values (default: false)

**Security:** Sensitive variables are replaced with `[REDACTED]` by default

##### `isLoaded(): boolean`
Checks if environment variables have been loaded.

##### `getEnvFilePath(): string | undefined`
Gets the current environment file path.

## Environment Variable Schema

The EnvironmentLoader validates against a comprehensive schema including:

### Model Providers (at least one required)
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `OLLAMA_MODEL`
- `LLAMACLOUD_API_KEY`
- `GROQ_API_KEY`
- `CLAUDE_API_KEY` (legacy)

### Database Configuration
- `POSTGRES_URL`
- `DATABASE_URL`
- `PGLITE_DATA_DIR`

### Logging
- `LOG_LEVEL: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace'`

### Service Integrations
- **Discord:** `DISCORD_API_TOKEN`, `DISCORD_APPLICATION_ID`
- **Twitter:** `TWITTER_API_KEY`, `TWITTER_API_SECRET`, `TWITTER_ACCESS_TOKEN`, `TWITTER_ACCESS_TOKEN_SECRET`
- **Telegram:** `TELEGRAM_BOT_TOKEN`

### Blockchain
- `EVM_PRIVATE_KEY`, `EVM_PUBLIC_KEY`
- `SOLANA_PRIVATE_KEY`, `SOLANA_PUBLIC_KEY`
- `WALLET_PRIVATE_KEY`, `WALLET_PUBLIC_KEY` (legacy)

## Validation Rules

### Required Model Provider
At least one model provider must be configured:
- Valid API key (not 'dummy_key')
- Non-empty value

### Service-Specific Rules
- **Discord:** Both token and application ID required if either is provided
- **Twitter:** All four credentials required if any are provided
- **Database:** Warns about conflicting POSTGRES_URL and DATABASE_URL

### Legacy Variable Warnings
- `CLAUDE_API_KEY` → use `ANTHROPIC_API_KEY`
- `WALLET_PRIVATE_KEY` → use `EVM_PRIVATE_KEY`

## Migration Guide

### From Scattered dotenv.config()

**Before:**
```typescript
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;
```

**After:**
```typescript
import { env } from '../utils/environment-loader';

await env.load();
const apiKey = env.get('OPENAI_API_KEY');
```

### From Direct process.env Access

**Before:**
```typescript
const isDryRun = process.env.TWITTER_DRY_RUN === 'true';
const port = parseInt(process.env.PORT || '3000', 10);
```

**After:**
```typescript
const isDryRun = env.getBoolean('TWITTER_DRY_RUN');
const port = env.getNumber('PORT', 3000);
```

### Adding Validation

**Before:**
```typescript
if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OpenAI API key');
}
```

**After:**
```typescript
const validation = await env.validate();
if (!validation.success) {
  throw new Error(`Environment validation failed: ${validation.errors.join(', ')}`);
}
```

## Implementation Notes

### Backward Compatibility
- Falls back to `process.env` when not loaded
- Does not break existing code patterns
- Graceful degradation for server/other packages

### Performance
- Singleton pattern prevents multiple loads
- Caches loaded values
- Lazy loading with explicit initialization

### Security
- Filters sensitive variables in `getAll()`
- Character-scoped variable isolation
- Validates required vs optional variables

### Error Handling
- Clear validation error messages
- Graceful handling of missing .env files
- Comprehensive logging with appropriate levels

## Best Practices

1. **Load Early:** Call `env.load()` early in application lifecycle
2. **Use Type-Safe Accessors:** Prefer `getBoolean()`, `getNumber()` over manual conversion
3. **Validate Environment:** Always validate in production applications
4. **Character Scoping:** Use character-scoped variables for agent-specific configuration
5. **Handle Errors:** Check validation results and handle errors gracefully

## Examples

### Complete Setup Example

```typescript
import { env } from '../utils/environment-loader';
import { logger } from '@elizaos/core';

async function initializeEnvironment() {
  try {
    // Load environment variables
    await env.load();
    
    // Validate configuration
    const validation = await env.validate();
    if (!validation.success) {
      logger.error('Environment validation failed:');
      validation.errors.forEach(error => logger.error(`  - ${error}`));
      process.exit(1);
    }
    
    // Log warnings
    validation.warnings.forEach(warning => logger.warn(warning));
    
    logger.info('Environment loaded and validated successfully');
    
    // Access configuration
    const logLevel = env.get('LOG_LEVEL');
    const hasOpenAI = !!env.get('OPENAI_API_KEY');
    
    logger.info(`Log level: ${logLevel}, OpenAI configured: ${hasOpenAI}`);
    
  } catch (error) {
    logger.error(`Failed to initialize environment: ${error}`);
    process.exit(1);
  }
}
```

### Character-Specific Configuration

```typescript
// .env file
OPENAI_API_KEY=sk-global-key
CHARACTER.alice.OPENAI_API_KEY=sk-alice-specific-key
CHARACTER.alice.CUSTOM_PROMPT=You are Alice, a helpful assistant
CHARACTER.bob.ANTHROPIC_API_KEY=sk-bob-anthropic-key

// Usage
await env.load();

const globalKey = env.get('OPENAI_API_KEY'); // sk-global-key
const aliceConfig = env.getCharacterScoped('alice');
// { OPENAI_API_KEY: 'sk-alice-specific-key', CUSTOM_PROMPT: 'You are Alice...' }

const bobConfig = env.getCharacterScoped('bob');
// { ANTHROPIC_API_KEY: 'sk-bob-anthropic-key' }
```