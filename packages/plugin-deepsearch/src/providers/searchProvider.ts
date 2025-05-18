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
    if (!query) {
      logger.warn('firecrawlSearch: No query provided in memory.content.text');
      return { text: '', data: { error: 'No query provided' }, values: {} };
    }

    try {
      const result = await firecrawl.search(query, {
        limit: 5, // Default reasonable limit
        scrapeOptions: { formats: ['markdown'] }, // Get markdown if scraping results
      });

      // Check if the result is a successful SearchResponse by checking for 'data' property
      // Assuming 'data' is an array for successful search results
      if ('data' in result && Array.isArray(result.data)) {
        logger.debug(
          `firecrawl search returned ${result.data.length} results for query: "${query}"`
        );
        return { text: JSON.stringify(result.data), data: result.data, values: {} };
      } else {
        // Handle ErrorResponse case
        const errorDetails = result as { error?: string; message?: string };
        logger.error('firecrawlSearch: Failed to fetch search results.', {
          query,
          error: errorDetails.error,
          message: errorDetails.message,
        });
        return {
          text: '',
          data: { error: errorDetails.error || 'Search failed', details: errorDetails.message },
          values: {},
        };
      }
    } catch (error) {
      logger.error('firecrawlSearch: Exception during search call.', { query, error });
      return {
        text: '',
        data: { error: 'Exception during search', details: String(error) },
        values: {},
      };
    }
  },
};
