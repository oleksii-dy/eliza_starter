import { IAgentRuntime, logger } from '@elizaos/core';
import { ResearchService } from '../service';
import {
  EvaluationMetrics,
  EvaluationResults,
  ResearchProject,
  DeepResearchBenchResult,
  ResearchStatus,
} from '../types';
import fs from 'fs/promises';
import path from 'path';

export interface BenchmarkConfig {
  name: string;
  description: string;
  queries: BenchmarkQuery[];
  outputDir: string;
  timeoutMs: number;
  includeReport: boolean;
}

export interface BenchmarkQuery {
  id: string;
  query: string;
  domain?: string;
  depth?: string;
  expectedSources?: number;
  maxDurationMs?: number;
  description?: string;
  metadata?: {
    [key: string]: any;
  };
}

export interface BenchmarkResult {
  benchmarkId: string;
  benchmarkName: string;
  runId: string;
  timestamp: number;
  environment: {
    nodeVersion: string;
    platform: string;
    memoryUsage: NodeJS.MemoryUsage;
  };
  queries: QueryResult[];
  summary: BenchmarkSummary;
  metadata: {
    totalDuration: number;
    successRate: number;
    averageQuality: number;
    configUsed: any;
  };
}

export interface QueryResult {
  queryId: string;
  query: string;
  success: boolean;
  duration: number;
  sourcesFound: number;
  evaluation?: EvaluationMetrics;
  error?: string;
  project?: ResearchProject;
}

export interface BenchmarkSummary {
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  averageDuration: number;
  averageSourcesFound: number;
  averageRaceScore?: number;
  averageFactScore?: number;
  qualityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export class BenchmarkRunner {
  private results: BenchmarkResult[] = [];

  constructor(
    private runtime: IAgentRuntime,
    private researchService: ResearchService
  ) {}

  async runBenchmark(config: BenchmarkConfig): Promise<BenchmarkResult> {
    const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    logger.info(
      `[BenchmarkRunner] Starting benchmark: ${config.name} (${runId})`
    );

    const queryResults: QueryResult[] = [];
    let successCount = 0;
    let totalDuration = 0;
    let totalSources = 0;
    const raceScores: number[] = [];
    const factScores: number[] = [];

    // Run each query
    for (const benchmarkQuery of config.queries) {
      logger.info(`[BenchmarkRunner] Running query: ${benchmarkQuery.id}`);

      const queryStartTime = Date.now();
      let queryResult: QueryResult;

      try {
        // Create research project
        const project = await this.researchService.createResearchProject(
          benchmarkQuery.query,
          {
            domain: benchmarkQuery.domain as any,
            researchDepth: benchmarkQuery.depth as any,
            timeout: benchmarkQuery.maxDurationMs || config.timeoutMs,
          }
        );

        // Wait for completion with timeout
        const completedProject = await this.waitForCompletion(
          project.id,
          benchmarkQuery.maxDurationMs || config.timeoutMs
        );

        const queryDuration = Date.now() - queryStartTime;
        const sourcesFound = completedProject.sources?.length || 0;

        // Evaluate if project completed successfully
        let raceScore: number | undefined;
        let factScore: number | undefined;

        if (
          completedProject.evaluation &&
          'raceScore' in completedProject.evaluation
        ) {
          // EvaluationMetrics format (from report)
          const evalMetrics =
            completedProject.evaluation as unknown as EvaluationMetrics;
          if (evalMetrics.raceScore) {
            raceScore = evalMetrics.raceScore.overall;
            if (raceScore !== undefined) {
              raceScores.push(raceScore);
            }
          }
          if (evalMetrics.factScore) {
            factScore = evalMetrics.factScore.citationAccuracy;
            if (factScore !== undefined) {
              factScores.push(factScore);
            }
          }
        } else if (completedProject.evaluationResults) {
          // EvaluationResults format (from service)
          if (completedProject.evaluationResults.raceEvaluation?.scores) {
            raceScore =
              completedProject.evaluationResults.raceEvaluation.scores.overall;
            if (raceScore !== undefined) {
              raceScores.push(raceScore);
            }
          }
          if (completedProject.evaluationResults.factEvaluation?.scores) {
            factScore =
              completedProject.evaluationResults.factEvaluation.scores
                .citationAccuracy;
            if (factScore !== undefined) {
              factScores.push(factScore);
            }
          }
        }

        // Convert evaluation to EvaluationMetrics format if needed
        let evaluationMetrics: EvaluationMetrics | undefined;
        if (
          completedProject.evaluation &&
          'raceScore' in completedProject.evaluation
        ) {
          evaluationMetrics =
            completedProject.evaluation as unknown as EvaluationMetrics;
        } else if (completedProject.evaluationResults) {
          // Convert EvaluationResults to EvaluationMetrics format
          evaluationMetrics = {
            raceScore:
              completedProject.evaluationResults.raceEvaluation?.scores,
            factScore:
              completedProject.evaluationResults.factEvaluation?.scores,
            timestamp: completedProject.evaluationResults.timestamp,
            evaluatorVersion: '1.0.0',
          };
        }

        queryResult = {
          queryId: benchmarkQuery.id,
          query: benchmarkQuery.query,
          success: true,
          duration: queryDuration,
          sourcesFound,
          evaluation: evaluationMetrics,
          project: completedProject,
        };

        successCount++;
        totalDuration += queryDuration;
        totalSources += sourcesFound;

        logger.info(
          `[BenchmarkRunner] Query ${benchmarkQuery.id} completed successfully`,
          {
            duration: queryDuration,
            sources: sourcesFound,
            raceScore,
          }
        );
      } catch (error) {
        const queryDuration = Date.now() - queryStartTime;
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        queryResult = {
          queryId: benchmarkQuery.id,
          query: benchmarkQuery.query,
          success: false,
          duration: queryDuration,
          sourcesFound: 0,
          error: errorMessage,
        };

        logger.error(
          `[BenchmarkRunner] Query ${benchmarkQuery.id} failed:`,
          error
        );
      }

      queryResults.push(queryResult);
    }

    // Calculate summary
    const averageRaceScore =
      raceScores.length > 0
        ? raceScores.reduce((a, b) => a + b, 0) / raceScores.length
        : undefined;

    const averageFactScore =
      factScores.length > 0
        ? factScores.reduce((a, b) => a + b, 0) / factScores.length
        : undefined;

    const summary: BenchmarkSummary = {
      totalQueries: config.queries.length,
      successfulQueries: successCount,
      failedQueries: config.queries.length - successCount,
      averageDuration: totalDuration / config.queries.length,
      averageSourcesFound: successCount > 0 ? totalSources / successCount : 0,
      averageRaceScore,
      averageFactScore,
      qualityGrade: this.calculateQualityGrade(
        averageRaceScore,
        averageFactScore
      ),
    };

    const benchmarkResult: BenchmarkResult = {
      benchmarkId: config.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      benchmarkName: config.name,
      runId,
      timestamp: Date.now(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsage: process.memoryUsage(),
      },
      queries: queryResults,
      summary,
      metadata: {
        totalDuration: Date.now() - startTime,
        successRate: successCount / config.queries.length,
        averageQuality: averageRaceScore || 0,
        configUsed: config,
      },
    };

    this.results.push(benchmarkResult);

    // Save results
    await this.saveBenchmarkResult(benchmarkResult, config.outputDir);

    if (config.includeReport) {
      await this.generateMarkdownReport(benchmarkResult, config.outputDir);
    }

    logger.info('[BenchmarkRunner] Benchmark completed:', {
      name: config.name,
      runId,
      successRate: summary.successfulQueries / summary.totalQueries,
      averageQuality: averageRaceScore,
      duration: Date.now() - startTime,
    });

    return benchmarkResult;
  }

  private async waitForCompletion(
    projectId: string,
    timeoutMs: number
  ): Promise<ResearchProject> {
    const checkInterval = 1000; // Check every second
    const maxChecks = Math.ceil(timeoutMs / checkInterval);
    let checks = 0;

    while (checks < maxChecks) {
      const project = await this.researchService.getProject(projectId);

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      if (project.status === ResearchStatus.COMPLETED) {
        return project;
      }

      if (project.status === ResearchStatus.FAILED) {
        throw new Error(`Project failed: ${project.error || 'Unknown error'}`);
      }

      await new Promise((resolve) => setTimeout(resolve, checkInterval));
      checks++;
    }

    throw new Error(`Project ${projectId} timed out after ${timeoutMs}ms`);
  }

  private calculateQualityGrade(
    raceScore?: number,
    factScore?: number
  ): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (!raceScore && !factScore) {
      return 'F';
    }

    const avgScore =
      raceScore && factScore
        ? (raceScore + factScore) / 2
        : raceScore || factScore || 0;

    if (avgScore >= 0.9) {
      return 'A';
    }
    if (avgScore >= 0.8) {
      return 'B';
    }
    if (avgScore >= 0.7) {
      return 'C';
    }
    if (avgScore >= 0.6) {
      return 'D';
    }
    return 'F';
  }

  private async saveBenchmarkResult(
    result: BenchmarkResult,
    outputDir: string
  ): Promise<void> {
    try {
      await fs.mkdir(outputDir, { recursive: true });

      const filename = `${result.benchmarkId}_${result.runId}.json`;
      const filepath = path.join(outputDir, filename);

      await fs.writeFile(filepath, JSON.stringify(result, null, 2));

      logger.info(`[BenchmarkRunner] Results saved to: ${filepath}`);
    } catch (error) {
      logger.error('[BenchmarkRunner] Failed to save benchmark result:', error);
    }
  }

  private async generateMarkdownReport(
    result: BenchmarkResult,
    outputDir: string
  ): Promise<void> {
    try {
      const report = this.formatMarkdownReport(result);

      const filename = `${result.benchmarkId}_${result.runId}_report.md`;
      const filepath = path.join(outputDir, filename);

      await fs.writeFile(filepath, report);

      logger.info(`[BenchmarkRunner] Report generated: ${filepath}`);
    } catch (error) {
      logger.error('[BenchmarkRunner] Failed to generate report:', error);
    }
  }

  private formatMarkdownReport(result: BenchmarkResult): string {
    const { summary, metadata, environment } = result;

    return `# Research Benchmark Report

## Benchmark: ${result.benchmarkName}

**Run ID:** ${result.runId}  
**Timestamp:** ${new Date(result.timestamp).toISOString()}  
**Duration:** ${(metadata.totalDuration / 1000).toFixed(1)}s  

## Environment

- **Node Version:** ${environment.nodeVersion}
- **Platform:** ${environment.platform}
- **Memory Usage:** ${Math.round(environment.memoryUsage.heapUsed / 1024 / 1024)}MB

## Summary

| Metric | Value |
|--------|-------|
| **Quality Grade** | **${summary.qualityGrade}** |
| **Success Rate** | ${((summary.successfulQueries / summary.totalQueries) * 100).toFixed(1)}% |
| **Total Queries** | ${summary.totalQueries} |
| **Successful** | ${summary.successfulQueries} |
| **Failed** | ${summary.failedQueries} |
| **Avg Duration** | ${(summary.averageDuration / 1000).toFixed(1)}s |
| **Avg Sources** | ${summary.averageSourcesFound.toFixed(1)} |
| **Avg RACE Score** | ${summary.averageRaceScore ? `${(summary.averageRaceScore * 100).toFixed(1)}%` : 'N/A'} |
| **Avg FACT Score** | ${summary.averageFactScore ? `${(summary.averageFactScore * 100).toFixed(1)}%` : 'N/A'} |

## Detailed Results

${result.queries.map((query) => this.formatQueryResult(query)).join('\n\n')}

## Performance Analysis

### Quality Distribution
${this.generateQualityDistribution(result.queries)}

### Duration Analysis
- **Fastest Query:** ${Math.min(...result.queries.map((q) => q.duration)) / 1000}s
- **Slowest Query:** ${Math.max(...result.queries.map((q) => q.duration)) / 1000}s
- **Standard Deviation:** ${this.calculateStandardDeviation(result.queries.map((q) => q.duration)) / 1000}s

### Source Analysis
- **Most Sources:** ${Math.max(...result.queries.map((q) => q.sourcesFound))}
- **Fewest Sources:** ${Math.min(...result.queries.map((q) => q.sourcesFound))}
- **Source Standard Deviation:** ${this.calculateStandardDeviation(result.queries.map((q) => q.sourcesFound))}

---
*Generated by ElizaOS Research Plugin v1.0*
`;
  }

  private formatQueryResult(query: QueryResult): string {
    const status = query.success ? '✅' : '❌';
    const raceScore = query.evaluation?.raceScore?.overall
      ? `${(query.evaluation.raceScore.overall * 100).toFixed(1)}%`
      : 'N/A';
    const factScore = query.evaluation?.factScore?.citationAccuracy
      ? `${(query.evaluation.factScore.citationAccuracy * 100).toFixed(1)}%`
      : 'N/A';

    return `### ${status} ${query.queryId}

**Query:** ${query.query}  
**Duration:** ${(query.duration / 1000).toFixed(1)}s  
**Sources:** ${query.sourcesFound}  
**RACE Score:** ${raceScore}  
**FACT Score:** ${factScore}  
${query.error ? `**Error:** ${query.error}  ` : ''}`;
  }

  private generateQualityDistribution(queries: QueryResult[]): string {
    const grades = { A: 0, B: 0, C: 0, D: 0, F: 0 };

    queries.forEach((query) => {
      if (query.evaluation?.raceScore) {
        const grade = this.calculateQualityGrade(
          query.evaluation.raceScore.overall
        );
        grades[grade]++;
      } else {
        grades.F++;
      }
    });

    return Object.entries(grades)
      .map(([grade, count]) => `- **${grade}:** ${count} queries`)
      .join('\n');
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  async getAllResults(): Promise<BenchmarkResult[]> {
    return [...this.results];
  }

  async loadPreviousResults(outputDir: string): Promise<BenchmarkResult[]> {
    try {
      const files = await fs.readdir(outputDir);
      const jsonFiles = files.filter(
        (f) => f.endsWith('.json') && !f.includes('_report')
      );

      const results: BenchmarkResult[] = [];

      for (const file of jsonFiles) {
        try {
          const content = await fs.readFile(
            path.join(outputDir, file),
            'utf-8'
          );
          const result = JSON.parse(content) as BenchmarkResult;
          results.push(result);
        } catch (error) {
          logger.warn(
            `[BenchmarkRunner] Failed to load result file ${file}:`,
            error
          );
        }
      }

      return results.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      logger.error('[BenchmarkRunner] Failed to load previous results:', error);
      return [];
    }
  }
}
