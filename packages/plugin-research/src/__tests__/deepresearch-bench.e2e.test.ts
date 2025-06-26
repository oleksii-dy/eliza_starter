import './test-setup'; // Load environment variables
import { type TestSuite } from '@elizaos/core';
import { ResearchService } from '../service';
import { ResearchDepth } from '../types';
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

export class DeepResearchBenchSuite implements TestSuite {
  name = 'DeepResearch Benchmark';
  description = 'Run DeepResearch benchmark with real ElizaOS runtime';

  tests = [
    {
      name: 'Run benchmark queries',
      fn: async (runtime: any) => {
        console.log('🚀 Starting DeepResearch Benchmark with ElizaOS runtime');
        console.log('='.repeat(60));

        // Get benchmark parameters from environment
        const limit = parseInt(process.env.BENCH_LIMIT || '5', 10);
        const lang = process.env.BENCH_LANG || 'en';

        // Check if data file exists
        const dataPath = path.join(
          __dirname,
          '../../deep_research_bench/data/prompt_data/query.jsonl'
        );
        const dataExists = await fs
          .access(dataPath)
          .then(() => true)
          .catch(() => false);

        if (!dataExists) {
          console.error(`❌ Benchmark data not found at: ${dataPath}`);
          console.log(
            'Please ensure the deep_research_bench/data directory is populated'
          );
          throw new Error('Benchmark data not found');
        }

        // Load benchmark queries
        const queryData = await fs.readFile(dataPath, 'utf-8');
        const queries: BenchmarkQuery[] = queryData
          .split('\n')
          .filter((line) => line.trim())
          .map((line) => JSON.parse(line))
          .filter((q) => q.language === lang)
          .slice(0, limit);

        console.log(`📝 Found ${queries.length} ${lang} queries to process`);

        if (queries.length === 0) {
          console.error(`❌ No queries found for language: ${lang}`);
          throw new Error('No queries found');
        }

        // Create output directories
        const outputDir = path.join(__dirname, `../../results/eliza/${lang}`);
        await fs.mkdir(outputDir, { recursive: true });

        // Get research service
        const researchService = runtime.getService(
          'research'
        ) as ResearchService;
        if (!researchService) {
          throw new Error('Research service not available');
        }

        // Process each query
        for (const query of queries) {
          console.log(`\n📊 Processing Query ID: ${query.id}`);
          console.log(`📝 Topic: ${query.topic}`);
          console.log(`📝 Query: ${query.prompt.substring(0, 100)}...`);

          try {
            const startTime = Date.now();

            // Create research project
            const project = await researchService.createResearchProject(
              query.prompt,
              {
                researchDepth: 'phd-level' as ResearchDepth,
                maxSearchResults: 30,
                evaluationEnabled: true,
              }
            );

            console.log(`✅ Project created: ${project.id}`);

            // Wait for completion
            const timeout = 10 * 60 * 1000; // 10 minutes per query
            const checkInterval = 5000; // 5 seconds
            let elapsed = 0;

            while (elapsed < timeout) {
              const updated = await researchService.getProject(project.id);

              if (!updated) {
                console.error(`❌ Project ${project.id} not found`);
                break;
              }

              if (updated.status === 'completed') {
                const duration = Date.now() - startTime;
                console.log(
                  `✅ Research completed in ${Math.round(duration / 1000)}s`
                );

                // Save report in benchmark format
                let fullReport = '';

                if (updated.report) {
                  if (updated.report.abstract) {
                    fullReport += `# Abstract\n\n${updated.report.abstract}\n\n`;
                  }

                  if (updated.report.summary) {
                    fullReport += `# Executive Summary\n\n${updated.report.summary}\n\n`;
                  }

                  for (const section of updated.report.sections || []) {
                    // Handle different section formats
                    const title =
                      (section as any).title ||
                      (section as any).heading ||
                      'Section';
                    fullReport += `# ${title}\n\n${section.content}\n\n`;
                  }

                  // Add bibliography if available
                  if (
                    updated.report?.bibliography &&
                    updated.report.bibliography.length > 0
                  ) {
                    fullReport += '\n# References\n\n';
                    for (const entry of updated.report.bibliography) {
                      fullReport += `- ${entry.citation}\n`;
                    }
                  }
                }

                // Save with benchmark query ID as filename
                const outputPath = path.join(outputDir, `${query.id}.txt`);
                await fs.writeFile(outputPath, fullReport);
                console.log(`📁 Saved to: ${outputPath}`);

                // Log performance metrics
                if (updated.metadata?.performanceMetrics) {
                  const metrics = updated.metadata.performanceMetrics;
                  console.log(
                    `📊 Performance: ${metrics.sourcesProcessed} sources, ${metrics.searchQueries} queries`
                  );
                }

                break;
              } else if (updated.status === 'failed') {
                console.error(`❌ Research failed: ${updated.error}`);
                break;
              }

              // Show progress
              if (elapsed % 30000 === 0 && elapsed > 0) {
                console.log(
                  `⏳ Still processing... (${elapsed / 1000}s elapsed)`
                );
              }

              await new Promise((resolve) =>
                setTimeout(resolve, checkInterval)
              );
              elapsed += checkInterval;
            }

            if (elapsed >= timeout) {
              console.error(`❌ Research timed out after ${timeout / 1000}s`);
            }
          } catch (error) {
            console.error(`❌ Error processing query ${query.id}:`, error);
          }
        }

        console.log('\n✅ Benchmark run complete!');
        console.log('\nTo evaluate results, run:');
        console.log(
          `python deep_research_bench/deepresearch_bench_race.py eliza --limit ${limit}`
        );
      },
    },
  ];
}

export default new DeepResearchBenchSuite();
