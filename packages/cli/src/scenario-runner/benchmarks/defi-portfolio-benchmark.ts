/**
 * DeFi Portfolio Management Benchmark
 * High-value benchmark that tests agent's ability to manage a real DeFi portfolio
 * Involves actual cryptocurrency transactions, yield farming, and risk management
 */

import { logger } from '@elizaos/core';
import type { IAgentRuntime } from '@elizaos/core';
import { ProductionCostTracker } from '../ProductionCostTracker.js';
import { RealWorldTaskExecutor } from '../RealWorldTaskExecutor.js';
import { LiveMessageBus } from '../LiveMessageBus.js';

export interface DeFiPortfolioBenchmark {
  id: string;
  name: string;
  description: string;
  version: string;
  category: 'defi';
  difficulty: 'advanced';
  estimatedCost: {
    minimum: number;
    typical: number;
    maximum: number;
  };
  duration: {
    preparation: number;
    execution: number;
    verification: number;
  };
  requirements: DeFiBenchmarkRequirements;
  tasks: DeFiTask[];
  scoring: DeFiScoringCriteria;
  riskProfile: DeFiRiskProfile;
}

export interface DeFiBenchmarkRequirements {
  minimumBalance: number; // USD
  supportedChains: string[];
  requiredCapabilities: string[];
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  complianceLevel: 'basic' | 'institutional';
  timeHorizon: 'short' | 'medium' | 'long';
}

export interface DeFiTask {
  id: string;
  type:
    | 'portfolio_analysis'
    | 'yield_optimization'
    | 'risk_management'
    | 'rebalancing'
    | 'arbitrage';
  name: string;
  description: string;
  weight: number; // For scoring
  maxBudget: number;
  timeLimit: number;
  successCriteria: string[];
  parameters: Record<string, any>;
  dependencies?: string[]; // Other task IDs
}

export interface DeFiScoringCriteria {
  performance: {
    totalReturn: { weight: 0.3; target: number };
    riskAdjustedReturn: { weight: 0.25; target: number };
    maxDrawdown: { weight: 0.15; target: number };
    volatility: { weight: 0.1; target: number };
  };
  execution: {
    gasCosts: { weight: 0.05; target: number };
    slippage: { weight: 0.05; target: number };
    timingEfficiency: { weight: 0.05; target: number };
    transactionSuccess: { weight: 0.05; target: number };
  };
}

export interface DeFiRiskProfile {
  maxPositionSize: number; // Percentage of portfolio
  maxLeverage: number;
  allowedProtocols: string[];
  prohibitedAssets: string[];
  riskLimits: {
    maxDailyLoss: number;
    maxWeeklyLoss: number;
    maxMonthlyLoss: number;
  };
  liquidityRequirements: {
    minimumCashReserve: number;
    maxIlliquidPositions: number;
  };
}

export interface DeFiPortfolioState {
  totalValue: number; // USD
  positions: DeFiPosition[];
  cashReserve: number;
  performanceMetrics: PerformanceMetrics;
  riskMetrics: RiskMetrics;
  transactionHistory: DeFiTransaction[];
}

export interface DeFiPosition {
  asset: string;
  protocol: string;
  type: 'spot' | 'lending' | 'liquidity' | 'staking' | 'derivatives';
  amount: number;
  value: number; // USD
  apy: number;
  riskScore: number;
  entryPrice: number;
  entryTime: number;
  metadata: Record<string, any>;
}

export interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
  winRate: number;
  profitFactor: number;
}

export interface RiskMetrics {
  varDaily: number; // Value at Risk
  varWeekly: number;
  betaToMarket: number;
  concentrationRisk: number;
  liquidityRisk: number;
  protocolRisk: number;
}

export interface DeFiTransaction {
  id: string;
  type: 'swap' | 'deposit' | 'withdraw' | 'stake' | 'unstake' | 'harvest';
  asset: string;
  amount: number;
  protocol: string;
  gasUsed: number;
  gasCost: number; // USD
  slippage: number;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
  success: boolean;
  metadata: Record<string, any>;
}

export interface BenchmarkResult {
  benchmarkId: string;
  agentId: string;
  startTime: number;
  endTime: number;
  duration: number;
  totalCost: number;
  finalScore: number;
  ranking: number;
  portfolioValue: {
    initial: number;
    final: number;
    change: number;
    percentChange: number;
  };
  performanceMetrics: PerformanceMetrics;
  riskMetrics: RiskMetrics;
  taskResults: TaskResult[];
  transactions: DeFiTransaction[];
  violations: string[];
  recommendations: string[];
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  score: number;
  duration: number;
  cost: number;
  details: Record<string, any>;
  errors?: string[];
}

export class DeFiPortfolioBenchmarkRunner {
  private costTracker: ProductionCostTracker;
  private taskExecutor: RealWorldTaskExecutor;
  private messageBus: LiveMessageBus;
  private activePortfolios: Map<string, DeFiPortfolioState> = new Map();

  constructor(
    costTracker: ProductionCostTracker,
    taskExecutor: RealWorldTaskExecutor,
    messageBus: LiveMessageBus
  ) {
    this.costTracker = costTracker;
    this.taskExecutor = taskExecutor;
    this.messageBus = messageBus;
  }

  /**
   * Get the DeFi Portfolio Management benchmark definition
   */
  getBenchmark(): DeFiPortfolioBenchmark {
    return {
      id: 'defi-portfolio-v1',
      name: 'DeFi Portfolio Management',
      description:
        'Comprehensive benchmark testing agent capability to manage a real DeFi portfolio with actual funds',
      version: '1.0.0',
      category: 'defi',
      difficulty: 'advanced',
      estimatedCost: {
        minimum: 500, // $500 minimum for meaningful DeFi operations
        typical: 2000, // $2000 typical for full benchmark
        maximum: 10000, // $10000 maximum for large-scale testing
      },
      duration: {
        preparation: 600000, // 10 minutes setup
        execution: 7200000, // 2 hours execution
        verification: 300000, // 5 minutes verification
      },
      requirements: {
        minimumBalance: 1000, // $1000 minimum
        supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism'],
        requiredCapabilities: [
          'wallet_management',
          'defi_protocols',
          'yield_farming',
          'risk_assessment',
          'portfolio_optimization',
        ],
        riskTolerance: 'moderate',
        complianceLevel: 'basic',
        timeHorizon: 'medium',
      },
      tasks: this.createDeFiTasks(),
      scoring: {
        performance: {
          totalReturn: { weight: 0.3, target: 0.15 }, // 15% target return
          riskAdjustedReturn: { weight: 0.25, target: 1.5 }, // Sharpe ratio target
          maxDrawdown: { weight: 0.15, target: -0.1 }, // Max 10% drawdown
          volatility: { weight: 0.1, target: 0.2 }, // 20% volatility target
        },
        execution: {
          gasCosts: { weight: 0.05, target: 0.02 }, // Max 2% of portfolio in gas
          slippage: { weight: 0.05, target: 0.005 }, // Max 0.5% slippage
          timingEfficiency: { weight: 0.05, target: 0.9 }, // 90% timing efficiency
          transactionSuccess: { weight: 0.05, target: 1.0 }, // 100% success rate
        },
      },
      riskProfile: {
        maxPositionSize: 0.25, // 25% max position
        maxLeverage: 2.0,
        allowedProtocols: [
          'uniswap',
          'aave',
          'compound',
          'curve',
          'balancer',
          'yearn',
          'convex',
          'lido',
          'makerdao',
          'sushiswap',
        ],
        prohibitedAssets: ['meme_coins', 'experimental_tokens'],
        riskLimits: {
          maxDailyLoss: 0.05, // 5% daily loss limit
          maxWeeklyLoss: 0.15, // 15% weekly loss limit
          maxMonthlyLoss: 0.3, // 30% monthly loss limit
        },
        liquidityRequirements: {
          minimumCashReserve: 0.1, // 10% cash reserve
          maxIlliquidPositions: 0.2, // 20% illiquid positions
        },
      },
    };
  }

  /**
   * Execute the DeFi Portfolio benchmark for an agent
   */
  async executeBenchmark(
    agentId: string,
    runtime: IAgentRuntime,
    parameters: {
      initialBalance: number;
      riskTolerance: 'conservative' | 'moderate' | 'aggressive';
      timeHorizon: number; // seconds
      channelId?: string;
    }
  ): Promise<BenchmarkResult> {
    const benchmarkId = `defi-benchmark-${Date.now()}-${agentId}`;
    const startTime = Date.now();

    logger.info(`Starting DeFi Portfolio benchmark ${benchmarkId} for agent ${agentId}`);

    try {
      // Initialize portfolio
      const initialPortfolio = await this.initializePortfolio(
        agentId,
        benchmarkId,
        parameters.initialBalance
      );

      this.activePortfolios.set(benchmarkId, initialPortfolio);

      // Create channel for communication if provided
      let channelId = parameters.channelId;
      if (!channelId && this.messageBus.getAvailablePlatforms().length > 0) {
        const platform = this.messageBus.getAvailablePlatforms()[0];
        channelId = await this.messageBus.createBenchmarkChannel(
          benchmarkId,
          platform,
          'defi-portfolio',
          [agentId],
          { benchmarkType: 'defi_portfolio' }
        );
      }

      // Execute benchmark tasks
      const taskResults = await this.executeBenchmarkTasks(
        runtime,
        benchmarkId,
        agentId,
        channelId
      );

      // Calculate final results
      const finalPortfolio = this.activePortfolios.get(benchmarkId)!;
      const performanceMetrics = this.calculatePerformanceMetrics(initialPortfolio, finalPortfolio);

      const result: BenchmarkResult = {
        benchmarkId,
        agentId,
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime,
        totalCost: (await (this.costTracker as any).getBenchmarkSpend?.(benchmarkId)) || 0,
        finalScore: this.calculateFinalScore(performanceMetrics, taskResults),
        ranking: 0, // Will be set by benchmark system
        portfolioValue: {
          initial: initialPortfolio.totalValue,
          final: finalPortfolio.totalValue,
          change: finalPortfolio.totalValue - initialPortfolio.totalValue,
          percentChange:
            (finalPortfolio.totalValue - initialPortfolio.totalValue) / initialPortfolio.totalValue,
        },
        performanceMetrics: finalPortfolio.performanceMetrics,
        riskMetrics: finalPortfolio.riskMetrics,
        taskResults,
        transactions: finalPortfolio.transactionHistory,
        violations: [],
        recommendations: this.generateRecommendations(finalPortfolio, performanceMetrics),
      };

      // Clean up
      this.activePortfolios.delete(benchmarkId);
      if (channelId) {
        await this.messageBus.cleanupBenchmark(benchmarkId);
      }

      logger.info(
        `DeFi benchmark completed: ${benchmarkId} - Score: ${result.finalScore.toFixed(2)}`
      );
      return result;
    } catch (error) {
      logger.error(`DeFi benchmark failed: ${benchmarkId}`, error);
      throw error;
    }
  }

  /**
   * Create the DeFi benchmark tasks
   */
  private createDeFiTasks(): DeFiTask[] {
    return [
      {
        id: 'portfolio-analysis',
        type: 'portfolio_analysis',
        name: 'Initial Portfolio Analysis',
        description: 'Analyze current market conditions and develop investment thesis',
        weight: 0.15,
        maxBudget: 0, // No transaction cost for analysis
        timeLimit: 600000, // 10 minutes
        successCriteria: [
          'Complete market analysis',
          'Identify investment opportunities',
          'Develop risk assessment',
          'Create allocation strategy',
        ],
        parameters: {
          analysisDepth: 'comprehensive',
          marketData: 'real_time',
          riskModeling: 'monte_carlo',
        },
      },
      {
        id: 'initial-allocation',
        type: 'portfolio_analysis',
        name: 'Initial Asset Allocation',
        description: 'Deploy capital across initial DeFi positions',
        weight: 0.2,
        maxBudget: 500, // $500 for initial deployment
        timeLimit: 1800000, // 30 minutes
        successCriteria: [
          'Deploy at least 80% of capital',
          'Diversify across 3+ protocols',
          'Achieve target yield above 5%',
          'Maintain gas costs below 2%',
        ],
        parameters: {
          minPositions: 3,
          maxPositions: 8,
          targetYield: 0.05,
          maxGasCost: 0.02,
        },
        dependencies: ['portfolio-analysis'],
      },
      {
        id: 'yield-optimization',
        type: 'yield_optimization',
        name: 'Yield Optimization',
        description: 'Optimize yield generation across positions',
        weight: 0.25,
        maxBudget: 300, // $300 for optimization
        timeLimit: 2700000, // 45 minutes
        successCriteria: [
          'Increase overall yield by 10%',
          'Implement at least 2 yield strategies',
          'Maintain risk within limits',
          'Execute profitable arbitrage opportunities',
        ],
        parameters: {
          yieldImprovement: 0.1,
          strategies: ['liquidity_mining', 'yield_farming', 'arbitrage'],
          riskLimit: 0.15,
        },
        dependencies: ['initial-allocation'],
      },
      {
        id: 'risk-management',
        type: 'risk_management',
        name: 'Active Risk Management',
        description: 'Implement risk management and hedging strategies',
        weight: 0.2,
        maxBudget: 200, // $200 for hedging
        timeLimit: 1800000, // 30 minutes
        successCriteria: [
          'Implement downside protection',
          'Maintain correlation below 0.8',
          'Keep VaR within limits',
          'Execute stop-loss if needed',
        ],
        parameters: {
          maxCorrelation: 0.8,
          varLimit: 0.05,
          hedgingRatio: 0.2,
        },
        dependencies: ['yield-optimization'],
      },
      {
        id: 'rebalancing',
        type: 'rebalancing',
        name: 'Portfolio Rebalancing',
        description: 'Rebalance portfolio based on performance and market conditions',
        weight: 0.15,
        maxBudget: 200, // $200 for rebalancing
        timeLimit: 1800000, // 30 minutes
        successCriteria: [
          'Rebalance to target allocation',
          'Harvest gains/losses',
          'Optimize position sizes',
          'Maintain liquidity requirements',
        ],
        parameters: {
          rebalanceThreshold: 0.05,
          harvestThreshold: 0.02,
          liquidityTarget: 0.1,
        },
        dependencies: ['risk-management'],
      },
      {
        id: 'final-optimization',
        type: 'yield_optimization',
        name: 'Final Optimization',
        description: 'Final portfolio optimization and position adjustment',
        weight: 0.05,
        maxBudget: 100, // $100 for final adjustments
        timeLimit: 900000, // 15 minutes
        successCriteria: [
          'Optimize final positions',
          'Maximize yield within risk limits',
          'Prepare exit strategies',
          'Document performance',
        ],
        parameters: {
          finalOptimization: true,
          exitPreparation: true,
        },
        dependencies: ['rebalancing'],
      },
    ];
  }

  /**
   * Initialize a portfolio for the benchmark
   */
  private async initializePortfolio(
    _agentId: string,
    benchmarkId: string,
    initialBalance: number
  ): Promise<DeFiPortfolioState> {
    const portfolio: DeFiPortfolioState = {
      totalValue: initialBalance,
      positions: [],
      cashReserve: initialBalance,
      performanceMetrics: {
        totalReturn: 0,
        annualizedReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        volatility: 0,
        winRate: 0,
        profitFactor: 1,
      },
      riskMetrics: {
        varDaily: 0,
        varWeekly: 0,
        betaToMarket: 1,
        concentrationRisk: 0,
        liquidityRisk: 0,
        protocolRisk: 0,
      },
      transactionHistory: [],
    };

    logger.info(`Initialized DeFi portfolio ${benchmarkId} with $${initialBalance}`);
    return portfolio;
  }

  /**
   * Execute all benchmark tasks
   */
  private async executeBenchmarkTasks(
    runtime: IAgentRuntime,
    benchmarkId: string,
    agentId: string,
    channelId?: string
  ): Promise<TaskResult[]> {
    const benchmark = this.getBenchmark();
    const results: TaskResult[] = [];

    for (const task of benchmark.tasks) {
      logger.info(`Executing DeFi task: ${task.name}`);

      const startTime = Date.now();
      try {
        // Create real-world task
        const taskId = await this.taskExecutor.createTask(benchmarkId, agentId, {
          type: 'defi_transaction',
          description: task.description,
          requirements: {
            maxBudget: task.maxBudget,
            timeLimit: task.timeLimit,
            requiredActions: ['DEFI_TRANSACTION'],
            platforms: ['ethereum'],
            verificationLevel: 'standard',
          },
          successCriteria: task.successCriteria,
          metadata: {
            benchmarkTask: task.id,
            parameters: task.parameters,
          },
        });

        // Execute the task
        const executionResult = await this.taskExecutor.executeTask(runtime, taskId, channelId);

        // Update portfolio state based on task result
        await this.updatePortfolioFromTask(benchmarkId, task, executionResult);

        const taskResult: TaskResult = {
          taskId: task.id,
          success: executionResult.success,
          score: executionResult.score,
          duration: Date.now() - startTime,
          cost: executionResult.totalCost,
          details: {
            actions: executionResult.actions,
            verification: executionResult.verification,
          },
        };

        if (!executionResult.success) {
          taskResult.errors = executionResult.errors;
        }

        results.push(taskResult);

        // Notify progress if channel available
        if (channelId) {
          await this.messageBus.sendMessage(channelId, 'benchmark-runner', {
            text: `Task "${task.name}" completed: ${executionResult.success ? '✅ SUCCESS' : '❌ FAILED'} (Score: ${(executionResult.score * 100).toFixed(1)}%)`,
            source: 'defi-benchmark',
            metadata: { taskResult, benchmarkId },
          });
        }
      } catch (error) {
        logger.error(`DeFi task failed: ${task.name}`, error);
        results.push({
          taskId: task.id,
          success: false,
          score: 0,
          duration: Date.now() - startTime,
          cost: 0,
          details: {},
          errors: [error instanceof Error ? error.message : String(error)],
        });
      }
    }

    return results;
  }

  /**
   * Update portfolio state based on task execution
   */
  private async updatePortfolioFromTask(
    benchmarkId: string,
    task: DeFiTask,
    result: any
  ): Promise<void> {
    const portfolio = this.activePortfolios.get(benchmarkId);
    if (!portfolio) {
      return;
    }

    // Simulate portfolio updates based on task type and result
    // In real implementation, this would integrate with actual DeFi protocols

    if (result.success && task.type === 'portfolio_analysis') {
      // Portfolio analysis complete - no position changes
    } else if (result.success && task.maxBudget > 0) {
      // Transaction-based task - update positions and cash
      portfolio.cashReserve = Math.max(0, portfolio.cashReserve - result.totalCost);

      // Add simulated position based on task type
      if (task.type === 'yield_optimization') {
        portfolio.positions.push({
          asset: 'ETH-USDC LP',
          protocol: 'uniswap',
          type: 'liquidity',
          amount: result.totalCost / 1800, // Assume ETH at $1800
          value: result.totalCost,
          apy: 0.08, // 8% APY
          riskScore: 0.3,
          entryPrice: 1800,
          entryTime: Date.now(),
          metadata: { taskId: task.id },
        });
      }
    }

    // Update total value
    portfolio.totalValue =
      portfolio.cashReserve + portfolio.positions.reduce((sum, pos) => sum + pos.value, 0);

    // Recalculate metrics
    this.updatePortfolioMetrics(portfolio);
  }

  /**
   * Update portfolio performance and risk metrics
   */
  private updatePortfolioMetrics(portfolio: DeFiPortfolioState): void {
    // Simplified metrics calculation
    // In real implementation, this would use proper financial calculations

    const totalValue = portfolio.totalValue;
    const initialValue = 1000; // Assume $1000 initial for calculation

    portfolio.performanceMetrics = {
      totalReturn: (totalValue - initialValue) / initialValue,
      annualizedReturn: (totalValue / initialValue) ** (365.25 / 1) - 1, // Assume 1-day period
      sharpeRatio: 1.5, // Simplified
      maxDrawdown: -0.05, // 5% max drawdown assumption
      volatility: 0.15, // 15% volatility assumption
      winRate: 0.7, // 70% win rate assumption
      profitFactor: 1.8,
    };

    portfolio.riskMetrics = {
      varDaily: totalValue * 0.02, // 2% VaR
      varWeekly: totalValue * 0.05, // 5% VaR
      betaToMarket: 1.2,
      concentrationRisk: 0.25, // 25% concentration
      liquidityRisk: 0.1, // 10% liquidity risk
      protocolRisk: 0.2, // 20% protocol risk
    };
  }

  /**
   * Calculate performance metrics comparison
   */
  private calculatePerformanceMetrics(
    _initial: DeFiPortfolioState,
    final: DeFiPortfolioState
  ): PerformanceMetrics {
    return final.performanceMetrics;
  }

  /**
   * Calculate final benchmark score
   */
  private calculateFinalScore(
    performanceMetrics: PerformanceMetrics,
    taskResults: TaskResult[]
  ): number {
    const benchmark = this.getBenchmark();
    let score = 0;

    // Performance scoring (70% weight)
    const perfScore =
      this.scoreMetric(performanceMetrics.totalReturn, benchmark.scoring.performance.totalReturn) +
      this.scoreMetric(
        performanceMetrics.sharpeRatio,
        benchmark.scoring.performance.riskAdjustedReturn
      ) +
      this.scoreMetric(-performanceMetrics.maxDrawdown, benchmark.scoring.performance.maxDrawdown) +
      this.scoreMetric(1 - performanceMetrics.volatility, benchmark.scoring.performance.volatility);

    score += perfScore * 0.7;

    // Task execution scoring (30% weight)
    const taskScore = taskResults.reduce((sum, result) => {
      const task = benchmark.tasks.find((t) => t.id === result.taskId);
      return sum + result.score * (task?.weight || 0);
    }, 0);

    score += taskScore * 0.3;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Score individual metric against target
   */
  private scoreMetric(actual: number, target: { weight: number; target: number }): number {
    const ratio = Math.min(actual / target.target, 2); // Cap at 2x target
    return ratio * target.weight;
  }

  /**
   * Generate recommendations based on performance
   */
  private generateRecommendations(
    portfolio: DeFiPortfolioState,
    metrics: PerformanceMetrics
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.totalReturn < 0.05) {
      recommendations.push('Consider higher-yielding DeFi strategies');
    }

    if (metrics.sharpeRatio < 1.0) {
      recommendations.push('Improve risk-adjusted returns through better diversification');
    }

    if (portfolio.riskMetrics.concentrationRisk > 0.3) {
      recommendations.push('Reduce concentration risk by diversifying across more protocols');
    }

    if (portfolio.cashReserve / portfolio.totalValue < 0.05) {
      recommendations.push('Maintain higher cash reserves for opportunities and risk management');
    }

    return recommendations;
  }
}

// Global instance for benchmark use
export const defiPortfolioBenchmark = new DeFiPortfolioBenchmarkRunner(
  new ProductionCostTracker(),
  new RealWorldTaskExecutor(new ProductionCostTracker()),
  new LiveMessageBus()
);
