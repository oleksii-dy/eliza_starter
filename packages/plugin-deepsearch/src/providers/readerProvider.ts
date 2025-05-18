import type { Provider, IAgentRuntime, Memory } from '@elizaos/core';
import { logger } from '@elizaos/core';
import FirecrawlApp from '@mendable/firecrawl-js';

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY ?? '',
  apiUrl: process.env.FIRECRAWL_BASE_URL,
});

export const readerProvider: Provider = {
  name: 'firecrawlReader',
  description: 'Fetch page content via Firecrawl',
  get: async (_runtime: IAgentRuntime, message: Memory) => {
    const url = message.content.text ?? '';
    const result = await firecrawl.scrape(url, { formats: ['markdown'] });
    logger.debug('firecrawl reader fetched content');
    return { text: result.data.markdown ?? '', data: result.data, values: {} };
  },
};
