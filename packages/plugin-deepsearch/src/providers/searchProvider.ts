import type { Provider, IAgentRuntime, Memory } from '@elizaos/core';
import { logger } from '@elizaos/core';
import FirecrawlApp from '@mendable/firecrawl-js';

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY ?? '',
  apiUrl: process.env.FIRECRAWL_BASE_URL,
});

export const searchProvider: Provider = {
  name: 'firecrawlSearch',
  description: 'Search the web using Firecrawl',
  get: async (_runtime: IAgentRuntime, message: Memory) => {
    const query = message.content.text ?? '';
    const result = await firecrawl.search(query, {
      limit: 5,
      scrapeOptions: { formats: ['markdown'] },
    });
    logger.debug(`firecrawl search returned ${result.data.length} results`);
    return { text: JSON.stringify(result.data), data: result.data, values: {} };
  },
};
