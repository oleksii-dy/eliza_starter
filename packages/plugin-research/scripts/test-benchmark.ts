#!/usr/bin/env bun
/**
 * Test script for DeepResearch benchmark
 */

import { ResearchService } from './src/service';
import { deepResearchBenchmark } from './src/benchmark/deepresearch-benchmark';
import { elizaLogger, IAgentRuntime, ModelType } from '@elizaos/core';
import { ResearchConfig, ResearchDomain, ResearchDepth } from './src/types';

// Create a mock runtime for testing
const createMockRuntime = (): IAgentRuntime => {
  return {
    agentId: 'test-agent',
    character: {
      name: 'TestAgent',
      bio: ['Test bio'],
      system: 'Test system prompt',
      clients: [],
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
In summary, the research demonstrates...`
        };
      }
      
      return { content: 'Mock response for: ' + lastMessage?.content?.substring(0, 100) };
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
    logger: elizaLogger,
  } as unknown as IAgentRuntime;
};

async function testBenchmark() {
  elizaLogger.info('Starting DeepResearch benchmark test...');
  
  try {
    // Check benchmark setup
    const setupResult = await deepResearchBenchmark.checkSetup();
    if (!setupResult.success) {
      elizaLogger.error('Benchmark setup check failed:', setupResult.error);
      
      // Try to install dependencies
      elizaLogger.info('Attempting to install benchmark dependencies...');
      const installed = await deepResearchBenchmark.setupBenchmark();
      if (!installed) {
        throw new Error('Failed to install benchmark dependencies');
      }
    } else {
      elizaLogger.info('Benchmark setup OK:', setupResult);
    }
    
    // Create runtime and service
    const runtime = createMockRuntime();
    const researchService = new ResearchService(runtime);
    
    // Test query
    const testQuery = "Research the latest advancements in quantum error correction codes and their implications for building scalable quantum computers";
    
    elizaLogger.info(`Creating research project for: "${testQuery}"`);
    
    // Create research project with high quality settings
    const project = await researchService.createResearchProject(testQuery, {
      researchDepth: ResearchDepth.PHD_LEVEL,
      domain: ResearchDomain.PHYSICS,
      maxSearchResults: 50,
      evaluationEnabled: true,
    });
    
    elizaLogger.info(`Research project created: ${project.id}`);
    
    // Wait for research to complete
    let completed = false;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max
    
    while (!completed && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5 seconds
      
      const updatedProject = await researchService.getProject(project.id);
      if (updatedProject) {
        elizaLogger.info(`Project status: ${updatedProject.status} (phase: ${updatedProject.phase})`);
        
        if (updatedProject.status === 'completed' && updatedProject.report) {
          completed = true;
          
          elizaLogger.info('Research completed! Running benchmark evaluation...');
          
          try {
            // Run the benchmark evaluation
            const benchmarkResult = await deepResearchBenchmark.evaluateProject(updatedProject);
            
            elizaLogger.info('=== BENCHMARK RESULTS ===');
            elizaLogger.info(`Comprehensiveness: ${benchmarkResult.comprehensiveness}`);
            elizaLogger.info(`Insight: ${benchmarkResult.insight}`);
            elizaLogger.info(`Instruction Following: ${benchmarkResult.instructionFollowing}`);
            elizaLogger.info(`Readability: ${benchmarkResult.readability}`);
            elizaLogger.info(`Overall Score: ${benchmarkResult.overallScore}`);
            
            // Export the report
            const exportPath = `./benchmark_results/benchmark_${project.id}.json`;
            const exported = await researchService.exportProject(project.id, 'deepresearch');
            await fs.writeFile(exportPath, exported);
            elizaLogger.info(`Report exported to: ${exportPath}`);
            
          } catch (benchError) {
            elizaLogger.error('Benchmark evaluation failed:', benchError);
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
    elizaLogger.error('Test failed:', error);
    process.exit(1);
  }
}

// Import fs at the top
import * as fs from 'fs/promises';

// Run the test
testBenchmark().then(() => {
  elizaLogger.info('Test completed successfully!');
  process.exit(0);
}).catch(error => {
  elizaLogger.error('Test failed:', error);
  process.exit(1);
}); 