import { describe, it, expect } from 'bun:test';
import { TogetherAIClient } from '../lib/together-client.js';
import { DatasetBuilder } from '../lib/dataset-builder.js';

describe('Simple Integration Tests', () => {
  it('should create TogetherAI client with API key', () => {
    const client = new TogetherAIClient('test-api-key');
    expect(client).toBeDefined();
  });

  it('should throw error without API key', () => {
    expect(() => new TogetherAIClient('')).toThrow('Together.ai API key is required');
  });

  it('should create dataset builder', () => {
    const builder = new DatasetBuilder('./test-data');
    expect(builder).toBeDefined();
  });

  it('should calculate correct token estimates', () => {
    const builder = new DatasetBuilder('./test-data');
    // @ts-expect-error - accessing private method for testing
    const tokens = builder.estimateTokens('Hello world!');
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(10);
  });

  it('should handle empty examples gracefully', async () => {
    const builder = new DatasetBuilder('./test-empty');
    await builder.loadExamples();

    const stats = builder.getStats();
    expect(stats.totalExamples).toBe(0);
    expect(stats.averageQuality).toBe(0);
    expect(stats.tokenCount).toBe(0);
  });
});
