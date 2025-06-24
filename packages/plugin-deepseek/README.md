# @elizaos/plugin-deepseek

An ElizaOS plugin for integrating with DeepSeek AI models.

## Overview

This plugin allows ElizaOS agents to use language models provided by DeepSeek through their API. It supports text generation capabilities and can be configured to use different DeepSeek models.

## Features

-   Integration with DeepSeek's chat completion API.
-   Configurable API key, base URL, and default model.
-   Handles `ModelType.TEXT_SMALL` and `ModelType.TEXT_LARGE` requests (can be configured to use the same or different DeepSeek models).
-   Basic support for `ModelType.OBJECT_SMALL` by instructing the model to return JSON.

## Configuration

To use this plugin, you need to provide your DeepSeek API key. This can be done through environment variables or by passing configuration when initializing the plugin.

### Environment Variables

-   `DEEPSEEK_API_KEY` (Required): Your DeepSeek API key.
-   `DEEPSEEK_BASE_URL` (Optional): The base URL for the DeepSeek API. Defaults to `https://api.deepseek.com/v1`.
-   `DEEPSEEK_CHAT_MODEL` (Optional): The default chat model to use (e.g., `deepseek-chat`). Defaults to `deepseek-chat`.

### Plugin Configuration Object

When adding the plugin to an agent's character file or project, you can pass a configuration object:

```json
{
  "plugins": [
    {
      "name": "@elizaos/plugin-deepseek",
      "config": {
        "DEEPSEEK_API_KEY": "your_actual_api_key_here",
        "DEEPSEEK_BASE_URL": "https://your.custom.deepseek.endpoint/v1",
        "DEEPSEEK_CHAT_MODEL": "specific-deepseek-model-name"
      }
    }
    // ... other plugins
  ]
}
```

## Usage

Once configured, ElizaOS agents can use `runtime.useModel` with `ModelType.TEXT_SMALL` or `ModelType.TEXT_LARGE` (and `ModelType.OBJECT_SMALL`) to leverage DeepSeek models for text generation.

Example in an agent's action:

```typescript
import { ModelType, type IAgentRuntime, type Memory } from '@elizaos/core';

// ...
const responseText = await runtime.useModel(ModelType.TEXT_SMALL, {
  prompt: "Explain quantum computing in simple terms.",
  // maxTokens: 150, // Optional
  // temperature: 0.7, // Optional
});
// ...
```

## Development

### Build

```bash
bun run build
```

### Test

```bash
bun test
```

This will run unit tests located in `src/__tests__`.

---

*This plugin is maintained as part of the ElizaOS project.*
