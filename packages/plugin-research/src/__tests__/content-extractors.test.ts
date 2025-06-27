import { describe, it, expect } from 'bun:test';
import { FirecrawlContentExtractor } from '../integrations/content-extractors/firecrawl';
import { PlaywrightContentExtractor } from '../integrations/content-extractors/playwright';

// Simplified TestSuite implementation for local use
class TestSuite {
  constructor(
    private name: string,
    private config: any
  ) {}

  addTest(test: any) {
    it(test.name, async () => {
      const context = this.config.beforeEach ? this.config.beforeEach() : {};
      await test.fn(context);
    });
  }

  run() {
    // No-op, bun:test handles execution
  }
}

const createUnitTest = (config: {
  name: string;
  fn: (context?: any) => Promise<void> | void;
}) => config;

describe('Content Extractors - Real Implementation Tests', () => {
  const contentExtractorSuite = new TestSuite(
    'Content Extractors - Real Implementation Tests',
    {}
  );

  contentExtractorSuite.addTest(
    createUnitTest({
      name: 'should initialize Firecrawl extractor',
      fn: () => {
        const extractor = new FirecrawlContentExtractor({
          apiKey: 'test-key',
          includeMarkdown: true,
        });
        expect(extractor).toBeDefined();
      },
    })
  );

  contentExtractorSuite.addTest(
    createUnitTest({
      name: 'should initialize Playwright extractor',
      fn: () => {
        const extractor = new PlaywrightContentExtractor();
        expect(extractor).toBeDefined();
      },
    })
  );

  contentExtractorSuite.addTest(
    createUnitTest({
      name: 'should handle missing API key for Firecrawl',
      fn: () => {
        expect(() => {
          new FirecrawlContentExtractor({
            apiKey: '',
          });
        }).toThrow('Firecrawl API key is required');
      },
    })
  );

  contentExtractorSuite.run();
});
