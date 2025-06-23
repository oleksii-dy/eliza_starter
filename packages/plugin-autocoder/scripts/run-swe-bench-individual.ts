#!/usr/bin/env bun

import { SWEBenchRunner } from '../src/swe-bench/swe-bench-runner.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface IndividualAnalysis {
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
  failure_analysis?: {
    error_type: string;
    root_cause: string;
    patch_issues: string[];
    unicode_issues: boolean;
    newline_issues: boolean;
    formatting_issues: boolean;
    logical_errors: boolean;
    research_quality: 'poor' | 'moderate' | 'good' | 'excellent';
    recommendations: string[];
  };
}

async function runIndividualBenchmark() {
  console.log('🎯 Starting INDIVIDUAL SWE-bench evaluation with detailed failure analysis...\n');
  console.log(
    '📊 This will run each TypeScript/JavaScript instance individually and analyze failures\n'
  );

  // Create mock runtime with API key from env
  const mockRuntime = {
    getSetting: (key: string) => {
      if (key === 'ANTHROPIC_API_KEY') {
        return process.env.ANTHROPIC_API_KEY;
      }
      return process.env[key];
    },
    agentId: 'swe-bench-individual',
    getService: (name: string) => {
      return null;
    },
    character: {
      name: 'SWEBenchIndividualAgent',
      bio: ['Agent for individual SWE-bench evaluation with failure analysis'],
      knowledge: [],
      messageExamples: [],
      postExamples: [],
      topics: [],
      plugins: [],
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

  // Create runner with enhanced generator and NO Claude Code to avoid cheating
  const runner = new SWEBenchRunner(mockRuntime, {
    docker_enabled: false,
    max_parallel_instances: 1,
    cleanup_after_run: true,
    timeout_per_instance: 900000, // 15 minutes per instance
    useEnhancedGenerator: true, // Enable validation checkpoints
    useClaudeCode: false, // Disable Claude Code SDK to avoid potential cheating
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

    // Get all TypeScript/JavaScript instances
    const allInstancesReport = await runner.runBenchmark({
      language_filter: ['TypeScript', 'JavaScript'],
      max_instances: 9999,
      save_artifacts: false,
      skip_evaluation: true,
      verbose: false,
    });

    const instances = allInstancesReport.results.per_instance_results.map((r) => ({
      instance_id: r.instance_id,
      repo: r.instance_id.split('__')[0].replace(/_/g, '/'),
      issue_title: 'Issue',
    }));

    console.log(`\n🔧 Running individual evaluation on ${instances.length} instances...`);
    console.log('🚨 ANTI-CHEATING MEASURES ENABLED:');
    console.log('   - Claude Code SDK disabled');
    console.log('   - Research queries will avoid "SWE bench" terms');
    console.log('   - Enhanced generator with custom prompts only\n');

    // Create results directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsDir = path.join(process.cwd(), 'swe-bench-individual', timestamp);
    await fs.mkdir(resultsDir, { recursive: true });

    // Track overall results
    const analysisResults: IndividualAnalysis[] = [];
    let processedCount = 0;
    let firstFailureFound = false;

    // Process each instance individually
    for (const instance of instances) {
      processedCount++;
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📌 PROCESSING INSTANCE ${processedCount}/${instances.length}`);
      console.log(`   ID: ${instance.instance_id}`);
      console.log(`   Repository: ${instance.repo}`);
      console.log(`${'='.repeat(80)}`);

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
            console.log('   ⚠️ Could not load patch details');
          }
        }

        // Analyze failure if not resolved
        let failureAnalysis = null;
        if (!instanceResult.resolved) {
          console.log('\n🔍 ANALYZING FAILURE...');
          failureAnalysis = await analyzeFailure(
            instanceResult,
            patchDetails,
            report.artifacts_dir
          );

          if (!firstFailureFound) {
            firstFailureFound = true;
            console.log('\n🚨 FIRST FAILURE DETECTED - DETAILED ANALYSIS:');
            console.log('==========================================');
            await performDetailedFailureAnalysis(failureAnalysis, instanceResult, patchDetails);
          }
        }

        // Create enhanced result
        const enhancedResult: IndividualAnalysis = {
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
          failure_analysis: failureAnalysis,
        };

        analysisResults.push(enhancedResult);

        // Log result
        console.log(`\n📊 RESULT SUMMARY:`);
        console.log(`   Status: ${instanceResult.resolved ? '✅ RESOLVED' : '❌ FAILED'}`);
        console.log(`   Tests: ${instanceResult.tests_passed ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(
          `   Compilation: ${instanceResult.compilation_success ? '✅ SUCCESS' : '❌ FAILED'}`
        );
        console.log(`   Time: ${(executionTime / 1000).toFixed(1)}s`);

        if (patchDetails?.solution_found_at) {
          console.log(`   Solution found at: ${patchDetails.solution_found_at}`);
          console.log(`   Wasted iterations: ${patchDetails.wasted_iterations || 0}`);
          console.log(`   Efficiency: ${patchDetails.efficiency_percentage?.toFixed(1) || 0}%`);
        }

        if (failureAnalysis) {
          console.log(`\n🔍 FAILURE ANALYSIS:`);
          console.log(`   Error type: ${failureAnalysis.error_type}`);
          console.log(`   Root cause: ${failureAnalysis.root_cause}`);
          console.log(`   Research quality: ${failureAnalysis.research_quality}`);
          console.log(`   Issues found: ${failureAnalysis.patch_issues.length}`);
        }

        // Save individual result
        await fs.writeFile(
          path.join(resultsDir, `${instance.instance_id}.json`),
          JSON.stringify(enhancedResult, null, 2)
        );

        // Save progress
        await fs.writeFile(
          path.join(resultsDir, 'progress.json'),
          JSON.stringify(
            {
              completed: processedCount,
              total: instances.length,
              results: analysisResults,
            },
            null,
            2
          )
        );

        // If this was a failure and we found our first one, ask if we should continue
        if (!instanceResult.resolved && firstFailureFound) {
          console.log('\n⏸️ Found first failure. Continuing with remaining instances...');
        }
      } catch (error) {
        console.error(`   ❌ Error processing instance: ${error.message}`);

        const failureAnalysis = await analyzeException(error, instance.instance_id);

        analysisResults.push({
          instance_id: instance.instance_id,
          resolved: false,
          tests_passed: false,
          compilation_success: false,
          execution_time: 0,
          error: error.message,
          failure_analysis: failureAnalysis,
        });
      }
    }

    // Create comprehensive analysis report
    const comprehensiveAnalysis = await createComprehensiveAnalysis(analysisResults);

    // Save comprehensive analysis
    await fs.writeFile(
      path.join(resultsDir, 'comprehensive-analysis.json'),
      JSON.stringify(comprehensiveAnalysis, null, 2)
    );

    // Create detailed markdown report
    const markdownReport = await createDetailedMarkdownReport(
      analysisResults,
      comprehensiveAnalysis
    );
    await fs.writeFile(path.join(resultsDir, 'detailed-analysis.md'), markdownReport);

    console.log('\n✅ Individual evaluation complete!');
    console.log(`\n📁 Results saved to: ${resultsDir}`);
    console.log('\n📊 Final Summary:');
    console.log(`- Total instances: ${analysisResults.length}`);
    console.log(`- Resolved: ${analysisResults.filter((r) => r.resolved).length}`);
    console.log(`- Failed: ${analysisResults.filter((r) => !r.resolved).length}`);
    console.log(
      `- Common failure types: ${comprehensiveAnalysis.common_failure_types
        .slice(0, 3)
        .map((f) => f.type)
        .join(', ')}`
    );
  } catch (error) {
    console.error('\n❌ Error running individual benchmark:', error);

    // Save error report
    const errorReport = {
      timestamp: new Date().toISOString(),
      mode: 'INDIVIDUAL',
      error: error.message,
      stack: error.stack,
    };

    const errorPath = path.join(process.cwd(), 'swe-bench-individual', 'error-report.json');
    await fs.mkdir(path.dirname(errorPath), { recursive: true });
    await fs.writeFile(errorPath, JSON.stringify(errorReport, null, 2));
  }
}

async function analyzeFailure(instanceResult: any, patchDetails: any, artifactsDir?: string) {
  const error = instanceResult.error || 'Unknown error';

  // Analyze error type
  let errorType = 'Unknown';
  if (error.includes('Patch application failed')) {
    errorType = 'Patch Application';
  } else if (error.includes('compilation')) {
    errorType = 'Compilation';
  } else if (error.includes('test')) {
    errorType = 'Test Failure';
  } else if (error.includes('timeout')) {
    errorType = 'Timeout';
  } else if (error.includes('git') || error.includes('clone')) {
    errorType = 'Repository Access';
  } else if (error.includes('API') || error.includes('authentication')) {
    errorType = 'API/Authentication';
  }

  // Analyze patch issues
  const patchIssues = [];
  let unicodeIssues = false;
  let newlineIssues = false;
  let formattingIssues = false;
  let logicalErrors = false;

  if (patchDetails?.patch) {
    const patch = patchDetails.patch;

    // Check for Unicode issues
    if (/[^\x00-\x7F]/.test(patch)) {
      unicodeIssues = true;
      patchIssues.push('Contains non-ASCII Unicode characters');
    }

    // Check for newline issues
    if (patch.includes('\r\n')) {
      newlineIssues = true;
      patchIssues.push('Contains Windows-style line endings (CRLF)');
    }

    // Check for formatting issues
    if (patch.includes('\t') && patch.includes('    ')) {
      formattingIssues = true;
      patchIssues.push('Mixed tabs and spaces indentation');
    }

    // Check for malformed patches
    if (!patch.includes('diff --git') && !patch.includes('---') && !patch.includes('+++')) {
      formattingIssues = true;
      patchIssues.push('Malformed patch format - missing git diff headers');
    }

    // Check for logical errors
    if (patch.includes('undefined') || patch.includes('null') || patch.includes('NaN')) {
      logicalErrors = true;
      patchIssues.push('Patch introduces undefined/null/NaN values');
    }
  } else {
    patchIssues.push('No patch was generated');
  }

  // Assess research quality
  let researchQuality: 'poor' | 'moderate' | 'good' | 'excellent' = 'poor';
  if (patchDetails?.technical_details) {
    const details = JSON.stringify(patchDetails.technical_details).toLowerCase();

    // Check if research avoided SWE-bench specific terms (anti-cheating)
    if (details.includes('swe-bench') || details.includes('swe bench')) {
      researchQuality = 'poor';
      patchIssues.push('Research may have referenced SWE-bench answers directly');
    } else if (details.length > 500) {
      researchQuality = 'good';
    } else if (details.length > 200) {
      researchQuality = 'moderate';
    }
  }

  // Generate recommendations
  const recommendations = [];
  if (unicodeIssues) {
    recommendations.push('Implement Unicode normalization in patch generation');
  }
  if (newlineIssues) {
    recommendations.push('Standardize line endings to Unix-style (LF)');
  }
  if (formattingIssues) {
    recommendations.push('Implement consistent code formatting and patch structure validation');
  }
  if (logicalErrors) {
    recommendations.push(
      'Add semantic validation to detect logical errors before patch application'
    );
  }
  if (researchQuality === 'poor') {
    recommendations.push(
      'Improve research methodology and avoid looking up benchmark-specific solutions'
    );
  }
  if (errorType === 'Patch Application') {
    recommendations.push('Enhance patch validation and dry-run testing before application');
  }

  return {
    error_type: errorType,
    root_cause: determineRootCause(errorType, patchIssues),
    patch_issues: patchIssues,
    unicode_issues: unicodeIssues,
    newline_issues: newlineIssues,
    formatting_issues: formattingIssues,
    logical_errors: logicalErrors,
    research_quality: researchQuality,
    recommendations,
  };
}

function determineRootCause(errorType: string, patchIssues: string[]): string {
  if (errorType === 'Patch Application' && patchIssues.length > 0) {
    return `Patch application failed due to: ${patchIssues[0]}`;
  }

  switch (errorType) {
    case 'Compilation':
      return 'Generated code has compilation errors';
    case 'Test Failure':
      return 'Solution does not pass required tests';
    case 'Timeout':
      return 'Process exceeded time limit';
    case 'Repository Access':
      return 'Unable to access or clone repository';
    case 'API/Authentication':
      return 'API key or authentication issues';
    default:
      return 'Unknown root cause - requires manual investigation';
  }
}

async function analyzeException(error: any, instanceId: string) {
  return {
    error_type: 'Exception',
    root_cause: `Unhandled exception: ${error.message}`,
    patch_issues: ['Process crashed before patch generation'],
    unicode_issues: false,
    newline_issues: false,
    formatting_issues: false,
    logical_errors: false,
    research_quality: 'poor' as const,
    recommendations: ['Improve error handling and exception management'],
  };
}

async function performDetailedFailureAnalysis(
  failureAnalysis: any,
  instanceResult: any,
  patchDetails: any
) {
  console.log(`\nError Type: ${failureAnalysis.error_type}`);
  console.log(`Root Cause: ${failureAnalysis.root_cause}`);
  console.log(`\nPatch Issues Found: ${failureAnalysis.patch_issues.length}`);
  failureAnalysis.patch_issues.forEach((issue: string, i: number) => {
    console.log(`  ${i + 1}. ${issue}`);
  });

  console.log(`\nFormatting Analysis:`);
  console.log(`  Unicode Issues: ${failureAnalysis.unicode_issues ? '❌ YES' : '✅ NO'}`);
  console.log(`  Newline Issues: ${failureAnalysis.newline_issues ? '❌ YES' : '✅ NO'}`);
  console.log(`  Formatting Issues: ${failureAnalysis.formatting_issues ? '❌ YES' : '✅ NO'}`);
  console.log(`  Logical Errors: ${failureAnalysis.logical_errors ? '❌ YES' : '✅ NO'}`);

  console.log(`\nResearch Quality: ${failureAnalysis.research_quality.toUpperCase()}`);

  console.log(`\nRecommendations: ${failureAnalysis.recommendations.length}`);
  failureAnalysis.recommendations.forEach((rec: string, i: number) => {
    console.log(`  ${i + 1}. ${rec}`);
  });

  if (patchDetails?.patch) {
    console.log(`\nPatch Preview (first 500 chars):`);
    console.log(`${'─'.repeat(50)}`);
    console.log(patchDetails.patch.substring(0, 500));
    if (patchDetails.patch.length > 500) {
      console.log('...[truncated]');
    }
    console.log(`${'─'.repeat(50)}`);
  }
}

async function createComprehensiveAnalysis(results: IndividualAnalysis[]) {
  const totalInstances = results.length;
  const resolvedInstances = results.filter((r) => r.resolved).length;
  const failedInstances = results.filter((r) => !r.resolved);

  // Analyze failure types
  const failureTypes = new Map<string, number>();
  const rootCauses = new Map<string, number>();
  const patchIssues = new Map<string, number>();

  let unicodeIssuesCount = 0;
  let newlineIssuesCount = 0;
  let formattingIssuesCount = 0;
  let logicalErrorsCount = 0;

  const researchQuality = { poor: 0, moderate: 0, good: 0, excellent: 0 };

  failedInstances.forEach((result) => {
    if (result.failure_analysis) {
      const analysis = result.failure_analysis;

      // Count failure types
      failureTypes.set(analysis.error_type, (failureTypes.get(analysis.error_type) || 0) + 1);
      rootCauses.set(analysis.root_cause, (rootCauses.get(analysis.root_cause) || 0) + 1);

      // Count patch issues
      analysis.patch_issues.forEach((issue) => {
        patchIssues.set(issue, (patchIssues.get(issue) || 0) + 1);
      });

      // Count specific issue types
      if (analysis.unicode_issues) unicodeIssuesCount++;
      if (analysis.newline_issues) newlineIssuesCount++;
      if (analysis.formatting_issues) formattingIssuesCount++;
      if (analysis.logical_errors) logicalErrorsCount++;

      // Count research quality
      researchQuality[analysis.research_quality]++;
    }
  });

  // Sort and get top issues
  const topFailureTypes = Array.from(failureTypes.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({
      type,
      count,
      percentage: ((count / failedInstances.length) * 100).toFixed(1),
    }));

  const topRootCauses = Array.from(rootCauses.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([cause, count]) => ({ cause, count }));

  const topPatchIssues = Array.from(patchIssues.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([issue, count]) => ({ issue, count }));

  return {
    summary: {
      total_instances: totalInstances,
      resolved_instances: resolvedInstances,
      failed_instances: failedInstances.length,
      resolution_rate: ((resolvedInstances / totalInstances) * 100).toFixed(1) + '%',
    },
    failure_analysis: {
      common_failure_types: topFailureTypes,
      common_root_causes: topRootCauses,
      common_patch_issues: topPatchIssues,
      issue_statistics: {
        unicode_issues: {
          count: unicodeIssuesCount,
          percentage: ((unicodeIssuesCount / failedInstances.length) * 100).toFixed(1) + '%',
        },
        newline_issues: {
          count: newlineIssuesCount,
          percentage: ((newlineIssuesCount / failedInstances.length) * 100).toFixed(1) + '%',
        },
        formatting_issues: {
          count: formattingIssuesCount,
          percentage: ((formattingIssuesCount / failedInstances.length) * 100).toFixed(1) + '%',
        },
        logical_errors: {
          count: logicalErrorsCount,
          percentage: ((logicalErrorsCount / failedInstances.length) * 100).toFixed(1) + '%',
        },
      },
      research_quality_distribution: researchQuality,
    },
    common_failure_types: topFailureTypes,
    efficiency_metrics: {
      instances_with_validation: results.filter((r) => r.validation_checkpoints?.length).length,
      average_efficiency:
        results
          .filter((r) => r.efficiency_percentage !== undefined)
          .reduce((sum, r) => sum + r.efficiency_percentage!, 0) /
          results.filter((r) => r.efficiency_percentage !== undefined).length || 0,
      total_wasted_iterations: results.reduce((sum, r) => sum + (r.wasted_iterations || 0), 0),
    },
  };
}

async function createDetailedMarkdownReport(
  results: IndividualAnalysis[],
  analysis: any
): Promise<string> {
  let markdown = `# SWE-bench Individual Instance Analysis Report\n\n`;
  markdown += `**Generated**: ${new Date().toISOString()}\n`;
  markdown += `**Anti-Cheating Measures**: ✅ Enabled (Claude Code SDK disabled, research filtering)\n\n`;

  markdown += `## Executive Summary\n\n`;
  markdown += `- **Total Instances**: ${analysis.summary.total_instances}\n`;
  markdown += `- **Resolution Rate**: ${analysis.summary.resolution_rate}\n`;
  markdown += `- **Failed Instances**: ${analysis.summary.failed_instances}\n\n`;

  markdown += `## Failure Analysis\n\n`;
  markdown += `### Most Common Failure Types\n\n`;
  analysis.failure_analysis.common_failure_types.forEach((failure: any, i: number) => {
    markdown += `${i + 1}. **${failure.type}**: ${failure.count} instances (${failure.percentage}%)\n`;
  });

  markdown += `\n### Technical Issue Distribution\n\n`;
  markdown += `| Issue Type | Count | Percentage |\n`;
  markdown += `|------------|-------|------------|\n`;
  markdown += `| Unicode Issues | ${analysis.failure_analysis.issue_statistics.unicode_issues.count} | ${analysis.failure_analysis.issue_statistics.unicode_issues.percentage} |\n`;
  markdown += `| Newline Issues | ${analysis.failure_analysis.issue_statistics.newline_issues.count} | ${analysis.failure_analysis.issue_statistics.newline_issues.percentage} |\n`;
  markdown += `| Formatting Issues | ${analysis.failure_analysis.issue_statistics.formatting_issues.count} | ${analysis.failure_analysis.issue_statistics.formatting_issues.percentage} |\n`;
  markdown += `| Logical Errors | ${analysis.failure_analysis.issue_statistics.logical_errors.count} | ${analysis.failure_analysis.issue_statistics.logical_errors.percentage} |\n`;

  markdown += `\n### Research Quality Assessment\n\n`;
  markdown += `| Quality Level | Count | Notes |\n`;
  markdown += `|---------------|-------|-------|\n`;
  Object.entries(analysis.failure_analysis.research_quality_distribution).forEach(
    ([quality, count]) => {
      const note =
        quality === 'poor'
          ? 'May have referenced SWE-bench answers'
          : quality === 'excellent'
            ? 'High-quality independent research'
            : '';
      markdown += `| ${quality.charAt(0).toUpperCase() + quality.slice(1)} | ${count} | ${note} |\n`;
    }
  );

  markdown += `\n### Top Root Causes\n\n`;
  analysis.failure_analysis.common_root_causes.slice(0, 5).forEach((cause: any, i: number) => {
    markdown += `${i + 1}. ${cause.cause} (${cause.count} instances)\n`;
  });

  markdown += `\n## Detailed Instance Results\n\n`;
  markdown += `| Instance | Status | Error Type | Root Cause | Efficiency |\n`;
  markdown += `|----------|--------|------------|------------|------------|\n`;

  results.forEach((result) => {
    const status = result.resolved ? '✅' : '❌';
    const errorType = result.failure_analysis?.error_type || '-';
    const rootCause = result.failure_analysis?.root_cause || '-';
    const efficiency =
      result.efficiency_percentage !== undefined
        ? `${result.efficiency_percentage.toFixed(1)}%`
        : '-';
    markdown += `| ${result.instance_id} | ${status} | ${errorType} | ${rootCause.substring(0, 50)}... | ${efficiency} |\n`;
  });

  markdown += `\n## Key Recommendations\n\n`;
  markdown += `Based on the failure analysis, here are the top recommendations to improve our SWE-bench performance:\n\n`;

  // Generate recommendations based on most common issues
  const topRecommendations = new Map<string, number>();
  results.forEach((result) => {
    result.failure_analysis?.recommendations.forEach((rec) => {
      topRecommendations.set(rec, (topRecommendations.get(rec) || 0) + 1);
    });
  });

  Array.from(topRecommendations.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([rec, count], i) => {
      markdown += `${i + 1}. **${rec}** (affects ${count} instances)\n`;
    });

  markdown += `\n## Anti-Cheating Verification\n\n`;
  markdown += `✅ **Claude Code SDK Disabled**: Prevents access to external code generation tools\n`;
  markdown += `✅ **Research Filtering**: Monitors for SWE-bench specific references in research\n`;
  markdown += `✅ **Enhanced Generator Only**: Uses custom prompts without benchmark-specific knowledge\n\n`;

  return markdown;
}

// Run the individual benchmark
runIndividualBenchmark().catch(console.error);
