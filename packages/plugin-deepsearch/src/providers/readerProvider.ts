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
    if (!url) {
      logger.warn('firecrawlReader: No URL provided in memory.content.text');
      return { text: '', data: { error: 'No URL provided' }, values: {} };
    }

    try {
      // Assuming 'scrape' was renamed to 'scrapeUrl' in the SDK
      const result = await firecrawl.scrapeUrl(url, { formats: ['markdown'] });

      // Check if the result is a successful ScrapeResponse by checking for the 'data' property
      if ('data' in result && result.data) {
        logger.debug(`firecrawl reader fetched content for ${url}`);
        // Ensure markdown exists on data, Firecrawl types suggest data could be generic or specific
        const markdownContent = (result.data as { markdown?: string }).markdown ?? '';
        return { text: markdownContent, data: result.data, values: {} };
      } else {
        // Handle ErrorResponse case
        const errorDetails = result as { error?: string; message?: string };
        logger.error('firecrawlReader: Failed to fetch content.', {
          url,
          error: errorDetails.error,
          message: errorDetails.message,
        });
        return {
          text: '',
          data: { error: errorDetails.error || 'Scrape failed', details: errorDetails.message },
          values: {},
        };
      }
    } catch (error) {
      logger.error('firecrawlReader: Exception during scrapeUrl call.', { url, error });
      return {
        text: '',
        data: { error: 'Exception during scrape', details: String(error) },
        values: {},
      };
    }
  },
};
