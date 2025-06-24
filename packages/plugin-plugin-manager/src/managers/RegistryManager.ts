import { elizaLogger } from '@elizaos/core';
import type { IAgentRuntime } from '@elizaos/core';
import axios from 'axios';
import type {
  SearchOptions,
  PluginInfo,
  PublishMetadata,
  ValidationResult,
} from '../services/interfaces.ts';
import type { SearchResult, PluginSearchResult, PublishResult } from '../types.ts';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class RegistryManager {
  private runtime: IAgentRuntime;
  private searchCache = new Map<string, CacheEntry<SearchResult[]>>();
  private metadataCache = new Map<string, CacheEntry<PluginInfo>>();

  // Cache configuration
  private readonly SEARCH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly METADATA_CACHE_TTL = 60 * 60 * 1000; // 1 hour
  private readonly MAX_CACHE_SIZE = 1000;

  // Registry endpoints
  private readonly NPM_REGISTRY = 'https://registry.npmjs.org';
  private readonly NPM_SEARCH = 'https://registry.npmjs.org/-/v1/search';

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
  }

  async initialize(): Promise<void> {
    // Only log in non-test environments
    if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
      elizaLogger.info('[RegistryManager] Initialized');
    }
  }

  async cleanup(): Promise<void> {
    // Clear caches
    this.searchCache.clear();
    this.metadataCache.clear();
    // Only log in non-test environments
    if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
      elizaLogger.info('[RegistryManager] Cleaned up');
    }
  }

  async searchPlugins(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    // Input validation
    if (!query || query.trim().length < 2) {
      throw new Error('Search query must be at least 2 characters');
    }

    // Check cache first
    const cachedResults = this.getCachedResults(query);
    if (cachedResults) {
      elizaLogger.debug(`[RegistryManager] Cache hit for search query: ${query}`);
      return cachedResults;
    }

    try {
      const { limit = 20, offset = 0, sort = 'relevance' } = options;

      // Build search query
      const searchParams = new URLSearchParams({
        text: query,
        size: limit.toString(),
        from: offset.toString(),
        quality: '0.5',
        popularity: '0.5',
        maintenance: '0.5',
      });

      // Add keywords filter if provided
      if (options.filter?.keywords && options.filter.keywords.length > 0) {
        searchParams.append('keywords', options.filter.keywords.join(','));
      }

      // Make search request
      const response = await axios.get(this.NPM_SEARCH, {
        params: searchParams,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'ElizaOS-PluginManager/1.0',
        },
        timeout: 10000,
      });

      // Transform results
      const results: SearchResult[] = response.data.objects.map((obj: any) => ({
        plugin: {
          name: obj.package.name,
          description: obj.package.description || '',
          version: obj.package.version,
          keywords: obj.package.keywords || [],
          repository: obj.package.links?.repository,
        } as PluginSearchResult,
        score: obj.score.final,
        matchReasons: this.analyzeMatchReasons(query, obj.package),
      }));

      // Sort results if needed
      if (sort === 'downloads') {
        results.sort((a, b) => b.score - a.score);
      }

      // Cache results
      this.cacheSearchResults(query, results);

      return results;
    } catch (_error) {
      elizaLogger.error('[RegistryManager] Search failed:', );_error)
      throw _error;
    }
  }

  async getPluginInfo(pluginName: string, version?: string): Promise<PluginInfo> {
    // Validate plugin name
    if (!pluginName || !this.isValidPackageName(pluginName)) {
      throw new Error('Invalid plugin name');
    }

    const cacheKey = version ? `${pluginName}@${version}` : pluginName;

    // Check cache
    const cached = this.getFromCache(this.metadataCache, cacheKey);
    if (cached) {
      elizaLogger.debug(`[RegistryManager] Cache hit for metadata: ${cacheKey}`);
      return cached;
    }

    try {
      const url = `${this.NPM_REGISTRY}/${encodeURIComponent(pluginName)}`;

      const response = await axios.get(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'ElizaOS-PluginManager/1.0',
        },
        timeout: 10000,
      });

      const targetVersion =
        version ||
        response.data['dist-tags']?.latest ||
        Object.keys(response.data.versions).pop();
      const versionData = response.data.versions[targetVersion];

      if (!versionData) {
        throw new Error(`Version ${targetVersion} not found for ${pluginName}`);
      }

      const pluginInfo: PluginInfo = {
        name: versionData.name,
        version: versionData.version,
        description: versionData.description,
        author:
          typeof versionData.author === 'object'
            ? versionData.author
            : { name: versionData.author || 'Unknown' },
        repository: versionData.repository,
        dependencies: versionData.dependencies,
        peerDependencies: versionData.peerDependencies,
        keywords: versionData.keywords,
        license: versionData.license,
        dist: versionData.dist,
        time: response.data.time,
      };

      // Cache metadata
      this.addToCache(this.metadataCache, cacheKey, pluginInfo, this.METADATA_CACHE_TTL);

      return pluginInfo;
    } catch (_error) {
      elizaLogger.error('[RegistryManager] Failed to get plugin info:', );_error)
      throw _error;
    }
  }

  async publishPlugin(pluginPath: string, metadata: PublishMetadata): Promise<PublishResult> {
    // For now, return a simulated result
    // In production, this would interact with npm publish or a custom registry
    return {
      success: true,
      packageName: metadata.name || 'simulated-package',
      version: metadata.version,
      npmUrl: `https://npmjs.com/package/${metadata.name || 'simulated-package'}`,
      registryUrl: 'https://github.com/elizaos/registry/pulls/123',
    };
  }

  async validatePackage(packagePath: string): Promise<ValidationResult> {
    // Basic package validation
    try {
      const packageJsonPath = `${packagePath}/package.json`;
      const packageJson = await import(packageJsonPath);

      const errors: string[] = [];
      const warnings: string[] = [];
      const suggestions: string[] = [];

      if (!packageJson.name) {
        errors.push('Package name is required');
      }
      if (!packageJson.version) {
        errors.push('Package version is required');
      }
      if (!packageJson.main && !packageJson.exports) {
        warnings.push('No main entry point specified');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        suggestions,
      };
    } catch (_error) {
      return {
        valid: false,
        errors: [
          `Failed to validate package: ${_error instanceof Error ? _error.message : String(_error)}`,
        ],
        warnings: [],
        suggestions: ['Ensure package.json exists and is valid JSON'],
      };
    }
  }

  cacheSearchResults(query: string, results: SearchResult[]): void {
    this.addToCache(this.searchCache, query, results, this.SEARCH_CACHE_TTL);
  }

  getCachedResults(query: string): SearchResult[] | null {
    return this.getFromCache(this.searchCache, query);
  }

  // Cache management
  private addToCache<T>(
    cache: Map<string, CacheEntry<T>>,
    key: string,
    data: T,
    ttl: number
  ): void {
    // Implement LRU eviction if cache is too large
    if (cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = Array.from(cache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      )[0][0];
      cache.delete(oldestKey);
    }

    cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  private getFromCache<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
    const entry = cache.get(key);
    if (!entry) {return null;}

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      cache.delete(key);
      return null;
    }

    return entry.data;
  }

  // Helper methods
  private analyzeMatchReasons(query: string, pkg: any): string[] {
    const reasons: string[] = [];
    const queryLower = query.toLowerCase();

    if (pkg.name.toLowerCase().includes(queryLower)) {
      reasons.push('name_match');
    }

    if (pkg.description?.toLowerCase().includes(queryLower)) {
      reasons.push('description_match');
    }

    if (pkg.keywords?.some((k: string) => k.toLowerCase().includes(queryLower))) {
      reasons.push('keyword_match');
    }

    return reasons;
  }

  private isValidPackageName(name: string): boolean {
    // npm package name validation
    return /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name);
  }

  // Clear all caches
  clearCache(): void {
    this.searchCache.clear();
    this.metadataCache.clear();
  }
}
