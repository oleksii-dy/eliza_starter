import {
  elizaLogger,
  type IAgentRuntime,
  type Memory,
  type State,
  type ActionResult,
  type Action,
  type HandlerCallback,
} from '@elizaos/core';
import { DistributedSWEBenchManager } from '../orchestration/distributed-swe-bench-manager';
import type { BenchmarkOptions } from '../swe-bench/types';

export const runDistributedSWEBenchAction: Action = {
  name: 'RUN_DISTRIBUTED_SWE_BENCH',
  similes: [
    'distributed swe-bench',
    'run distributed evaluation',
    'start multi-language swe-bench',
    'evaluate all languages',
    'docker swe-bench',
    'container evaluation',
  ],
  description: 'Run SWE-bench evaluation across multiple languages using Docker containers',
  examples: [
    [
      {
        name: 'user',
        content: {
          text: 'Run distributed swe-bench on 10 instances across all languages',
          source: 'user',
        },
      },
      {
        name: 'assistant',
        content: {
          text: "Starting distributed SWE-bench evaluation across all languages with 10 instances. This will spin up Docker containers for TypeScript, JavaScript, Java, Go, Rust, C, and C++. I'll monitor the progress...",
          source: 'assistant',
        },
      },
    ],
    [
      {
        name: 'user',
        content: {
          text: 'Show distributed swe-bench status',
          source: 'user',
        },
      },
      {
        name: 'assistant',
        content: {
          text: 'Checking distributed SWE-bench status...\n\nBridge Server: Healthy\nActive Tasks: 5\nContainers: 10 total (8 idle, 2 busy)\n\nCurrent progress: 45% complete',
          source: 'assistant',
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    const text = message.content.text?.toLowerCase() || '';

    // Check for distributed/docker/multi-language keywords
    const distributedKeywords = [
      'distributed',
      'docker',
      'container',
      'all language',
      'multi-language',
      'java',
      'go',
      'rust',
      'c++',
    ];

    const hasSWEBench = text.includes('swe-bench') || text.includes('swe bench');
    const hasDistributed = distributedKeywords.some((keyword) => text.includes(keyword));

    return hasSWEBench && hasDistributed;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      const text = message.content.text || '';
      elizaLogger.info('[DISTRIBUTED-SWE-BENCH] Starting distributed evaluation');

      // Parse options from message
      const benchmarkOptions = parseDistributedOptions(text);

      // Check if we should just get stats
      if (text.includes('status') || text.includes('stats')) {
        const manager = new DistributedSWEBenchManager(runtime);
        const stats = await manager.getStats();

        const responseText = formatStatsResponse(stats);

        if (callback) {
          await callback({
            text: responseText,
            actions: ['RUN_DISTRIBUTED_SWE_BENCH'],
          });
        }

        return { text: responseText };
      }

      // Check if we should stop infrastructure
      if (text.includes('stop') || text.includes('shutdown')) {
        const manager = new DistributedSWEBenchManager(runtime);
        await manager.stopInfrastructure();

        const responseText = 'Distributed SWE-bench infrastructure has been stopped.';

        if (callback) {
          await callback({
            text: responseText,
            actions: ['RUN_DISTRIBUTED_SWE_BENCH'],
          });
        }

        return { text: responseText };
      }

      // Initialize manager
      const manager = new DistributedSWEBenchManager(runtime);

      // Start infrastructure if needed
      if (!text.includes('skip-infra')) {
        elizaLogger.info('[DISTRIBUTED-SWE-BENCH] Starting infrastructure...');

        if (callback) {
          await callback({
            text: '🐳 Starting Docker infrastructure for distributed SWE-bench evaluation...\n\nThis will:\n- Build base Docker image with all language toolchains\n- Start 10 containers (2 Node.js, 4 Compiled, 2 JVM, 2 spare)\n- Launch Redis queue and bridge server\n- Set up monitoring with Prometheus/Grafana\n\nPlease wait, this may take a few minutes...',
            actions: ['RUN_DISTRIBUTED_SWE_BENCH'],
          });
        }

        await manager.startInfrastructure();
      }

      // Run benchmark
      elizaLogger.info('[DISTRIBUTED-SWE-BENCH] Running benchmark with options:', benchmarkOptions);

      if (callback) {
        await callback({
          text: `🚀 Running distributed SWE-bench evaluation:\n- Max instances: ${benchmarkOptions.max_instances || 'all'}\n- Languages: ${benchmarkOptions.language_filter?.join(', ') || 'all'}\n- Parallel containers: 10\n\nMonitoring progress...`,
          actions: ['RUN_DISTRIBUTED_SWE_BENCH'],
        });
      }

      const report = await manager.runDistributedBenchmark(benchmarkOptions);

      // Format response
      const responseText = formatDistributedReport(report);

      if (callback) {
        await callback({
          text: responseText,
          actions: ['RUN_DISTRIBUTED_SWE_BENCH'],
        });
      }

      return { text: responseText };
    } catch (error) {
      elizaLogger.error('[DISTRIBUTED-SWE-BENCH] Error:', error);

      const errorMessage = `Failed to run distributed SWE-bench: ${
        error instanceof Error ? error.message : String(error)
      }`;

      if (callback) {
        await callback({
          text: errorMessage,
          actions: ['RUN_DISTRIBUTED_SWE_BENCH'],
        });
      }

      return { text: errorMessage };
    }
  },
};

function parseDistributedOptions(text: string): BenchmarkOptions {
  const options: BenchmarkOptions = {};

  // Parse max instances
  const instancesMatch = text.match(/(\d+)\s*instances?/i);
  if (instancesMatch) {
    options.max_instances = parseInt(instancesMatch[1], 10);
  }

  // Parse language filter
  const languages: string[] = [];

  if (text.includes('all language')) {
    // Don't set filter to run all languages
  } else {
    if (text.includes('typescript')) {languages.push('TypeScript');}
    if (text.includes('javascript')) {languages.push('JavaScript');}
    if (text.includes('java')) {languages.push('Java');}
    if (text.includes('go')) {languages.push('Go');}
    if (text.includes('rust')) {languages.push('Rust');}
    if (text.includes('c++') || text.includes('cpp')) {languages.push('C++');}
    if (text.includes(' c ') || text.includes(' c,')) {languages.push('C');}

    if (languages.length > 0) {
      options.language_filter = languages as any;
    }
  }

  // Parse repository filter
  const repoMatch = text.match(/repo(?:sitory)?:\s*([^\s,]+(?:,\s*[^\s,]+)*)/i);
  if (repoMatch) {
    options.repo_filter = repoMatch[1].split(',').map((r) => r.trim());
  }

  // Other options
  options.save_artifacts = true;
  options.docker_enabled = true;

  return options;
}

function formatDistributedReport(report: any): string {
  const results = report.results;
  const duration = (report.duration / 1000 / 60).toFixed(2);

  let response = '✅ **Distributed SWE-bench Evaluation Complete**\n\n';
  response += `**Duration**: ${duration} minutes\n\n`;

  response += '**Overall Results**:\n';
  response += `- Total Instances: ${results.total_instances}\n`;
  response += `- Resolved: ${results.resolved_instances}\n`;
  response += `- Resolution Rate: ${(results.resolution_rate * 100).toFixed(2)}%\n\n`;

  if (results.by_language && Object.keys(results.by_language).length > 0) {
    response += '**Results by Language**:\n';
    for (const [lang, stats] of Object.entries(results.by_language) as any) {
      const rate = stats.total > 0 ? ((stats.successful / stats.total) * 100).toFixed(2) : 0;
      response += `- ${lang}: ${stats.successful}/${stats.total} (${rate}%)\n`;
    }
    response += '\n';
  }

  response += '**Performance**:\n';
  response += `- Total Execution Time: ${(results.execution_time?.total / 1000 / 60).toFixed(2)} minutes\n`;
  response += `- Average per Instance: ${(results.execution_time?.average / 1000).toFixed(2)} seconds\n\n`;

  response += '**Infrastructure**:\n';
  response += '- Containers Used: 10 (distributed across language types)\n';
  response += '- Parallel Execution: Yes\n\n';

  response += `📊 Full report saved to: ${report.artifacts_dir}/report.json\n`;
  response += '📈 Grafana dashboard: http://localhost:3001 (admin/admin)\n';
  response += '🔍 Prometheus metrics: http://localhost:9090\n\n';

  response += 'To stop the infrastructure, say "stop distributed swe-bench"';

  return response;
}

function formatStatsResponse(stats: any): string {
  if (stats.error) {
    return `❌ Failed to get status: ${stats.message}`;
  }

  let response = '📊 **Distributed SWE-bench Status**\n\n';

  if (stats.bridge_status) {
    response += '**Bridge Server**:\n';
    response += `- Status: ${stats.bridge_status.status}\n`;
    response += `- Active Tasks: ${stats.bridge_status.activeTasks}\n`;
    response += `- Pending Tasks: ${stats.bridge_status.pendingTasks}\n\n`;
  }

  if (stats.containers && Array.isArray(stats.containers)) {
    response += `**Containers** (${stats.containers.length} total):\n`;

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const container of stats.containers) {
      byType[container.languageType] = (byType[container.languageType] || 0) + 1;
      byStatus[container.status] = (byStatus[container.status] || 0) + 1;
    }

    response += `By Type: ${Object.entries(byType)
      .map(([type, count]) => `${type}:${count}`)
      .join(', ')}\n`;
    response += `By Status: ${Object.entries(byStatus)
      .map(([status, count]) => `${status}:${count}`)
      .join(', ')}\n\n`;

    // Show individual containers
    for (const container of stats.containers.slice(0, 5)) {
      response += `- ${container.id}: ${container.status}`;
      if (container.currentTask) {
        response += ` (working on ${container.currentTask})`;
      }
      response += '\n';
    }

    if (stats.containers.length > 5) {
      response += `... and ${stats.containers.length - 5} more\n`;
    }
  }

  return response;
}
