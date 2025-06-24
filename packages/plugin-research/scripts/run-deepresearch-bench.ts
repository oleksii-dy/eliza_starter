import { ResearchService } from '../src/service';
import { ResearchDepth } from '../src/types';
import { IAgentRuntime, ModelType, logger } from '@elizaos/core';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a runtime with necessary capabilities
const createRuntime = (): IAgentRuntime => {
  return {
    agentId: 'deepresearch-bench-agent',
    getSetting: (key: string) => {
      const settings: Record<string, string> = {
        // Research settings
        RESEARCH_MAX_RESULTS: '50',
        RESEARCH_TIMEOUT: '600000',
        RESEARCH_ENABLE_CITATIONS: 'true',
        RESEARCH_LANGUAGE: 'en',
        RESEARCH_QUALITY_THRESHOLD: '0.7',

        // API keys from environment
        TAVILY_API_KEY: process.env.TAVILY_API_KEY || '',
        EXA_API_KEY: process.env.EXA_API_KEY || '',
        SERPAPI_API_KEY: process.env.SERPAPI_API_KEY || '',
        SERPER_API_KEY: process.env.SERPER_API_KEY || '',
        SEMANTIC_SCHOLAR_API_KEY: process.env.SEMANTIC_SCHOLAR_API_KEY || '',
        FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY || '',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      };
      return settings[key] || null;
    },
    useModel: async (modelType: typeof ModelType[keyof typeof ModelType], params: any) => {
      // Use OpenAI API for actual LLM calls
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        logger.warn('No OpenAI API key found, using mock responses');
        return 'Mock response for benchmark testing';
      }

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: modelType === ModelType.TEXT_LARGE ? 'gpt-4' : 'gpt-3.5-turbo',
            messages: params.messages,
            temperature: params.temperature || 0.7,
            max_tokens: params.max_tokens || 2000,
          }),
        });

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error.message);
        }

        return data.choices[0].message.content;
      } catch (error) {
        logger.error('OpenAI API error:', error);
        throw error;
      }
    },
    getService: (name: string) => null,
    character: {
      name: 'DeepResearch Bench Agent',
      bio: ['A research agent for benchmark evaluation'],
      system: 'You are an expert research assistant.',
    },
  } as unknown as IAgentRuntime;
};

interface BenchmarkQuery {
  id: number;
  topic: string;
  language: string;
  prompt: string;
}

async function runBenchmark() {
  console.log('🚀 Starting DeepResearch Bench Evaluation');
  console.log('=' .repeat(60));

  // Load benchmark queries
  const dataPath = path.join(__dirname, '../deep_research_bench/data/prompt_data/query.jsonl');
  const queryData = await fs.readFile(dataPath, 'utf-8');

  // Get first 5 English queries
  const allQueries: BenchmarkQuery[] = queryData
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));

  const englishQueries = allQueries
    .filter(q => q.language === 'en')
    .slice(0, 5);

  console.log(`📝 Found ${englishQueries.length} English queries to process\n`);

  // Create output directory
  const outputDir = path.join(__dirname, '../results/eliza/en');
  await fs.mkdir(outputDir, { recursive: true });

  // Initialize research service
  const runtime = createRuntime();
  const researchService = new ResearchService(runtime);

  // Track results
  const results: any[] = [];

  for (const query of englishQueries) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Processing Query ID: ${query.id}`);
    console.log(`📝 Topic: ${query.topic}`);
    console.log(`📝 Query: ${query.prompt.substring(0, 200)}${query.prompt.length > 200 ? '...' : ''}`);
    console.log(`${'='.repeat(60)}\n`);

    const startTime = Date.now();

    try {
      // Create research project with DeepResearch Bench settings
      const project = await researchService.createResearchProject(query.prompt, {
        researchDepth: ResearchDepth.PHD_LEVEL,
        maxSearchResults: 50,
        evaluationEnabled: true,
        parallelSearches: 10,
        enableCitations: true,
        qualityThreshold: 0.7,
      });

      console.log(`✅ Project created: ${project.id}`);
      console.log(`📊 Domain: ${project.metadata.domain}`);
      console.log(`🎯 Task Type: ${project.metadata.taskType}`);
      console.log(`🔍 Depth: ${project.metadata.depth}`);

      // Wait for completion with progress updates
      const timeout = 10 * 60 * 1000; // 10 minutes
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
          console.log(`\n📍 Phase: ${updated.phase}`);
          lastPhase = updated.phase;
        }

        if (updated.status === 'completed') {
          const duration = Date.now() - startTime;
          console.log(`\n✅ Research completed in ${Math.round(duration / 1000)}s`);

          // Log statistics
          console.log('\n📊 Research Statistics:');
          console.log(`  - Sources found: ${updated.sources.length}`);
          console.log(`  - Findings extracted: ${updated.findings.length}`);
          console.log(`  - Word count: ${updated.report?.wordCount || 0}`);
          console.log(`  - Citations: ${updated.report?.citations.length || 0}`);

          // Log evaluation results if available
          if (updated.evaluationResults) {
            const race = updated.evaluationResults.raceEvaluation.scores;
            const fact = updated.evaluationResults.factEvaluation.scores;

            console.log('\n📊 RACE Evaluation:');
            console.log(`  - Overall: ${(race.overall * 100).toFixed(1)}%`);
            console.log(`  - Comprehensiveness: ${(race.comprehensiveness * 100).toFixed(1)}%`);
            console.log(`  - Depth: ${(race.depth * 100).toFixed(1)}%`);
            console.log(`  - Instruction Following: ${(race.instructionFollowing * 100).toFixed(1)}%`);
            console.log(`  - Readability: ${(race.readability * 100).toFixed(1)}%`);

            console.log('\n📊 FACT Evaluation:');
            console.log(`  - Citation Accuracy: ${(fact.citationAccuracy * 100).toFixed(1)}%`);
            console.log(`  - Total Citations: ${fact.totalCitations}`);
            console.log(`  - Verified Citations: ${fact.verifiedCitations}`);
          }

          // Save report
          let fullReport = '';

          if (updated.report) {
            // Add title and abstract
            fullReport += `# ${updated.report.title}\n\n`;

            if (updated.report.abstract) {
              fullReport += `## Abstract\n\n${updated.report.abstract}\n\n`;
            }

            if (updated.report.summary) {
              fullReport += `## Executive Summary\n\n${updated.report.summary}\n\n`;
            }

            // Add sections
            for (const section of updated.report.sections || []) {
              fullReport += `## ${section.heading}\n\n${section.content}\n\n`;

              // Add subsections if any
              if (section.subsections) {
                for (const subsection of section.subsections) {
                  fullReport += `### ${subsection.heading}\n\n${subsection.content}\n\n`;
                }
              }
            }

            // Add bibliography
            if (updated.report.bibliography && updated.report.bibliography.length > 0) {
              fullReport += '\n## References\n\n';
              for (const entry of updated.report.bibliography) {
                fullReport += `- ${entry.citation}\n`;
              }
            }
          }

          // Save with benchmark query ID as filename
          const outputPath = path.join(outputDir, `${query.id}.txt`);
          await fs.writeFile(outputPath, fullReport);
          console.log(`\n📁 Report saved to: ${outputPath}`);

          // Track result
          results.push({
            queryId: query.id,
            success: true,
            duration,
            wordCount: updated.report?.wordCount || 0,
            citations: updated.report?.citations.length || 0,
            raceScore: updated.evaluationResults?.raceEvaluation.scores.overall || 0,
            factScore: updated.evaluationResults?.factEvaluation.scores.citationAccuracy || 0,
          });

          break;
        } else if (updated.status === 'failed') {
          console.error(`\n❌ Research failed: ${updated.error}`);
          results.push({
            queryId: query.id,
            success: false,
            error: updated.error,
          });
          break;
        }

        // Show progress every 30 seconds
        if (elapsed % 30000 === 0 && elapsed > 0) {
          console.log(`⏳ Still processing... (${elapsed / 1000}s elapsed)`);
          if (updated.sources.length > 0) {
            console.log(`  - Sources so far: ${updated.sources.length}`);
          }
          if (updated.findings.length > 0) {
            console.log(`  - Findings so far: ${updated.findings.length}`);
          }
        }

        await new Promise(resolve => setTimeout(resolve, checkInterval));
        elapsed += checkInterval;
      }

      if (elapsed >= timeout) {
        console.error(`\n❌ Research timed out after ${timeout / 1000}s`);
        results.push({
          queryId: query.id,
          success: false,
          error: 'Timeout',
        });
      }

    } catch (error) {
      console.error(`\n❌ Error processing query ${query.id}:`, error);
      results.push({
        queryId: query.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Summary
  console.log(`\n\n${'='.repeat(60)}`);
  console.log('📊 BENCHMARK SUMMARY');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success);
  console.log(`\n✅ Successful: ${successful.length}/${results.length} (${(successful.length / results.length * 100).toFixed(1)}%)`);

  if (successful.length > 0) {
    const avgWordCount = successful.reduce((sum, r) => sum + r.wordCount, 0) / successful.length;
    const avgCitations = successful.reduce((sum, r) => sum + r.citations, 0) / successful.length;
    const avgRaceScore = successful.reduce((sum, r) => sum + r.raceScore, 0) / successful.length;
    const avgFactScore = successful.reduce((sum, r) => sum + r.factScore, 0) / successful.length;
    const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;

    console.log('\n📊 Average Metrics:');
    console.log(`  - Word Count: ${Math.round(avgWordCount)}`);
    console.log(`  - Citations: ${Math.round(avgCitations)}`);
    console.log(`  - RACE Score: ${(avgRaceScore * 100).toFixed(1)}%`);
    console.log(`  - FACT Score: ${(avgFactScore * 100).toFixed(1)}%`);
    console.log(`  - Duration: ${Math.round(avgDuration / 1000)}s`);
  }

  // Save results summary
  const summaryPath = path.join(outputDir, 'benchmark_summary.json');
  await fs.writeFile(summaryPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalQueries: results.length,
    successful: successful.length,
    results,
  }, null, 2));

  console.log(`\n📁 Summary saved to: ${summaryPath}`);

  console.log('\n\n✅ Benchmark run complete!');
  console.log('\nTo evaluate with DeepResearch Bench tools:');
  console.log('python deep_research_bench/deepresearch_bench_race.py eliza --limit 5');
}

// Run the benchmark
runBenchmark().catch(console.error);
