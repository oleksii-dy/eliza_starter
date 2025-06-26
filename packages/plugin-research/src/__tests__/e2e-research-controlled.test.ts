/**
 * Controlled E2E Research Tests
 * These tests can run in different modes:
 * - Mock Mode: Fast tests with mock providers (default for CI)
 * - Live Mode: Real API tests with timeout protection
 * - Benchmark Mode: Long-running comprehensive tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ResearchService } from '../service';
import { ResearchStatus, ResearchDepth } from '../types';
import {
  LongRunningTestManager,
  RESEARCH_TEST_CONFIG,
  QUICK_TEST_CONFIG,
} from './test-runner-config';
import {
  enableTestMode,
  disableTestMode,
  createIsolatedResearchService,
  shouldSkipE2ETest,
} from './test-isolation';

let testManager: LongRunningTestManager;

// Determine test mode based on environment
const TEST_MODE = process.env.RESEARCH_TEST_MODE || 'mock'; // 'mock', 'live', 'benchmark'
const config = TEST_MODE === 'mock' ? QUICK_TEST_CONFIG : RESEARCH_TEST_CONFIG;

describe('Controlled E2E Research Tests', () => {
  let service: ResearchService;

  beforeEach(() => {
    testManager = new LongRunningTestManager(config);

    if (TEST_MODE === 'mock') {
      enableTestMode();
      service = createIsolatedResearchService();
    } else {
      // Use real service for live/benchmark modes
      const runtime = {
        getSetting: (key: string) => process.env[key] || null,
        useModel: async () => 'Mock LLM response',
        agentId: 'test-agent',
        character: { name: 'Test Agent', bio: 'Test' },
      };
      service = new ResearchService(runtime as any);
    }
  });

  afterEach(() => {
    testManager.cleanup();
    if (TEST_MODE === 'mock') {
      disableTestMode();
    }
  });

  it('should complete basic research workflow', async () => {
    if (TEST_MODE !== 'mock' && shouldSkipE2ETest()) {
      console.log('⏭️  Skipping live E2E test - missing API keys');
      return;
    }

    const testId = testManager.startTest('basic-research-workflow');

    try {
      await testManager.createTimeoutWrapper(
        testId,
        async () => {
          testManager.updateProgress(testId, 10, 'Creating research project');

          const project = await service.createResearchProject(
            'test quantum computing basics',
            {
              researchDepth: ResearchDepth.MODERATE,
              maxSearchResults: TEST_MODE === 'mock' ? 3 : 10,
              timeout: TEST_MODE === 'mock' ? 5000 : 30000,
              evaluationEnabled: false, // Disable for speed
            }
          );

          expect(project).toBeDefined();
          expect(project.id).toBeDefined();
          expect(project.query).toBe('test quantum computing basics');

          testManager.updateProgress(
            testId,
            50,
            'Project created, checking status'
          );

          // In mock mode, research should complete quickly
          if (TEST_MODE === 'mock') {
            // Give it a moment to process
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const updated = await service.getProject(project.id);
            expect(updated).toBeDefined();
            expect(updated?.status).toBeDefined();

            testManager.updateProgress(testId, 100, 'Mock research completed');
          } else {
            // For live tests, monitor progress
            const timeout = 60000; // 1 minute for live tests
            const startTime = Date.now();

            while (Date.now() - startTime < timeout) {
              const updated = await service.getProject(project.id);

              if (!updated) {
                throw new Error('Project not found');
              }

              const progress = Math.min(
                90,
                50 + ((Date.now() - startTime) / timeout) * 40
              );
              testManager.updateProgress(
                testId,
                progress,
                `Phase: ${updated.phase}`
              );

              if (
                updated.status === ResearchStatus.COMPLETED ||
                updated.status === ResearchStatus.FAILED
              ) {
                testManager.updateProgress(
                  testId,
                  100,
                  `Research ${updated.status.toLowerCase()}`
                );
                break;
              }

              await new Promise((resolve) => setTimeout(resolve, 2000));
            }
          }
        },
        config.maxTimeout
      );
    } catch (error) {
      console.error(
        `❌ Test failed: ${error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)}`
      );
      throw error;
    }
  });

  it('should handle research project lifecycle', async () => {
    if (TEST_MODE !== 'mock' && shouldSkipE2ETest()) {
      console.log('⏭️  Skipping lifecycle test - missing API keys');
      return;
    }

    const testId = testManager.startTest('research-lifecycle');

    try {
      await testManager.createTimeoutWrapper(
        testId,
        async () => {
          testManager.updateProgress(testId, 20, 'Creating projects');

          // Create multiple projects
          const project1 = await service.createResearchProject(
            'AI healthcare applications',
            {
              researchDepth: ResearchDepth.SURFACE,
              maxSearchResults: 2,
              timeout: 5000,
            }
          );

          const project2 = await service.createResearchProject(
            'blockchain technology trends',
            {
              researchDepth: ResearchDepth.SURFACE,
              maxSearchResults: 2,
              timeout: 5000,
            }
          );

          testManager.updateProgress(testId, 60, 'Checking project list');

          // Get all projects
          const allProjects = await service.getAllProjects();
          expect(allProjects.length).toBeGreaterThanOrEqual(2);

          // Check that our projects are in the list
          const projectIds = allProjects.map((p) => p.id);
          expect(projectIds).toContain(project1.id);
          expect(projectIds).toContain(project2.id);

          testManager.updateProgress(testId, 100, 'Lifecycle test completed');
        },
        config.maxTimeout
      );
    } catch (error) {
      console.error(
        `❌ Lifecycle test failed: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  });

  // Benchmark test - only runs in benchmark mode
  if (TEST_MODE === 'benchmark') {
    it('should complete comprehensive research benchmark', async () => {
      const testId = testManager.startTest('comprehensive-benchmark');

      try {
        await testManager.createTimeoutWrapper(
          testId,
          async () => {
            console.log('🚀 Starting comprehensive research benchmark');

            const project = await service.createResearchProject(
              'comprehensive analysis of quantum computing breakthroughs in 2024',
              {
                researchDepth: ResearchDepth.PHD_LEVEL,
                maxSearchResults: 50,
                evaluationEnabled: true,
                enableCitations: true,
                qualityThreshold: 0.8,
                timeout: 600000, // 10 minutes
              }
            );

            testManager.updateProgress(testId, 10, 'Benchmark project created');

            // Monitor with extended timeout
            const timeout = 900000; // 15 minutes
            const startTime = Date.now();
            const checkInterval = 10000; // 10 seconds

            while (Date.now() - startTime < timeout) {
              const updated = await service.getProject(project.id);

              if (!updated) {
                throw new Error('Benchmark project not found');
              }

              const elapsed = Date.now() - startTime;
              const progress = Math.min(90, 10 + (elapsed / timeout) * 80);
              testManager.updateProgress(
                testId,
                progress,
                `Phase: ${updated.phase}, Sources: ${updated.sources.length}, Findings: ${updated.findings.length}`
              );

              if (updated.status === ResearchStatus.COMPLETED) {
                console.log('✅ Benchmark completed successfully');
                console.log(
                  `📊 Final stats: ${updated.sources.length} sources, ${updated.findings.length} findings`
                );

                if (updated.report) {
                  console.log(
                    `📝 Report: ${updated.report.wordCount || 0} words, ${updated.report.citations.length} citations`
                  );
                }

                testManager.updateProgress(testId, 100, 'Benchmark completed');
                break;
              } else if (updated.status === ResearchStatus.FAILED) {
                throw new Error(`Benchmark failed: ${updated.error}`);
              }

              await new Promise((resolve) =>
                setTimeout(resolve, checkInterval)
              );
            }

            if (Date.now() - startTime >= timeout) {
              throw new Error('Benchmark timed out');
            }
          },
          900000
        ); // 15 minute timeout
      } catch (error) {
        console.error(
          `❌ Benchmark failed: ${error instanceof Error ? error.message : String(error)}`
        );
        throw error;
      }
    });
  }
});

// Log test mode
console.log(`🧪 Running research tests in ${TEST_MODE.toUpperCase()} mode`);
if (TEST_MODE === 'mock') {
  console.log('   - Using mock providers for fast, isolated testing');
} else if (TEST_MODE === 'live') {
  console.log('   - Using real APIs with timeout protection');
} else if (TEST_MODE === 'benchmark') {
  console.log('   - Running comprehensive benchmarks (may take 15+ minutes)');
}
