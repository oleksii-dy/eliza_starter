/**
 * Fallback Authentication Service
 * Used when the elizaos-services plugin is not available
 */

import { logger } from '@elizaos/core';

export interface ApiKeyValidationResult {
  isValid: boolean;
  provider: string;
  keyType: 'production' | 'test' | 'invalid';
  capabilities: string[];
  errorMessage?: string;
  rateLimits?: {
    remaining: number;
    resetTime: Date;
  };
  usage?: {
    tokensUsed: number;
    costEstimate: number;
  };
}

export interface AuthStatus {
  overall: 'healthy' | 'degraded' | 'failed';
  providers: {
    [key: string]: ApiKeyValidationResult;
  };
  lastChecked: Date;
  capabilities: string[];
}

/**
 * Fallback Authentication Service
 * Provides basic API key validation when the full plugin is not available
 */
export class FallbackAuthService {
  private lastAuthStatus: AuthStatus | null = null;
  private validationCache = new Map<
    string,
    { result: ApiKeyValidationResult; timestamp: number }
  >();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Validate API key for a specific provider
   */
  async validateApiKey(provider: string, apiKey: string): Promise<ApiKeyValidationResult> {
    // Check cache first
    const cacheKey = `${provider}:${apiKey.substring(0, 10)}`;
    const cached = this.validationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }

    logger.debug(`Validating ${provider} API key with fallback service...`);

    // Check if it's a test key
    if (this.isTestKey(apiKey)) {
      const result: ApiKeyValidationResult = {
        isValid: true,
        provider,
        keyType: 'test',
        capabilities: this.getTestKeyCapabilities(provider),
      };
      this.validationCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    }

    // Basic API key validation
    try {
      const result = await this.performBasicKeyValidation(provider, apiKey);
      this.validationCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    } catch (error) {
      const result: ApiKeyValidationResult = {
        isValid: false,
        provider,
        keyType: 'invalid',
        capabilities: [],
        errorMessage: error instanceof Error ? error.message : 'Unknown validation error',
      };
      this.validationCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    }
  }

  /**
   * Get comprehensive authentication status for all providers
   */
  async getAuthStatus(): Promise<AuthStatus> {
    logger.debug('Checking authentication status with fallback service...');

    const providers: { [key: string]: ApiKeyValidationResult } = {};
    const capabilities: string[] = [];

    // Check all configured providers
    const providerConfigs = [
      { name: 'openai', envKey: 'OPENAI_API_KEY' },
      { name: 'groq', envKey: 'GROQ_API_KEY' },
      { name: 'anthropic', envKey: 'ANTHROPIC_API_KEY' },
    ];

    for (const config of providerConfigs) {
      const apiKey = process.env[config.envKey];

      if (apiKey) {
        const result = await this.validateApiKey(config.name, apiKey);
        providers[config.name] = result;

        if (result.isValid) {
          capabilities.push(...result.capabilities);
        }
      } else {
        providers[config.name] = {
          isValid: false,
          provider: config.name,
          keyType: 'invalid',
          capabilities: [],
          errorMessage: 'API key not configured',
        };
      }
    }

    // Determine overall status
    const validProviders = Object.values(providers).filter((p) => p.isValid);
    let overall: 'healthy' | 'degraded' | 'failed';

    if (validProviders.length === 0) {
      overall = 'failed';
    } else if (validProviders.length < Object.keys(providers).length) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    const status: AuthStatus = {
      overall,
      providers,
      lastChecked: new Date(),
      capabilities: [...new Set(capabilities)], // Remove duplicates
    };

    this.lastAuthStatus = status;
    return status;
  }

  /**
   * Test API functionality with basic implementation
   */
  async testApiFunctionality(provider: string): Promise<{
    success: boolean;
    response?: string;
    tokenUsage?: number;
    latency?: number;
    error?: string;
  }> {
    logger.debug(`Testing ${provider} API functionality with fallback service...`);

    const apiKey = this.getApiKey(provider);
    if (!apiKey) {
      return {
        success: false,
        error: 'API key not configured',
      };
    }

    const startTime = Date.now();

    try {
      // For test keys, return simulated response
      if (this.isTestKey(apiKey)) {
        return {
          success: true,
          response: `Hello from ${provider} test API! (Fallback service)`,
          tokenUsage: 15,
          latency: Date.now() - startTime,
        };
      }

      // Basic API test
      const result = await this.performBasicApiTest(provider, apiKey);
      return {
        success: true,
        response: result.response,
        tokenUsage: result.tokenUsage,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown test error',
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * Validate all configured providers and return detailed report
   */
  async validateAllProviders(): Promise<{
    overall: boolean;
    results: { [provider: string]: ApiKeyValidationResult };
    summary: string;
  }> {
    const status = await this.getAuthStatus();

    const validProviders = Object.values(status.providers).filter((p) => p.isValid).length;
    const totalProviders = Object.keys(status.providers).length;

    const summary =
      `${validProviders}/${totalProviders} providers configured correctly (fallback service). ` +
      `Available capabilities: ${status.capabilities.join(', ')}`;

    return {
      overall: status.overall !== 'failed',
      results: status.providers,
      summary,
    };
  }

  /**
   * Get the appropriate API key for a provider
   */
  private getApiKey(provider: string): string | null {
    const keyMap: { [key: string]: string } = {
      openai: 'OPENAI_API_KEY',
      groq: 'GROQ_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
    };

    const envKey = keyMap[provider];
    if (!envKey) {
      return null;
    }

    return process.env[envKey] || null;
  }

  /**
   * Check if an API key is a test key
   */
  private isTestKey(apiKey: string): boolean {
    return (
      apiKey.includes('test') || apiKey.includes('elizaos') || apiKey.includes('development-only')
    );
  }

  /**
   * Get capabilities for test keys
   */
  private getTestKeyCapabilities(provider: string): string[] {
    const capabilities: { [key: string]: string[] } = {
      openai: ['text_generation', 'embeddings', 'image_description'],
      groq: ['text_generation'],
      anthropic: ['text_generation', 'image_description'],
    };

    return capabilities[provider] || [];
  }

  /**
   * Perform basic API key validation (format check only)
   */
  private async performBasicKeyValidation(
    provider: string,
    apiKey: string
  ): Promise<ApiKeyValidationResult> {
    // Basic format validation
    let isValidFormat = false;

    switch (provider) {
      case 'openai':
        isValidFormat = apiKey.startsWith('sk-') && apiKey.length > 20;
        break;
      case 'groq':
        isValidFormat = apiKey.startsWith('gsk_') && apiKey.length > 20;
        break;
      case 'anthropic':
        isValidFormat = apiKey.startsWith('sk-ant-') && apiKey.length > 20;
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    if (isValidFormat) {
      logger.warn(
        `${provider} API key format is valid, but cannot test actual connectivity (fallback service)`
      );
      return {
        isValid: true,
        provider,
        keyType: 'production',
        capabilities: this.getTestKeyCapabilities(provider),
        errorMessage: 'Key format valid, but not tested (fallback service)',
      };
    } else {
      return {
        isValid: false,
        provider,
        keyType: 'invalid',
        capabilities: [],
        errorMessage: `Invalid ${provider} API key format`,
      };
    }
  }

  /**
   * Perform basic API functionality test (fallback implementation)
   */
  private async performBasicApiTest(
    provider: string,
    apiKey: string
  ): Promise<{
    response: string;
    tokenUsage: number;
  }> {
    // Fallback service cannot test real APIs, return simulated response
    logger.warn(
      `Cannot test real ${provider} API in fallback mode (key: ${apiKey.substring(0, 8)}...). Use elizaos-services plugin for full testing.`
    );

    return {
      response: `Simulated response from ${provider} (fallback service - install elizaos-services plugin for real testing)`,
      tokenUsage: 10,
    };
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.validationCache.clear();
    this.lastAuthStatus = null;
  }

  /**
   * Get cached auth status (if available)
   */
  getCachedAuthStatus(): AuthStatus | null {
    return this.lastAuthStatus;
  }
}
