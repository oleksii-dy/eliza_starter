#!/usr/bin/env bun

import { SWEBenchRunner } from '../src/swe-bench/swe-bench-runner.js';
import { elizaLogger, type IAgentRuntime } from '@elizaos/core';
import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const INSTANCE_ID = process.argv[2] || 'iamkun__dayjs-2399';

async function runTestOnly() {
  elizaLogger.info(`🚀 Running SWE-bench test-only mode for: ${INSTANCE_ID}`);

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
    getService: () => null
  } as unknown as IAgentRuntime;

  // Create runner with test-only configuration
  const runner = new SWEBenchRunner(runtime, {
    work_dir: '.swe-bench-work-single',
    cache_dir: '.swe-bench-cache',
    docker_enabled: false,
    max_parallel_instances: 1,
    cleanup_after_run: false,
    useEnhancedGenerator: true,
    useClaudeCode: false
  });

  await runner.initialize();

  // Run with skip_evaluation to avoid the evaluation step
  const report = await runner.runBenchmark({
    instance_ids: [INSTANCE_ID],
    max_instances: 1,
    save_artifacts: true,
    skip_evaluation: true, // Skip the problematic evaluation step
    language_filter: ['TypeScript', 'JavaScript']
  });

  // Create analysis
  const analysisDir = `swe-bench-analysis/test-only-${INSTANCE_ID}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  await fs.mkdir(analysisDir, { recursive: true });

  // Save report
  await fs.writeFile(
    path.join(analysisDir, 'report.json'),
    JSON.stringify(report, null, 2)
  );

  // Check results
  const result = report.results.per_instance_results?.[0];
  if (result) {
    const summary = `# SWE-bench Test-Only Analysis

## Instance: ${INSTANCE_ID}

### Result
- **Tests Passed**: ${result.tests_passed ? '✅ Yes' : '❌ No'}
- **Compilation Success**: ${result.compilation_success ? '✅ Yes' : '❌ No'}
- **Execution Time**: ${(result.execution_time / 1000).toFixed(1)}s

### Summary
${result.tests_passed ?
    '✅ Tests are passing! The fix appears to be working correctly.' :
    '❌ Tests are still failing. Further investigation needed.'}

### Details
- Check \`.swe-bench-work-single/repos/${INSTANCE_ID}\` for the patched code
- Check \`.swe-bench-work-single/artifacts/${INSTANCE_ID}\` for generated patches
`;

    await fs.writeFile(
      path.join(analysisDir, 'README.md'),
      summary
    );

    elizaLogger.info(`📊 Analysis saved to: ${analysisDir}`);

    if (result.tests_passed) {
      elizaLogger.info(`✅ SUCCESS: Tests are passing for ${INSTANCE_ID}!`);
    } else {
      elizaLogger.error(`❌ FAILURE: Tests are still failing for ${INSTANCE_ID}`);
    }
  }
}

// Run the script
runTestOnly().catch(error => {
  elizaLogger.error('Fatal error:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});
