#!/usr/bin/env bun
/**
 * Quick TypeScript/JavaScript Research Benchmark
 * Focused on demonstrating research capabilities for software engineering topics
 */

import { ResearchService } from '../src/service';
import { logger, IAgentRuntime, ModelType } from '@elizaos/core';
import { ResearchDomain, ResearchDepth } from '../src/types';
import fs from 'fs/promises';
import path from 'path';

interface QuickBenchmarkResult {
  id: string;
  query: string;
  duration: number;
  status: 'completed' | 'failed' | 'timeout';
  sources: number;
  findings: number;
  wordCount: number;
  error?: string;
  summary?: string;
}

// Simplified TypeScript/JavaScript research queries
const TS_JS_QUERIES = [
  {
    id: 'react_hooks_cleanup',
    query:
      'How do React useEffect cleanup functions work and what are common patterns for preventing memory leaks?',
    expectedSources: 5,
  },
  {
    id: 'typescript_generics',
    query:
      'What are TypeScript generic constraints and how do they improve type safety in modern applications?',
    expectedSources: 5,
  },
  {
    id: 'nodejs_performance',
    query:
      'What are the key Node.js performance optimization techniques for high-throughput applications?',
    expectedSources: 5,
  },
];

async function createQuickRuntime(): Promise<IAgentRuntime> {
  const runtime = {
    agentId: 'quick-ts-js-agent',
    character: {
      name: 'Quick TS/JS Research Agent',
      bio: ['Fast TypeScript/JavaScript research specialist'],
      system:
        'You are an expert in TypeScript, JavaScript, and web development research.',
      plugins: ['research'],
    },

    getSetting: (key: string) => {
      return process.env[key] || '';
    },

    getService(name: string) {
      if (name === 'research') {
        return researchService;
      }
      return null;
    },

    useModel: async (modelType: string, params: any) => {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const messages = params.messages || [];
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Fast model for quick results
        messages,
        temperature: params.temperature || 0.4,
        max_tokens: params.max_tokens || 2000,
      });

      return completion.choices[0].message.content;
    },

    logger: logger,
  } as any;

  const researchService = await ResearchService.start(runtime);
  runtime.researchService = researchService;

  return runtime;
}

async function runQuickTsJsBenchmark() {
  console.log('🚀 Quick TypeScript/JavaScript Research Benchmark');
  console.log('='.repeat(60));
  console.log(
    `📊 Testing ${TS_JS_QUERIES.length} software development research queries`
  );
  console.log('='.repeat(60));

  const runtime = await createQuickRuntime();
  const researchService = runtime.researchService;

  const results: QuickBenchmarkResult[] = [];
  const startTime = Date.now();

  for (let i = 0; i < TS_JS_QUERIES.length; i++) {
    const testQuery = TS_JS_QUERIES[i];

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Processing Query ${i + 1}/${TS_JS_QUERIES.length}`);
    console.log(`🔧 ID: ${testQuery.id}`);
    console.log(`📝 Query: ${testQuery.query}`);
    console.log(`${'='.repeat(60)}\n`);

    const queryStart = Date.now();

    try {
      // Create fast research project
      const project = await researchService.createResearchProject(
        testQuery.query,
        {
          researchDepth: 'moderate' as ResearchDepth, // Fast setting
          domain: 'computer_science' as ResearchDomain,
          maxSearchResults: 5, // Reduced for speed
          evaluationEnabled: false, // Disable for speed
          searchProviders: ['web'], // Single provider
          timeout: 90000, // 90 seconds
          maxDepth: 2, // Quick iterations
          enableCitations: false, // Disable for speed
          qualityThreshold: 0.5, // Lower threshold for speed
        }
      );

      console.log(`✅ Project created: ${project.id}`);
      console.log(`📊 Domain: ${project.metadata.domain}`);
      console.log(`🎯 Task Type: ${project.metadata.taskType}`);

      // Wait for completion with timeout
      const timeout = 90 * 1000; // 90 seconds
      const checkInterval = 5000; // 5 seconds
      let elapsed = 0;
      let lastPhase = '';

      while (elapsed < timeout) {
        const updated = await researchService.getProject(project.id);

        if (!updated) {
          console.error(`❌ Project ${project.id} not found`);
          break;
        }

        // Show phase changes
        if (updated.phase !== lastPhase) {
          console.log(`📍 Phase: ${updated.phase}`);
          lastPhase = updated.phase;
        }

        if (updated.status === 'completed') {
          const duration = Date.now() - queryStart;
          console.log(
            `\n✅ Research completed in ${Math.round(duration / 1000)}s`
          );

          // Log statistics
          console.log('📊 Results:');
          console.log(`  - Sources: ${updated.sources.length}`);
          console.log(`  - Findings: ${updated.findings.length}`);
          console.log(`  - Word count: ${updated.report?.wordCount || 0}`);

          // Get summary
          let summary = 'No report generated';
          if (updated.report?.summary) {
            summary = `${updated.report.summary.substring(0, 300)}...`;
            console.log(`📄 Summary: ${summary.substring(0, 150)}...`);
          }

          results.push({
            id: testQuery.id,
            query: testQuery.query,
            duration,
            status: 'completed',
            sources: updated.sources.length,
            findings: updated.findings.length,
            wordCount: updated.report?.wordCount || 0,
            summary,
          });

          break;
        } else if (updated.status === 'failed') {
          console.error(`❌ Research failed: ${updated.error}`);
          results.push({
            id: testQuery.id,
            query: testQuery.query,
            duration: Date.now() - queryStart,
            status: 'failed',
            sources: updated.sources.length,
            findings: updated.findings.length,
            wordCount: 0,
            error: updated.error,
          });
          break;
        }

        // Progress updates
        if (elapsed % 15000 === 0 && elapsed > 0) {
          console.log(
            `⏳ Processing... (${Math.round(elapsed / 1000)}s) - Status: ${updated.status}, Phase: ${updated.phase}`
          );
          if (updated.sources.length > 0) {
            console.log(
              `  📊 Progress: ${updated.sources.length} sources, ${updated.findings.length} findings`
            );
          }
        }

        await new Promise((resolve) => setTimeout(resolve, checkInterval));
        elapsed += checkInterval;
      }

      if (elapsed >= timeout) {
        console.log(`⏰ Research timed out after ${timeout / 1000}s`);
        const final = await researchService.getProject(project.id);
        results.push({
          id: testQuery.id,
          query: testQuery.query,
          duration: timeout,
          status: 'timeout',
          sources: final?.sources.length || 0,
          findings: final?.findings.length || 0,
          wordCount: 0,
          error: 'Timeout',
        });
      }
    } catch (error) {
      console.error(`❌ Error: ${error}`);
      results.push({
        id: testQuery.id,
        query: testQuery.query,
        duration: Date.now() - queryStart,
        status: 'failed',
        sources: 0,
        findings: 0,
        wordCount: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Brief pause between queries
    if (i < TS_JS_QUERIES.length - 1) {
      console.log('\n⏸️  Pausing 3s before next query...');
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  const totalDuration = Date.now() - startTime;

  // Generate results summary
  console.log(`\n\n${'='.repeat(60)}`);
  console.log('📊 TYPESCRIPT/JAVASCRIPT RESEARCH BENCHMARK RESULTS');
  console.log('='.repeat(60));

  const successful = results.filter((r) => r.status === 'completed');
  const failed = results.filter((r) => r.status === 'failed');
  const timedOut = results.filter((r) => r.status === 'timeout');

  console.log('\n🎯 Overall Performance:');
  console.log(`⏱️  Total Runtime: ${Math.round(totalDuration / 1000)}s`);
  console.log(
    `✅ Successful: ${successful.length}/${results.length} (${((successful.length / results.length) * 100).toFixed(1)}%)`
  );
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`⏰ Timed Out: ${timedOut.length}`);

  if (successful.length > 0) {
    const avgDuration =
      successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
    const avgSources =
      successful.reduce((sum, r) => sum + r.sources, 0) / successful.length;
    const avgFindings =
      successful.reduce((sum, r) => sum + r.findings, 0) / successful.length;
    const avgWordCount =
      successful.reduce((sum, r) => sum + r.wordCount, 0) / successful.length;

    console.log('\n📊 Average Performance Metrics (Successful Queries):');
    console.log(`  ⏱️  Duration: ${Math.round(avgDuration / 1000)}s`);
    console.log(`  🔍 Sources Found: ${Math.round(avgSources)}`);
    console.log(`  📋 Findings Extracted: ${Math.round(avgFindings)}`);
    console.log(`  📄 Report Word Count: ${Math.round(avgWordCount)}`);
  }

  console.log('\n📋 Individual Query Results:');
  for (const result of results) {
    const statusIcon =
      result.status === 'completed'
        ? '✅'
        : result.status === 'failed'
          ? '❌'
          : '⏰';
    console.log(`\n${statusIcon} ${result.id}:`);
    console.log(`   Query: ${result.query.substring(0, 80)}...`);
    console.log(`   Duration: ${Math.round(result.duration / 1000)}s`);
    console.log(`   Sources: ${result.sources}`);
    console.log(`   Findings: ${result.findings}`);
    console.log(`   Status: ${result.status}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.summary && result.status === 'completed') {
      console.log(`   Summary: ${result.summary.substring(0, 120)}...`);
    }
  }

  // Create detailed benchmark report
  const benchmarkReport = {
    benchmark: 'Quick TypeScript/JavaScript Research Benchmark',
    timestamp: new Date().toISOString(),
    model: 'elizaos-research-v1',
    configuration: {
      depth: 'moderate',
      domain: 'computer_science',
      maxSearchResults: 5,
      timeout: 90000,
      evaluationEnabled: false,
    },
    totalDuration,
    totalQueries: results.length,
    successful: successful.length,
    failed: failed.length,
    timedOut: timedOut.length,
    successRate: successful.length / results.length,
    averageMetrics:
      successful.length > 0
        ? {
            duration:
              successful.reduce((sum, r) => sum + r.duration, 0) /
              successful.length,
            sources:
              successful.reduce((sum, r) => sum + r.sources, 0) /
              successful.length,
            findings:
              successful.reduce((sum, r) => sum + r.findings, 0) /
              successful.length,
            wordCount:
              successful.reduce((sum, r) => sum + r.wordCount, 0) /
              successful.length,
          }
        : null,
    queryResults: results,
  };

  // Save results
  const outputDir = './benchmark_results';
  await fs.mkdir(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(
    outputDir,
    `quick_ts_js_benchmark_${timestamp}.json`
  );

  await fs.writeFile(outputFile, JSON.stringify(benchmarkReport, null, 2));

  console.log(`\n📁 Detailed results saved to: ${outputFile}`);

  // Final assessment
  const overallSuccess = successful.length >= 2; // At least 2/3 should succeed
  if (overallSuccess) {
    console.log(
      '\n🎉 BENCHMARK PASSED: TypeScript/JavaScript research capabilities verified!'
    );
  } else {
    console.log(
      '\n⚠️  BENCHMARK MIXED: Some issues detected in research capabilities'
    );
  }

  console.log('\n✅ Quick TypeScript/JavaScript Research Benchmark Complete!');

  await researchService.stop();

  return benchmarkReport;
}

// Run the quick benchmark
runQuickTsJsBenchmark()
  .then((results) => {
    console.log('\n🎉 Quick benchmark execution completed!');
    console.log(
      `📊 Final Success Rate: ${(results.successRate * 100).toFixed(1)}%`
    );
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Quick benchmark execution failed:', error);
    process.exit(1);
  });
