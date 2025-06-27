import {
  type IAgentRuntime,
  Service,
  elizaLogger,
} from '@elizaos/core';
// Local type definition for ImprovedE2BService
interface ImprovedE2BService {
  createSandbox(options: any): Promise<string>;
  runCommandInSandbox(sandboxId: string, command: string): Promise<any>;
  writeFileToSandbox(sandboxId: string, path: string, content: string): Promise<void>;
  readFileFromSandbox(sandboxId: string, path: string): Promise<string>;
  closeSandbox(sandboxId: string): Promise<void>;
}
import { ContractGenerationService } from './ContractGenerationService.ts';
import { contractBenchmarkScenarios } from '../actions/generateContract.ts';
import type { BenchmarkScenario, BenchmarkResult } from '../types/contracts.ts';

/**
 * Benchmark Service for testing contract and dApp generation flows
 */
export class BenchmarkService extends Service {
  static serviceName = 'benchmark';
  static serviceType = 'benchmark';

  private contractService: ContractGenerationService | null = null;
  private e2bService: ImprovedE2BService | null = null;
  private results: BenchmarkResult[] = [];
  private performanceMetrics: {
    cpuUsage: number[];
    memoryUsage: number[];
    timestamps: number[];
    activeConnections: number[];
  } = {
    cpuUsage: [],
    memoryUsage: [],
    timestamps: [],
    activeConnections: [],
  };
  private metricsInterval: NodeJS.Timeout | null = null;

  get capabilityDescription(): string {
    return 'Runs automated benchmarks for contract and dApp generation workflows';
  }

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<BenchmarkService> {
    const service = new BenchmarkService(runtime);
    await service.initialize();
    return service;
  }

  async initialize(): Promise<void> {
    try {
      elizaLogger.info('Initializing Benchmark Service');
      
      this.contractService = this.runtime.getService('contract-generation') as ContractGenerationService;
      this.e2bService = this.runtime.getService('e2b') as ImprovedE2BService;

      if (!this.contractService) {
        elizaLogger.warn('Contract generation service not found - some benchmarks will be skipped');
      }

      if (!this.e2bService) {
        elizaLogger.warn('E2B service not found - sandbox benchmarks will be limited');
      }

      elizaLogger.info('Benchmark Service initialized successfully');
    } catch (error) {
      elizaLogger.error('Failed to initialize Benchmark Service', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    elizaLogger.info('Stopping Benchmark Service');
    
    // Stop performance monitoring
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    
    // Clear stored metrics to free memory
    this.performanceMetrics = {
      cpuUsage: [],
      memoryUsage: [],
      timestamps: [],
      activeConnections: [],
    };
    
    // Clear benchmark results
    this.results = [];
  }

  /**
   * Run all contract generation benchmarks
   */
  async runContractBenchmarks(): Promise<BenchmarkResult[]> {
    elizaLogger.info('Starting contract generation benchmarks');

    const results: BenchmarkResult[] = [];

    for (const scenario of contractBenchmarkScenarios) {
      elizaLogger.info(`Running benchmark: ${scenario.name}`);
      
      try {
        const result = await this.runContractBenchmark(scenario);
        results.push(result);
        
        elizaLogger.info(`Benchmark completed: ${scenario.name}`, {
          success: result.success,
          duration: result.duration,
        });
      } catch (error) {
        elizaLogger.error(`Benchmark failed: ${scenario.name}`, error);
        
        results.push({
          scenarioId: scenario.id,
          success: false,
          duration: 0,
          outputs: {
            contractGenerated: false,
            contractCompiled: false,
            contractDeployed: false,
            testInterfaceGenerated: false,
            frontendGenerated: false,
            demoAccessible: false,
          },
          errors: [error instanceof Error ? error.message : String(error)],
          generatedArtifacts: {},
          metadata: {
            executedAt: new Date(),
            agentId: this.runtime.agentId,
          },
        });
      }
    }

    this.results.push(...results);
    
    elizaLogger.info('Contract benchmarks completed', {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    });

    return results;
  }

  /**
   * Run a single contract benchmark scenario
   */
  async runContractBenchmark(scenario: BenchmarkScenario): Promise<BenchmarkResult> {
    const startTime = Date.now();
    const result: BenchmarkResult = {
      scenarioId: scenario.id,
      success: false,
      duration: 0,
      outputs: {
        contractGenerated: false,
        contractCompiled: false,
        contractDeployed: false,
        testInterfaceGenerated: false,
        frontendGenerated: false,
        demoAccessible: false,
      },
      errors: [],
      generatedArtifacts: {},
      metadata: {
        executedAt: new Date(),
        agentId: this.runtime.agentId,
      },
    };

    try {
      if (!this.contractService) {
        throw new Error('Contract generation service not available');
      }

      // Parse scenario options
      const options = this.parseScenarioOptions(scenario);

      // Create mock state
      const state = {
        values: {},
        data: {},
        text: scenario.userPrompt,
      };

      // Generate contract
      elizaLogger.debug(`Generating contract for scenario: ${scenario.id}`);
      const contract = await this.contractService.generateContract(
        scenario.userPrompt,
        options,
        state
      );

      result.outputs.contractGenerated = true;
      result.generatedArtifacts.contractAddress = contract.deploymentInfo?.address;

      // Check compilation
      if (contract.abi && contract.bytecode) {
        result.outputs.contractCompiled = true;
      }

      // Check deployment
      if (contract.deploymentInfo) {
        result.outputs.contractDeployed = true;
        result.generatedArtifacts.contractAddress = contract.deploymentInfo.address;
      }

      // Check test interface
      if (contract.testInterface) {
        result.outputs.testInterfaceGenerated = true;
      }

      // Check frontend
      if (contract.frontend) {
        result.outputs.frontendGenerated = true;
      }

      // Try to create demo
      if (contract.deploymentInfo && this.e2bService) {
        try {
          const demoInfo = await this.contractService.deployWithDemo(contract, options);
          if (demoInfo.demoUrl) {
            result.outputs.demoAccessible = true;
            result.generatedArtifacts.demoUrl = demoInfo.demoUrl;
            result.metadata.sandboxId = demoInfo.demoUrl.split('-')[0];
          }
        } catch (demoError) {
          elizaLogger.warn('Demo creation failed', demoError);
          result.errors.push(`Demo creation failed: ${demoError}`);
        }
      }

      // Validate success criteria
      const criteriaValid = this.validateSuccessCriteria(scenario, result);
      result.success = criteriaValid && result.errors.length === 0;

      result.duration = Date.now() - startTime;

      elizaLogger.info(`Benchmark result for ${scenario.id}`, {
        success: result.success,
        duration: result.duration,
        outputs: result.outputs,
      });

      return result;

    } catch (error) {
      result.duration = Date.now() - startTime;
      result.errors.push(error instanceof Error ? error.message : String(error));
      elizaLogger.error(`Benchmark failed for ${scenario.id}`, error);
      return result;
    }
  }

  /**
   * Run performance benchmarks with detailed metrics collection
   */
  async runPerformanceBenchmarks(): Promise<{
    averageGenerationTime: number;
    averageCompilationTime: number;
    averageDeploymentTime: number;
    successRate: number;
    throughput: number;
    memoryUsage: {
      peak: number;
      average: number;
    };
    systemMetrics: {
      memory: { current: number; peak: number; average: number };
      cpu: { current: number; peak: number; average: number };
      connections: { current: number; peak: number; average: number };
      monitoringDuration: number;
    };
    detailedMetrics: {
      generationPhase: {
        averageTime: number;
        successRate: number;
        errors: string[];
      };
      compilationPhase: {
        averageTime: number;
        successRate: number;
        errors: string[];
      };
      deploymentPhase: {
        averageTime: number;
        successRate: number;
        errors: string[];
      };
    };
    recommendations: string[];
  }> {
    elizaLogger.info('Running detailed performance benchmarks with real-time monitoring');

    // Start performance monitoring
    this.startPerformanceMonitoring();

    const performanceResults = [];
    const detailedTimings: {
      generation: number[];
      compilation: number[];
      deployment: number[];
    } = {
      generation: [],
      compilation: [],
      deployment: [],
    };
    const phaseErrors = {
      generation: [] as string[],
      compilation: [] as string[],
      deployment: [] as string[],
    };
    const memorySnapshots: number[] = [];
    const iterations = 5; // Run each scenario multiple times

    const overallStartTime = Date.now();

    try {
      for (let i = 0; i < iterations; i++) {
        elizaLogger.info(`Performance iteration ${i + 1}/${iterations}`);
        
        // Collect memory snapshot and force garbage collection
        if (global.gc) {
          global.gc();
        }
        const memoryUsage = process.memoryUsage();
        memorySnapshots.push(memoryUsage.heapUsed);
        
        const results = await this.runDetailedContractBenchmarks(detailedTimings, phaseErrors);
        performanceResults.push(...results);

        // Log progress with real-time metrics
        const currentSnapshot = this.getCurrentPerformanceSnapshot();
        elizaLogger.info(`Iteration ${i + 1} completed`, {
          currentMemory: `${(currentSnapshot.memory.current / 1024 / 1024).toFixed(1)}MB`,
          peakMemory: `${(currentSnapshot.memory.peak / 1024 / 1024).toFixed(1)}MB`,
          avgCPU: `${currentSnapshot.cpu.average.toFixed(1)}%`,
        });
      }

      const totalDuration = Date.now() - overallStartTime;

    // Calculate metrics
    const successfulResults = performanceResults.filter(r => r.success);
    const totalResults = performanceResults.length;

    const averageGenerationTime = detailedTimings.generation.length > 0 
      ? detailedTimings.generation.reduce((sum, time) => sum + time, 0) / detailedTimings.generation.length
      : 0;

    const averageCompilationTime = detailedTimings.compilation.length > 0
      ? detailedTimings.compilation.reduce((sum, time) => sum + time, 0) / detailedTimings.compilation.length
      : 0;

    const averageDeploymentTime = detailedTimings.deployment.length > 0
      ? detailedTimings.deployment.reduce((sum, time) => sum + time, 0) / detailedTimings.deployment.length
      : 0;

    const successRate = totalResults > 0 ? (successfulResults.length / totalResults) * 100 : 0;
    const throughput = totalResults > 0 ? (totalResults / totalDuration) * 1000 * 60 : 0; // scenarios per minute

    // Memory metrics
    const peakMemory = Math.max(...memorySnapshots);
    const averageMemory = memorySnapshots.reduce((sum, mem) => sum + mem, 0) / memorySnapshots.length;

    // Detailed phase metrics
    const detailedMetrics = {
      generationPhase: {
        averageTime: averageGenerationTime,
        successRate: detailedTimings.generation.length > 0 
          ? ((detailedTimings.generation.length - phaseErrors.generation.length) / detailedTimings.generation.length) * 100
          : 0,
        errors: phaseErrors.generation,
      },
      compilationPhase: {
        averageTime: averageCompilationTime,
        successRate: detailedTimings.compilation.length > 0
          ? ((detailedTimings.compilation.length - phaseErrors.compilation.length) / detailedTimings.compilation.length) * 100
          : 0,
        errors: phaseErrors.compilation,
      },
      deploymentPhase: {
        averageTime: averageDeploymentTime,
        successRate: detailedTimings.deployment.length > 0
          ? ((detailedTimings.deployment.length - phaseErrors.deployment.length) / detailedTimings.deployment.length) * 100
          : 0,
        errors: phaseErrors.deployment,
      },
    };

      // Get final system metrics snapshot
      const systemMetrics = this.getCurrentPerformanceSnapshot();

      // Generate recommendations with enhanced metrics
      const recommendations = this.generatePerformanceRecommendations(performanceResults, detailedMetrics);

      const metrics = {
        averageGenerationTime,
        averageCompilationTime,
        averageDeploymentTime,
        successRate,
        throughput,
        memoryUsage: {
          peak: peakMemory,
          average: averageMemory,
        },
        systemMetrics,
        detailedMetrics,
        recommendations,
      };

      elizaLogger.info('Performance benchmarks completed with enhanced metrics', {
        ...metrics,
        totalScenarios: totalResults,
        successfulScenarios: successfulResults.length,
        totalDuration,
        systemMemoryPeak: `${(systemMetrics.memory.peak / 1024 / 1024).toFixed(1)}MB`,
        systemCPUAverage: `${systemMetrics.cpu.average.toFixed(1)}%`,
        monitoringDuration: `${(systemMetrics.monitoringDuration / 1000).toFixed(1)}s`,
      });

      return metrics;

    } finally {
      // Always stop performance monitoring
      this.stopPerformanceMonitoring();
    }
  }

  /**
   * Run contract benchmarks with detailed timing collection
   */
  private async runDetailedContractBenchmarks(
    timings: { generation: number[]; compilation: number[]; deployment: number[] },
    errors: { generation: string[]; compilation: string[]; deployment: string[] }
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    for (const scenario of contractBenchmarkScenarios) {
      elizaLogger.info(`Running detailed benchmark: ${scenario.name}`);
      
      try {
        const result = await this.runDetailedContractBenchmark(scenario, timings, errors);
        results.push(result);
        
        elizaLogger.info(`Detailed benchmark completed: ${scenario.name}`, {
          success: result.success,
          duration: result.duration,
        });
      } catch (error) {
        elizaLogger.error(`Detailed benchmark failed: ${scenario.name}`, error);
        
        // Add to generation errors since it failed before any phase
        errors.generation.push(error instanceof Error ? error.message : String(error));
        
        results.push({
          scenarioId: scenario.id,
          success: false,
          duration: 0,
          outputs: {
            contractGenerated: false,
            contractCompiled: false,
            contractDeployed: false,
            testInterfaceGenerated: false,
            frontendGenerated: false,
            demoAccessible: false,
          },
          errors: [error instanceof Error ? error.message : String(error)],
          generatedArtifacts: {},
          metadata: {
            executedAt: new Date(),
            agentId: this.runtime.agentId,
          },
        });
      }
    }

    return results;
  }

  /**
   * Run a single contract benchmark with detailed phase timing
   */
  private async runDetailedContractBenchmark(
    scenario: BenchmarkScenario, 
    timings: { generation: number[]; compilation: number[]; deployment: number[] },
    errors: { generation: string[]; compilation: string[]; deployment: string[] }
  ): Promise<BenchmarkResult> {
    const startTime = Date.now();
    const result: BenchmarkResult = {
      scenarioId: scenario.id,
      success: false,
      duration: 0,
      outputs: {
        contractGenerated: false,
        contractCompiled: false,
        contractDeployed: false,
        testInterfaceGenerated: false,
        frontendGenerated: false,
        demoAccessible: false,
      },
      errors: [],
      generatedArtifacts: {},
      metadata: {
        executedAt: new Date(),
        agentId: this.runtime.agentId,
      },
    };

    try {
      if (!this.contractService) {
        throw new Error('Contract generation service not available');
      }

      // Parse scenario options
      const options = this.parseScenarioOptions(scenario);

      // Create mock state
      const state = {
        values: {},
        data: {},
        text: scenario.userPrompt,
      };

      // Phase 1: Contract Generation
      elizaLogger.debug(`Phase 1 - Generating contract for scenario: ${scenario.id}`);
      const generationStartTime = Date.now();
      
      let contract;
      try {
        contract = await this.contractService.generateContract(
          scenario.userPrompt,
          options,
          state
        );
        
        const generationTime = Date.now() - generationStartTime;
        timings.generation.push(generationTime);
        
        result.outputs.contractGenerated = true;
        elizaLogger.debug(`Phase 1 completed in ${generationTime}ms`);
      } catch (genError) {
        const generationTime = Date.now() - generationStartTime;
        timings.generation.push(generationTime);
        errors.generation.push(genError instanceof Error ? genError.message : String(genError));
        throw genError;
      }

      // Phase 2: Compilation Check
      elizaLogger.debug(`Phase 2 - Checking compilation for scenario: ${scenario.id}`);
      const compilationStartTime = Date.now();
      
      try {
        if (contract.abi && contract.bytecode) {
          result.outputs.contractCompiled = true;
          const compilationTime = Date.now() - compilationStartTime;
          timings.compilation.push(compilationTime);
          elizaLogger.debug(`Phase 2 completed in ${compilationTime}ms`);
        } else {
          const compilationTime = Date.now() - compilationStartTime;
          timings.compilation.push(compilationTime);
          errors.compilation.push('Contract missing ABI or bytecode after generation');
        }
      } catch (compError) {
        const compilationTime = Date.now() - compilationStartTime;
        timings.compilation.push(compilationTime);
        errors.compilation.push(compError instanceof Error ? compError.message : String(compError));
      }

      // Phase 3: Deployment Check
      elizaLogger.debug(`Phase 3 - Checking deployment for scenario: ${scenario.id}`);
      const deploymentStartTime = Date.now();
      
      try {
        if (contract.deploymentInfo) {
          result.outputs.contractDeployed = true;
          result.generatedArtifacts.contractAddress = contract.deploymentInfo.address;
          const deploymentTime = Date.now() - deploymentStartTime;
          timings.deployment.push(deploymentTime);
          elizaLogger.debug(`Phase 3 completed in ${deploymentTime}ms`);
        } else {
          const deploymentTime = Date.now() - deploymentStartTime;
          timings.deployment.push(deploymentTime);
          errors.deployment.push('Contract not deployed');
        }
      } catch (deployError) {
        const deploymentTime = Date.now() - deploymentStartTime;
        timings.deployment.push(deploymentTime);
        errors.deployment.push(deployError instanceof Error ? deployError.message : String(deployError));
      }

      // Additional artifact checks
      if (contract.testInterface) {
        result.outputs.testInterfaceGenerated = true;
      }

      if (contract.frontend) {
        result.outputs.frontendGenerated = true;
      }

      // Demo accessibility check
      if (contract.deploymentInfo && this.e2bService) {
        try {
          const demoInfo = await this.contractService.deployWithDemo(contract, options);
          if (demoInfo.demoUrl) {
            result.outputs.demoAccessible = true;
            result.generatedArtifacts.demoUrl = demoInfo.demoUrl;
            result.metadata.sandboxId = demoInfo.demoUrl.split('-')[0];
          }
        } catch (demoError) {
          elizaLogger.warn('Demo creation failed', demoError);
          result.errors.push(`Demo creation failed: ${demoError}`);
        }
      }

      // Validate success criteria
      const criteriaValid = this.validateSuccessCriteria(scenario, result);
      result.success = criteriaValid && result.errors.length === 0;

      result.duration = Date.now() - startTime;

      elizaLogger.info(`Detailed benchmark result for ${scenario.id}`, {
        success: result.success,
        duration: result.duration,
        outputs: result.outputs,
      });

      return result;

    } catch (error) {
      result.duration = Date.now() - startTime;
      result.errors.push(error instanceof Error ? error.message : String(error));
      elizaLogger.error(`Detailed benchmark failed for ${scenario.id}`, error);
      return result;
    }
  }

  /**
   * Generate benchmark report
   */
  generateReport(): {
    summary: {
      totalScenarios: number;
      successfulScenarios: number;
      failedScenarios: number;
      averageDuration: number;
      successRate: number;
    };
    scenarioResults: BenchmarkResult[];
    recommendations: string[];
  } {
    const totalScenarios = this.results.length;
    const successfulScenarios = this.results.filter(r => r.success).length;
    const failedScenarios = totalScenarios - successfulScenarios;
    const averageDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / totalScenarios;
    const successRate = (successfulScenarios / totalScenarios) * 100;

    const recommendations = this.generateRecommendations();

    return {
      summary: {
        totalScenarios,
        successfulScenarios,
        failedScenarios,
        averageDuration,
        successRate,
      },
      scenarioResults: this.results,
      recommendations,
    };
  }

  private parseScenarioOptions(scenario: BenchmarkScenario): any {
    return {
      blockchain: scenario.blockchain as any,
      contractType: this.inferContractType(scenario.userPrompt),
      compile: true,
      deploy: true,
      generateTestInterface: scenario.expectedOutputs.testInterfaceGenerated,
      generateFrontend: scenario.expectedOutputs.frontendGenerated,
      network: scenario.blockchain === 'solana' ? 'devnet' : 'sepolia',
    };
  }

  private inferContractType(prompt: string): string {
    if (/erc20|token/i.test(prompt)) return 'token';
    if (/nft|erc721/i.test(prompt)) return 'nft';
    if (/defi|yield|pool/i.test(prompt)) return 'defi';
    if (/dao|governance/i.test(prompt)) return 'dao';
    return 'custom';
  }

  private validateSuccessCriteria(scenario: BenchmarkScenario, result: BenchmarkResult): boolean {
    // Check if expected outputs match actual outputs
    const expectedOutputs = scenario.expectedOutputs;
    const actualOutputs = result.outputs;

    return (
      actualOutputs.contractGenerated >= expectedOutputs.contractGenerated &&
      actualOutputs.contractCompiled >= expectedOutputs.contractCompiled &&
      actualOutputs.contractDeployed >= expectedOutputs.contractDeployed &&
      actualOutputs.testInterfaceGenerated >= expectedOutputs.testInterfaceGenerated &&
      actualOutputs.frontendGenerated >= expectedOutputs.frontendGenerated &&
      actualOutputs.demoAccessible >= expectedOutputs.demoAccessible
    );
  }

  private generatePerformanceRecommendations(
    results: BenchmarkResult[], 
    detailedMetrics?: {
      generationPhase: { averageTime: number; successRate: number; errors: string[] };
      compilationPhase: { averageTime: number; successRate: number; errors: string[] };
      deploymentPhase: { averageTime: number; successRate: number; errors: string[] };
    }
  ): string[] {
    const recommendations: string[] = [];

    const avgDuration = results.length > 0 
      ? results.reduce((sum, r) => sum + r.duration, 0) / results.length 
      : 0;
    const successRate = results.length > 0 
      ? (results.filter(r => r.success).length / results.length) * 100 
      : 0;

    // Overall performance recommendations
    if (avgDuration > 300000) { // 5 minutes
      recommendations.push('Consider optimizing contract generation templates for faster execution');
    }

    if (successRate < 90) {
      recommendations.push('Improve error handling and validation in contract generation flow');
    }

    // Phase-specific recommendations
    if (detailedMetrics) {
      // Generation phase recommendations
      if (detailedMetrics.generationPhase.averageTime > 180000) { // 3 minutes
        recommendations.push('Optimize AI model response times for contract generation');
      }
      
      if (detailedMetrics.generationPhase.successRate < 95) {
        recommendations.push('Improve prompt engineering and input validation for generation phase');
      }

      // Compilation phase recommendations
      if (detailedMetrics.compilationPhase.averageTime > 60000) { // 1 minute
        recommendations.push('Consider using faster compilation tools or caching compilation artifacts');
      }
      
      if (detailedMetrics.compilationPhase.successRate < 90) {
        recommendations.push('Review contract templates for compilation issues and syntax errors');
      }

      // Deployment phase recommendations
      if (detailedMetrics.deploymentPhase.averageTime > 45000) { // 45 seconds
        recommendations.push('Optimize network configuration and consider faster blockchain networks for testing');
      }
      
      if (detailedMetrics.deploymentPhase.successRate < 85) {
        recommendations.push('Check network connectivity, gas settings, and deployment configuration');
      }

      // Error-specific recommendations
      const allErrors = [
        ...detailedMetrics.generationPhase.errors,
        ...detailedMetrics.compilationPhase.errors,
        ...detailedMetrics.deploymentPhase.errors,
      ];

      const errorPatterns = this.analyzeErrorPatterns(allErrors);
      errorPatterns.forEach(pattern => {
        recommendations.push(`Address recurring error pattern: ${pattern}`);
      });
    } else {
      // Fallback to basic recommendations
      const compilationFailures = results.filter(r => !r.outputs.contractCompiled).length;
      if (compilationFailures > 0) {
        recommendations.push('Review contract templates for compilation issues');
      }

      const deploymentFailures = results.filter(r => !r.outputs.contractDeployed).length;
      if (deploymentFailures > 0) {
        recommendations.push('Check network connectivity and deployment configuration');
      }
    }

    // Memory and resource recommendations
    const demoFailures = results.filter(r => !r.outputs.demoAccessible).length;
    if (demoFailures > 0) {
      recommendations.push('Improve demo environment setup and resource allocation');
    }

    const frontendFailures = results.filter(r => !r.outputs.frontendGenerated).length;
    if (frontendFailures > 0) {
      recommendations.push('Enhance frontend generation templates and dependency management');
    }

    return recommendations.slice(0, 8); // Limit to top 8 recommendations
  }

  /**
   * Analyze error patterns to provide targeted recommendations
   */
  private analyzeErrorPatterns(errors: string[]): string[] {
    const patterns: Record<string, number> = {};
    
    errors.forEach(error => {
      const normalized = error.toLowerCase();
      
      // Common error patterns
      if (normalized.includes('timeout') || normalized.includes('timed out')) {
        patterns['Timeout issues - consider increasing timeout values'] = (patterns['Timeout issues - consider increasing timeout values'] || 0) + 1;
      }
      
      if (normalized.includes('gas') || normalized.includes('fee')) {
        patterns['Gas/fee issues - review gas settings and pricing'] = (patterns['Gas/fee issues - review gas settings and pricing'] || 0) + 1;
      }
      
      if (normalized.includes('network') || normalized.includes('connection')) {
        patterns['Network connectivity issues - check RPC endpoints'] = (patterns['Network connectivity issues - check RPC endpoints'] || 0) + 1;
      }
      
      if (normalized.includes('compile') || normalized.includes('syntax')) {
        patterns['Compilation errors - review generated contract syntax'] = (patterns['Compilation errors - review generated contract syntax'] || 0) + 1;
      }
      
      if (normalized.includes('api') || normalized.includes('key')) {
        patterns['API/authentication issues - verify credentials'] = (patterns['API/authentication issues - verify credentials'] || 0) + 1;
      }
      
      if (normalized.includes('memory') || normalized.includes('heap')) {
        patterns['Memory issues - consider increasing available memory'] = (patterns['Memory issues - consider increasing available memory'] || 0) + 1;
      }
    });

    // Return patterns that occur more than once
    return Object.entries(patterns)
      .filter(([_, count]) => count > 1)
      .map(([pattern, _]) => pattern)
      .slice(0, 5); // Top 5 patterns
  }

  /**
   * Start performance monitoring during benchmarks
   */
  private startPerformanceMonitoring(): void {
    if (this.metricsInterval) {
      return; // Already monitoring
    }

    elizaLogger.info('Starting performance monitoring');
    
    this.metricsInterval = setInterval(() => {
      try {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        // Calculate CPU percentage (approximation)
        const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000; // Convert microseconds to milliseconds
        
        this.performanceMetrics.memoryUsage.push(memUsage.heapUsed);
        this.performanceMetrics.cpuUsage.push(cpuPercent);
        this.performanceMetrics.timestamps.push(Date.now());
        
        // Estimate active connections (simplified)
        const activeConnections = this.estimateActiveConnections();
        this.performanceMetrics.activeConnections.push(activeConnections);
        
        // Keep only last 1000 measurements to prevent memory bloat
        if (this.performanceMetrics.timestamps.length > 1000) {
          this.performanceMetrics.memoryUsage = this.performanceMetrics.memoryUsage.slice(-1000);
          this.performanceMetrics.cpuUsage = this.performanceMetrics.cpuUsage.slice(-1000);
          this.performanceMetrics.timestamps = this.performanceMetrics.timestamps.slice(-1000);
          this.performanceMetrics.activeConnections = this.performanceMetrics.activeConnections.slice(-1000);
        }
      } catch (error) {
        elizaLogger.warn('Performance monitoring error', error);
      }
    }, 1000); // Collect metrics every second
  }

  /**
   * Stop performance monitoring
   */
  private stopPerformanceMonitoring(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
      elizaLogger.info('Performance monitoring stopped');
    }
  }

  /**
   * Get current performance metrics
   */
  private getCurrentPerformanceSnapshot(): {
    memory: { current: number; peak: number; average: number };
    cpu: { current: number; peak: number; average: number };
    connections: { current: number; peak: number; average: number };
    monitoringDuration: number;
  } {
    const now = Date.now();
    const startTime = this.performanceMetrics.timestamps[0] || now;
    const monitoringDuration = now - startTime;

    const memory = {
      current: this.performanceMetrics.memoryUsage[this.performanceMetrics.memoryUsage.length - 1] || 0,
      peak: Math.max(...this.performanceMetrics.memoryUsage, 0),
      average: this.performanceMetrics.memoryUsage.length > 0
        ? this.performanceMetrics.memoryUsage.reduce((sum, val) => sum + val, 0) / this.performanceMetrics.memoryUsage.length
        : 0,
    };

    const cpu = {
      current: this.performanceMetrics.cpuUsage[this.performanceMetrics.cpuUsage.length - 1] || 0,
      peak: Math.max(...this.performanceMetrics.cpuUsage, 0),
      average: this.performanceMetrics.cpuUsage.length > 0
        ? this.performanceMetrics.cpuUsage.reduce((sum, val) => sum + val, 0) / this.performanceMetrics.cpuUsage.length
        : 0,
    };

    const connections = {
      current: this.performanceMetrics.activeConnections[this.performanceMetrics.activeConnections.length - 1] || 0,
      peak: Math.max(...this.performanceMetrics.activeConnections, 0),
      average: this.performanceMetrics.activeConnections.length > 0
        ? this.performanceMetrics.activeConnections.reduce((sum, val) => sum + val, 0) / this.performanceMetrics.activeConnections.length
        : 0,
    };

    return {
      memory,
      cpu,
      connections,
      monitoringDuration,
    };
  }

  /**
   * Estimate active connections (simplified)
   */
  private estimateActiveConnections(): number {
    // This is a simplified estimation - in a real implementation,
    // you might track actual network connections or active service calls
    let connections = 0;
    
    if (this.contractService) connections += 1;
    if (this.e2bService) connections += 1;
    
    // Add estimated connections based on active benchmark scenarios
    // This is a rough approximation
    connections += Math.min(contractBenchmarkScenarios.length, 5);
    
    return connections;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    const failedResults = this.results.filter(r => !r.success);
    
    if (failedResults.length > 0) {
      const commonErrors = this.analyzeCommonErrors(failedResults);
      recommendations.push(...commonErrors.map(error => `Address common error: ${error}`));
    }

    const slowResults = this.results.filter(r => r.duration > 240000); // 4 minutes
    if (slowResults.length > 0) {
      recommendations.push('Optimize slow-performing scenarios');
    }

    if (this.results.some(r => !r.outputs.demoAccessible)) {
      recommendations.push('Improve demo environment setup and accessibility');
    }

    return recommendations;
  }

  private analyzeCommonErrors(failedResults: BenchmarkResult[]): string[] {
    const errorCounts: Record<string, number> = {};

    failedResults.forEach(result => {
      result.errors.forEach(error => {
        // Normalize error messages to group similar errors
        const normalizedError = error.toLowerCase()
          .replace(/\d+/g, 'N')
          .replace(/0x[a-f0-9]+/gi, '0xHEX');
        
        errorCounts[normalizedError] = (errorCounts[normalizedError] || 0) + 1;
      });
    });

    // Return errors that occur in more than 20% of failures
    const threshold = Math.max(1, Math.floor(failedResults.length * 0.2));
    
    return Object.entries(errorCounts)
      .filter(([_, count]) => count >= threshold)
      .map(([error, _]) => error)
      .slice(0, 5); // Top 5 most common errors
  }
}