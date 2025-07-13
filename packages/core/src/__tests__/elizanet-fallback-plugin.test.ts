import { describe, it, expect, beforeEach, afterEach, vi } from 'bun:test';
import { AgentRuntime } from '../runtime';
import { elizaNetFallbackPlugin } from '../elizanet-fallback-plugin';
import { ModelType } from '../types';
import { defaultCharacter } from '../test_resources/constants';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ElizaNet Fallback Plugin', () => {
  let runtime: AgentRuntime;

  beforeEach(() => {
    runtime = new AgentRuntime({
      character: defaultCharacter,
      plugins: [elizaNetFallbackPlugin],
    });
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Plugin Configuration', () => {
    it('should have correct plugin name and description', () => {
      expect(elizaNetFallbackPlugin.name).toBe('elizanet-fallback');
      expect(elizaNetFallbackPlugin.description).toContain('ElizaNet LiteLLM fallback');
    });

    it('should have correct priority', () => {
      expect(elizaNetFallbackPlugin.priority).toBe(-1);
    });

    it('should have all required model types', () => {
      expect(elizaNetFallbackPlugin.models).toHaveProperty(ModelType.TEXT_EMBEDDING);
      expect(elizaNetFallbackPlugin.models).toHaveProperty(ModelType.TEXT_SMALL);
      expect(elizaNetFallbackPlugin.models).toHaveProperty(ModelType.TEXT_LARGE);
      expect(elizaNetFallbackPlugin.models).toHaveProperty(ModelType.IMAGE);
      expect(elizaNetFallbackPlugin.models).toHaveProperty(ModelType.OBJECT_SMALL);
      expect(elizaNetFallbackPlugin.models).toHaveProperty(ModelType.OBJECT_LARGE);
    });

    it('should have configuration options', () => {
      const config = elizaNetFallbackPlugin.config;
      expect(config).toHaveProperty('ELIZANET_BASE_URL');
      expect(config).toHaveProperty('ELIZANET_API_KEY');
      expect(config).toHaveProperty('ELIZANET_TIMEOUT');
      expect(config).toHaveProperty('ELIZANET_SMALL_MODEL');
      expect(config).toHaveProperty('ELIZANET_LARGE_MODEL');
      expect(config).toHaveProperty('ELIZANET_EMBEDDING_MODEL');
      expect(config).toHaveProperty('ELIZANET_IMAGE_MODEL');
      expect(config).toHaveProperty('ELIZANET_FALLBACK_ENABLED');
    });
  });

  describe('Text Generation', () => {
    it('should generate text successfully', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Hello, world!' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const textHandler = elizaNetFallbackPlugin.models[ModelType.TEXT_SMALL];
      const result = await textHandler(runtime, { prompt: 'Hello' });

      expect(result).toBe('Hello, world!');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/chat/completions'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('"model"'),
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const textHandler = elizaNetFallbackPlugin.models[ModelType.TEXT_SMALL];
      
      await expect(textHandler(runtime, { prompt: 'Hello' })).rejects.toThrow(
        'ElizaNet API error: 500 Internal Server Error'
      );
    });

    it('should handle timeout errors', async () => {
      // Set a very short timeout
      runtime.setSetting('ELIZANET_TIMEOUT', '100');

      mockFetch.mockImplementationOnce(() => 
        new Promise((resolve) => setTimeout(resolve, 200))
      );

      const textHandler = elizaNetFallbackPlugin.models[ModelType.TEXT_SMALL];
      
      await expect(textHandler(runtime, { prompt: 'Hello' })).rejects.toThrow(
        'ElizaNet API timeout after 100ms'
      );
    });
  });

  describe('Text Embedding', () => {
    it('should generate embeddings successfully', async () => {
      const mockEmbedding = new Array(1536).fill(0).map(() => Math.random());
      const mockResponse = {
        data: [{ embedding: mockEmbedding }],
        usage: { prompt_tokens: 5, total_tokens: 5 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const embeddingHandler = elizaNetFallbackPlugin.models[ModelType.TEXT_EMBEDDING];
      const result = await embeddingHandler(runtime, 'Hello world');

      expect(result).toEqual(mockEmbedding);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/embeddings'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('"input":"Hello world"'),
        })
      );
    });

    it('should handle null input for embeddings', async () => {
      const embeddingHandler = elizaNetFallbackPlugin.models[ModelType.TEXT_EMBEDDING];
      const result = await embeddingHandler(runtime, null);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1536); // Default dimension
      expect(result[0]).toBe(0.1); // Test vector marker
    });

    it('should handle empty text input', async () => {
      const embeddingHandler = elizaNetFallbackPlugin.models[ModelType.TEXT_EMBEDDING];
      const result = await embeddingHandler(runtime, '');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1536); // Default dimension
      expect(result[0]).toBe(0.3); // Empty text marker
    });

    it('should handle embedding API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const embeddingHandler = elizaNetFallbackPlugin.models[ModelType.TEXT_EMBEDDING];
      const result = await embeddingHandler(runtime, 'Hello world');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1536); // Default dimension
      expect(result[0]).toBe(0.4); // Error marker
    });
  });

  describe('Image Generation', () => {
    it('should generate images successfully', async () => {
      const mockResponse = {
        data: [{ url: 'https://example.com/image.png' }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const imageHandler = elizaNetFallbackPlugin.models[ModelType.IMAGE];
      const result = await imageHandler(runtime, { prompt: 'A beautiful sunset' });

      expect(result).toEqual([{ url: 'https://example.com/image.png' }]);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/images/generations'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('"prompt":"A beautiful sunset"'),
        })
      );
    });

    it('should handle image generation API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      const imageHandler = elizaNetFallbackPlugin.models[ModelType.IMAGE];
      
      await expect(imageHandler(runtime, { prompt: 'Invalid prompt' })).rejects.toThrow(
        'ElizaNet Image API error: 400 Bad Request'
      );
    });
  });

  describe('Tokenization', () => {
    it('should tokenize text correctly', async () => {
      const tokenizeHandler = elizaNetFallbackPlugin.models[ModelType.TEXT_TOKENIZER_ENCODE];
      const result = await tokenizeHandler(runtime, { 
        prompt: 'Hello world', 
        modelType: ModelType.TEXT_SMALL 
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should detokenize text correctly', async () => {
      const tokenizeHandler = elizaNetFallbackPlugin.models[ModelType.TEXT_TOKENIZER_ENCODE];
      const detokenizeHandler = elizaNetFallbackPlugin.models[ModelType.TEXT_TOKENIZER_DECODE];
      
      const originalText = 'Hello world';
      const tokens = await tokenizeHandler(runtime, { 
        prompt: originalText, 
        modelType: ModelType.TEXT_SMALL 
      });
      
      const decodedText = await detokenizeHandler(runtime, { 
        tokens, 
        modelType: ModelType.TEXT_SMALL 
      });

      expect(decodedText).toBe(originalText);
    });
  });

  describe('Plugin Tests', () => {
    it('should have test definitions', () => {
      expect(elizaNetFallbackPlugin.tests).toBeDefined();
      expect(elizaNetFallbackPlugin.tests).toHaveLength(1);
      expect(elizaNetFallbackPlugin.tests[0].name).toBe('elizanet_fallback_plugin_tests');
      expect(elizaNetFallbackPlugin.tests[0].tests).toHaveLength(3);
    });

    it('should have connection test', () => {
      const connectionTest = elizaNetFallbackPlugin.tests[0].tests.find(
        (test) => test.name === 'elizanet_test_connection'
      );
      expect(connectionTest).toBeDefined();
      expect(typeof connectionTest.fn).toBe('function');
    });

    it('should have text generation test', () => {
      const textTest = elizaNetFallbackPlugin.tests[0].tests.find(
        (test) => test.name === 'elizanet_test_text_generation'
      );
      expect(textTest).toBeDefined();
      expect(typeof textTest.fn).toBe('function');
    });

    it('should have embedding test', () => {
      const embeddingTest = elizaNetFallbackPlugin.tests[0].tests.find(
        (test) => test.name === 'elizanet_test_embedding'
      );
      expect(embeddingTest).toBeDefined();
      expect(typeof embeddingTest.fn).toBe('function');
    });
  });

  describe('Configuration Settings', () => {
    it('should use default base URL when not configured', () => {
      // Mock getSetting to return undefined
      const getSetting = vi.spyOn(runtime, 'getSetting').mockReturnValue(undefined);
      
      // The plugin should use the default base URL
      expect(elizaNetFallbackPlugin.config.ELIZANET_BASE_URL).toBeUndefined();
      
      getSetting.mockRestore();
    });

    it('should handle custom configuration', () => {
      runtime.setSetting('ELIZANET_BASE_URL', 'https://custom.elizanet.com');
      runtime.setSetting('ELIZANET_API_KEY', 'custom-key');
      runtime.setSetting('ELIZANET_TIMEOUT', '60000');

      expect(runtime.getSetting('ELIZANET_BASE_URL')).toBe('https://custom.elizanet.com');
      expect(runtime.getSetting('ELIZANET_API_KEY')).toBe('custom-key');
      expect(runtime.getSetting('ELIZANET_TIMEOUT')).toBe('60000');
    });

    it('should handle fallback enabled/disabled setting', () => {
      runtime.setSetting('ELIZANET_FALLBACK_ENABLED', 'false');
      expect(runtime.getSetting('ELIZANET_FALLBACK_ENABLED')).toBe(false);

      runtime.setSetting('ELIZANET_FALLBACK_ENABLED', 'true');
      expect(runtime.getSetting('ELIZANET_FALLBACK_ENABLED')).toBe(true);
    });
  });
});