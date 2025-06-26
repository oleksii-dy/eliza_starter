/* eslint-disable @typescript-eslint/no-unused-vars */
import { IAgentRuntime, logger } from '@elizaos/core';
import { SearchProvider, ContentExtractor } from '../types';

// Compatibility interface for content extraction
interface CompatibleContentExtractor {
  extractContent(
    url: string
  ): Promise<{ content: string; title?: string; metadata?: any }>;
  name?: string;
}
import { TavilySearchProvider } from './search-providers/tavily';
import { SerperSearchProvider } from './search-providers/serper';
import { AcademicSearchProvider } from './search-providers/academic';
import {
  FirecrawlContentExtractor,
  FirecrawlConfig,
} from './content-extractors/firecrawl';
import { PlaywrightContentExtractor } from './content-extractors/playwright';
import { CachedSearchProvider } from './cache';
import { RateLimitedSearchProvider } from './rate-limiter';
import { ExaSearchProvider } from './search-providers/exa';
import { SerpAPISearchProvider } from './search-providers/serpapi';
import { StagehandGoogleSearchProvider } from './search-providers/stagehand-google';
import { PyPISearchProvider } from './search-providers/pypi';
import { NPMSearchProvider } from './search-providers/npm';

// Mock provider function for test mode
function createMockProvider(type: string): SearchProvider {
  return {
    name: `mock-${type}`,
    supportedDomains: ['*'],
    async search(query: string, options?: any): Promise<any[]> {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      return [
        {
          title: `Mock ${type} Result for: ${query}`,
          url: `https://mock-${type}.example.com/search/${encodeURIComponent(query)}`,
          snippet: `This is a mock search result from ${type} provider for the query: ${query}`,
          score: 0.95,
          publishedDate: new Date().toISOString(),
          domain: `mock-${type}.example.com`,
          provider: `mock-${type}`,
          metadata: {
            type: 'mock',
            provider: `mock-${type}`,
            mode: 'test',
          },
        },
      ];
    },
  };
}

// Mock content extractor function for test mode
function createMockContentExtractor(): CompatibleContentExtractor {
  return {
    name: 'mock-content-extractor',
    async extractContent(
      url: string
    ): Promise<{ content: string; metadata?: any }> {
      // Simulate content extraction delay
      await new Promise((resolve) => setTimeout(resolve, 50));

      return {
        content: `
# Mock Content for ${url}

This is mock content extracted from the URL. In a real scenario, this would contain the actual content from the webpage.

## Summary
The mock content provides representative data for testing purposes.

## Key Points
- Mock data point 1
- Mock data point 2  
- Mock data point 3

## Conclusion
This mock content serves as a representative example of what would be extracted from a real webpage.
        `.trim(),
        metadata: {
          title: `Mock Page Title for ${url}`,
          author: 'Mock Author',
          publishedDate: new Date().toISOString(),
          wordCount: 150,
          extractedBy: 'mock-extractor',
        },
      };
    },
  };
}

// Wrapper to make FirecrawlContentExtractor compatible with ContentExtractor interface
class FirecrawlWrapper implements CompatibleContentExtractor {
  name = 'firecrawl-content-extractor';
  private extractor: FirecrawlContentExtractor;

  constructor(apiKey: string) {
    const config: FirecrawlConfig = { apiKey };
    this.extractor = new FirecrawlContentExtractor(config);
  }

  async extractContent(
    url: string
  ): Promise<{ content: string; metadata?: any }> {
    const result = await this.extractor.extractContent(url);
    if (!result) {
      return { content: '', metadata: {} };
    }
    return result;
  }
}

// Wrapper to make PlaywrightContentExtractor compatible with ContentExtractor interface
class PlaywrightWrapper implements CompatibleContentExtractor {
  name = 'playwright-content-extractor';
  private extractor: PlaywrightContentExtractor;

  constructor() {
    this.extractor = new PlaywrightContentExtractor();
  }

  async extractContent(
    url: string
  ): Promise<{ content: string; metadata?: any }> {
    const result = await this.extractor.extractContent(url);
    if (!result) {
      return { content: '', metadata: {} };
    }
    return result;
  }
}

// Wrapper for PyPI search provider
class PyPISearchWrapper implements SearchProvider {
  private provider: PyPISearchProvider;
  name = 'pypi';
  supportedDomains = ['pypi.org'];

  constructor() {
    this.provider = new PyPISearchProvider();
  }

  async search(query: string, options?: any): Promise<any[]> {
    const maxResults = options?.maxResults;
    return this.provider.search(query, maxResults);
  }
}

// Wrapper for NPM search provider
class NPMSearchWrapper implements SearchProvider {
  private provider: NPMSearchProvider;
  name = 'npm';
  supportedDomains = ['npmjs.com'];

  constructor() {
    this.provider = new NPMSearchProvider();
  }

  async search(query: string, options?: any): Promise<any[]> {
    const maxResults = options?.maxResults;
    return this.provider.search(query, maxResults);
  }
}

// Wrapper for Tavily search provider
class TavilySearchWrapper implements SearchProvider {
  private provider: TavilySearchProvider;
  name = 'tavily';
  supportedDomains = ['*'];

  constructor(config: any) {
    this.provider = new TavilySearchProvider(config);
  }

  async search(query: string, options?: any): Promise<any[]> {
    return this.provider.search(query, options);
  }
}

// Wrapper for Serper search provider
class SerperSearchWrapper implements SearchProvider {
  private provider: SerperSearchProvider;
  name = 'serper';
  supportedDomains = ['*'];

  constructor(config: any) {
    this.provider = new SerperSearchProvider(config);
  }

  async search(query: string, options?: any): Promise<any[]> {
    return this.provider.search(query, options);
  }
}

// Wrapper for Exa search provider
class ExaSearchWrapper implements SearchProvider {
  private provider: ExaSearchProvider;
  name = 'exa';
  supportedDomains = ['*'];

  constructor(config: any) {
    this.provider = new ExaSearchProvider(config);
  }

  async search(query: string, options?: any): Promise<any[]> {
    return this.provider.search(query, options);
  }
}

// Wrapper for SerpAPI search provider
class SerpAPISearchWrapper implements SearchProvider {
  private provider: SerpAPISearchProvider;
  name = 'serpapi';
  supportedDomains = ['*'];

  constructor(config: any) {
    this.provider = new SerpAPISearchProvider(config);
  }

  async search(query: string, options?: any): Promise<any[]> {
    return this.provider.search(query, options);
  }
}

// Wrapper for Academic search provider
class AcademicSearchWrapper implements SearchProvider {
  private provider: AcademicSearchProvider;
  name = 'academic';
  supportedDomains = ['*'];

  constructor(config: any) {
    this.provider = new AcademicSearchProvider(config);
  }

  async search(query: string, options?: any): Promise<any[]> {
    return this.provider.search(query, options);
  }
}

// Wrapper for GitHub search provider (uses existing GitHub plugin)
class GitHubSearchWrapper implements SearchProvider {
  name = 'github';
  supportedDomains = ['github.com'];

  constructor(private runtime: IAgentRuntime) {}

  async search(query: string, options?: any): Promise<any[]> {
    const maxResults = options?.maxResults;
    try {
      const githubService = this.runtime.getService('github');
      if (!githubService) {
        logger.warn('GitHub service not available');
        return [];
      }

      const results: any[] = [];
      const limit = maxResults || 10;

      // Search repositories
      const repos = await (githubService as any).searchRepositories(query, {
        sort: 'stars',
        per_page: Math.min(limit, 5),
      });

      if (repos?.items) {
        results.push(
          ...repos.items.map((repo: any) => ({
            title: repo.full_name,
            url: repo.html_url,
            snippet: repo.description || 'No description',
            content: `${repo.description || ''}\nStars: ${repo.stargazers_count} | Language: ${repo.language || 'N/A'}`,
            score: Math.min(1.0, repo.stargazers_count / 10000), // Normalize by star count
            provider: 'github',
            metadata: {
              type: 'repository',
              language: repo.language,
              stars: repo.stargazers_count,
              forks: repo.forks_count,
              openIssues: repo.open_issues_count,
              updatedAt: repo.updated_at,
              owner: repo.owner?.login,
            },
          }))
        );
      }

      // Search issues if we have room for more results
      if (results.length < limit) {
        const issues = await (githubService as any).searchIssues(
          `${query} is:issue`,
          {
            sort: 'updated',
            per_page: Math.min(limit - results.length, 5),
          }
        );

        if (issues?.items) {
          results.push(
            ...issues.items.map((issue: any) => ({
              title: issue.title,
              url: issue.html_url,
              snippet: issue.body
                ? `${issue.body.substring(0, 200)}...`
                : 'No description',
              content: `${issue.title}\n${issue.body || ''}`,
              score: issue.comments / 50, // Normalize by comment count
              provider: 'github',
              metadata: {
                type: 'issue',
                state: issue.state,
                comments: issue.comments,
                author: issue.user?.login,
                createdAt: issue.created_at,
                updatedAt: issue.updated_at,
                number: issue.number,
              },
            }))
          );
        }
      }

      return results.slice(0, limit);
    } catch (error) {
      logger.error('GitHub search error:', error);
      return [];
    }
  }
}

// StagehandContentExtractor - uses browserbase/stagehand for extraction
class StagehandContentExtractor implements CompatibleContentExtractor {
  name = 'stagehand-content-extractor';
  constructor(private runtime: IAgentRuntime) {}

  async extractContent(
    url: string
  ): Promise<{ content: string; title?: string; metadata?: any }> {
    try {
      const stagehandService = this.runtime.getService('stagehand');
      if (!stagehandService) {
        return { content: '', title: undefined, metadata: undefined };
      }

      // Cast to any to access custom methods
      const stagehand = stagehandService as any;
      const session =
        (await stagehand.getCurrentSession?.()) ||
        (await stagehand.createSession?.(`extract-${Date.now()}`));

      if (!session) {
        return { content: '', title: undefined, metadata: undefined };
      }

      await session.page.goto(url);
      await session.page.waitForLoadState('domcontentloaded');

      // Extract main content using AI
      const extracted = await session.stagehand.extract({
        instruction:
          'Extract the main article content, title, and any important metadata. Exclude navigation, ads, and sidebars.',
        schema: {
          title: 'string',
          content: 'string',
          author: 'string?',
          publishDate: 'string?',
          description: 'string?',
        },
      });

      return {
        content: extracted.content || '',
        title: extracted.title,
        metadata: {
          author: extracted.author,
          publishDate: extracted.publishDate,
          description: extracted.description,
        },
      };
    } catch (error) {
      logger.error('Stagehand content extraction error:', error);
      return { content: '', title: undefined, metadata: undefined };
    }
  }
}

export function createSearchProvider(
  type: string,
  runtime: any
): SearchProvider {
  // In test mode, use mock providers instead of real API providers
  if (
    process.env.RESEARCH_MOCK_MODE === 'true' ||
    process.env.NODE_ENV === 'test'
  ) {
    logger.info(`[Factory] Using mock provider for ${type} in test mode`);
    return createMockProvider(type);
  }

  const apiKey = runtime.getSetting(`${type.toUpperCase()}_API_KEY`);

  switch (type) {
    case 'tavily':
      if (!apiKey) {
        throw new Error(
          'TAVILY_API_KEY is required for Tavily search provider. Please configure this environment variable.'
        );
      }
      return new TavilySearchWrapper({ apiKey });

    case 'serper':
      if (!apiKey) {
        throw new Error(
          'SERPER_API_KEY is required for Serper search provider. Please configure this environment variable.'
        );
      }
      return new SerperSearchWrapper({ apiKey });

    case 'exa':
      if (!apiKey) {
        throw new Error(
          'EXA_API_KEY is required for Exa search provider. Please configure this environment variable.'
        );
      }
      return new ExaSearchWrapper({ apiKey });

    case 'serpapi':
      if (!apiKey) {
        throw new Error(
          'SERPAPI_API_KEY is required for SerpAPI search provider. Please configure this environment variable.'
        );
      }
      return new SerpAPISearchWrapper({ apiKey });

    case 'academic':
      return new AcademicSearchWrapper(runtime);

    case 'pypi':
      logger.info('Using PyPI search provider');
      return new PyPISearchWrapper();

    case 'npm':
      logger.info('Using NPM search provider');
      return new NPMSearchWrapper();

    case 'github':
      logger.info('Using GitHub search provider');
      return new GitHubSearchWrapper(runtime);

    case 'web':
    default:
      // PRIORITIZE TAVILY as requested - "use tavily for search!"
      // Try Tavily first and prioritize it heavily
      const tavilyKey = runtime.getSetting('TAVILY_API_KEY');
      if (tavilyKey) {
        logger.info(
          '🎯 Using TAVILY as primary web search provider (user preference)'
        );
        return new TavilySearchWrapper({
          apiKey: tavilyKey,
          searchDepth: 'advanced',
          includeRawContent: true,
          maxResults: 50,
          includeAnswer: true,
        });
      }

      // Fallback providers only if Tavily is not available
      const fallbackProviders = ['EXA', 'SERPAPI', 'SERPER'];
      for (const provider of fallbackProviders) {
        const key = runtime.getSetting(`${provider}_API_KEY`);
        if (key) {
          logger.warn(
            `⚠️ Using ${provider} as fallback (TAVILY_API_KEY not configured)`
          );
          switch (provider) {
            case 'EXA':
              return new ExaSearchWrapper({ apiKey: key });
            case 'SERPAPI':
              return new SerpAPISearchWrapper({ apiKey: key });
            case 'SERPER':
              return new SerperSearchWrapper({ apiKey: key });
          }
        }
      }

      throw new Error(
        'No web search provider configured. RECOMMENDED: Set TAVILY_API_KEY for optimal search results. Alternatives: EXA_API_KEY, SERPAPI_API_KEY, or SERPER_API_KEY.'
      );
  }
}

// Enhanced content extractor with Tavily-first strategy
class RobustContentExtractor implements CompatibleContentExtractor {
  name = 'robust-content-extractor';
  private extractors: CompatibleContentExtractor[] = [];
  private runtime: IAgentRuntime;

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
    // Build priority list of extractors

    // NOTE: Tavily provides high-quality content directly via raw_content
    // We prioritize external extractors only when Tavily content is insufficient

    // 1. Stagehand/Browserbase (highest priority for complex pages)
    try {
      const stagehandService = runtime.getService('stagehand');
      if (stagehandService) {
        this.extractors.push(new StagehandContentExtractor(runtime));
        logger.info('Added Stagehand content extractor for complex pages');
      }
    } catch (e) {
      // Service not available
    }

    // 2. Firecrawl (backup for when Tavily content is insufficient)
    const firecrawlKey = runtime.getSetting('FIRECRAWL_API_KEY');
    if (firecrawlKey) {
      this.extractors.push(new FirecrawlWrapper(firecrawlKey));
      logger.info('Added Firecrawl content extractor as backup');
    }

    // 3. Playwright (last resort - may get blocked)
    this.extractors.push(new PlaywrightWrapper());
    logger.info('Added Playwright content extractor as last resort');
  }

  async extractContent(
    url: string
  ): Promise<{ content: string; title?: string; metadata?: any }> {
    const errors: Error[] = [];

    // STRATEGY: Prefer Tavily's built-in content when available
    // Only use additional extractors if Tavily content is insufficient
    logger.debug(`Content extraction requested for: ${url}`);
    logger.info(
      'ℹ️ Note: Tavily search provider includes high-quality content via raw_content field'
    );

    for (let i = 0; i < this.extractors.length; i++) {
      const extractor = this.extractors[i];
      const extractorName = extractor.constructor.name;

      try {
        logger.debug(
          `Attempting content extraction with ${extractorName} for: ${url}`
        );
        const result = await extractor.extractContent(url);

        // Validate result quality - more lenient for Tavily-first strategy
        if (result && result.content && result.content.trim().length > 50) {
          logger.info(
            `Successfully extracted content with ${extractorName} (${result.content.length} chars)`
          );

          // Add extraction metadata
          result.metadata = {
            ...result.metadata,
            extractorUsed: extractorName,
            extractionTime: Date.now(),
            contentLength: result.content.length,
            url,
            strategy: 'backup_extraction', // This is backup to Tavily
          };

          return result;
        } else {
          logger.warn(
            `${extractorName} returned insufficient content (${result?.content?.length || 0} chars)`
          );
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.warn(
          `${extractorName} extraction failed for ${url}: ${errorMsg}`
        );
        errors.push(error instanceof Error ? error : new Error(errorMsg));
      }
    }

    // All extractors failed
    logger.error(
      `All content extractors failed for ${url}. Errors:`,
      errors.map((e) => e.message)
    );
    logger.info(
      '💡 This is expected when Tavily already provides sufficient content via raw_content'
    );

    // Return minimal result with error info
    return {
      content: `Content extraction via secondary extractors failed for ${url}. This is expected when Tavily search already provides sufficient content. Content may also be behind paywall, require authentication, or have anti-bot protection.`,
      title: undefined,
      metadata: {
        extractionFailed: true,
        url,
        errors: errors.map((e) => e.message),
        extractionTime: Date.now(),
        note: 'Tavily search provider typically includes rich content via raw_content field',
      },
    };
  }
}

export function createContentExtractor(
  runtime: IAgentRuntime
): CompatibleContentExtractor | null {
  // In test mode, use mock content extractor
  if (
    process.env.RESEARCH_MOCK_MODE === 'true' ||
    process.env.NODE_ENV === 'test'
  ) {
    logger.info('[Factory] Using mock content extractor in test mode');
    return createMockContentExtractor();
  }

  return new RobustContentExtractor(runtime);
}

export function createAcademicSearchProvider(
  runtime: IAgentRuntime
): SearchProvider {
  // In test mode, use mock academic provider
  if (
    process.env.RESEARCH_MOCK_MODE === 'true' ||
    process.env.NODE_ENV === 'test'
  ) {
    logger.info('[Factory] Using mock academic provider in test mode');
    return createMockProvider('academic');
  }

  const semanticScholarKey = runtime.getSetting('SEMANTIC_SCHOLAR_API_KEY');
  logger.info(
    'Using Academic search provider (Semantic Scholar, arXiv, CrossRef)'
  );

  const provider = new AcademicSearchWrapper({
    semanticScholarApiKey: semanticScholarKey,
    timeout: 30000,
  });

  // Wrap with rate limiting but SKIP caching to avoid cross-contamination issues
  const rateLimited = new RateLimitedSearchProvider(provider, {
    tokensPerInterval: 100, // Academic sources allow more requests
    interval: 'minute',
  });

  // DISABLED: Caching can cause cross-contamination between different research projects
  // return new CachedSearchProvider(rateLimited);
  return rateLimited;
}
