import { elizaLogger, type IAgentRuntime, type Memory, type State } from '@elizaos/core';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { SWEBenchDataLoader } from '../swe-bench/data-loader';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import type {
  SWEBenchInstance,
  BenchmarkOptions,
  BenchmarkReport,
  SWEBenchResult,
} from '../swe-bench/types';

const execAsync = promisify(exec);

interface ContainerPool {
  totalContainers: number;
  availableContainers: number;
  busyContainers: number;
  containersByLanguage: Record<string, number>;
}

interface DistributedTask {
  id: string;
  instanceId: string;
  instance: SWEBenchInstance;
  language: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  containerId?: string;
  startTime?: Date;
  endTime?: Date;
  result?: SWEBenchResult;
  error?: string;
}

export class DistributedSWEBenchManager {
  private runtime: IAgentRuntime;
  private bridgeServerUrl: string;
  private dataLoader: SWEBenchDataLoader;
  private tasks: Map<string, DistributedTask> = new Map();
  private isRunning: boolean = false;
  private dockerComposeFile: string;

  constructor(
    runtime: IAgentRuntime,
    config?: {
      bridgeServerUrl?: string;
      dockerComposeFile?: string;
    }
  ) {
    this.runtime = runtime;
    this.bridgeServerUrl = config?.bridgeServerUrl || 'http://localhost:8080';
    this.dockerComposeFile =
      config?.dockerComposeFile ||
      path.join(process.cwd(), 'docker/compose/docker-compose.swe-bench.yml');

    const cacheDir = path.join(process.cwd(), '.eliza-temp', 'swe-bench-cache');
    this.dataLoader = new SWEBenchDataLoader(cacheDir);
  }

  /**
   * Start the distributed SWE-bench infrastructure
   */
  async startInfrastructure(): Promise<void> {
    elizaLogger.info('[DISTRIBUTED] Starting SWE-bench infrastructure...');

    try {
      // Build base image first
      elizaLogger.info('[DISTRIBUTED] Building base Docker image...');
      await execAsync(
        'docker build -f docker/base/Dockerfile.base -t plugin-autocoder-base:latest .',
        { cwd: process.cwd() }
      );

      // Start docker-compose
      elizaLogger.info('[DISTRIBUTED] Starting Docker Compose services...');
      await execAsync(`docker-compose -f ${this.dockerComposeFile} up -d`, { cwd: process.cwd() });

      // Wait for services to be ready
      await this.waitForServices();

      elizaLogger.info('[DISTRIBUTED] Infrastructure started successfully');
    } catch (error) {
      elizaLogger.error('[DISTRIBUTED] Failed to start infrastructure:', error);
      throw error;
    }
  }

  /**
   * Stop the distributed infrastructure
   */
  async stopInfrastructure(): Promise<void> {
    elizaLogger.info('[DISTRIBUTED] Stopping infrastructure...');

    try {
      await execAsync(`docker-compose -f ${this.dockerComposeFile} down`, { cwd: process.cwd() });
      elizaLogger.info('[DISTRIBUTED] Infrastructure stopped');
    } catch (error) {
      elizaLogger.error('[DISTRIBUTED] Failed to stop infrastructure:', error);
    }
  }

  /**
   * Wait for all services to be ready
   */
  private async waitForServices(): Promise<void> {
    const maxAttempts = 30;
    const delayMs = 2000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Check bridge server health
        const response = await axios.get(`${this.bridgeServerUrl}/health`);
        if (response.data.status === 'healthy') {
          elizaLogger.info('[DISTRIBUTED] Bridge server is ready');

          // Wait for containers to register
          await new Promise((resolve) => setTimeout(resolve, 5000));

          const containerResponse = await axios.get(`${this.bridgeServerUrl}/containers`);
          const containerCount = containerResponse.data.length;

          if (containerCount >= 8) {
            // Expecting at least 8 containers
            elizaLogger.info(`[DISTRIBUTED] ${containerCount} containers registered`);
            return;
          }
        }
      } catch (error) {
        // Service not ready yet
      }

      elizaLogger.info(`[DISTRIBUTED] Waiting for services... (attempt ${attempt}/${maxAttempts})`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    throw new Error('Services failed to start within timeout');
  }

  /**
   * Run distributed SWE-bench evaluation
   */
  async runDistributedBenchmark(options: BenchmarkOptions): Promise<BenchmarkReport> {
    if (this.isRunning) {
      throw new Error('Benchmark is already running');
    }

    this.isRunning = true;
    const startTime = new Date();
    const runId = `distributed-${Date.now()}`;

    try {
      // Initialize data loader
      await this.dataLoader.initialize();

      // Load instances
      const instances = await this.loadInstances(options);
      elizaLogger.info(`[DISTRIBUTED] Loaded ${instances.length} instances for evaluation`);

      // Create tasks
      const tasks = instances.map((instance) => ({
        id: uuidv4(),
        instanceId: instance.instance_id,
        instance,
        language: instance.language.toLowerCase(),
        status: 'queued' as const,
      }));

      // Submit tasks to bridge server
      const submittedTasks = await this.submitTasks(tasks);

      // Monitor progress
      const results = await this.monitorTasks(submittedTasks);

      // Create report
      const endTime = new Date();
      const report: BenchmarkReport = {
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration: endTime.getTime() - startTime.getTime(),
        config: options,
        results: this.aggregateResults(results),
        artifacts_dir: path.join(
          process.cwd(),
          '.eliza-temp',
          'swe-bench-work',
          'distributed',
          runId
        ),
        logs_dir: path.join(
          process.cwd(),
          '.eliza-temp',
          'swe-bench-work',
          'distributed',
          runId,
          'logs'
        ),
      };

      // Save report
      await this.saveReport(report, runId);

      return report;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Load instances based on options
   */
  private async loadInstances(options: BenchmarkOptions): Promise<SWEBenchInstance[]> {
    let instances = await this.dataLoader.loadDataset();

    // Apply filters
    if (options.instance_ids && options.instance_ids.length > 0) {
      instances = instances.filter((i) => options.instance_ids!.includes(i.instance_id));
    }

    if (options.language_filter && options.language_filter.length > 0) {
      // For distributed, we support all languages
      const expandedFilter = this.expandLanguageFilter(options.language_filter);
      instances = instances.filter((i) => expandedFilter.includes(i.language as any));
    }

    if (options.repo_filter && options.repo_filter.length > 0) {
      instances = instances.filter((i) =>
        options.repo_filter!.some((repo) => i.repo.includes(repo))
      );
    }

    if (options.max_instances) {
      instances = instances.slice(0, options.max_instances);
    }

    return instances;
  }

  /**
   * Expand language filter to include all supported languages
   */
  private expandLanguageFilter(filter: string[]): string[] {
    const allLanguages = ['typescript', 'javascript', 'java', 'go', 'rust', 'c', 'cpp'];

    // If filter only has TS/JS, expand to all languages for distributed mode
    if (filter.length === 2 && filter.includes('TypeScript') && filter.includes('JavaScript')) {
      return allLanguages;
    }

    return filter.map((lang) => lang.toLowerCase());
  }

  /**
   * Submit tasks to bridge server
   */
  private async submitTasks(tasks: DistributedTask[]): Promise<DistributedTask[]> {
    elizaLogger.info(`[DISTRIBUTED] Submitting ${tasks.length} tasks to bridge server`);

    const submittedTasks: DistributedTask[] = [];

    for (const task of tasks) {
      try {
        // Generate patch using runtime
        const patch = await this.generatePatch(task.instance);

        // Submit to bridge
        const response = await axios.post(`${this.bridgeServerUrl}/task`, {
          type: 'swe_bench_evaluation',
          data: {
            instance: task.instance,
            patch: patch,
            config: {
              timeout: 300000,
              saveArtifacts: true,
            },
          },
          language: task.language,
          priority: this.calculatePriority(task.instance),
        });

        task.id = response.data.taskId;
        this.tasks.set(task.id, task);
        submittedTasks.push(task);

        elizaLogger.info(`[DISTRIBUTED] Submitted task ${task.id} for instance ${task.instanceId}`);
      } catch (error) {
        elizaLogger.error(`[DISTRIBUTED] Failed to submit task for ${task.instanceId}:`, error);
        task.status = 'failed';
        task.error = error instanceof Error ? error.message : String(error);
      }
    }

    return submittedTasks;
  }

  /**
   * Generate patch for instance using runtime
   */
  private async generatePatch(instance: SWEBenchInstance): Promise<string> {
    // Use the runtime to generate a patch
    const prompt = `Generate a patch for the following SWE-bench instance:

Repository: ${instance.repo}
Issue: ${instance.issue_title}
Description: ${instance.issue_body}
Language: ${instance.language}

Problem Statement: ${instance.problem_statement || instance.issue_body}

Generate a unified diff patch that fixes this issue.`;

    const response = await this.runtime.useModel('TEXT_LARGE', {
      prompt,
      maxTokens: 4000,
      temperature: 0.2,
    });

    return response as string;
  }

  /**
   * Calculate task priority based on instance properties
   */
  private calculatePriority(instance: SWEBenchInstance): number {
    let priority = 0;

    // Prioritize by language (balance workload)
    const languagePriorities: Record<string, number> = {
      typescript: 10,
      javascript: 10,
      java: 8,
      go: 7,
      rust: 6,
      c: 5,
      cpp: 5,
    };

    priority += languagePriorities[instance.language.toLowerCase()] || 0;

    // Prioritize smaller repositories
    if (instance.repo.includes('small') || instance.repo.includes('mini')) {
      priority += 5;
    }

    return priority;
  }

  /**
   * Monitor task progress
   */
  private async monitorTasks(tasks: DistributedTask[]): Promise<SWEBenchResult[]> {
    elizaLogger.info(`[DISTRIBUTED] Monitoring ${tasks.length} tasks`);

    const results: SWEBenchResult[] = [];
    const checkInterval = 5000; // 5 seconds
    const timeout = 3600000; // 1 hour total timeout
    const startTime = Date.now();

    while (tasks.some((t) => t.status === 'queued' || t.status === 'running')) {
      // Check timeout
      if (Date.now() - startTime > timeout) {
        elizaLogger.warn('[DISTRIBUTED] Timeout reached, canceling remaining tasks');
        break;
      }

      // Update task statuses
      for (const task of tasks) {
        if (task.status === 'completed' || task.status === 'failed') {
          continue;
        }

        try {
          const response = await axios.get(`${this.bridgeServerUrl}/task/${task.id}`);
          const serverTask = response.data;

          task.status = serverTask.status;

          if (serverTask.status === 'completed') {
            task.endTime = new Date(serverTask.completedAt);
            task.result = this.convertToSWEBenchResult(serverTask.result, task);
            results.push(task.result);
            elizaLogger.info(`[DISTRIBUTED] Task ${task.id} completed for ${task.instanceId}`);
          } else if (serverTask.status === 'failed') {
            task.endTime = new Date(serverTask.completedAt);
            task.error = serverTask.error;
            elizaLogger.error(
              `[DISTRIBUTED] Task ${task.id} failed for ${task.instanceId}: ${task.error}`
            );
          } else if (serverTask.status === 'running' && !task.startTime) {
            task.startTime = new Date(serverTask.startedAt);
            task.containerId = serverTask.containerId;
            elizaLogger.info(
              `[DISTRIBUTED] Task ${task.id} started on container ${task.containerId}`
            );
          }
        } catch (error) {
          elizaLogger.error(`[DISTRIBUTED] Failed to check task ${task.id}:`, error);
        }
      }

      // Log progress
      const completed = tasks.filter((t) => t.status === 'completed').length;
      const failed = tasks.filter((t) => t.status === 'failed').length;
      const running = tasks.filter((t) => t.status === 'running').length;
      const queued = tasks.filter((t) => t.status === 'queued').length;

      elizaLogger.info(
        `[DISTRIBUTED] Progress: ${completed} completed, ${failed} failed, ` +
          `${running} running, ${queued} queued`
      );

      // Get container pool status
      try {
        const poolStatus = await this.getContainerPoolStatus();
        elizaLogger.info(
          `[DISTRIBUTED] Container pool: ${poolStatus.availableContainers}/${poolStatus.totalContainers} available`
        );
      } catch (error) {
        // Ignore errors getting pool status
      }

      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    return results;
  }

  /**
   * Convert server result to SWEBenchResult
   */
  private convertToSWEBenchResult(serverResult: any, task: DistributedTask): SWEBenchResult {
    return {
      instance_id: task.instanceId,
      success: serverResult.success,
      patch: serverResult.patch || '',
      execution_time: serverResult.executionTime || 0,
      iterations: 1,
      token_usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total: 0,
        cost: 0,
      },
      test_results: {
        total: 0,
        passed: serverResult.success ? 1 : 0,
        failed: serverResult.success ? 0 : 1,
        skipped: 0,
        duration: serverResult.executionTime || 0,
      },
      compilation_success: true,
    };
  }

  /**
   * Get container pool status
   */
  private async getContainerPoolStatus(): Promise<ContainerPool> {
    try {
      const response = await axios.get(`${this.bridgeServerUrl}/containers`);
      const containers = response.data;

      const languageCounts: Record<string, number> = {};
      let available = 0;
      let busy = 0;

      for (const container of containers) {
        if (container.status === 'idle') {
          available++;
        } else if (container.status === 'busy') {
          busy++;
        }

        languageCounts[container.languageType] = (languageCounts[container.languageType] || 0) + 1;
      }

      return {
        totalContainers: containers.length,
        availableContainers: available,
        busyContainers: busy,
        containersByLanguage: languageCounts,
      };
    } catch (error) {
      return {
        totalContainers: 0,
        availableContainers: 0,
        busyContainers: 0,
        containersByLanguage: {},
      };
    }
  }

  /**
   * Aggregate results into evaluation summary
   */
  private aggregateResults(results: SWEBenchResult[]): any {
    const total = results.length;
    const successful = results.filter((r) => r.success).length;

    const byLanguage: Record<string, { total: number; successful: number }> = {};

    for (const task of this.tasks.values()) {
      const lang = task.language;
      if (!byLanguage[lang]) {
        byLanguage[lang] = { total: 0, successful: 0 };
      }
      byLanguage[lang].total++;

      if (task.result?.success) {
        byLanguage[lang].successful++;
      }
    }

    return {
      total_instances: total,
      resolved_instances: successful,
      resolution_rate: total > 0 ? successful / total : 0,
      by_language: byLanguage,
      execution_time: {
        total: results.reduce((sum, r) => sum + r.execution_time, 0),
        average: total > 0 ? results.reduce((sum, r) => sum + r.execution_time, 0) / total : 0,
      },
      per_instance_results: results,
    };
  }

  /**
   * Save benchmark report
   */
  private async saveReport(report: BenchmarkReport, runId: string): Promise<void> {
    const reportDir = path.join(process.cwd(), '.eliza-temp', 'swe-bench-work', 'distributed', runId);
      process.cwd(),
      '.eliza-temp',
      'swe-bench-work',
      'distributed',
      runId
    );
    await fs.mkdir(reportDir, { recursive: true });

    const reportPath = path.join(reportDir, 'report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    elizaLogger.info(`[DISTRIBUTED] Report saved to ${reportPath}`);

    // Also save a summary
    const summaryPath = path.join(reportDir, 'summary.md');
    const summary = this.generateSummary(report);
    await fs.writeFile(summaryPath, summary);
  }

  /**
   * Generate markdown summary
   */
  private generateSummary(report: BenchmarkReport): string {
    const results = report.results as any; // TODO: Fix type mismatch

    return `# Distributed SWE-bench Evaluation Report

## Overview
- **Start Time**: ${report.start_time}
- **End Time**: ${report.end_time}
- **Duration**: ${(report.duration / 1000 / 60).toFixed(2)} minutes

## Results
- **Total Instances**: ${results.total_instances}
- **Resolved**: ${results.resolved_instances}
- **Resolution Rate**: ${(results.resolution_rate * 100).toFixed(2)}%

## By Language
${
  results.by_language
    ? Object.entries(results.by_language as Record<string, any>)
        .map(
          ([lang, stats]: [string, any]) =>
            `- **${lang}**: ${stats.successful}/${stats.total} (${
              stats.total > 0 ? ((stats.successful / stats.total) * 100).toFixed(2) : 0
            }%)`
        )
        .join('\n')
    : 'No language breakdown available'
}

## Performance
- **Total Execution Time**: ${results.execution_time ? (results.execution_time.total / 1000 / 60).toFixed(2) : '0'} minutes
- **Average per Instance**: ${results.execution_time ? (results.execution_time.average / 1000).toFixed(2) : '0'} seconds

## Configuration
\`\`\`json
${JSON.stringify(report.config, null, 2)}
\`\`\`
`;
  }

  /**
   * Get real-time statistics
   */
  async getStats(): Promise<any> {
    try {
      const healthResponse = await axios.get(`${this.bridgeServerUrl}/health`);
      const containersResponse = await axios.get(`${this.bridgeServerUrl}/containers`);

      return {
        bridge_status: healthResponse.data,
        containers: containersResponse.data,
        active_tasks: Array.from(this.tasks.values()).filter((t) => t.status === 'running').length,
        completed_tasks: Array.from(this.tasks.values()).filter((t) => t.status === 'completed')
          .length,
      };
    } catch (error) {
      return {
        error: 'Failed to get stats',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
