import './test-setup'; // Load environment variables
import { type TestSuite, IAgentRuntime, logger } from '@elizaos/core';
import { ResearchService } from '../service';
import { ResearchDepth, ResearchStatus } from '../types';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface BenchmarkQuery {
  id: number;
  topic: string;
  language: string;
  prompt: string;
}

interface BenchmarkResult {
  queryId: number;
  success: boolean;
  duration?: number;
  wordCount?: number;
  citations?: number;
  sources?: number;
  findings?: number;
  error?: string;
  report?: string;
}

export class DeepResearchBenchFullSuite implements TestSuite {
  name = 'deepresearch-bench-full-e2e';
  description = 'Full DeepResearch Bench evaluation for first 5 English queries';

  tests = [
    {
      name: 'Process first 5 English benchmark queries',
      fn: async (runtime: IAgentRuntime) => {
        console.log(`\n${'='.repeat(80)}`);
        console.log('🚀 DeepResearch Bench Full Evaluation');
        console.log('='.repeat(80));

        // Check if we have necessary API keys
        const hasSearchProvider = !!(
          runtime.getSetting('TAVILY_API_KEY') ||
          runtime.getSetting('EXA_API_KEY') ||
          runtime.getSetting('SERPAPI_API_KEY') ||
          runtime.getSetting('SERPER_API_KEY')
        );

        if (!hasSearchProvider) {
          console.warn('⚠️  No search provider API keys found');
          console.log('Will use mock providers for demonstration');
        }

        // Load benchmark data
        const dataPath = path.join(
          __dirname,
          '../../deep_research_bench/data/prompt_data/query.jsonl'
        );
        const dataExists = await fs
          .access(dataPath)
          .then(() => true)
          .catch(() => false);

        if (!dataExists) {
          throw new Error(`Benchmark data not found at: ${dataPath}`);
        }

        const queryData = await fs.readFile(dataPath, 'utf-8');
        const allQueries: BenchmarkQuery[] = queryData
          .split('\n')
          .filter((line) => line.trim())
          .map((line) => JSON.parse(line));

        // Get first 5 English queries
        const queries = allQueries.filter((q) => q.language === 'en').slice(0, 5);

        console.log(`\n📝 Processing ${queries.length} English queries`);

        // Create output directory
        const outputDir = path.join(__dirname, '../../results/eliza/en');
        await fs.mkdir(outputDir, { recursive: true });

        // Get research service
        const researchService = runtime.getService('research') as ResearchService;
        if (!researchService) {
          throw new Error('Research service not available');
        }

        const results: BenchmarkResult[] = [];

        // Process each query
        for (let i = 0; i < queries.length; i++) {
          const query = queries[i];
          console.log(`\n${'─'.repeat(80)}`);
          console.log(`📊 Query ${i + 1}/${queries.length} - ID: ${query.id}`);
          console.log(`📝 Topic: ${query.topic}`);
          console.log(
            `📝 Query: ${query.prompt.substring(0, 150)}${query.prompt.length > 150 ? '...' : ''}`
          );
          console.log(`${'─'.repeat(80)}\n`);

          const startTime = Date.now();
          const result: BenchmarkResult = {
            queryId: query.id,
            success: false,
          };

          try {
            // Create research project with optimal settings for DeepResearch Bench
            const project = await researchService.createResearchProject(query.prompt, {
              researchDepth: ResearchDepth.PHD_LEVEL,
              maxSearchResults: 50, // Increased for better coverage
              evaluationEnabled: true,
              parallelSearches: 10,
              enableCitations: true,
              qualityThreshold: 0.7,
              maxDepth: 3, // Allow deeper exploration
              timeout: 600000, // 10 minutes
            });

            console.log(`✅ Project created: ${project.id}`);
            console.log(`📊 Domain: ${project.metadata.domain}`);
            console.log(`🎯 Task Type: ${project.metadata.taskType}`);
            console.log(`🔍 Depth: ${project.metadata.depth}`);

            // Monitor progress
            const timeout = 10 * 60 * 1000; // 10 minutes
            const checkInterval = 5000; // 5 seconds
            let elapsed = 0;
            let lastPhase = '';
            let lastSourceCount = 0;
            let lastFindingCount = 0;

            while (elapsed < timeout) {
              const updated = await researchService.getProject(project.id);

              if (!updated) {
                throw new Error(`Project ${project.id} not found`);
              }

              // Show phase changes
              if (updated.phase !== lastPhase) {
                console.log(`\n📍 Phase: ${lastPhase} → ${updated.phase}`);
                lastPhase = updated.phase;
              }

              // Show progress updates
              if (updated.sources.length !== lastSourceCount) {
                console.log(`  📚 Sources: ${lastSourceCount} → ${updated.sources.length}`);
                lastSourceCount = updated.sources.length;
              }

              if (updated.findings.length !== lastFindingCount) {
                console.log(`  💡 Findings: ${lastFindingCount} → ${updated.findings.length}`);
                lastFindingCount = updated.findings.length;
              }

              // Check completion
              if (updated.status === ResearchStatus.COMPLETED) {
                const duration = Date.now() - startTime;
                console.log(`\n✅ Research completed in ${Math.round(duration / 1000)}s`);

                result.success = true;
                result.duration = duration;
                result.sources = updated.sources.length;
                result.findings = updated.findings.length;

                // Process report
                if (updated.report) {
                  result.wordCount = updated.report.wordCount || 0;
                  result.citations = updated.report.citations.length;

                  // Build full report text
                  let fullReport = '';

                  // Title and metadata
                  fullReport += `# ${updated.report.title}\n\n`;
                  fullReport += `**Query ID:** ${query.id}\n`;
                  fullReport += `**Topic:** ${query.topic}\n`;
                  fullReport += `**Generated:** ${new Date().toISOString()}\n\n`;

                  // Abstract
                  if (updated.report.abstract) {
                    fullReport += `## Abstract\n\n${updated.report.abstract}\n\n`;
                  }

                  // Executive Summary
                  if (updated.report.summary) {
                    fullReport += `## Executive Summary\n\n${updated.report.summary}\n\n`;
                  }

                  // Main sections
                  for (const section of updated.report.sections || []) {
                    fullReport += `## ${section.heading}\n\n${section.content}\n\n`;

                    // Subsections
                    if (section.subsections) {
                      for (const subsection of section.subsections) {
                        fullReport += `### ${subsection.heading}\n\n${subsection.content}\n\n`;
                      }
                    }
                  }

                  // Add evaluation metrics if available
                  if (updated.report.evaluationMetrics) {
                    fullReport += '## Evaluation Metrics\n\n';
                    const race = updated.report.evaluationMetrics.raceScore;
                    if (race) {
                      fullReport += '### RACE Score\n';
                      fullReport += `- Overall: ${(race.overall * 100).toFixed(1)}%\n`;
                      fullReport += `- Comprehensiveness: ${(race.comprehensiveness * 100).toFixed(1)}%\n`;
                      fullReport += `- Depth: ${(race.depth * 100).toFixed(1)}%\n`;
                      fullReport += `- Instruction Following: ${(race.instructionFollowing * 100).toFixed(1)}%\n`;
                      fullReport += `- Readability: ${(race.readability * 100).toFixed(1)}%\n\n`;
                    }
                  }

                  // Bibliography
                  if (updated.report.bibliography && updated.report.bibliography.length > 0) {
                    fullReport += '## References\n\n';
                    for (let i = 0; i < updated.report.bibliography.length; i++) {
                      const entry = updated.report.bibliography[i];
                      fullReport += `[${i + 1}] ${entry.citation}\n`;
                    }
                  }

                  result.report = fullReport;

                  // Save report
                  const outputPath = path.join(outputDir, `${query.id}.txt`);
                  await fs.writeFile(outputPath, fullReport);
                  console.log(`\n📁 Report saved to: ${outputPath}`);
                }

                // Log statistics
                console.log('\n📊 Research Statistics:');
                console.log(`  - Sources found: ${result.sources}`);
                console.log(`  - Findings extracted: ${result.findings}`);
                console.log(`  - Word count: ${result.wordCount || 0}`);
                console.log(`  - Citations: ${result.citations || 0}`);

                // Log evaluation if available
                if (updated.evaluationResults) {
                  const race = updated.evaluationResults.raceEvaluation?.scores;
                  const fact = updated.evaluationResults.factEvaluation?.scores;

                  if (race) {
                    console.log('\n📊 RACE Evaluation:');
                    console.log(`  - Overall: ${(race.overall * 100).toFixed(1)}%`);
                    console.log(
                      `  - Comprehensiveness: ${(race.comprehensiveness * 100).toFixed(1)}%`
                    );
                    console.log(`  - Depth: ${(race.depth * 100).toFixed(1)}%`);
                    console.log(
                      `  - Instruction Following: ${(race.instructionFollowing * 100).toFixed(1)}%`
                    );
                    console.log(`  - Readability: ${(race.readability * 100).toFixed(1)}%`);
                  }

                  if (fact) {
                    console.log('\n📊 FACT Evaluation:');
                    console.log(
                      `  - Citation Accuracy: ${(fact.citationAccuracy * 100).toFixed(1)}%`
                    );
                    console.log(`  - Total Citations: ${fact.totalCitations}`);
                    console.log(`  - Verified Citations: ${fact.verifiedCitations}`);
                  }
                }

                break;
              } else if (updated.status === ResearchStatus.FAILED) {
                throw new Error(updated.error || 'Research failed');
              }

              // Progress indicator
              if (elapsed % 30000 === 0 && elapsed > 0) {
                console.log(`⏳ Processing... (${Math.round(elapsed / 1000)}s elapsed)`);
              }

              await new Promise((resolve) => setTimeout(resolve, checkInterval));
              elapsed += checkInterval;
            }

            if (elapsed >= timeout) {
              throw new Error('Research timed out');
            }
          } catch (error) {
            result.error = error instanceof Error ? error.message : String(error);
            console.error(`\n❌ Error: ${result.error}`);
          }

          results.push(result);
        }

        // Summary report
        console.log(`\n\n${'='.repeat(80)}`);
        console.log('📊 BENCHMARK SUMMARY');
        console.log('='.repeat(80));

        const successful = results.filter((r) => r.success);
        const successRate = ((successful.length / results.length) * 100).toFixed(1);

        console.log(`\n✅ Success Rate: ${successful.length}/${results.length} (${successRate}%)`);

        if (successful.length > 0) {
          const avgWordCount =
            successful.reduce((sum, r) => sum + (r.wordCount || 0), 0) / successful.length;
          const avgCitations =
            successful.reduce((sum, r) => sum + (r.citations || 0), 0) / successful.length;
          const avgSources =
            successful.reduce((sum, r) => sum + (r.sources || 0), 0) / successful.length;
          const avgFindings =
            successful.reduce((sum, r) => sum + (r.findings || 0), 0) / successful.length;
          const avgDuration =
            successful.reduce((sum, r) => sum + (r.duration || 0), 0) / successful.length;

          console.log('\n📊 Average Metrics (successful runs):');
          console.log(`  - Word Count: ${Math.round(avgWordCount)}`);
          console.log(`  - Citations: ${Math.round(avgCitations)}`);
          console.log(`  - Sources: ${Math.round(avgSources)}`);
          console.log(`  - Findings: ${Math.round(avgFindings)}`);
          console.log(`  - Duration: ${Math.round(avgDuration / 1000)}s`);
        }

        // Failed queries
        const failed = results.filter((r) => !r.success);
        if (failed.length > 0) {
          console.log('\n❌ Failed Queries:');
          for (const f of failed) {
            console.log(`  - Query ${f.queryId}: ${f.error}`);
          }
        }

        // Save summary
        const summaryPath = path.join(outputDir, 'benchmark_summary.json');
        await fs.writeFile(
          summaryPath,
          JSON.stringify(
            {
              timestamp: new Date().toISOString(),
              totalQueries: results.length,
              successful: successful.length,
              successRate: parseFloat(successRate),
              results,
            },
            null,
            2
          )
        );

        console.log(`\n📁 Summary saved to: ${summaryPath}`);

        // Target metrics
        console.log('\n🎯 DeepResearch Bench Targets:');
        console.log(`  - Success Rate: 100% (current: ${successRate}%)`);
        console.log(
          `  - Min Word Count: 3000 (avg: ${successful.length > 0 ? Math.round(successful.reduce((sum, r) => sum + (r.wordCount || 0), 0) / successful.length) : 0})`
        );
        console.log(
          `  - Min Citations: 30 (avg: ${successful.length > 0 ? Math.round(successful.reduce((sum, r) => sum + (r.citations || 0), 0) / successful.length) : 0})`
        );

        console.log('\n✅ Benchmark evaluation complete!');

        // Fail the test if success rate is below 100%
        if (successful.length < results.length) {
          throw new Error(
            `Only ${successful.length}/${results.length} queries succeeded. Target is 100% success rate.`
          );
        }
      },
    },
  ];
}

export default new DeepResearchBenchFullSuite();
