import {
  type Action,
  type ActionResult,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  elizaLogger,
} from '@elizaos/core';
import { BenchmarkService } from '../services/BenchmarkService.ts';
import { contractBenchmarkScenarios } from './generateContract.ts';

export const runBenchmarkAction: Action = {
  name: 'RUN_BENCHMARK',
  similes: ['BENCHMARK', 'TEST_SCENARIOS', 'RUN_TESTS', 'VALIDATE_SYSTEM'],
  description: 'Runs automated benchmarks to test contract and dApp generation flows',
  
  validate: async (runtime: IAgentRuntime): Promise<boolean> => {
    const benchmarkService = runtime.getService('benchmark') as BenchmarkService;
    return !!benchmarkService;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      elizaLogger.info('Starting benchmark execution', { 
        messageId: message.id,
        roomId: message.roomId 
      });

      const benchmarkService = runtime.getService('benchmark') as BenchmarkService;
      if (!benchmarkService) {
        throw new Error('Benchmark service not available');
      }

      // Parse benchmark type from message
      const benchmarkType = parseBenchmarkType(message.content.text || '');

      // Initial response
      if (callback) {
        callback({
          text: `🧪 **Starting ${benchmarkType} Benchmarks**\n\n` +
                `Running comprehensive tests of the contract generation system...\n` +
                `This will test ${contractBenchmarkScenarios.length} scenarios across multiple blockchains.\n\n` +
                `⏱️ Estimated time: ${estimateBenchmarkTime(benchmarkType)} minutes\n` +
                `📊 Testing: Generation, Compilation, Deployment, UI Creation\n\n` +
                `Progress updates will follow...`,
          content: {
            action: 'RUN_BENCHMARK',
            status: 'started',
            benchmarkType,
          },
        });
      }

      let results: any[] = [];
      let performanceMetrics = null;

      // Run benchmarks based on type
      switch (benchmarkType) {
        case 'contract':
          results = await benchmarkService.runContractBenchmarks();
          break;
        case 'performance':
          performanceMetrics = await benchmarkService.runPerformanceBenchmarks();
          results = []; // Performance benchmarks return different format
          break;
        case 'all':
        default:
          results = await benchmarkService.runContractBenchmarks();
          try {
            performanceMetrics = await benchmarkService.runPerformanceBenchmarks();
          } catch (error) {
            elizaLogger.warn('Performance benchmarks failed', error);
          }
          break;
      }

      // Generate comprehensive report
      const report = benchmarkService.generateReport();

      // Create detailed results message
      let resultsMessage = `🎯 **Benchmark Results Complete!**\n\n`;
      
      // Summary section
      resultsMessage += `## 📊 Summary\n`;
      resultsMessage += `**Total Scenarios:** ${report.summary.totalScenarios}\n`;
      resultsMessage += `**Successful:** ${report.summary.successfulScenarios} ✅\n`;
      resultsMessage += `**Failed:** ${report.summary.failedScenarios} ❌\n`;
      resultsMessage += `**Success Rate:** ${report.summary.successRate.toFixed(1)}%\n`;
      resultsMessage += `**Average Duration:** ${(report.summary.averageDuration / 1000).toFixed(1)}s\n\n`;

      // Performance metrics if available
      if (performanceMetrics) {
        resultsMessage += `## ⚡ Performance Metrics\n`;
        resultsMessage += `**Average Generation Time:** ${(performanceMetrics.averageGenerationTime / 1000).toFixed(1)}s\n`;
        resultsMessage += `**Compilation Time:** ${(performanceMetrics.averageCompilationTime / 1000).toFixed(1)}s\n`;
        resultsMessage += `**Deployment Time:** ${(performanceMetrics.averageDeploymentTime / 1000).toFixed(1)}s\n`;
        resultsMessage += `**System Success Rate:** ${performanceMetrics.successRate.toFixed(1)}%\n`;
        resultsMessage += `**Throughput:** ${performanceMetrics.throughput.toFixed(1)} scenarios/min\n`;
        
        // System metrics if available
        if (performanceMetrics.systemMetrics) {
          resultsMessage += `\n### 🔧 System Performance\n`;
          resultsMessage += `**Peak Memory Usage:** ${(performanceMetrics.systemMetrics.memory.peak / 1024 / 1024).toFixed(1)}MB\n`;
          resultsMessage += `**Average Memory Usage:** ${(performanceMetrics.systemMetrics.memory.average / 1024 / 1024).toFixed(1)}MB\n`;
          resultsMessage += `**Average CPU Usage:** ${performanceMetrics.systemMetrics.cpu.average.toFixed(1)}%\n`;
          resultsMessage += `**Peak CPU Usage:** ${performanceMetrics.systemMetrics.cpu.peak.toFixed(1)}%\n`;
          resultsMessage += `**Monitoring Duration:** ${(performanceMetrics.systemMetrics.monitoringDuration / 1000).toFixed(1)}s\n`;
        }
        
        // Detailed phase metrics if available
        if (performanceMetrics.detailedMetrics) {
          resultsMessage += `\n### 📊 Phase Breakdown\n`;
          resultsMessage += `**Generation Phase:** ${(performanceMetrics.detailedMetrics.generationPhase.averageTime / 1000).toFixed(1)}s avg, ${performanceMetrics.detailedMetrics.generationPhase.successRate.toFixed(1)}% success\n`;
          resultsMessage += `**Compilation Phase:** ${(performanceMetrics.detailedMetrics.compilationPhase.averageTime / 1000).toFixed(1)}s avg, ${performanceMetrics.detailedMetrics.compilationPhase.successRate.toFixed(1)}% success\n`;
          resultsMessage += `**Deployment Phase:** ${(performanceMetrics.detailedMetrics.deploymentPhase.averageTime / 1000).toFixed(1)}s avg, ${performanceMetrics.detailedMetrics.deploymentPhase.successRate.toFixed(1)}% success\n`;
        }
        
        resultsMessage += `\n`;
      }

      // Scenario breakdown
      resultsMessage += `## 🔍 Scenario Results\n`;
      
      const successfulScenarios = results.filter(r => r.success);
      const failedScenarios = results.filter(r => !r.success);

      if (successfulScenarios.length > 0) {
        resultsMessage += `**✅ Successful Scenarios:**\n`;
        successfulScenarios.forEach(result => {
          const scenario = contractBenchmarkScenarios.find(s => s.id === result.scenarioId);
          const duration = (result.duration / 1000).toFixed(1);
          resultsMessage += `• ${scenario?.name || result.scenarioId} (${duration}s)\n`;
        });
        resultsMessage += `\n`;
      }

      if (failedScenarios.length > 0) {
        resultsMessage += `**❌ Failed Scenarios:**\n`;
        failedScenarios.forEach(result => {
          const scenario = contractBenchmarkScenarios.find(s => s.id === result.scenarioId);
          resultsMessage += `• ${scenario?.name || result.scenarioId}\n`;
          if (result.errors.length > 0) {
            resultsMessage += `  Error: ${result.errors[0]}\n`;
          }
        });
        resultsMessage += `\n`;
      }

      // Feature compatibility
      resultsMessage += `## 🛠️ Feature Compatibility\n`;
      const featureStats = calculateFeatureStats(results);
      Object.entries(featureStats).forEach(([feature, stats]) => {
        const percentage = ((stats.successful / stats.total) * 100).toFixed(1);
        const status = percentage === '100.0' ? '✅' : percentage === '0.0' ? '❌' : '⚠️';
        resultsMessage += `${status} **${formatFeatureName(feature)}:** ${percentage}% (${stats.successful}/${stats.total})\n`;
      });

      // Recommendations
      if (report.recommendations.length > 0) {
        resultsMessage += `\n## 💡 Recommendations\n`;
        report.recommendations.forEach(rec => {
          resultsMessage += `• ${rec}\n`;
        });
      }

      // Performance recommendations
      if (performanceMetrics?.recommendations.length) {
        resultsMessage += `\n## 🚀 Performance Recommendations\n`;
        performanceMetrics.recommendations.forEach(rec => {
          resultsMessage += `• ${rec}\n`;
        });
      }

      // Next steps
      resultsMessage += `\n## 🎯 Next Steps\n`;
      if (report.summary.successRate < 90) {
        resultsMessage += `• Address failing scenarios to improve reliability\n`;
      }
      if (performanceMetrics && performanceMetrics.averageGenerationTime > 180000) {
        resultsMessage += `• Optimize generation speed for better user experience\n`;
      }
      resultsMessage += `• Run "RUN_BENCHMARK performance" for detailed performance analysis\n`;
      resultsMessage += `• Test with custom scenarios: "benchmark my custom contract"\n`;

      if (callback) {
        callback({
          text: resultsMessage,
          content: {
            action: 'RUN_BENCHMARK',
            status: 'completed',
            benchmarkType,
            results: {
              summary: report.summary,
              performanceMetrics,
              scenarioResults: results,
              recommendations: report.recommendations,
            },
          },
        });
      }

      // Store benchmark results in memory
      await runtime.createMemory(
        {
          entityId: runtime.agentId,
          roomId: message.roomId,
          agentId: runtime.agentId,
          content: {
            text: `Benchmark completed: ${benchmarkType}`,
            type: 'benchmark-results',
            results: {
              benchmarkType,
              summary: report.summary,
              performanceMetrics,
              executedAt: new Date(),
            },
          },
        },
        'benchmarks'
      );

      return {
        data: {
          actionName: 'RUN_BENCHMARK',
          success: true,
          benchmarkType,
          summary: report.summary,
          performanceMetrics,
          totalScenarios: results.length,
          successfulScenarios: results.filter(r => r.success).length,
        },
        values: {
          benchmarkCompleted: true,
          successRate: report.summary.successRate,
          averageDuration: report.summary.averageDuration,
          hasPerformanceMetrics: !!performanceMetrics,
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      elizaLogger.error('Benchmark execution failed', error);

      if (callback) {
        callback({
          text: `❌ **Benchmark Execution Failed**\n\n` +
                `**Error:** ${errorMessage}\n\n` +
                `Please check system configuration and try again.`,
          content: {
            action: 'RUN_BENCHMARK',
            status: 'failed',
            error: errorMessage,
          },
        });
      }

      return {
        data: {
          actionName: 'RUN_BENCHMARK',
          success: false,
          error: errorMessage,
        },
        values: {
          benchmarkCompleted: false,
          error: errorMessage,
        },
      };
    }
  },

  examples: [
    [
      {
        name: '{{user}}',
        content: {
          text: 'Run benchmarks to test the contract generation system',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'I\'ll run comprehensive benchmarks to test all contract generation flows across EVM and SVM blockchains. This will validate generation, compilation, deployment, and UI creation capabilities.',
          thought: 'User wants to validate the entire contract generation system. I should run the full benchmark suite to test all scenarios and provide detailed performance metrics.',
          actions: ['RUN_BENCHMARK'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Test performance benchmarks for contract generation speed',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'I\'ll run performance benchmarks to measure contract generation speed, compilation time, and deployment efficiency across multiple iterations.',
          thought: 'User specifically wants performance metrics. I should run performance benchmarks with multiple iterations to get accurate timing data.',
          actions: ['RUN_BENCHMARK'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Validate that all blockchain types work correctly',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'I\'ll run blockchain compatibility benchmarks to test contract generation across Ethereum, Base, Arbitrum, Polygon, and Solana networks.',
          thought: 'User wants to validate cross-blockchain compatibility. I should run all benchmark scenarios to ensure each blockchain type works correctly.',
          actions: ['RUN_BENCHMARK'],
        },
      },
    ],
  ],
};

function parseBenchmarkType(text: string): string {
  if (/performance|speed|timing/i.test(text)) {
    return 'performance';
  }
  if (/contract|generation|compile/i.test(text)) {
    return 'contract';
  }
  return 'all';
}

function estimateBenchmarkTime(benchmarkType: string): number {
  switch (benchmarkType) {
    case 'contract':
      return Math.ceil(contractBenchmarkScenarios.length * 3); // 3 minutes per scenario average
    case 'performance':
      return Math.ceil(contractBenchmarkScenarios.length * 5 * 3); // 5 iterations, 3 minutes each
    case 'all':
    default:
      return Math.ceil(contractBenchmarkScenarios.length * 6); // Contract + performance
  }
}

function calculateFeatureStats(results: any[]): Record<string, { total: number; successful: number }> {
  const features = [
    'contractGenerated',
    'contractCompiled', 
    'contractDeployed',
    'testInterfaceGenerated',
    'frontendGenerated',
    'demoAccessible',
  ];

  const stats: Record<string, { total: number; successful: number }> = {};

  features.forEach(feature => {
    stats[feature] = {
      total: results.length,
      successful: results.filter(r => r.outputs[feature]).length,
    };
  });

  return stats;
}

function formatFeatureName(feature: string): string {
  const names: Record<string, string> = {
    contractGenerated: 'Contract Generation',
    contractCompiled: 'Contract Compilation',
    contractDeployed: 'Contract Deployment',
    testInterfaceGenerated: 'Test Interface Creation',
    frontendGenerated: 'Frontend Generation',
    demoAccessible: 'Demo Accessibility',
  };

  return names[feature] || feature;
}