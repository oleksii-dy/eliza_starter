import { describe, it, expect, vi } from 'vitest';

vi.mock('@mendable/firecrawl-js', () => {
  return {
    default: class {
      async search() {
        return { data: [{ url: 'https://example.com', markdown: 'Example content' }] };
      }
      async scrape() {
        return { data: { markdown: 'Example page' } };
      }
    },
  };
});

import { DeepSearchService } from '../src/services/deepSearchService';
import type { IAgentRuntime } from '@elizaos/core';

describe('DeepSearchService', () => {
  it('returns an answer', async () => {
    const runtime: IAgentRuntime = {
      useModel: async () => 'mock output',
      getConfig: () => ({}),
      getSetting: () => null,
    } as any;

    const service = new DeepSearchService(runtime, {
      search_provider: 'firecrawl',
      token_budget: 16000,
      max_iterations: 1,
    });

    const result = await service.ask('test', { depth: 1, breadth: 1 }, () => {});
    expect(result.answer).toBeDefined();
  });
});
