# ElizaNet LiteLLM Fallback POC

This POC implements a fallback mechanism that automatically retries failed model requests using the ElizaNet LiteLLM instance at `http://elizanet.up.railway.app/` when the primary model fails due to rate limiting or other errors.

## 🚀 Features

- **Automatic Fallback**: Seamlessly falls back to ElizaNet LiteLLM when primary models fail
- **Rate Limiting Detection**: Detects rate limiting errors (429, quota exceeded, too many requests)
- **Network Error Handling**: Handles network errors (503, 502, 504, timeouts, connection issues)
- **Comprehensive Logging**: Logs fallback usage for monitoring and debugging
- **Configurable**: Easy to enable/disable and configure via environment variables or character settings
- **Multi-Model Support**: Supports text generation, embeddings, and image generation

## 📋 Implementation Details

### Core Changes

The fallback mechanism is implemented in `/packages/core/src/runtime.ts` with the following key methods:

1. **`useModel()`** - Modified to catch errors and attempt fallback
2. **`shouldFallbackToElizaNet()`** - Determines if an error warrants fallback
3. **`fallbackToElizaNet()`** - Orchestrates the fallback request
4. **`elizaNetTextGeneration()`** - Handles text generation fallback
5. **`elizaNetEmbedding()`** - Handles embedding generation fallback
6. **`elizaNetImageGeneration()`** - Handles image generation fallback

### Error Detection

The system automatically detects these error conditions for fallback:

**Rate Limiting Errors:**
- Error messages containing: "rate limit", "quota exceeded", "too many requests"
- HTTP status codes: 429
- Error codes containing: "rate_limit"

**Network Errors:**
- Error messages containing: "service unavailable", "timeout", "connection refused", "network error"
- HTTP status codes: 503, 502, 504

## ⚙️ Configuration

### Environment Variables

```bash
# Enable/disable fallback (default: enabled)
ELIZANET_FALLBACK_ENABLED=true

# ElizaNet LiteLLM base URL (default: http://elizanet.up.railway.app)
ELIZANET_BASE_URL=http://elizanet.up.railway.app

# API key for authenticated requests (optional)
ELIZANET_API_KEY=your-api-key-here

# Request timeout in milliseconds (default: 30000)
ELIZANET_TIMEOUT=30000
```

### Character Configuration

```typescript
const character: Character = {
  // ... other character properties
  settings: {
    ELIZANET_FALLBACK_ENABLED: true,
    ELIZANET_BASE_URL: 'http://elizanet.up.railway.app',
    ELIZANET_TIMEOUT: '30000',
  },
  secrets: {
    ELIZANET_API_KEY: 'your-api-key-here', // Optional
  },
};
```

## 🔧 Usage

### Basic Usage

The fallback mechanism works automatically once configured. No code changes are needed for existing `runtime.useModel()` calls:

```typescript
// This will automatically fallback to ElizaNet if the primary model fails
const response = await runtime.useModel(ModelType.TEXT_SMALL, {
  prompt: 'Hello, world!',
  maxTokens: 100,
  temperature: 0.7,
});
```

### Text Generation Example

```typescript
const textResponse = await runtime.useModel(ModelType.TEXT_LARGE, {
  messages: [
    { role: 'user', content: 'What is the capital of France?' }
  ],
  maxTokens: 100,
  temperature: 0.7,
});
```

### Embedding Generation Example

```typescript
const embedding = await runtime.useModel(ModelType.TEXT_EMBEDDING, {
  text: 'This is text to embed',
});
```

### Image Generation Example

```typescript
const imageUrl = await runtime.useModel(ModelType.IMAGE, {
  prompt: 'A beautiful sunset over mountains',
  size: '1024x1024',
  quality: 'standard',
});
```

## 🧪 Testing the POC

Run the provided test script to see the fallback mechanism in action:

```bash
# Install dependencies
bun install

# Run the POC demonstration
bun run elizanet-fallback-poc.ts
```

The test script demonstrates:
1. Rate limiting fallback
2. Network error fallback
3. Working model (no fallback needed)
4. Fallback disabled scenario

## 📊 Monitoring & Logging

### Fallback Events

The system logs detailed information about fallback usage:

```typescript
// Fallback attempt
this.logger.warn('[useModel] Primary model failed with Rate limit exceeded. Attempting fallback to ElizaNet LiteLLM...');

// Fallback success
this.logger.info('[useModel] Successfully fell back to ElizaNet LiteLLM for text_small (took 1,234ms)');

// Fallback failure
this.logger.error('[useModel] ElizaNet fallback also failed: Network timeout');
```

### Database Logging

Fallback usage is logged to the database with provider marked as `elizanet-fallback`:

```typescript
{
  type: 'useModel:text_small:fallback',
  provider: 'elizanet-fallback',
  fallbackReason: 'Rate limit exceeded',
  executionTime: 1234,
  // ... other fields
}
```

## 🔄 API Compatibility

The ElizaNet LiteLLM instance is expected to be compatible with OpenAI's API format:

### Text Generation
- **Endpoint**: `/v1/chat/completions`
- **Method**: POST
- **Format**: OpenAI Chat Completions API

### Embeddings
- **Endpoint**: `/v1/embeddings`
- **Method**: POST
- **Format**: OpenAI Embeddings API

### Image Generation
- **Endpoint**: `/v1/images/generations`
- **Method**: POST
- **Format**: OpenAI Images API

## 🛠️ Customization

### Adding Custom Error Detection

To add custom error detection logic, modify the `shouldFallbackToElizaNet()` method:

```typescript
private shouldFallbackToElizaNet(error: any): boolean {
  // ... existing logic
  
  // Add custom error detection
  if (error.code === 'CUSTOM_ERROR_CODE') {
    return true;
  }
  
  return false;
}
```

### Custom Fallback Endpoints

To use different endpoints for different model types, modify the `fallbackToElizaNet()` method:

```typescript
private async fallbackToElizaNet(modelKey: string, params: any): Promise<any> {
  const baseUrl = this.getSetting('ELIZANET_BASE_URL') || 'http://elizanet.up.railway.app';
  
  // Custom endpoints for different model types
  if (modelKey === 'custom_model_type') {
    return await this.customFallbackHandler(baseUrl, params);
  }
  
  // ... existing logic
}
```

## 🔐 Security Considerations

1. **API Keys**: Store API keys securely in character secrets, not in plain text
2. **Rate Limiting**: The fallback itself should be rate-limited to prevent abuse
3. **Validation**: Validate all responses from the fallback API
4. **Logging**: Be careful not to log sensitive information in debug logs

## 🚧 Limitations

1. **Model Compatibility**: Only supports OpenAI-compatible APIs
2. **Error Handling**: Limited to predefined error patterns
3. **Timeout**: Fixed timeout for all requests (configurable)
4. **Authentication**: Only supports Bearer token authentication

## 🎯 Future Enhancements

1. **Plugin Architecture**: Convert to a plugin for easier installation
2. **Multiple Fallbacks**: Support chaining multiple fallback providers
3. **Circuit Breaker**: Implement circuit breaker pattern for failed endpoints
4. **Metrics**: Add detailed metrics and monitoring
5. **Caching**: Cache responses to reduce API calls

## 📝 Contributing

To contribute to this POC:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This POC is part of the ElizaOS project and follows the same license terms.