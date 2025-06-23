#!/usr/bin/env bun

import { autocoderPlugin } from '../src/index.js';
import { SWEBenchRunner } from '../src/swe-bench/swe-bench-runner.js';
import { SWEBenchDataLoader } from '../src/swe-bench/data-loader.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';
import type { BenchmarkOptions, SWEBenchInstance } from '../src/swe-bench/types.js';

// Load environment variables
dotenv.config();

async function runSelectiveSWEBench() {
  console.log('🚀 Starting selective SWE-bench evaluation (every 5th problem)...\n');

  // Create mock runtime with API key from env
  const mockRuntime = {
    getSetting: (key: string) => {
      if (key === 'ANTHROPIC_API_KEY') {
        return process.env.ANTHROPIC_API_KEY;
      }
      return undefined;
    },
    getService: (serviceName: string) => null,
    registerAction: (action: any) => {
      console.log(`Registering action: ${action.name}`);
    },
    agentId: 'swe-bench-selective',
    character: {
      name: 'SWEBenchSelectiveAgent',
      bio: ['Agent for selective SWE-bench evaluation'],
      knowledge: [],
      messageExamples: [],
      postExamples: [],
      topics: [],
      plugins: [],
    },
    logger: {
      info: console.log,
      error: console.error,
      warn: console.warn,
      debug: console.debug,
    },
  } as any;

  // Verify API key is available
  const apiKey = mockRuntime.getSetting('ANTHROPIC_API_KEY');
  if (!apiKey) {
    console.error('❌ Error: ANTHROPIC_API_KEY not found');
    console.log('Please set ANTHROPIC_API_KEY in your .env file');
    process.exit(1);
  }
  console.log('✅ Anthropic API key loaded\n');

  try {
    // Initialize data loader to get the dataset
    const dataLoader = new SWEBenchDataLoader(path.join(process.cwd(), '.swe-bench-cache'));
    await dataLoader.initialize();

    // Load all TypeScript instances
    const allInstances = await dataLoader.loadDataset();
    const tsInstances = allInstances.filter(
      (inst) => inst.language === 'TypeScript' || inst.language === 'JavaScript'
    );

    console.log(`📊 Total TypeScript/JavaScript instances: ${tsInstances.length}`);

    // Select every 5th instance (0, 5, 10, 15, 20)
    const selectedInstances: SWEBenchInstance[] = [];
    for (let i = 0; i < Math.min(25, tsInstances.length); i += 5) {
      selectedInstances.push(tsInstances[i]);
    }

    console.log(`\n📋 Selected ${selectedInstances.length} instances for evaluation:`);
    selectedInstances.forEach((inst, idx) => {
      console.log(`  ${idx + 1}. ${inst.instance_id} - ${inst.repo}`);
    });
    console.log('');

    // Initialize runner with Claude Code SDK enabled
    const runner = new SWEBenchRunner(mockRuntime, {
      cache_dir: path.join(process.cwd(), '.swe-bench-cache'),
      work_dir: path.join(process.cwd(), '.swe-bench-work'),
      docker_enabled: false,
      max_parallel_instances: 1,
      timeout_per_instance: 600000, // 10 minutes per instance
      cleanup_after_run: true,
      useClaudeCode: true, // Use Claude Code SDK for best results
    });

    await runner.initialize();

    // Run benchmark on selected instances
    const options: BenchmarkOptions = {
      instance_ids: selectedInstances.map((inst) => inst.instance_id),
      max_instances: selectedInstances.length,
      save_artifacts: true,
      skip_evaluation: false,
      language_filter: ['TypeScript', 'JavaScript'],
    };

    console.log('🔧 Starting benchmark run...\n');
    const report = await runner.runBenchmark(options);

    // Create detailed analysis report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const analysisDir = path.join(process.cwd(), 'swe-bench-analysis', `selective-${timestamp}`);
    await fs.mkdir(analysisDir, { recursive: true });

    // Save the main report
    await fs.writeFile(path.join(analysisDir, 'report.json'), JSON.stringify(report, null, 2));

    // Create a detailed analysis for each instance
    const analysis = {
      timestamp: new Date().toISOString(),
      summary: {
        total_instances: report.results.total_instances,
        resolved_instances: report.results.resolved_instances,
        resolution_rate: report.results.resolution_rate,
        compilation_success_rate: report.results.compilation_success_rate,
        avg_execution_time: report.results.summary.avg_execution_time,
        total_cost: report.results.summary.total_cost,
      },
      instances: report.results.per_instance_results.map((result, idx) => {
        const instance = selectedInstances.find((inst) => inst.instance_id === result.instance_id);
        return {
          instance_id: result.instance_id,
          repo: instance?.repo || 'unknown',
          issue_title: instance?.issue_title || 'unknown',
          resolved: result.resolved,
          tests_passed: result.tests_passed,
          compilation_success: result.compilation_success,
          execution_time: result.execution_time,
          error: result.error,
          analysis: {
            success: result.resolved,
            failure_reason: result.error || (!result.resolved ? 'Tests failed' : null),
            needs_improvement: !result.resolved,
          },
        };
      }),
    };

    // Save detailed analysis
    await fs.writeFile(path.join(analysisDir, 'analysis.json'), JSON.stringify(analysis, null, 2));

    // Create markdown summary
    const markdownSummary = `# SWE-bench Selective Evaluation Report

## Summary
- **Date**: ${new Date().toISOString()}
- **Total Instances**: ${analysis.summary.total_instances}
- **Resolved**: ${analysis.summary.resolved_instances} (${(analysis.summary.resolution_rate * 100).toFixed(1)}%)
- **Compilation Success Rate**: ${(analysis.summary.compilation_success_rate * 100).toFixed(1)}%
- **Average Execution Time**: ${(analysis.summary.avg_execution_time / 1000).toFixed(1)}s
- **Total Cost**: $${analysis.summary.total_cost.toFixed(2)}

## Instance Results

| # | Instance ID | Repository | Resolved | Tests Passed | Compiled | Time (s) | Notes |
|---|-------------|------------|----------|--------------|----------|----------|-------|
${analysis.instances
  .map(
    (inst, idx) =>
      `| ${idx + 1} | ${inst.instance_id} | ${inst.repo} | ${inst.resolved ? '✅' : '❌'} | ${inst.tests_passed ? '✅' : '❌'} | ${inst.compilation_success ? '✅' : '❌'} | ${(inst.execution_time / 1000).toFixed(1)} | ${inst.error || '-'} |`
  )
  .join('\n')}

## Analysis

### Success Rate: ${(analysis.summary.resolution_rate * 100).toFixed(1)}%

${
  analysis.summary.resolution_rate < 1
    ? `
### Failed Instances Requiring Improvement:
${analysis.instances
  .filter((inst) => !inst.resolved)
  .map((inst) => `- **${inst.instance_id}**: ${inst.analysis.failure_reason || 'Unknown failure'}`)
  .join('\n')}
`
    : '### All instances resolved successfully! 🎉'
}

## Next Steps
${
  analysis.summary.resolution_rate < 1
    ? `
1. Analyze the failed instances to identify common patterns
2. Improve the autocoder's handling of:
   - Test understanding and resolution
   - Code generation accuracy
   - Error recovery mechanisms
3. Re-run the failed instances after improvements
`
    : `
1. Expand testing to more instances
2. Test on more complex problems
3. Consider adding more challenging edge cases
`
}
`;

    await fs.writeFile(path.join(analysisDir, 'README.md'), markdownSummary);

    console.log('\n✅ Evaluation complete!');
    console.log(
      `📊 Results: ${analysis.summary.resolved_instances}/${analysis.summary.total_instances} resolved (${(analysis.summary.resolution_rate * 100).toFixed(1)}%)`
    );
    console.log(`📁 Full analysis saved to: ${analysisDir}`);

    // If not all instances were resolved, provide actionable feedback
    if (analysis.summary.resolution_rate < 1) {
      console.log('\n⚠️  Some instances failed. Analyzing failures...');
      const failedInstances = analysis.instances.filter((inst) => !inst.resolved);
      console.log(`\n${failedInstances.length} instances need improvement:`);
      failedInstances.forEach((inst) => {
        console.log(`  - ${inst.instance_id}: ${inst.analysis.failure_reason}`);
      });

      console.log('\n💡 Suggested improvements:');
      console.log('  1. Review the generated patches in the artifacts directory');
      console.log('  2. Check if the issue understanding was correct');
      console.log('  3. Verify test execution and error handling');
      console.log('  4. Consider enhancing the patch generation strategy');
    }
  } catch (error: any) {
    console.error('\n❌ Error running selective SWE-bench:', error.message);
    console.error('Stack trace:', error.stack);

    // Save error report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const errorReport = {
      timestamp: new Date().toISOString(),
      mode: 'SELECTIVE',
      error: error.message,
      stack: error.stack,
    };

    const errorDir = path.join(process.cwd(), 'swe-bench-analysis', 'errors');
    await fs.mkdir(errorDir, { recursive: true });

    await fs.writeFile(
      path.join(errorDir, `selective-error-${timestamp}.json`),
      JSON.stringify(errorReport, null, 2)
    );
  }
}

// Run the selective evaluation
runSelectiveSWEBench().catch(console.error);
