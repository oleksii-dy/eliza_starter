#!/usr/bin/env bun

import autocoderPlugin from '../src/index';
import { SWEBenchRunner } from '../src/swe-bench/swe-bench-runner.js';
import { elizaLogger, type IAgentRuntime } from '@elizaos/core';
import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const INSTANCE_ID = process.argv[2] || 'axios__axios-5919';
const SHORT_TIMEOUT = 30000; // 30 seconds timeout

async function runSingleInstance() {
  elizaLogger.info(`🚀 Running SWE-bench for single instance: ${INSTANCE_ID}`);
  
  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    elizaLogger.error('❌ ANTHROPIC_API_KEY not found in environment');
    process.exit(1);
  }

  // Create a mock runtime
  const runtime = {
    agentId: 'test-agent',
    getSetting: (key: string) => process.env[key],
    logger: elizaLogger,
    getService: (name: string) => null
  } as unknown as IAgentRuntime;
  
  // Create runner with short timeout and debug options
  const runner = new SWEBenchRunner(runtime, {
    work_dir: '.swe-bench-work-single',
    cache_dir: '.swe-bench-cache',
    docker_enabled: false,
    max_parallel_instances: 1,
    cleanup_after_run: false, // Keep files for debugging
    timeout_per_instance: SHORT_TIMEOUT, // 30 seconds instead of 5 minutes
    useEnhancedGenerator: true,
    useClaudeCode: false
  });

  await runner.initialize();

  // Run with debug output
  elizaLogger.info(`⏱️  Running with ${SHORT_TIMEOUT/1000}s timeout...`);
  
  const startTime = Date.now();
  const report = await runner.runBenchmark({
    instance_ids: [INSTANCE_ID],
    max_instances: 1,
    save_artifacts: true,
    skip_evaluation: false,
    language_filter: ['TypeScript', 'JavaScript']
  });
  const duration = Date.now() - startTime;

  // Analyze results
  const result = report.results.per_instance_results[0];
  
  elizaLogger.info('\n📊 Results:');
  elizaLogger.info(`  - Duration: ${(duration / 1000).toFixed(1)}s`);
  elizaLogger.info(`  - Resolved: ${result.resolved ? '✅' : '❌'}`);
  elizaLogger.info(`  - Tests Passed: ${result.tests_passed ? '✅' : '❌'}`);
  elizaLogger.info(`  - Compilation Success: ${result.compilation_success ? '✅' : '❌'}`);
  elizaLogger.info(`  - Error: ${result.error || 'None'}`);
  
  // Save results
  const analysisDir = `swe-bench-analysis/single-${INSTANCE_ID.replace(/[^a-zA-Z0-9-_]/g, '-')}-${Date.now()}`;
  await fs.mkdir(analysisDir, { recursive: true });
  
  await fs.writeFile(
    path.join(analysisDir, 'report.json'),
    JSON.stringify(report, null, 2)
  );
  
  // Create summary
  const summary = `# SWE-bench Single Instance Analysis

## Instance: ${INSTANCE_ID}

### Result
- **Resolved**: ${result.resolved ? '✅ Yes' : '❌ No'}
- **Tests Passed**: ${result.tests_passed ? '✅ Yes' : '❌ No'}  
- **Compilation Success**: ${result.compilation_success ? '✅ Yes' : '❌ No'}
- **Execution Time**: ${(result.execution_time / 1000).toFixed(1)}s
- **Error**: ${result.error || 'None'}

### Debug Info
- Work directory: \`.swe-bench-work-single\`
- Artifacts: \`.swe-bench-work-single/artifacts/${INSTANCE_ID}\`
- Logs: \`.swe-bench-work-single/logs\`
`;

  await fs.writeFile(
    path.join(analysisDir, 'README.md'),
    summary
  );

  elizaLogger.info(`\n📁 Results saved to: ${analysisDir}`);
  
  // Check work directory for artifacts
  const artifactsDir = path.join('.swe-bench-work-single', 'artifacts', INSTANCE_ID);
  try {
    await fs.access(artifactsDir);
    const files = await fs.readdir(artifactsDir);
    elizaLogger.info('\n📄 Generated artifacts:');
    for (const file of files) {
      elizaLogger.info(`  - ${file}`);
    }
  } catch {
    elizaLogger.warn('⚠️  No artifacts found');
  }
}

// Run the script
runSingleInstance().catch(error => {
  elizaLogger.error('Fatal error:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});