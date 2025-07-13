# ElizaNet Fallback Plugin Technical Specification

## Overview

The ElizaNet Fallback Plugin provides a resilient fallback mechanism for ElizaOS agents when primary model providers fail due to rate limiting, network errors, or service unavailability. This plugin integrates with the ElizaNet LiteLLM instance to maintain continuous service availability.

## Architecture

### 1. Plugin Structure

```typescript
interface ElizaNetFallbackPlugin extends Plugin {
  name: 'elizanet-fallback';
  description: 'ElizaNet LiteLLM fallback plugin for rate limiting and network errors';
  priority: -1; // Lower priority for fallback behavior
  models: ModelHandlers;
  config: PluginConfiguration;
  tests: TestSuite[];
}
```

### 2. Model Support Matrix

| Model Type | Endpoint | Implementation | Fallback Strategy |
|------------|----------|---------------|------------------|
| `TEXT_SMALL` | `/v1/chat/completions` | `elizaNetTextGeneration` | Rate limit + Network error |
| `TEXT_LARGE` | `/v1/chat/completions` | `elizaNetTextGeneration` | Rate limit + Network error |
| `TEXT_EMBEDDING` | `/v1/embeddings` | `elizaNetEmbedding` | Rate limit + Network error |
| `IMAGE` | `/v1/images/generations` | `elizaNetImageGeneration` | Rate limit + Network error |
| `OBJECT_SMALL` | `/v1/chat/completions` | `generateObjectByModelType` | Rate limit + Network error |
| `OBJECT_LARGE` | `/v1/chat/completions` | `generateObjectByModelType` | Rate limit + Network error |
| `TEXT_TOKENIZER_ENCODE` | Local | `tokenizeText` | Always available |
| `TEXT_TOKENIZER_DECODE` | Local | `detokenizeText` | Always available |

### 3. Configuration Schema

```typescript
interface ElizaNetConfiguration {
  // Connection Settings
  ELIZANET_BASE_URL?: string;         // Default: 'http://elizanet.up.railway.app'
  ELIZANET_API_KEY?: string;          // Optional authentication
  ELIZANET_TIMEOUT?: string;          // Default: '30000' (30 seconds)
  
  // Model Configuration
  ELIZANET_SMALL_MODEL?: string;      // Default: 'gpt-4o-mini'
  ELIZANET_LARGE_MODEL?: string;      // Default: 'gpt-4o'
  ELIZANET_EMBEDDING_MODEL?: string;  // Default: 'text-embedding-3-small'
  ELIZANET_EMBEDDING_DIMENSIONS?: string; // Default: '1536'
  ELIZANET_IMAGE_MODEL?: string;      // Default: 'dall-e-3'
  
  // Control Settings
  ELIZANET_FALLBACK_ENABLED?: string; // Default: 'true'
}
```

## API Specification

### 1. Text Generation

**Endpoint:** `POST /v1/chat/completions`

**Request Schema:**
```typescript
interface ChatCompletionRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string[] | null;
}
```

**Response Schema:**
```typescript
interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
      role: 'assistant';
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

### 2. Embeddings

**Endpoint:** `POST /v1/embeddings`

**Request Schema:**
```typescript
interface EmbeddingRequest {
  model: string;
  input: string;
}
```

**Response Schema:**
```typescript
interface EmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
}
```

### 3. Image Generation

**Endpoint:** `POST /v1/images/generations`

**Request Schema:**
```typescript
interface ImageGenerationRequest {
  model: string;
  prompt: string;
  n?: number;
  size?: '256x256' | '512x512' | '1024x1024';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
}
```

**Response Schema:**
```typescript
interface ImageGenerationResponse {
  data: Array<{
    url: string;
    revised_prompt?: string;
  }>;
}
```

## Implementation Details

### 1. Error Handling Strategy

The plugin implements a comprehensive error detection and fallback mechanism:

```typescript
// Error conditions that trigger fallback
const FALLBACK_CONDITIONS = {
  // Rate limiting errors
  RATE_LIMIT_STATUS: [429],
  RATE_LIMIT_MESSAGES: [
    'rate limit', 'quota exceeded', 'too many requests',
    'rate_limit_exceeded', 'insufficient_quota'
  ],
  
  // Network errors
  NETWORK_ERROR_STATUS: [503, 502, 504, 500],
  NETWORK_ERROR_MESSAGES: [
    'service unavailable', 'timeout', 'connection refused',
    'network error', 'bad gateway', 'gateway timeout'
  ],
  
  // Connection timeouts
  TIMEOUT_ERRORS: ['AbortError', 'TimeoutError']
};
```

### 2. Timeout Management

```typescript
class TimeoutController {
  private controller: AbortController;
  private timeoutId: NodeJS.Timeout;
  
  constructor(timeout: number) {
    this.controller = new AbortController();
    this.timeoutId = setTimeout(() => {
      this.controller.abort();
    }, timeout);
  }
  
  get signal(): AbortSignal {
    return this.controller.signal;
  }
  
  clear(): void {
    clearTimeout(this.timeoutId);
  }
}
```

### 3. Authentication Handling

```typescript
function buildHeaders(runtime: IAgentRuntime): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  const apiKey = getApiKey(runtime);
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  
  return headers;
}
```

### 4. Response Validation

```typescript
function validateResponse<T>(
  response: Response,
  validator: (data: unknown) => data is T
): Promise<T> {
  if (!response.ok) {
    throw new Error(`ElizaNet API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json().then(data => {
    if (!validator(data)) {
      throw new Error('Invalid response format from ElizaNet API');
    }
    return data;
  });
}
```

## Fallback Behavior

### 1. Embedding Fallback

When embedding requests fail, the plugin provides graceful degradation:

```typescript
// Fallback vectors for different error conditions
const FALLBACK_VECTORS = {
  NULL_INPUT: (dim: number) => {
    const vector = Array(dim).fill(0);
    vector[0] = 0.1;
    return vector;
  },
  EMPTY_TEXT: (dim: number) => {
    const vector = Array(dim).fill(0);
    vector[0] = 0.3;
    return vector;
  },
  API_ERROR: (dim: number) => {
    const vector = Array(dim).fill(0);
    vector[0] = 0.4;
    return vector;
  },
  NETWORK_ERROR: (dim: number) => {
    const vector = Array(dim).fill(0);
    vector[0] = 0.6;
    return vector;
  }
};
```

### 2. Text Generation Fallback

Text generation failures throw exceptions to trigger higher-level fallback mechanisms:

```typescript
// No graceful degradation for text generation
// Failures propagate to allow primary provider retry
async function elizaNetTextGeneration(
  runtime: IAgentRuntime,
  params: GenerateTextParams
): Promise<string> {
  try {
    // Implementation
  } catch (error) {
    // Log error and re-throw
    logger.error(`[ElizaNet] Text generation failed: ${error.message}`);
    throw error;
  }
}
```

## Configuration Management

### 1. Setting Resolution Order

1. **Runtime Settings** (highest priority)
2. **Environment Variables**
3. **Default Values** (lowest priority)

```typescript
function getSetting(
  runtime: IAgentRuntime,
  key: string,
  defaultValue?: string
): string | undefined {
  return runtime.getSetting(key) ?? process.env[key] ?? defaultValue;
}
```

### 2. Character Configuration

```json
{
  "name": "MyAgent",
  "plugins": ["@elizaos/core"],
  "settings": {
    "ELIZANET_BASE_URL": "https://custom.elizanet.com",
    "ELIZANET_TIMEOUT": "45000",
    "ELIZANET_FALLBACK_ENABLED": "true"
  },
  "secrets": {
    "ELIZANET_API_KEY": "your-api-key-here"
  }
}
```

### 3. Environment Variables

```bash
# Core Configuration
ELIZANET_BASE_URL=http://elizanet.up.railway.app
ELIZANET_API_KEY=your-api-key
ELIZANET_TIMEOUT=30000

# Model Configuration
ELIZANET_SMALL_MODEL=gpt-4o-mini
ELIZANET_LARGE_MODEL=gpt-4o
ELIZANET_EMBEDDING_MODEL=text-embedding-3-small
ELIZANET_EMBEDDING_DIMENSIONS=1536
ELIZANET_IMAGE_MODEL=dall-e-3

# Control
ELIZANET_FALLBACK_ENABLED=true
```

## Testing Specification

### 1. Unit Tests

```typescript
describe('ElizaNet Fallback Plugin', () => {
  describe('Configuration', () => {
    it('should use default base URL when not configured');
    it('should respect custom configuration');
    it('should handle missing API key gracefully');
  });
  
  describe('Text Generation', () => {
    it('should generate text successfully');
    it('should handle API errors gracefully');
    it('should respect timeout settings');
  });
  
  describe('Embeddings', () => {
    it('should generate embeddings successfully');
    it('should handle null input gracefully');
    it('should return fallback vectors on API errors');
  });
  
  describe('Image Generation', () => {
    it('should generate images successfully');
    it('should handle API errors gracefully');
  });
});
```

### 2. Integration Tests

```typescript
describe('ElizaNet Plugin Integration', () => {
  it('should connect to ElizaNet API successfully');
  it('should handle network timeouts gracefully');
  it('should validate API responses correctly');
  it('should emit usage events properly');
});
```

### 3. Performance Tests

```typescript
describe('ElizaNet Plugin Performance', () => {
  it('should complete requests within timeout limits');
  it('should handle concurrent requests efficiently');
  it('should maintain stable memory usage');
});
```

## Security Considerations

### 1. API Key Management

- API keys are stored in character secrets, not configuration
- Keys are masked in logs and error messages
- Optional authentication allows anonymous usage

### 2. Input Validation

```typescript
function validateInput(input: unknown): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }
  
  if (input.length > MAX_INPUT_LENGTH) {
    throw new Error('Input exceeds maximum length');
  }
  
  return input;
}
```

### 3. Response Sanitization

- All API responses are validated against expected schemas
- Malformed responses are rejected with appropriate error messages
- No raw user input is directly interpolated into API requests

## Monitoring and Observability

### 1. Event Emission

```typescript
// Usage events for monitoring
runtime.emitEvent(EventType.MODEL_USED, {
  provider: 'elizanet-fallback',
  type: modelType,
  prompt: sanitizedPrompt,
  tokens: {
    prompt: usage.promptTokens,
    completion: usage.completionTokens,
    total: usage.totalTokens,
  },
});
```

### 2. Logging Strategy

```typescript
// Structured logging for observability
logger.debug(`[ElizaNet] ${operation} request`, {
  baseUrl: sanitizedUrl,
  hasApiKey: !!apiKey,
  timeout,
  modelType,
});

logger.info(`[ElizaNet] ${operation} completed`, {
  duration: Date.now() - startTime,
  tokenUsage: usage,
});
```

### 3. Error Tracking

```typescript
// Comprehensive error logging
logger.error(`[ElizaNet] ${operation} failed`, {
  error: error.message,
  statusCode: error.status,
  requestId: error.requestId,
  retryable: isRetryableError(error),
});
```

## Deployment Considerations

### 1. Environment Setup

```bash
# Production deployment
ELIZANET_BASE_URL=https://production.elizanet.com
ELIZANET_TIMEOUT=45000
ELIZANET_FALLBACK_ENABLED=true

# Development
ELIZANET_BASE_URL=http://localhost:8000
ELIZANET_TIMEOUT=10000
ELIZANET_FALLBACK_ENABLED=false
```

### 2. Health Checks

```typescript
async function healthCheck(runtime: IAgentRuntime): Promise<boolean> {
  try {
    const response = await fetch(`${getBaseURL(runtime)}/v1/models`, {
      method: 'GET',
      headers: buildHeaders(runtime),
      signal: AbortSignal.timeout(5000),
    });
    
    return response.ok;
  } catch (error) {
    logger.warn(`[ElizaNet] Health check failed: ${error.message}`);
    return false;
  }
}
```

### 3. Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > CIRCUIT_RESET_TIMEOUT) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await operation();
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
  
  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= FAILURE_THRESHOLD) {
      this.state = 'open';
    }
  }
  
  private reset(): void {
    this.failures = 0;
    this.state = 'closed';
  }
}
```

## Performance Characteristics

### 1. Expected Latency

- **Text Generation**: 2-5 seconds (depends on model size)
- **Embeddings**: 100-500ms
- **Image Generation**: 10-30 seconds
- **Tokenization**: <50ms (local processing)

### 2. Throughput Limits

- **Concurrent Requests**: Limited by ElizaNet instance capacity
- **Rate Limiting**: Respects upstream provider limits
- **Memory Usage**: Minimal (stateless operations)

### 3. Error Rates

- **Expected**: <5% under normal conditions
- **Degraded**: 10-20% during high load
- **Fallback Success**: >90% when primary providers fail

## Migration and Compatibility

### 1. Version Compatibility

- **ElizaOS Core**: Compatible with v2.0.0+
- **Node.js**: Requires Node.js 18+
- **Dependencies**: Uses standard ElizaOS dependencies

### 2. Breaking Changes

- Plugin priority system requires ElizaOS v2.0.0+
- Model handler interface changes in v2.0.0
- Configuration schema updates

### 3. Migration Path

```typescript
// From v1.x to v2.x
// Old configuration
const oldConfig = {
  elizaNetUrl: 'http://elizanet.up.railway.app',
  elizaNetKey: 'api-key',
};

// New configuration
const newConfig = {
  ELIZANET_BASE_URL: 'http://elizanet.up.railway.app',
  ELIZANET_API_KEY: 'api-key',
};
```

## Future Enhancements

### 1. Planned Features

- **Multi-provider Support**: Chain multiple fallback providers
- **Intelligent Routing**: Route requests based on model capabilities
- **Caching Layer**: Cache responses to reduce API calls
- **Metrics Dashboard**: Real-time monitoring interface

### 2. Extension Points

- **Custom Error Handlers**: Pluggable error detection logic
- **Request Transformers**: Modify requests before sending
- **Response Processors**: Custom response handling
- **Health Monitors**: Advanced health checking

### 3. Performance Optimizations

- **Connection Pooling**: Reuse HTTP connections
- **Request Batching**: Combine multiple requests
- **Streaming Support**: Real-time response streaming
- **Compression**: Reduce payload sizes

## Conclusion

The ElizaNet Fallback Plugin provides a robust, production-ready fallback mechanism for ElizaOS agents. Its comprehensive error handling, configurable behavior, and thorough testing make it suitable for mission-critical applications where continuous availability is essential.

The plugin's design prioritizes reliability, observability, and maintainability while providing a seamless integration experience for developers. Its modular architecture allows for easy extension and customization based on specific deployment requirements.