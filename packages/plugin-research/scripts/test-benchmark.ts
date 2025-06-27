#!/usr/bin/env bun
/**
 * Test script for DeepResearch benchmark
 */

import { ResearchService } from './src/service';
import { deepResearchBenchmark } from './src/benchmark/deepresearch-benchmark';
import { logger, IAgentRuntime, ModelType } from '@elizaos/core';
import { ResearchConfig, ResearchDomain, ResearchDepth } from './src/types';

// Create a mock runtime for testing
const createMockRuntime = (): IAgentRuntime => {
  return {
    agentId: 'test-agent',
    character: {
      name: 'TestAgent',
      bio: ['Test bio'],
      system: 'Test system prompt',
      plugins: ['research'],
    },

    // Mock OpenAI model calls
    useModel: async (modelType: string, params: any) => {
      const messages = params.messages || [];
      const lastMessage = messages[messages.length - 1];

      // Return realistic responses for benchmark
      if (lastMessage?.content?.includes('research')) {
        return {
          content: `Based on the search results, here is a comprehensive analysis of the topic.
          
## Overview
The research reveals several key insights about the topic...

## Key Findings
1. First major finding with supporting evidence
2. Second finding with detailed analysis
3. Third finding with implications

## Conclusion
In summary, the research demonstrates...`,
        };
      }

      return {
        content: `Mock response for: ${lastMessage?.content?.substring(0, 100)}`,
      };
    },

    // Other required methods
    getSetting: (key: string) => {
      const settings: Record<string, string> = {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
        FILE_LOGGING: 'true',
      };
      return settings[key];
    },

    getService: (name: string) => null,
    messageManager: {} as any,
    updateState: async () => true,
    composeState: async () => ({ values: {}, data: {}, text: '' }),
    db: {} as any,
    logger: logger,
  } as unknown as IAgentRuntime;
};

async function testBenchmark() {
  logger.info('Starting DeepResearch benchmark test...');

  try {
    // Check benchmark setup
    const setupResult = await deepResearchBenchmark.checkSetup();
    if (!setupResult.success) {
      logger.error('Benchmark setup check failed:', setupResult.error);

      // Try to install dependencies
      logger.info('Attempting to install benchmark dependencies...');
      const installed = await deepResearchBenchmark.setupBenchmark();
      if (!installed) {
        throw new Error('Failed to install benchmark dependencies');
      }
    } else {
      logger.info('Benchmark setup OK:', setupResult);
    }

    // Create runtime and service
    const runtime = createMockRuntime();
    const researchService = new ResearchService(runtime);

    // Test query
    const testQuery =
      'Research the latest advancements in quantum error correction codes and their implications for building scalable quantum computers';

    logger.info(`Creating research project for: "${testQuery}"`);

    // Create research project with high quality settings
    const project = await researchService.createResearchProject(testQuery, {
      researchDepth: ResearchDepth.PHD_LEVEL,
      domain: ResearchDomain.PHYSICS,
      maxSearchResults: 50,
      evaluationEnabled: true,
    });

    logger.info(`Research project created: ${project.id}`);

    // Wait for research to complete
    let completed = false;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max

    while (!completed && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Check every 5 seconds

      const updatedProject = await researchService.getProject(project.id);
      if (updatedProject) {
        logger.info(
          `Project status: ${updatedProject.status} (phase: ${updatedProject.phase})`
        );

        if (updatedProject.status === 'completed' && updatedProject.report) {
          completed = true;

          logger.info('Research completed! Running benchmark evaluation...');

          try {
            // Run the benchmark evaluation
            const benchmarkResult =
              await deepResearchBenchmark.evaluateProject(updatedProject);

            logger.info('=== BENCHMARK RESULTS ===');
            logger.info(
              `Comprehensiveness: ${benchmarkResult.comprehensiveness}`
            );
            logger.info(`Insight: ${benchmarkResult.insight}`);
            logger.info(
              `Instruction Following: ${benchmarkResult.instructionFollowing}`
            );
            logger.info(`Readability: ${benchmarkResult.readability}`);
            logger.info(`Overall Score: ${benchmarkResult.overallScore}`);

            // Export the report
            const exportPath = `./benchmark_results/benchmark_${project.id}.json`;
            const exported = await researchService.exportProject(
              project.id,
              'deepresearch'
            );
            await fs.writeFile(exportPath, exported);
            logger.info(`Report exported to: ${exportPath}`);
          } catch (benchError) {
            logger.error('Benchmark evaluation failed:', benchError);
          }
        } else if (updatedProject.status === 'failed') {
          throw new Error(`Research failed: ${updatedProject.error}`);
        }
      }

      attempts++;
    }

    if (!completed) {
      throw new Error('Research timed out after 5 minutes');
    }
  } catch (error) {
    logger.error('Test failed:', error);
    process.exit(1);
  }
}

// Import fs at the top
import * as fs from 'fs/promises';

// Run the test
testBenchmark()
  .then(() => {
    logger.info('Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Test failed:', error);
    process.exit(1);
  });
