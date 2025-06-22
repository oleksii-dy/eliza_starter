import { IAgentRuntime, elizaLogger } from '@elizaos/core';
import { SearchProvider, ContentExtractor } from './rate-limiter';
import { TavilySearchProvider } from './search-providers/tavily';
import { SerperSearchProvider } from './search-providers/serper';
import { AcademicSearchProvider } from './search-providers/academic';
import { FirecrawlContentExtractor, FirecrawlConfig } from './content-extractors/firecrawl';
import { PlaywrightContentExtractor } from './content-extractors/playwright';
import { CachedSearchProvider } from './cache';
import { RateLimitedSearchProvider } from './rate-limiter';
import { ExaSearchProvider } from './search-providers/exa';
import { SerpAPISearchProvider } from './search-providers/serpapi';
import { StagehandGoogleSearchProvider } from './search-providers/stagehand-google';
import { PyPISearchProvider } from './search-providers/pypi';
import { NPMSearchProvider } from './search-providers/npm';

export type { SearchProvider, ContentExtractor };

// Wrapper to make FirecrawlContentExtractor compatible with ContentExtractor interface
class FirecrawlWrapper implements ContentExtractor {
  private extractor: FirecrawlContentExtractor;
  
  constructor(apiKey: string) {
    const config: FirecrawlConfig = { apiKey };
    this.extractor = new FirecrawlContentExtractor(config);
  }
  
  async extractContent(url: string): Promise<{ content: string; metadata?: any }> {
    const result = await this.extractor.extractContent(url);
    if (!result) {
      return { content: '', metadata: {} };
    }
    return result;
  }
}

// Wrapper to make PlaywrightContentExtractor compatible with ContentExtractor interface
class PlaywrightWrapper implements ContentExtractor {
  private extractor: PlaywrightContentExtractor;
  
  constructor() {
    this.extractor = new PlaywrightContentExtractor();
  }
  
  async extractContent(url: string): Promise<{ content: string; metadata?: any }> {
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
  
  constructor() {
    this.provider = new PyPISearchProvider();
  }
  
  async search(query: string, maxResults?: number): Promise<any[]> {
    return this.provider.search(query, maxResults);
  }
}

// Wrapper for NPM search provider
class NPMSearchWrapper implements SearchProvider {
  private provider: NPMSearchProvider;
  name = 'npm';
  
  constructor() {
    this.provider = new NPMSearchProvider();
  }
  
  async search(query: string, maxResults?: number): Promise<any[]> {
    return this.provider.search(query, maxResults);
  }
}

// Wrapper for GitHub search provider (uses existing GitHub plugin)
class GitHubSearchWrapper implements SearchProvider {
  name = 'github';
  
  constructor(private runtime: IAgentRuntime) {}
  
  async search(query: string, maxResults?: number): Promise<any[]> {
    try {
      const githubService = this.runtime.getService('github');
      if (!githubService) {
        elizaLogger.warn('GitHub service not available');
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
        results.push(...repos.items.map((repo: any) => ({
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
        })));
      }
      
      // Search issues if we have room for more results
      if (results.length < limit) {
        const issues = await (githubService as any).searchIssues(`${query} is:issue`, {
          sort: 'updated',
          per_page: Math.min(limit - results.length, 5),
        });
        
        if (issues?.items) {
          results.push(...issues.items.map((issue: any) => ({
            title: issue.title,
            url: issue.html_url,
            snippet: issue.body ? issue.body.substring(0, 200) + '...' : 'No description',
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
          })));
        }
      }
      
      return results.slice(0, limit);
    } catch (error) {
      elizaLogger.error('GitHub search error:', error);
      return [];
    }
  }
}

// StagehandContentExtractor - uses browserbase/stagehand for extraction
class StagehandContentExtractor implements ContentExtractor {
  constructor(private runtime: IAgentRuntime) {}
  
  async extractContent(url: string): Promise<{ content: string; title?: string; metadata?: any }> {
    try {
      const stagehandService = this.runtime.getService('stagehand');
      if (!stagehandService) {
        return { content: '', title: undefined, metadata: undefined };
      }
      
      // Cast to any to access custom methods
      const stagehand = stagehandService as any;
      const session = await stagehand.getCurrentSession?.() || 
                     await stagehand.createSession?.(`extract-${Date.now()}`);
      
      if (!session) {
        return { content: '', title: undefined, metadata: undefined };
      }
      
      await session.page.goto(url);
      await session.page.waitForLoadState('domcontentloaded');
      
      // Extract main content using AI
      const extracted = await session.stagehand.extract({
        instruction: 'Extract the main article content, title, and any important metadata. Exclude navigation, ads, and sidebars.',
        schema: {
          title: 'string',
          content: 'string',
          author: 'string?',
          publishDate: 'string?',
          description: 'string?'
        }
      });
      
      return {
        content: extracted.content || '',
        title: extracted.title,
        metadata: {
          author: extracted.author,
          publishDate: extracted.publishDate,
          description: extracted.description
        }
      };
    } catch (error) {
      elizaLogger.error('Stagehand content extraction error:', error);
      return { content: '', title: undefined, metadata: undefined };
    }
  }
}

export function createSearchProvider(type: string, runtime: any): SearchProvider {
  const apiKey = runtime.getSetting(`${type.toUpperCase()}_API_KEY`);

  switch (type) {
    case 'tavily':
      if (!apiKey) {
        throw new Error('TAVILY_API_KEY is required for Tavily search provider. Please configure this environment variable.');
      }
      return new TavilySearchProvider({ apiKey });

    case 'serper':
      if (!apiKey) {
        throw new Error('SERPER_API_KEY is required for Serper search provider. Please configure this environment variable.');
      }
      return new SerperSearchProvider({ apiKey });
      
    case 'exa':
      if (!apiKey) {
        throw new Error('EXA_API_KEY is required for Exa search provider. Please configure this environment variable.');
      }
      return new ExaSearchProvider({ apiKey });
      
    case 'serpapi':
      if (!apiKey) {
        throw new Error('SERPAPI_API_KEY is required for SerpAPI search provider. Please configure this environment variable.');
      }
      return new SerpAPISearchProvider({ apiKey });

    case 'academic':
      return new AcademicSearchProvider(runtime);
      
    case 'pypi':
      elizaLogger.info('Using PyPI search provider');
      return new PyPISearchWrapper();
      
    case 'npm':
      elizaLogger.info('Using NPM search provider');
      return new NPMSearchWrapper();
      
    case 'github':
      elizaLogger.info('Using GitHub search provider');
      return new GitHubSearchWrapper(runtime);

    case 'web':
    default:
      // PRIORITIZE TAVILY as requested - "use tavily for search!"
      // Try Tavily first and prioritize it heavily
      const tavilyKey = runtime.getSetting('TAVILY_API_KEY');
      if (tavilyKey) {
        elizaLogger.info('🎯 Using TAVILY as primary web search provider (user preference)');
        return new TavilySearchProvider({ 
          apiKey: tavilyKey,
          searchDepth: 'advanced',
          includeRawContent: true,
          maxResults: 50,
          includeAnswer: true
        });
      }
      
      // Fallback providers only if Tavily is not available
      const fallbackProviders = ['EXA', 'SERPAPI', 'SERPER'];
      for (const provider of fallbackProviders) {
        const key = runtime.getSetting(`${provider}_API_KEY`);
        if (key) {
          elizaLogger.warn(`⚠️ Using ${provider} as fallback (TAVILY_API_KEY not configured)`);
          switch (provider) {
            case 'EXA':
              return new ExaSearchProvider({ apiKey: key });
            case 'SERPAPI':
              return new SerpAPISearchProvider({ apiKey: key });
            case 'SERPER':
              return new SerperSearchProvider({ apiKey: key });
          }
        }
      }
      
      throw new Error('No web search provider configured. RECOMMENDED: Set TAVILY_API_KEY for optimal search results. Alternatives: EXA_API_KEY, SERPAPI_API_KEY, or SERPER_API_KEY.');
  }
}

// Enhanced content extractor with Tavily-first strategy
class RobustContentExtractor implements ContentExtractor {
  private extractors: ContentExtractor[] = [];
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
        elizaLogger.info('Added Stagehand content extractor for complex pages');
      }
    } catch (e) {
      // Service not available
    }
    
    // 2. Firecrawl (backup for when Tavily content is insufficient)
    const firecrawlKey = runtime.getSetting('FIRECRAWL_API_KEY');
    if (firecrawlKey) {
      this.extractors.push(new FirecrawlWrapper(firecrawlKey));
      elizaLogger.info('Added Firecrawl content extractor as backup');
    }
    
    // 3. Playwright (last resort - may get blocked)
    this.extractors.push(new PlaywrightWrapper());
    elizaLogger.info('Added Playwright content extractor as last resort');
  }
  
  async extractContent(url: string): Promise<{ content: string; title?: string; metadata?: any }> {
    const errors: Error[] = [];
    
    // STRATEGY: Prefer Tavily's built-in content when available
    // Only use additional extractors if Tavily content is insufficient
    elizaLogger.debug(`Content extraction requested for: ${url}`);
    elizaLogger.info('ℹ️ Note: Tavily search provider includes high-quality content via raw_content field');
    
    for (let i = 0; i < this.extractors.length; i++) {
      const extractor = this.extractors[i];
      const extractorName = extractor.constructor.name;
      
      try {
        elizaLogger.debug(`Attempting content extraction with ${extractorName} for: ${url}`);
        const result = await extractor.extractContent(url);
        
        // Validate result quality - more lenient for Tavily-first strategy
        if (result && result.content && result.content.trim().length > 50) {
          elizaLogger.info(`Successfully extracted content with ${extractorName} (${result.content.length} chars)`);
          
          // Add extraction metadata
          result.metadata = {
            ...result.metadata,
            extractorUsed: extractorName,
            extractionTime: Date.now(),
            contentLength: result.content.length,
            url: url,
            strategy: 'backup_extraction' // This is backup to Tavily
          };
          
          return result;
        } else {
          elizaLogger.warn(`${extractorName} returned insufficient content (${result?.content?.length || 0} chars)`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        elizaLogger.warn(`${extractorName} extraction failed for ${url}: ${errorMsg}`);
        errors.push(error instanceof Error ? error : new Error(errorMsg));
      }
    }
    
    // All extractors failed
    elizaLogger.error(`All content extractors failed for ${url}. Errors:`, errors.map(e => e.message));
    elizaLogger.info('💡 This is expected when Tavily already provides sufficient content via raw_content');
    
    // Return minimal result with error info
    return {
      content: `Content extraction via secondary extractors failed for ${url}. This is expected when Tavily search already provides sufficient content. Content may also be behind paywall, require authentication, or have anti-bot protection.`,
      title: undefined,
      metadata: {
        extractionFailed: true,
        url: url,
        errors: errors.map(e => e.message),
        extractionTime: Date.now(),
        note: 'Tavily search provider typically includes rich content via raw_content field'
      }
    };
  }
}

export function createContentExtractor(runtime: IAgentRuntime): ContentExtractor | null {
  return new RobustContentExtractor(runtime);
}

export function createAcademicSearchProvider(runtime: IAgentRuntime): SearchProvider {
  const semanticScholarKey = runtime.getSetting('SEMANTIC_SCHOLAR_API_KEY');
  elizaLogger.info('Using Academic search provider (Semantic Scholar, arXiv, CrossRef)');
  
  const provider = new AcademicSearchProvider({
    semanticScholarApiKey: semanticScholarKey,
    timeout: 30000,
  });
  
  // Wrap with rate limiting but SKIP caching to avoid cross-contamination issues
  const rateLimited = new RateLimitedSearchProvider(provider, {
    tokensPerInterval: 100, // Academic sources allow more requests
    interval: 'minute'
  });
  
  // DISABLED: Caching can cause cross-contamination between different research projects
  // return new CachedSearchProvider(rateLimited);
  return rateLimited;
} 