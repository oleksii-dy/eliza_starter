import { describe, it, expect, vi } from 'vitest';
import type { IAgentRuntime } from '@elizaos/core';
import rssPlugin, { rssInterestEvaluator } from '../src/index';

// Basic test to ensure plugin exports correctly

describe('rss plugin', () => {
  it('should expose a valid plugin object', () => {
    expect(rssPlugin).toHaveProperty('name', 'rss');
    expect(rssPlugin.services?.length).toBe(1);
    expect(rssPlugin.evaluators?.[0]).toBe(rssInterestEvaluator);
  });

  it('evaluator should validate rss memories', async () => {
    const memory = { content: { source: 'rss', text: 'Hello' } } as any;
    const result = await rssInterestEvaluator.validate({} as IAgentRuntime, memory);
    expect(result).toBe(true);
  });
});
