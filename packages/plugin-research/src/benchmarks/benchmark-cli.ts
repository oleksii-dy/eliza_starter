#!/usr/bin/env node

import { logger } from '@elizaos/core';
import { BenchmarkRunner } from './benchmark-runner';
import { STANDARD_BENCHMARKS, getBenchmarkByName, getAllBenchmarkNames } from './standard-benchmarks';
import { ResearchService } from '../service';
import fs from 'fs/promises';
import path from 'path';

// Mock runtime for CLI usage
class CLIRuntime {
  private settings: Map<string, string> = new Map();

  constructor() {
    // Load environment variables
    this.loadEnvironmentVariables();
  }

  private loadEnvironmentVariables() {
    const envVars = [
      'TAVILY_API_KEY',
      'SERPER_API_KEY',
      'EXA_API_KEY',
      'SERPAPI_API_KEY',
      'FIRECRAWL_API_KEY',
      'SEMANTIC_SCHOLAR_API_KEY',
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'RESEARCH_MAX_RESULTS',
      'RESEARCH_TIMEOUT',
      'RESEARCH_DEPTH',
      'RESEARCH_DOMAIN',
    ];

    for (const envVar of envVars) {
      const value = process.env[envVar];
      if (value) {
        this.settings.set(envVar, value);
      }
    }
  }

  getSetting(key: string): string | null {
    return this.settings.get(key) || null;
  }

  // Mock useModel for CLI usage
  async useModel(type: any, params: any): Promise<any> {
    // This is a simplified mock - in real usage, you'd connect to your AI model
    if (process.env.OPENAI_API_KEY) {
      // Could integrate with OpenAI here
      throw new Error('CLI mode: Please implement AI model integration for full benchmark functionality');
    }

    throw new Error('CLI mode: No AI model available. Set OPENAI_API_KEY or ANTHROPIC_API_KEY');
  }

  // Additional required properties for IAgentRuntime interface
  agentId = 'benchmark-cli';
  character = { name: 'Benchmark Runner' };
  providers = [];
  actions = [];
  evaluators = [];
  plugins = [];
  services = new Map();
  events = new Map();
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printHelp();
    process.exit(0);
  }

  const command = args[0];

  try {
    switch (command) {
      case 'list':
        listBenchmarks();
        break;

      case 'run':
        if (args.length < 2) {
          console.error('Error: Please specify a benchmark name');
          console.error('Usage: benchmark-cli run <benchmark-name>');
          console.error('Available benchmarks:', getAllBenchmarkNames().join(', '));
          process.exit(1);
        }
        await runBenchmark(args[1], args.slice(2));
        break;

      case 'results':
        await showResults(args.slice(1));
        break;

      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('Benchmark failed:', error);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
ElizaOS Research Benchmark CLI

Usage:
  benchmark-cli <command> [options]

Commands:
  list                    List all available benchmarks
  run <name>             Run a specific benchmark
  results [--latest]     Show benchmark results

Examples:
  benchmark-cli list
  benchmark-cli run deepresearch
  benchmark-cli run speed --output ./my-results
  benchmark-cli results --latest

Available Benchmarks:
  ${getAllBenchmarkNames().map(name => `  ${name}`).join('\n')}

Environment Variables:
  TAVILY_API_KEY         API key for Tavily search
  SERPER_API_KEY         API key for Serper search  
  EXA_API_KEY            API key for Exa search
  SERPAPI_API_KEY        API key for SerpAPI search
  FIRECRAWL_API_KEY      API key for Firecrawl content extraction
  OPENAI_API_KEY         API key for OpenAI models
  ANTHROPIC_API_KEY      API key for Anthropic models

Configuration:
  RESEARCH_MAX_RESULTS   Maximum search results (default: 50)
  RESEARCH_TIMEOUT       Timeout in milliseconds (default: 600000)
  RESEARCH_DEPTH         Research depth: surface, moderate, deep, phd_level
  RESEARCH_DOMAIN        Research domain (default: general)
`);
}

function listBenchmarks() {
  console.log('Available Benchmarks:\n');

  Object.entries(STANDARD_BENCHMARKS).forEach(([name, config]) => {
    console.log(`📊 ${config.name}`);
    console.log(`   ID: ${name}`);
    console.log(`   Description: ${config.description}`);
    console.log(`   Queries: ${config.queries.length}`);
    console.log(`   Timeout: ${config.timeoutMs / 1000}s per query`);
    console.log('');
  });
}

async function runBenchmark(benchmarkName: string, additionalArgs: string[]) {
  const config = getBenchmarkByName(benchmarkName);

  if (!config) {
    console.error(`Benchmark '${benchmarkName}' not found`);
    console.error('Available benchmarks:', getAllBenchmarkNames().join(', '));
    process.exit(1);
  }

  // Parse additional arguments
  const outputIndex = additionalArgs.indexOf('--output');
  if (outputIndex !== -1 && outputIndex + 1 < additionalArgs.length) {
    config.outputDir = additionalArgs[outputIndex + 1];
  }

  console.log(`🚀 Starting benchmark: ${config.name}`);
  console.log(`📁 Output directory: ${config.outputDir}`);
  console.log(`⏱️  Timeout: ${config.timeoutMs / 1000}s per query`);
  console.log(`📝 Queries: ${config.queries.length}`);
  console.log('');

  // Validate environment
  await validateEnvironment();

  // Create runtime and services
  const runtime = new CLIRuntime() as any;
  const researchService = new ResearchService(runtime);

  // Create benchmark runner
  const runner = new BenchmarkRunner(runtime, researchService);

  // Run benchmark
  console.log('⏳ Running benchmark...\n');
  const startTime = Date.now();

  try {
    const result = await runner.runBenchmark(config);

    const duration = Date.now() - startTime;

    console.log('\n🎉 Benchmark completed successfully!');
    console.log(`⏱️  Total duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`✅ Success rate: ${((result.summary.successfulQueries / result.summary.totalQueries) * 100).toFixed(1)}%`);
    console.log(`📊 Quality grade: ${result.summary.qualityGrade}`);
    console.log(`📁 Results saved to: ${config.outputDir}`);

    if (result.summary.averageRaceScore) {
      console.log(`🎯 Average RACE score: ${(result.summary.averageRaceScore * 100).toFixed(1)}%`);
    }

    if (result.summary.averageFactScore) {
      console.log(`📚 Average FACT score: ${(result.summary.averageFactScore * 100).toFixed(1)}%`);
    }

  } catch (error) {
    console.error('\n❌ Benchmark failed:', error);
    process.exit(1);
  }
}

async function showResults(args: string[]) {
  const outputDir = '/Users/shawwalters/eliza-self/packages/docs/benchmarks';

  try {
    const files = await fs.readdir(outputDir);
    const reportFiles = files.filter(f => f.endsWith('_report.md'));

    if (reportFiles.length === 0) {
      console.log('No benchmark results found');
      return;
    }

    const latest = args.includes('--latest');

    if (latest) {
      // Show the latest report
      const latestReport = reportFiles.sort().reverse()[0];
      const content = await fs.readFile(path.join(outputDir, latestReport), 'utf-8');
      console.log(content);
    } else {
      // List all reports
      console.log('Available benchmark reports:\n');

      reportFiles.sort().reverse().forEach(file => {
        const parts = file.replace('_report.md', '').split('_');
        const runId = parts.pop();
        const benchmarkId = parts.join('_');

        console.log(`📊 ${benchmarkId}`);
        console.log(`   Run ID: ${runId}`);
        console.log(`   File: ${file}`);
        console.log('');
      });

      console.log('Use --latest to view the most recent report');
    }

  } catch (error) {
    console.error('Failed to read results:', error);
  }
}

async function validateEnvironment() {
  const required = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'];
  const searchProviders = ['TAVILY_API_KEY', 'SERPER_API_KEY', 'EXA_API_KEY', 'SERPAPI_API_KEY'];

  // Check for at least one AI model key
  const hasAIKey = required.some(key => process.env[key]);
  if (!hasAIKey) {
    console.warn('⚠️  Warning: No AI model API key found');
    console.warn('   Set OPENAI_API_KEY or ANTHROPIC_API_KEY for full functionality');
  }

  // Check for at least one search provider
  const hasSearchKey = searchProviders.some(key => process.env[key]);
  if (!hasSearchKey) {
    console.warn('⚠️  Warning: No search provider API key found');
    console.warn('   Set at least one of: TAVILY_API_KEY, SERPER_API_KEY, EXA_API_KEY, SERPAPI_API_KEY');
  }

  if (!hasAIKey || !hasSearchKey) {
    console.warn('   Some benchmark features may be limited\n');
  }
}

// Run the CLI
if (require.main === module) {
  main().catch(error => {
    console.error('CLI Error:', error);
    process.exit(1);
  });
}

export { main };
