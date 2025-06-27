#!/usr/bin/env bun
/**
 * Run TypeScript/JavaScript subset of research benchmarks
 */

import { ResearchService } from '../src/service';
import { logger, IAgentRuntime, ModelType } from '@elizaos/core';
import { ResearchDomain, ResearchDepth } from '../src/types';
import { SWE_BENCH } from '../src/benchmarks/standard-benchmarks';
import fs from 'fs/promises';
import path from 'path';

interface BenchmarkResult {
  id: string;
  query: string;
  projectId: string;
  duration: number;
  status: 'completed' | 'failed' | 'timeout';
  sources: number;
  findings: number;
  wordCount: number;
  citations: number;
  raceScore?: number;
  factScore?: number;
  error?: string;
}

async function createBenchmarkRuntime(): Promise<IAgentRuntime> {
  const runtime = {
    agentId: 'ts-js-benchmark-agent',
    character: {
      name: 'TypeScript/JavaScript Research Agent',
      bio: [
        'Expert software engineering research agent specializing in TypeScript and JavaScript',
      ],
      system:
        'You are an expert software engineering researcher with deep knowledge of TypeScript, JavaScript, and modern web development frameworks.',
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

    // Use OpenAI for high-quality technical research
    useModel: async (modelType: string, params: any) => {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const messages = params.messages || [];
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview', // Use GPT-4 for technical accuracy
        messages,
        temperature: params.temperature || 0.3, // Lower temperature for technical content
        max_tokens: params.max_tokens || 4000,
      });

      return completion.choices[0].message.content;
    },

    logger: logger,
  } as any;

  const researchService = await ResearchService.start(runtime);
  runtime.researchService = researchService;

  return runtime;
}

async function runTsJsBenchmark() {
  console.log('🚀 Starting TypeScript/JavaScript Research Benchmark');
  console.log('='.repeat(70));
  console.log(
    `📊 Testing ${SWE_BENCH.queries.length} software engineering issues`
  );
  console.log('='.repeat(70));

  const runtime = await createBenchmarkRuntime();
  const researchService = runtime.researchService;

  const results: BenchmarkResult[] = [];

  // Run first 3 issues as a representative sample (for speed)
  const selectedQueries = SWE_BENCH.queries.slice(0, 3);

  for (let i = 0; i < selectedQueries.length; i++) {
    const benchmarkQuery = selectedQueries[i];
    const query = benchmarkQuery.query;

    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 Processing Issue ${i + 1}/${selectedQueries.length}`);
    console.log(`🔧 ID: ${benchmarkQuery.id}`);
    console.log(`📝 Repository: ${benchmarkQuery.metadata.repo}`);
    console.log(`🏷️  Category: ${benchmarkQuery.metadata.category}`);
    console.log(`🔥 Difficulty: ${benchmarkQuery.metadata.difficulty}`);
    console.log(`💻 Language: ${benchmarkQuery.metadata.language}`);
    console.log(`📋 Query: ${query.substring(0, 150)}...`);
    console.log(`${'='.repeat(70)}\n`);

    const startTime = Date.now();

    try {
      // Create research project with software engineering focus
      const project = await researchService.createResearchProject(query, {
        researchDepth: 'deep' as ResearchDepth, // Deep research for technical issues
        domain: 'computer_science' as ResearchDomain,
        maxSearchResults: 15, // More results for technical complexity
        evaluationEnabled: true,
        searchProviders: ['web', 'academic'], // Include academic sources for research depth
        timeout: 300000, // 5 minutes per issue (reduced from 30 min for demo)
        maxDepth: 3, // More iterations for complex technical issues
        enableCitations: true,
        qualityThreshold: 0.7,
      });

      console.log(`✅ Project created: ${project.id}`);
      console.log(`📊 Domain: ${project.metadata.domain}`);
      console.log(`🎯 Task Type: ${project.metadata.taskType}`);
      console.log(`🔍 Depth: ${project.metadata.depth}`);

      // Wait for completion with progress updates
      const timeout = 5 * 60 * 1000; // 5 minutes
      const checkInterval = 10000; // 10 seconds
      let elapsed = 0;
      let lastPhase = '';
      let lastProgress = 0;

      while (elapsed < timeout) {
        const updated = await researchService.getProject(project.id);

        if (!updated) {
          console.error(`❌ Project ${project.id} not found`);
          break;
        }

        // Show phase changes and progress
        if (updated.phase !== lastPhase) {
          console.log(`\n📍 Phase: ${updated.phase}`);
          lastPhase = updated.phase;
        }

        // Show progress updates
        const currentProgress = Math.round(
          (updated.sources.length / benchmarkQuery.expectedSources) * 100
        );
        if (currentProgress > lastProgress + 10) {
          console.log(
            `📈 Progress: ${currentProgress}% (${updated.sources.length}/${benchmarkQuery.expectedSources} sources)`
          );
          lastProgress = currentProgress;
        }

        if (updated.status === 'completed') {
          const duration = Date.now() - startTime;
          console.log(
            `\n✅ Research completed in ${Math.round(duration / 1000)}s`
          );

          // Log detailed statistics
          console.log('\n📊 Research Statistics:');
          console.log(
            `  - Sources found: ${updated.sources.length}/${benchmarkQuery.expectedSources}`
          );
          console.log(`  - Findings extracted: ${updated.findings.length}`);
          console.log(`  - Word count: ${updated.report?.wordCount || 0}`);
          console.log(
            `  - Citations: ${updated.report?.citations.length || 0}`
          );
          console.log(`  - Repository: ${benchmarkQuery.metadata.repo}`);
          console.log(`  - Issue: #${benchmarkQuery.metadata.issue_number}`);

          // Log evaluation results if available
          let raceScore = 0;
          let factScore = 0;

          if (updated.evaluationResults) {
            const race = updated.evaluationResults.raceEvaluation?.scores;
            const fact = updated.evaluationResults.factEvaluation?.scores;

            if (race) {
              raceScore = race.overall;
              console.log('\n📊 RACE Evaluation:');
              console.log(`  - Overall: ${(race.overall * 100).toFixed(1)}%`);
              console.log(
                `  - Comprehensiveness: ${(race.comprehensiveness * 100).toFixed(1)}%`
              );
              console.log(
                `  - Technical Depth: ${(race.depth * 100).toFixed(1)}%`
              );
              console.log(
                `  - Instruction Following: ${(race.instructionFollowing * 100).toFixed(1)}%`
              );
            }

            if (fact) {
              factScore = fact.citationAccuracy;
              console.log('\n📊 FACT Evaluation:');
              console.log(
                `  - Citation Accuracy: ${(fact.citationAccuracy * 100).toFixed(1)}%`
              );
              console.log(`  - Total Citations: ${fact.totalCitations}`);
              console.log(`  - Verified Citations: ${fact.verifiedCitations}`);
            }
          }

          // Store result
          results.push({
            id: benchmarkQuery.id,
            query,
            projectId: project.id,
            duration,
            status: 'completed',
            sources: updated.sources.length,
            findings: updated.findings.length,
            wordCount: updated.report?.wordCount || 0,
            citations: updated.report?.citations.length || 0,
            raceScore,
            factScore,
          });

          break;
        } else if (updated.status === 'failed') {
          console.error(`\n❌ Research failed: ${updated.error}`);
          results.push({
            id: benchmarkQuery.id,
            query,
            projectId: project.id,
            duration: Date.now() - startTime,
            status: 'failed',
            sources: updated.sources.length,
            findings: updated.findings.length,
            wordCount: 0,
            citations: 0,
            error: updated.error,
          });
          break;
        }

        // Show status every 30 seconds
        if (elapsed % 30000 === 0 && elapsed > 0) {
          console.log(
            `⏳ Still processing... (${Math.round(elapsed / 1000)}s elapsed)`
          );
          console.log(`  - Status: ${updated.status}`);
          console.log(`  - Phase: ${updated.phase}`);
          console.log(`  - Sources: ${updated.sources.length}`);
          console.log(`  - Findings: ${updated.findings.length}`);
        }

        await new Promise((resolve) => setTimeout(resolve, checkInterval));
        elapsed += checkInterval;
      }

      if (elapsed >= timeout) {
        console.error(`\n⏰ Research timed out after ${timeout / 1000}s`);
        const final = await researchService.getProject(project.id);
        results.push({
          id: benchmarkQuery.id,
          query,
          projectId: project.id,
          duration: timeout,
          status: 'timeout',
          sources: final?.sources.length || 0,
          findings: final?.findings.length || 0,
          wordCount: 0,
          citations: 0,
          error: 'Timeout',
        });
      }
    } catch (error) {
      console.error(`\n❌ Error processing ${benchmarkQuery.id}:`, error);
      results.push({
        id: benchmarkQuery.id,
        query,
        projectId: '',
        duration: Date.now() - startTime,
        status: 'failed',
        sources: 0,
        findings: 0,
        wordCount: 0,
        citations: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Brief pause between tests
    if (i < selectedQueries.length - 1) {
      console.log('\n⏸️  Brief pause before next test...');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  // Generate comprehensive summary
  console.log(`\n\n${'='.repeat(70)}`);
  console.log('📊 TYPESCRIPT/JAVASCRIPT RESEARCH BENCHMARK RESULTS');
  console.log('='.repeat(70));

  const successful = results.filter((r) => r.status === 'completed');
  const failed = results.filter((r) => r.status === 'failed');
  const timedOut = results.filter((r) => r.status === 'timeout');

  console.log(
    `\n📈 Success Rate: ${successful.length}/${results.length} (${((successful.length / results.length) * 100).toFixed(1)}%)`
  );
  console.log(`✅ Completed: ${successful.length}`);
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
    const avgCitations =
      successful.reduce((sum, r) => sum + r.citations, 0) / successful.length;
    const avgRaceScore =
      successful
        .filter((r) => r.raceScore)
        .reduce((sum, r) => sum + (r.raceScore || 0), 0) / successful.length;
    const avgFactScore =
      successful
        .filter((r) => r.factScore)
        .reduce((sum, r) => sum + (r.factScore || 0), 0) / successful.length;

    console.log('\n📊 Average Performance Metrics:');
    console.log(`  - Duration: ${Math.round(avgDuration / 1000)}s`);
    console.log(`  - Sources Found: ${Math.round(avgSources)}`);
    console.log(`  - Findings Extracted: ${Math.round(avgFindings)}`);
    console.log(`  - Report Word Count: ${Math.round(avgWordCount)}`);
    console.log(`  - Citations: ${Math.round(avgCitations)}`);
    console.log(`  - RACE Score: ${(avgRaceScore * 100).toFixed(1)}%`);
    console.log(`  - FACT Score: ${(avgFactScore * 100).toFixed(1)}%`);
  }

  // Individual results breakdown
  console.log('\n📋 Individual Results:');
  for (const result of results) {
    const statusIcon =
      result.status === 'completed'
        ? '✅'
        : result.status === 'failed'
          ? '❌'
          : '⏰';
    console.log(`${statusIcon} ${result.id}:`);
    console.log(`   Duration: ${Math.round(result.duration / 1000)}s`);
    console.log(`   Sources: ${result.sources}`);
    console.log(`   Status: ${result.status}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.raceScore) {
      console.log(`   RACE: ${(result.raceScore * 100).toFixed(1)}%`);
    }
    console.log('');
  }

  // Save detailed results
  const outputDir = './benchmark_results';
  await fs.mkdir(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(outputDir, `ts_js_benchmark_${timestamp}.json`);

  const reportData = {
    benchmark: 'TypeScript/JavaScript Software Engineering Research',
    timestamp: new Date().toISOString(),
    model: 'elizaos-research-v1',
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
            citations:
              successful.reduce((sum, r) => sum + r.citations, 0) /
              successful.length,
            raceScore:
              successful
                .filter((r) => r.raceScore)
                .reduce((sum, r) => sum + (r.raceScore || 0), 0) /
              successful.length,
            factScore:
              successful
                .filter((r) => r.factScore)
                .reduce((sum, r) => sum + (r.factScore || 0), 0) /
              successful.length,
          }
        : null,
    results,
  };

  await fs.writeFile(outputFile, JSON.stringify(reportData, null, 2));

  console.log(`\n📁 Detailed results saved to: ${outputFile}`);
  console.log('\n✅ TypeScript/JavaScript Research Benchmark Complete!');

  await researchService.stop();

  return reportData;
}

// Run the benchmark
runTsJsBenchmark()
  .then((results) => {
    console.log('\n🎉 Benchmark execution completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Benchmark execution failed:', error);
    process.exit(1);
  });
