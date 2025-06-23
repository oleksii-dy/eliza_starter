#!/usr/bin/env bun

import { SWEBenchRunner } from '../src/swe-bench/swe-bench-runner.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface InstanceResult {
  instance_id: string;
  resolved: boolean;
  tests_passed: boolean;
  compilation_success: boolean;
  execution_time: number;
  validation_checkpoints?: Array<{
    phase: string;
    iteration?: number;
    passed: boolean;
    score: number;
    details: any;
  }>;
  solution_found_at?: string;
  wasted_iterations?: number;
  efficiency_percentage?: number;
  error?: string;
}

async function runComprehensiveBenchmark() {
  console.log('🚀 Starting COMPREHENSIVE SWE-bench evaluation with validation checkpoints...\n');
  console.log('📊 This will run all TypeScript/JavaScript tests one by one\n');

  // Create mock runtime with API key from env
  const mockRuntime = {
    getSetting: (key: string) => {
      if (key === 'ANTHROPIC_API_KEY') {
        return process.env.ANTHROPIC_API_KEY;
      }
      return process.env[key];
    },
    agentId: 'swe-bench-comprehensive',
    getService: (name: string) => {
      // Return null for all services - they're not needed for patch generation
      return null;
    },
    character: {
      name: 'SWEBenchAgent',
      bio: ['Agent for comprehensive SWE-bench evaluation'],
      knowledge: []
      messageExamples: []
      postExamples: []
      topics: []
      plugins: []
    },
  } as any;

  // Check API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ Error: ANTHROPIC_API_KEY not found in .env file');
    console.log('\nPlease add your Anthropic API key to .env file:');
    console.log('ANTHROPIC_API_KEY="your-key-here"');
    process.exit(1);
  }

  console.log('✅ Anthropic API key loaded from .env\n');

  // Create runner with enhanced generator enabled
  const runner = new SWEBenchRunner(mockRuntime, {
    docker_enabled: false,
    max_parallel_instances: 1,
    cleanup_after_run: true,
    timeout_per_instance: 900000, // 15 minutes per instance
    useEnhancedGenerator: true, // Enable validation checkpoints
    useClaudeCode: true, // Use Claude Code for better results
  });

  try {
    // Initialize
    console.log('📦 Initializing SWE-bench runner...');
    await runner.initialize();

    // Get dataset stats
    console.log('\n📊 Loading dataset statistics...');
    const stats = await runner.getDatasetStats();
    const tsJsCount = (stats.byLanguage['TypeScript'] || 0) + (stats.byLanguage['JavaScript'] || 0);
    console.log(`Total instances: ${stats.total}`);
    console.log(`TypeScript/JavaScript instances: ${tsJsCount}`);

    // Run benchmark with all TypeScript/JavaScript instances
    // The runner internally filters based on language_filter
    const allInstancesReport = await runner.runBenchmark({
      language_filter: ['TypeScript', 'JavaScript'],
      max_instances: 9999, // Get all instances
      save_artifacts: false,
      skip_evaluation: true, // Just to get the instances
      verbose: false,
    });

    // Extract instances from the report
    const instances = allInstancesReport.results.per_instance_results.map((r) => ({
      instance_id: r.instance_id,
      repo: r.instance_id.split('__')[0].replace(/_/g, '/'),
      issue_title: 'Issue',
      // We'll get full instance data when processing individually
    }));

    console.log(`\n🔧 Running comprehensive evaluation on ${instances.length} instances...\n`);
    console.log('⚠️  This will use your Anthropic API credits!\n');

    // Create results directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsDir = path.join(process.cwd(), 'swe-bench-comprehensive', timestamp);
    await fs.mkdir(resultsDir, { recursive: true });

    // Track overall results
    const overallResults: InstanceResult[] = [];
    let totalValidationPassed = 0;
    let totalWastedIterations = 0;
    let totalEfficiencySum = 0;
    let firstPassInstances = 0;

    // Process each instance individually
    for (let i = 0; i < instances.length; i++) {
      const instance = instances[i];
      console.log(`\n📌 Processing instance ${i + 1}/${instances.length}: ${instance.instance_id}`);
      console.log(`   Repository: ${instance.repo}`);
      console.log(`   Issue: ${instance.issue_title}`);

      try {
        // Run single instance
        const startTime = Date.now();
        const report = await runner.runBenchmark({
          instance_ids: [instance.instance_id],
          max_instances: 1,
          save_artifacts: true,
          skip_evaluation: false,
          verbose: true,
        });

        const endTime = Date.now();
        const executionTime = endTime - startTime;

        // Extract result
        const instanceResult = report.results.per_instance_results[0];

        // Get patch details from artifacts if available
        let patchDetails: any = null;
        if (report.artifacts_dir) {
          try {
            const patchPath = path.join(
              report.artifacts_dir,
              'patches',
              `${instance.instance_id}.json`
            );
            const patchData = await fs.readFile(patchPath, 'utf-8');
            patchDetails = JSON.parse(patchData);
          } catch (e) {
            console.log('   Could not load patch details');
          }
        }

        // Create enhanced result
        const enhancedResult: InstanceResult = {
          instance_id: instance.instance_id,
          resolved: instanceResult.resolved,
          tests_passed: instanceResult.tests_passed,
          compilation_success: instanceResult.compilation_success,
          execution_time: executionTime,
          validation_checkpoints: patchDetails?.validation_checkpoints,
          solution_found_at: patchDetails?.solution_found_at,
          wasted_iterations: patchDetails?.wasted_iterations,
          efficiency_percentage: patchDetails?.efficiency_percentage,
          error: instanceResult.error,
        };

        overallResults.push(enhancedResult);

        // Update statistics
        if (patchDetails?.validation_checkpoints) {
          const passedCheckpoints = patchDetails.validation_checkpoints.filter((cp) => cp.passed);
          if (passedCheckpoints.length > 0) {
            totalValidationPassed++;

            // Check if first checkpoint passed
            if (passedCheckpoints[0]?.phase === 'Research & Initial Analysis') {
              firstPassInstances++;
            }
          }

          if (patchDetails.wasted_iterations !== undefined) {
            totalWastedIterations += patchDetails.wasted_iterations;
          }

          if (patchDetails.efficiency_percentage !== undefined) {
            totalEfficiencySum += patchDetails.efficiency_percentage;
          }
        }

        // Log result
        console.log(`   Result: ${instanceResult.resolved ? '✅ RESOLVED' : '❌ FAILED'}`);
        if (patchDetails?.solution_found_at) {
          console.log(`   Solution found at: ${patchDetails.solution_found_at}`);
          console.log(`   Wasted iterations: ${patchDetails.wasted_iterations || 0}`);
          console.log(`   Efficiency: ${patchDetails.efficiency_percentage?.toFixed(1) || 0}%`);
        }

        // Save individual result
        await fs.writeFile(
          path.join(resultsDir, `${instance.instance_id}.json`),
          JSON.stringify(enhancedResult, null, 2)
        );

        // Copy artifacts
        if (report.artifacts_dir) {
          const instanceArtifactsDir = path.join(resultsDir, 'artifacts', instance.instance_id);
          await fs.mkdir(instanceArtifactsDir, { recursive: true });
          try {
            await fs.cp(report.artifacts_dir, instanceArtifactsDir, { recursive: true });
          } catch (e) {
            console.log('   Could not copy artifacts');
          }
        }
      } catch (error) {
        console.error(`   ❌ Error processing instance: ${error.message}`);

        overallResults.push({
          instance_id: instance.instance_id,
          resolved: false,
          tests_passed: false,
          compilation_success: false,
          execution_time: 0,
          error: error.message,
        });
      }

      // Save progress
      await fs.writeFile(
        path.join(resultsDir, 'progress.json'),
        JSON.stringify(
          {
            completed: i + 1,
            total: instances.length,
            results: overallResults,
          },
          null,
          2
        )
      );
    }

    // Calculate final statistics
    const resolvedCount = overallResults.filter((r) => r.resolved).length;
    const testsPassedCount = overallResults.filter((r) => r.tests_passed).length;
    const compilationSuccessCount = overallResults.filter((r) => r.compilation_success).length;
    const avgEfficiency = totalEfficiencySum / (totalValidationPassed || 1);

    // Create comprehensive report
    const comprehensiveReport = {
      timestamp: new Date().toISOString(),
      total_instances: instances.length,
      resolved_instances: resolvedCount,
      resolution_rate: ((resolvedCount / instances.length) * 100).toFixed(1) + '%',
      tests_passed_count: testsPassedCount,
      test_pass_rate: ((testsPassedCount / instances.length) * 100).toFixed(1) + '%',
      compilation_success_count: compilationSuccessCount,
      compilation_success_rate:
        ((compilationSuccessCount / instances.length) * 100).toFixed(1) + '%',
      validation_statistics: {
        instances_with_passing_validation: totalValidationPassed,
        first_pass_success_count: firstPassInstances,
        first_pass_success_rate: ((firstPassInstances / instances.length) * 100).toFixed(1) + '%',
        total_wasted_iterations: totalWastedIterations,
        average_wasted_iterations: (totalWastedIterations / totalValidationPassed).toFixed(1),
        average_efficiency: avgEfficiency.toFixed(1) + '%',
      },
      instance_results: overallResults,
    };

    // Save comprehensive report
    await fs.writeFile(
      path.join(resultsDir, 'comprehensive-report.json'),
      JSON.stringify(comprehensiveReport, null, 2)
    );

    // Create markdown summary
    let markdown = `# Comprehensive SWE-bench Evaluation Report

**Date**: ${new Date().toISOString()}
**Total Instances**: ${instances.length}

## Overall Results

- **Resolution Rate**: ${comprehensiveReport.resolution_rate} (${resolvedCount}/${instances.length})
- **Test Pass Rate**: ${comprehensiveReport.test_pass_rate} (${testsPassedCount}/${instances.length})
- **Compilation Success Rate**: ${comprehensiveReport.compilation_success_rate} (${compilationSuccessCount}/${instances.length})

## Efficiency Analysis

- **Instances with Passing Validation**: ${totalValidationPassed}
- **First-Pass Success Rate**: ${comprehensiveReport.validation_statistics.first_pass_success_rate}
- **Total Wasted Iterations**: ${totalWastedIterations}
- **Average Wasted Iterations**: ${comprehensiveReport.validation_statistics.average_wasted_iterations}
- **Average Efficiency**: ${comprehensiveReport.validation_statistics.average_efficiency}

## Instance Details

| Instance | Resolved | Tests | Compilation | Solution Found | Wasted | Efficiency |
|----------|----------|-------|-------------|----------------|--------|------------|
`;

    for (const result of overallResults) {
      const resolved = result.resolved ? '✅' : '❌';
      const tests = result.tests_passed ? '✅' : '❌';
      const compilation = result.compilation_success ? '✅' : '❌';
      const solutionFound = result.solution_found_at || '-';
      const wasted =
        result.wasted_iterations !== undefined ? result.wasted_iterations.toString() : '-';
      const efficiency =
        result.efficiency_percentage !== undefined
          ? result.efficiency_percentage.toFixed(1) + '%'
          : '-';

      markdown += `| ${result.instance_id} | ${resolved} | ${tests} | ${compilation} | ${solutionFound} | ${wasted} | ${efficiency} |\n`;
    }

    markdown += `\n## Key Insights

1. **Early Success Detection**: ${firstPassInstances} instances (${((firstPassInstances / instances.length) * 100).toFixed(1)}%) found working solutions in the first phase
2. **Iteration Efficiency**: On average, ${comprehensiveReport.validation_statistics.average_wasted_iterations} iterations continued after finding a working solution
3. **Overall Workflow Efficiency**: ${comprehensiveReport.validation_statistics.average_efficiency} average efficiency across successful instances

## Recommendations

Based on the validation checkpoint analysis:
`;

    if (avgEfficiency < 50) {
      markdown += `- The workflow shows low efficiency (${avgEfficiency.toFixed(1)}%), suggesting many iterations after finding solutions\n`;
      markdown += `- Consider implementing early termination when validation passes\n`;
    } else if (avgEfficiency < 75) {
      markdown += `- The workflow shows moderate efficiency (${avgEfficiency.toFixed(1)}%)\n`;
      markdown += `- Some optimization opportunities exist to reduce wasted iterations\n`;
    } else {
      markdown += `- The workflow shows good efficiency (${avgEfficiency.toFixed(1)}%)\n`;
      markdown += `- The validation checkpoint system is effectively minimizing wasted effort\n`;
    }

    await fs.writeFile(path.join(resultsDir, 'comprehensive-report.md'), markdown);

    console.log('\n✅ Comprehensive evaluation complete!');
    console.log(`\n📁 Results saved to: ${resultsDir}`);
    console.log('\nSummary:');
    console.log(`- Resolution Rate: ${comprehensiveReport.resolution_rate}`);
    console.log(`- Test Pass Rate: ${comprehensiveReport.test_pass_rate}`);
    console.log(
      `- First-Pass Success: ${comprehensiveReport.validation_statistics.first_pass_success_rate}`
    );
    console.log(
      `- Average Efficiency: ${comprehensiveReport.validation_statistics.average_efficiency}`
    );
  } catch (error) {
    console.error('\n❌ Error running comprehensive benchmark:', error);

    // Save error report
    const errorReport = {
      timestamp: new Date().toISOString(),
      mode: 'COMPREHENSIVE',
      error: error.message,
      stack: error.stack,
    };

    const errorPath = path.join(process.cwd(), 'swe-bench-comprehensive', 'error-report.json');
    await fs.mkdir(path.dirname(errorPath), { recursive: true });
    await fs.writeFile(errorPath, JSON.stringify(errorReport, null, 2));
  }
}

// Run the comprehensive benchmark
runComprehensiveBenchmark().catch(console.error);
