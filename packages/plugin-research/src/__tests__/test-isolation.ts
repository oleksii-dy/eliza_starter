/**
 * Test Isolation Utilities
 * Prevents tests from making real API calls and handles timeouts
 */

import { ResearchService } from '../service';
import {
  createTestRuntime,
  MockSearchProvider,
  MockContentExtractor,
} from './test-providers';

// Global test isolation flag
let isTestMode = false;

export function enableTestMode() {
  isTestMode = true;

  // Override search providers in test mode
  process.env.RESEARCH_MOCK_MODE = 'true';
  process.env.RESEARCH_TIMEOUT = '5000'; // 5 second timeout for tests

  console.log('🧪 Test mode enabled - using mock providers');
}

export function disableTestMode() {
  isTestMode = false;
  delete process.env.RESEARCH_MOCK_MODE;
  delete process.env.RESEARCH_TIMEOUT;

  console.log('🚀 Test mode disabled - using real providers');
}

export function createIsolatedResearchService() {
  const runtime = createTestRuntime({
    // Override specific settings for test isolation
    RESEARCH_MOCK_MODE: 'true',
    RESEARCH_TIMEOUT: '30000', // Minimum allowed timeout
    RESEARCH_MAX_RESULTS: '3', // Fewer results for faster tests
  });

  return new ResearchService(runtime);
}

// Mock provider registration
export function mockSearchProviders() {
  const originalProviders = (global as any).__RESEARCH_PROVIDERS__;

  // Install mock providers
  (global as any).__RESEARCH_PROVIDERS__ = {
    searchProviders: [new MockSearchProvider()],
    contentExtractors: [new MockContentExtractor()],
  };

  return () => {
    // Restore original providers
    (global as any).__RESEARCH_PROVIDERS__ = originalProviders;
  };
}

// Test wrapper that automatically handles isolation and timeouts
export function isolatedTest(
  testName: string,
  testFn: () => Promise<void>,
  timeout = 10000
) {
  return {
    name: testName,
    fn: async () => {
      enableTestMode();
      const restoreProviders = mockSearchProviders();

      try {
        // Wrap test with timeout
        await Promise.race([
          testFn(),
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(`Test "${testName}" timed out after ${timeout}ms`)
                ),
              timeout
            )
          ),
        ]);
      } finally {
        restoreProviders();
        disableTestMode();
      }
    },
  };
}

// Skip long-running E2E tests in CI or when API keys are missing
export function shouldSkipE2ETest(): boolean {
  const isCI = process.env.CI === 'true';
  const hasApiKeys = !!(
    process.env.TAVILY_API_KEY ||
    process.env.EXA_API_KEY ||
    process.env.SERPAPI_API_KEY ||
    process.env.SERPER_API_KEY
  );

  if (isCI && !hasApiKeys) {
    console.log('⏭️  Skipping E2E tests in CI without API keys');
    return true;
  }

  return false;
}

export { isTestMode };
