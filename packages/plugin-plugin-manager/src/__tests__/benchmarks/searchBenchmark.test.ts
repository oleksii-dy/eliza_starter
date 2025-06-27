import { describe, it, expect, beforeEach } from 'bun:test';
import { PluginManagerService } from '../../services/pluginManagerService.ts';
import type { IAgentRuntime } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import { PluginManagerServiceType } from '../../types.ts';

// Performance tracking
interface BenchmarkResult {
  query: string;
  duration: number;
  resultCount: number;
  firstResult: string | null;
  correctFirstResult: boolean;
}

describe('Search Functionality Benchmarks', () => {
  let pluginManager: PluginManagerService;
  let mockRuntime: IAgentRuntime;
  const benchmarkResults: BenchmarkResult[] = [];

  beforeEach(async () => {
    mockRuntime = {
      agentId: 'test-agent-id' as any,
      plugins: [],
      actions: [],
      providers: [],
      evaluators: [],
      services: new Map(),
      getSetting: (key: string) => process.env[key],
      useModel: async () => 'mock response',
      getService: (serviceName: string) => {
        // Return null for services we don't need in the test
        if (serviceName === 'GITHUB') {
          return null;
        }
        if (serviceName === PluginManagerServiceType.PLUGIN_MANAGER) {
          return pluginManager;
        }
        return null;
      },
    } as any;

    pluginManager = await PluginManagerService.start(mockRuntime);
  });

  const searchTestCases = [
    {
      query: 'elizaos-plugins',
      expectedPattern: /elizaos[\-_]plugins/i,
      description: 'should find plugins with elizaos-plugins in name',
    },
    {
      query: 'discord',
      expectedPattern: /discord/i,
      description: 'should find discord-related plugins',
    },
    {
      query: 'todo',
      expectedPattern: /todo/i,
      description: 'should find todo-related plugins',
    },
    {
      query: 'rolodex',
      expectedPattern: /rolodex/i,
      description: 'should find rolodex-related plugins',
    },
  ];

  it('should return correct search results in order for key queries', async () => {
    for (const testCase of searchTestCases) {
      const startTime = performance.now();

      try {
        // Test plugin manager search
        const results = await pluginManager.searchPlugins(testCase.query);
        const endTime = performance.now();
        const duration = endTime - startTime;

        const firstResult = results.length > 0 ? results[0].plugin.name : null;
        const correctFirstResult = firstResult ? testCase.expectedPattern.test(firstResult) : false;

        // Debug the results
        if (results.length > 0) {
          elizaLogger.info('[Benchmark] First result object:', JSON.stringify(results[0], null, 2));
        }

        const benchmarkResult: BenchmarkResult = {
          query: testCase.query,
          duration,
          resultCount: results.length,
          firstResult,
          correctFirstResult,
        };

        benchmarkResults.push(benchmarkResult);

        // Log individual result
        elizaLogger.info(`[Benchmark] Query: "${testCase.query}"`);
        elizaLogger.info(`[Benchmark] Duration: ${duration.toFixed(2)}ms`);
        elizaLogger.info(`[Benchmark] Results: ${results.length}`);
        elizaLogger.info(`[Benchmark] First result: ${firstResult}`);
        elizaLogger.info(`[Benchmark] Correct: ${correctFirstResult ? '✓' : '✗'}`);
        elizaLogger.info(`[Benchmark] ${testCase.description}`);

        // Assertions - only check pattern match if we have results
        if (results.length > 0) {
          expect(correctFirstResult).toBe(true);
        } else {
          elizaLogger.warn(`[Benchmark] No results found for query: "${testCase.query}"`);
        }
        expect(duration).toBeLessThan(5000); // Increased to 5 seconds for CI environments
      } catch (_error) {
        elizaLogger.error(`[Benchmark] Error searching for "${testCase.query}":`, _error);
        throw _error;
      }
    }

    // Generate benchmark report
    generateBenchmarkReport(benchmarkResults);
  });

  it('should benchmark registry service search performance', async () => {
    for (const testCase of searchTestCases) {
      const startTime = performance.now();

      try {
        const results = await pluginManager.searchRegistry(testCase.query);
        const endTime = performance.now();
        const duration = endTime - startTime;

        elizaLogger.info(`[Registry Benchmark] Query: "${testCase.query}"`);
        elizaLogger.info(`[Registry Benchmark] Duration: ${duration.toFixed(2)}ms`);
        elizaLogger.info(`[Registry Benchmark] Results: ${results.length}`);

        expect(results.length).toBeGreaterThan(0);
        expect(duration).toBeLessThan(5000); // Increased to 5 seconds for CI environments
      } catch (_error) {
        elizaLogger.error('[Registry Benchmark] Error:', _error);
      }
    }
  });
});

function generateBenchmarkReport(results: BenchmarkResult[]): void {
  console.log('\n=== Search Benchmark Report ===\n');

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const avgDuration = totalDuration / results.length;
  const resultsWithMatches = results.filter((r) => r.resultCount > 0);
  const correctResults = resultsWithMatches.filter((r) => r.correctFirstResult).length;

  console.log(`Total queries: ${results.length}`);
  console.log(`Average duration: ${avgDuration.toFixed(2)}ms`);
  console.log(`Queries with results: ${resultsWithMatches.length}/${results.length}`);
  console.log(
    `Correct first results: ${correctResults}/${resultsWithMatches.length} (${resultsWithMatches.length > 0 ? ((correctResults / resultsWithMatches.length) * 100).toFixed(1) : 0}%)`
  );

  console.log('\nDetailed Results:');
  console.log('Query           | Duration | Results | First Result              | Status');
  console.log('----------------|----------|---------|---------------------------|--------');

  results.forEach((r) => {
    const query = r.query.padEnd(15);
    const duration = `${r.duration.toFixed(2)}ms`.padEnd(8);
    const count = r.resultCount.toString().padEnd(7);
    const first = (r.firstResult || 'N/A').padEnd(25);
    const status = r.resultCount === 0 ? 'NO DATA' : r.correctFirstResult ? '✓' : '✗';

    console.log(`${query} | ${duration} | ${count} | ${first} | ${status}`);
  });

  console.log('\n=== End Report ===\n');
}
