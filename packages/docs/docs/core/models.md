---
sidebar_position: 19
title: Model System
description: Complete guide to the ElizaOS model system for AI model integration and management
keywords: [models, AI, LLM, embeddings, transcription, text-to-speech, model providers]
---

# Model System

The ElizaOS Model System provides a unified interface for integrating and managing various AI models across different providers. It abstracts the complexity of working with multiple model types and providers, offering a consistent API for text generation, embeddings, image generation, audio processing, and more.

## Overview

The model system enables:

- **Provider-agnostic model access** through a unified interface
- **Dynamic model registration** by plugins
- **Automatic model selection** based on availability and priority
- **Type-safe model usage** with TypeScript
- **Built-in support** for major model categories

## Core Concepts

### Model Types

ElizaOS defines standard model types for common AI tasks:

```typescript
export const ModelType = {
  // Text Generation Models
  TEXT_SMALL: 'TEXT_SMALL', // Fast, lightweight responses
  TEXT_LARGE: 'TEXT_LARGE', // High-quality generation
  TEXT_REASONING_SMALL: 'REASONING_SMALL', // Reasoning-optimized
  TEXT_REASONING_LARGE: 'REASONING_LARGE', // Advanced reasoning
  TEXT_COMPLETION: 'TEXT_COMPLETION', // Code/text completion

  // Embedding Models
  TEXT_EMBEDDING: 'TEXT_EMBEDDING', // Text vectorization

  // Tokenization
  TEXT_TOKENIZER_ENCODE: 'TEXT_TOKENIZER_ENCODE', // Text to tokens
  TEXT_TOKENIZER_DECODE: 'TEXT_TOKENIZER_DECODE', // Tokens to text

  // Multimodal Models
  IMAGE: 'IMAGE', // Image generation
  IMAGE_DESCRIPTION: 'IMAGE_DESCRIPTION', // Image analysis
  TRANSCRIPTION: 'TRANSCRIPTION', // Speech-to-text
  TEXT_TO_SPEECH: 'TEXT_TO_SPEECH', // Text-to-speech

  // Object Generation
  OBJECT_SMALL: 'OBJECT_SMALL', // Structured data generation
  OBJECT_LARGE: 'OBJECT_LARGE', // Complex object generation

  // Audio/Video Processing
  AUDIO: 'AUDIO', // Audio processing
  VIDEO: 'VIDEO', // Video processing
} as const;
```

### Model Registration

Models are registered by plugins with handlers and priorities:

```typescript
// Model handler structure
export interface ModelHandler {
  // Function that executes the model
  handler: (runtime: IAgentRuntime, params: Record<string, unknown>) => Promise<unknown>;

  // Provider name (e.g., plugin name)
  provider: string;

  // Priority for selection (higher = preferred)
  priority?: number;
}
```

## Using Models

### Basic Usage

The `useModel` method provides unified access to all model types:

```typescript
// Text generation
const response = await runtime.useModel(ModelType.TEXT_LARGE, {
  prompt: 'Explain quantum computing in simple terms',
  temperature: 0.7,
  maxTokens: 500,
});

// Text embedding
const embedding = await runtime.useModel(ModelType.TEXT_EMBEDDING, {
  text: 'This is the text to embed',
});

// Image generation
const images = await runtime.useModel(ModelType.IMAGE, {
  prompt: 'A serene mountain landscape at sunset',
  size: '1024x1024',
  count: 1,
});
```

### Type-Safe Usage

Use TypeScript generics for type safety:

```typescript
// Type-safe model usage
const text = await runtime.useModel<ModelType.TEXT_LARGE, string>(ModelType.TEXT_LARGE, {
  prompt: 'Write a haiku about coding',
  temperature: 0.9,
});
// 'text' is typed as string

const embeddings = await runtime.useModel<ModelType.TEXT_EMBEDDING, number[]>(
  ModelType.TEXT_EMBEDDING,
  { text: 'Hello world' }
);
// 'embeddings' is typed as number[]
```

## Model Categories

### Text Generation Models

For generating human-like text responses:

```typescript
// Small model - Fast responses
const quickResponse = await runtime.useModel(ModelType.TEXT_SMALL, {
  prompt: 'Quick greeting for a user',
  temperature: 0.8,
  maxTokens: 50,
});

// Large model - Complex tasks
const detailedResponse = await runtime.useModel(ModelType.TEXT_LARGE, {
  prompt: 'Write a comprehensive guide about TypeScript generics',
  temperature: 0.7,
  maxTokens: 2000,
  stopSequences: ['---', '###'],
});

// Reasoning model - Analytical tasks
const analysis = await runtime.useModel(ModelType.TEXT_REASONING_LARGE, {
  prompt: 'Analyze the pros and cons of microservices architecture',
  temperature: 0.3, // Lower for more focused reasoning
  maxTokens: 1500,
});
```

### Embedding Models

For converting text to vector representations:

```typescript
// Single text embedding
const singleEmbedding = await runtime.useModel(ModelType.TEXT_EMBEDDING, {
  text: 'Machine learning is fascinating',
});

// Batch embeddings (provider-dependent)
const batchEmbeddings = await runtime.useModel(ModelType.TEXT_EMBEDDING, {
  texts: ['First document', 'Second document', 'Third document'],
});

// Using embeddings for similarity
const embedding1 = await runtime.useModel(ModelType.TEXT_EMBEDDING, {
  text: 'cats are cute',
});
const embedding2 = await runtime.useModel(ModelType.TEXT_EMBEDDING, {
  text: 'kittens are adorable',
});
const similarity = cosineSimilarity(embedding1, embedding2);
```

### Object Generation Models

For generating structured data:

```typescript
// Generate structured data with schema
const userData = await runtime.useModel(ModelType.OBJECT_LARGE, {
  prompt: 'Generate a user profile for a software developer',
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' },
      skills: {
        type: 'array',
        items: { type: 'string' },
      },
      experience: {
        type: 'object',
        properties: {
          years: { type: 'number' },
          companies: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    },
    required: ['name', 'skills'],
  },
});

// Generate enum values
const sentiment = await runtime.useModel(ModelType.OBJECT_SMALL, {
  prompt: "Analyze sentiment: 'This product exceeded my expectations!'",
  output: 'enum',
  enumValues: ['positive', 'negative', 'neutral'],
});
```

### Multimodal Models

For working with images, audio, and video:

```typescript
// Image generation
const artworks = await runtime.useModel(ModelType.IMAGE, {
  prompt: 'Abstract art representing artificial intelligence',
  size: '1024x1024',
  count: 3,
  style: 'digital art', // Provider-specific parameter
});

// Image description
const description = await runtime.useModel(ModelType.IMAGE_DESCRIPTION, {
  imageUrl: 'https://example.com/image.jpg',
  prompt: 'Describe this image in detail, focusing on the mood and composition',
});

// Audio transcription
const transcript = await runtime.useModel(ModelType.TRANSCRIPTION, {
  audioUrl: '/path/to/audio.mp3',
  prompt: 'Technical podcast about web development', // Helps with accuracy
});

// Text to speech
const audioBuffer = await runtime.useModel(ModelType.TEXT_TO_SPEECH, {
  text: 'Welcome to the ElizaOS documentation',
  voice: 'nova', // Provider-specific voice
  speed: 1.0,
});
```

### Tokenization Models

For working with token-level operations:

```typescript
// Encode text to tokens
const tokens = await runtime.useModel(ModelType.TEXT_TOKENIZER_ENCODE, {
  prompt: 'Hello, world!',
  modelType: ModelType.TEXT_LARGE, // Use same tokenizer as generation model
});
console.log(`Token count: ${tokens.length}`);

// Decode tokens back to text
const decodedText = await runtime.useModel(ModelType.TEXT_TOKENIZER_DECODE, {
  tokens: [15339, 11, 1917, 0],
  modelType: ModelType.TEXT_LARGE,
});
```

## Model Registration

### Registering Custom Models

Plugins can register model handlers:

```typescript
// In a plugin
export const myPlugin: Plugin = {
  name: 'my-ai-plugin',

  init: async (runtime: IAgentRuntime) => {
    // Register a text generation model
    runtime.registerModel(ModelType.TEXT_LARGE, {
      handler: async (runtime, params) => {
        const { prompt, temperature = 0.7, maxTokens = 1000 } = params as TextGenerationParams;

        // Call your AI provider
        const response = await myAIProvider.generate({
          prompt,
          temperature,
          max_tokens: maxTokens,
        });

        return response.text;
      },
      provider: 'my-ai-plugin',
      priority: 100, // Higher priority than default
    });

    // Register an embedding model
    runtime.registerModel(ModelType.TEXT_EMBEDDING, {
      handler: async (runtime, params) => {
        const { text } = params as TextEmbeddingParams;

        const embedding = await myAIProvider.embed(text);
        return embedding.vector;
      },
      provider: 'my-ai-plugin',
      priority: 90,
    });
  },
};
```

### Model Priority and Selection

When multiple providers register the same model type, the system selects based on:

1. **Availability**: Model must be registered
2. **Priority**: Higher priority preferred
3. **Registration order**: Earlier registration wins ties

```typescript
// Plugin A registers with priority 50
pluginA.registerModel(ModelType.TEXT_LARGE, {
  handler: handlerA,
  provider: 'plugin-a',
  priority: 50,
});

// Plugin B registers with priority 100
pluginB.registerModel(ModelType.TEXT_LARGE, {
  handler: handlerB,
  provider: 'plugin-b',
  priority: 100, // This will be selected
});

// Usage automatically selects plugin B's handler
const result = await runtime.useModel(ModelType.TEXT_LARGE, { prompt: 'Hello' });
```

## Advanced Patterns

### Model Fallbacks

Implement fallback strategies for reliability:

```typescript
async function generateWithFallback(runtime: IAgentRuntime, prompt: string): Promise<string> {
  try {
    // Try primary model
    return await runtime.useModel(ModelType.TEXT_REASONING_LARGE, {
      prompt,
      temperature: 0.7,
    });
  } catch (error) {
    console.warn('Primary model failed, trying fallback:', error);

    try {
      // Fall back to standard large model
      return await runtime.useModel(ModelType.TEXT_LARGE, {
        prompt,
        temperature: 0.7,
      });
    } catch (fallbackError) {
      console.warn('Large model failed, using small model:', fallbackError);

      // Final fallback to small model
      return await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
        temperature: 0.7,
        maxTokens: 500, // Limit tokens for small model
      });
    }
  }
}
```

### Model Chaining

Chain multiple models for complex tasks:

```typescript
async function analyzeAndSummarize(runtime: IAgentRuntime, imageUrl: string): Promise<string> {
  // Step 1: Describe the image
  const description = await runtime.useModel(ModelType.IMAGE_DESCRIPTION, {
    imageUrl,
    prompt: 'Describe this image in detail',
  });

  // Step 2: Extract key points using reasoning model
  const analysis = await runtime.useModel(ModelType.TEXT_REASONING_SMALL, {
    prompt: `Analyze this image description and extract key insights:\n\n${description.description}`,
    temperature: 0.3,
  });

  // Step 3: Generate a concise summary
  const summary = await runtime.useModel(ModelType.TEXT_SMALL, {
    prompt: `Summarize in one paragraph:\n\n${analysis}`,
    temperature: 0.5,
    maxTokens: 150,
  });

  return summary;
}
```

### Model Caching

Cache model results for performance:

```typescript
class ModelCache {
  private cache = new Map<string, { result: any; timestamp: number }>();
  private ttl = 3600000; // 1 hour

  async getCachedOrGenerate<T>(key: string, generator: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.result as T;
    }

    const result = await generator();
    this.cache.set(key, { result, timestamp: Date.now() });

    return result;
  }
}

// Usage
const cache = new ModelCache();
const embedding = await cache.getCachedOrGenerate(`embed:${text}`, () =>
  runtime.useModel(ModelType.TEXT_EMBEDDING, { text })
);
```

### Model Streaming

Some providers support streaming responses:

```typescript
// Note: Streaming support is provider-dependent
async function streamResponse(
  runtime: IAgentRuntime,
  prompt: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  const response = await runtime.useModel(ModelType.TEXT_LARGE, {
    prompt,
    stream: true, // Provider-specific
    onToken: onChunk, // Callback for each token
  });

  return response;
}

// Usage
let fullResponse = '';
await streamResponse(runtime, 'Tell me a story', (chunk) => {
  fullResponse += chunk;
  console.log('Received:', chunk);
});
```

## Best Practices

### 1. Use Appropriate Model Types

Choose the right model for the task:

```typescript
// ✅ Good - Task-appropriate models
const quickGreeting = await runtime.useModel(ModelType.TEXT_SMALL, {
  prompt: 'Say hello',
  maxTokens: 50,
});

const complexAnalysis = await runtime.useModel(ModelType.TEXT_REASONING_LARGE, {
  prompt: 'Analyze market trends...',
  temperature: 0.3,
});

// ❌ Bad - Overusing large models
const simpleResponse = await runtime.useModel(ModelType.TEXT_REASONING_LARGE, {
  prompt: "What's 2+2?", // Waste of resources
  maxTokens: 10,
});
```

### 2. Handle Model Errors

Always handle potential failures:

```typescript
async function safeModelCall(runtime: IAgentRuntime): Promise<string> {
  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, {
      prompt: 'Generate response',
    });
    return response;
  } catch (error) {
    if (error.code === 'MODEL_NOT_AVAILABLE') {
      return "I'm having trouble accessing my language model.";
    }
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      return "I'm receiving too many requests. Please try again later.";
    }

    console.error('Model error:', error);
    return 'I encountered an error processing your request.';
  }
}
```

### 3. Optimize Token Usage

Be mindful of token limits and costs:

```typescript
// Track token usage
const response = await runtime.useModel(ModelType.TEXT_LARGE, {
  prompt: longPrompt,
  maxTokens: 1000,
  stopSequences: ['\n\n', '---'], // Stop early if possible
});

// The MODEL_USED event provides token counts
runtime.on(EventType.MODEL_USED, (payload) => {
  console.log(`Tokens used: ${payload.tokens?.total}`);
  console.log(`Prompt tokens: ${payload.tokens?.prompt}`);
  console.log(`Completion tokens: ${payload.tokens?.completion}`);
});
```

### 4. Use Type Guards

Implement type guards for model results:

```typescript
// Type guard for image generation result
function isImageGenerationResult(result: unknown): result is { url: string }[] {
  return (
    Array.isArray(result) &&
    result.every(
      (item) => typeof item === 'object' && 'url' in item && typeof item.url === 'string'
    )
  );
}

// Safe usage
const result = await runtime.useModel(ModelType.IMAGE, {
  prompt: 'A cat',
});

if (isImageGenerationResult(result)) {
  result.forEach((image) => {
    console.log('Generated image:', image.url);
  });
} else {
  console.error('Unexpected result format');
}
```

## Performance Considerations

### Model Latency

Different models have different performance characteristics:

```typescript
// Measure model performance
async function measureModelPerformance(
  runtime: IAgentRuntime,
  modelType: ModelTypeName,
  params: any
): Promise<{ result: any; duration: number }> {
  const startTime = performance.now();

  const result = await runtime.useModel(modelType, params);

  const duration = performance.now() - startTime;

  console.log(`Model ${modelType} took ${duration}ms`);

  return { result, duration };
}
```

### Batching Requests

Batch operations when possible:

```typescript
// Instead of multiple individual calls
const embeddings = [];
for (const text of texts) {
  const embedding = await runtime.useModel(ModelType.TEXT_EMBEDDING, { text });
  embeddings.push(embedding);
}

// Batch if provider supports it
const batchEmbeddings = await runtime.useModel(ModelType.TEXT_EMBEDDING, {
  texts: texts, // Provider-dependent
});
```

### Resource Management

Monitor and manage model resource usage:

```typescript
class ModelResourceManager {
  private activeRequests = 0;
  private maxConcurrent = 5;

  async throttledModelCall<T>(call: () => Promise<T>): Promise<T> {
    while (this.activeRequests >= this.maxConcurrent) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.activeRequests++;
    try {
      return await call();
    } finally {
      this.activeRequests--;
    }
  }
}
```

## Integration Examples

### Custom Provider Integration

```typescript
export const customAIPlugin: Plugin = {
  name: 'custom-ai',

  init: async (runtime) => {
    // Initialize your AI client
    const client = new CustomAIClient({
      apiKey: runtime.getSetting('CUSTOM_AI_KEY'),
    });

    // Register multiple model types
    const models = [
      {
        type: ModelType.TEXT_LARGE,
        model: 'custom-large-v1',
        handler: client.generateText.bind(client),
      },
      {
        type: ModelType.TEXT_EMBEDDING,
        model: 'custom-embed-v1',
        handler: client.createEmbedding.bind(client),
      },
      {
        type: ModelType.IMAGE,
        model: 'custom-image-v1',
        handler: client.generateImage.bind(client),
      },
    ];

    for (const { type, model, handler } of models) {
      runtime.registerModel(type, {
        handler: async (runtime, params) => {
          return handler({ model, ...params });
        },
        provider: 'custom-ai',
        priority: 80,
      });
    }
  },
};
```

### Model Middleware

Add preprocessing or postprocessing:

```typescript
function withModelMiddleware(
  originalHandler: ModelHandler['handler'],
  middleware: {
    before?: (params: any) => any;
    after?: (result: any, params: any) => any;
  }
): ModelHandler['handler'] {
  return async (runtime, params) => {
    // Preprocess parameters
    const processedParams = middleware.before ? middleware.before(params) : params;

    // Call original handler
    const result = await originalHandler(runtime, processedParams);

    // Postprocess result
    return middleware.after ? middleware.after(result, processedParams) : result;
  };
}

// Usage
runtime.registerModel(ModelType.TEXT_LARGE, {
  handler: withModelMiddleware(originalHandler, {
    before: (params) => ({
      ...params,
      prompt: sanitizePrompt(params.prompt),
    }),
    after: (result) => {
      return filterInappropriateContent(result);
    },
  }),
  provider: 'filtered-ai',
  priority: 100,
});
```

## Summary

The ElizaOS Model System provides:

- **Unified interface** for all AI model types
- **Provider flexibility** through dynamic registration
- **Type safety** with TypeScript generics
- **Automatic selection** based on availability and priority
- **Extensible design** for custom model types

Key benefits:

- Write provider-agnostic code
- Easy model provider switching
- Consistent error handling
- Built-in usage tracking
- Support for emerging model types

The model system is fundamental to ElizaOS's AI capabilities, enabling agents to leverage the best available models for each task while maintaining clean, maintainable code.
