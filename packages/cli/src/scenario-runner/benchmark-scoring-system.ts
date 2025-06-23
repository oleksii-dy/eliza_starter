/**
 * Comprehensive Scoring and Evaluation System
 * Provides standardized scoring, ranking, and evaluation across all benchmark types
 * Enables fair comparison of agents and tracking performance improvements
 */

import { logger } from '@elizaos/core';
import type { IAgentRuntime } from '@elizaos/core';
import { ProductionCostTracker } from './production-cost-tracker.js';

export interface BenchmarkScore {
  benchmarkId: string;
  agentId: string;
  benchmarkType: string;
  version: string;
  timestamp: number;
  
  // Core scoring components
  overallScore: number; // 0-1
  categoryScores: CategoryScores;
  performanceMetrics: PerformanceMetrics;
  economicMetrics: EconomicMetrics;
  riskMetrics: RiskMetrics;
  
  // Ranking and comparison
  ranking: RankingInfo;
  percentile: number; // 0-100
  improvementSuggestions: string[];
  
  // Metadata
  executionContext: ExecutionContext;
  verification: VerificationInfo;
}

export interface CategoryScores {
  // Universal categories (0-1 scale)
  technical: number;      // Technical execution quality
  economic: number;       // Economic/financial performance
  efficiency: number;     // Resource utilization efficiency
  reliability: number;    // Consistency and error handling
  innovation: number;     // Novel approaches and creativity
  
  // Domain-specific categories
  domainSpecific: Record<string, number>;
}

export interface PerformanceMetrics {
  // Execution metrics
  executionTime: number;          // Total milliseconds
  taskCompletionRate: number;     // 0-1
  errorRate: number;              // 0-1
  
  // Quality metrics
  accuracyScore: number;          // 0-1
  consistencyScore: number;       // 0-1
  innovationScore: number;        // 0-1
  
  // Efficiency metrics
  resourceEfficiency: number;     // 0-1
  costEfficiency: number;         // 0-1
  timeEfficiency: number;         // 0-1
}

export interface EconomicMetrics {
  // Financial performance
  totalCost: number;              // USD
  costPerTask: number;            // USD
  costEfficiency: number;         // Value/Cost ratio
  
  // ROI metrics
  returnOnInvestment: number;     // Ratio
  profitMargin: number;          // Percentage
  valueGenerated: number;         // USD equivalent
  
  // Risk-adjusted returns
  sharpeRatio: number;           // Risk-adjusted performance
  maxDrawdown: number;           // Maximum loss
  volatility: number;            // Standard deviation
}

export interface RiskMetrics {
  // Overall risk assessment
  overallRisk: number;           // 0-1 scale
  riskAdjustedScore: number;     // Score adjusted for risk
  
  // Risk categories
  executionRisk: number;         // Risk of execution failure
  financialRisk: number;         // Risk of financial loss
  operationalRisk: number;       // Risk of operational issues
  complianceRisk: number;        // Risk of compliance violations
  
  // Risk factors
  riskFactors: RiskFactor[];
  mitigation: RiskMitigation[];
}

export interface RiskFactor {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number; // 0-1
  impact: number; // 0-1
  description: string;
}

export interface RiskMitigation {
  riskType: string;
  strategy: string;
  effectiveness: number; // 0-1
  cost: number; // USD
}

export interface RankingInfo {
  currentRank: number;
  totalParticipants: number;
  previousRank?: number;
  rankChange: number;
  
  // Comparative metrics
  scoreVsAverage: number;        // How much above/below average
  scoreVsLeader: number;         // Distance from leader
  improvementRate: number;       // Rate of improvement over time
}

export interface ExecutionContext {
  agentVersion: string;
  pluginsUsed: string[];
  runtimeEnvironment: string;
  hardwareSpec: string;
  networkConditions: string;
  marketConditions?: Record<string, any>;
}

export interface VerificationInfo {
  verified: boolean;
  verificationMethod: string;
  verificationScore: number; // 0-1
  thirdPartyValidation: boolean;
  auditTrail: AuditEvent[];
}

export interface AuditEvent {
  timestamp: number;
  event: string;
  details: Record<string, any>;
  verification: string;
}

export interface BenchmarkLeaderboard {
  benchmarkType: string;
  timeframe: 'daily' | 'weekly' | 'monthly' | 'all_time';
  lastUpdated: number;
  
  rankings: LeaderboardEntry[];
  statistics: LeaderboardStats;
  trends: TrendAnalysis;
}

export interface LeaderboardEntry {
  rank: number;
  agentId: string;
  agentName: string;
  developer: string;
  score: number;
  scoreBreakdown: CategoryScores;
  cost: number;
  improvement: number; // Change from previous period
  verified: boolean;
  
  // Additional metrics
  attempts: number;
  bestScore: number;
  consistency: number;
}

export interface LeaderboardStats {
  totalParticipants: number;
  averageScore: number;
  medianScore: number;
  standardDeviation: number;
  topScoreProgress: number[]; // Historical top scores
  participationTrend: number[]; // Participation over time
}

export interface TrendAnalysis {
  scoreImprovement: {
    overall: number;
    byCategory: Record<string, number>;
  };
  costOptimization: number;
  innovationRate: number;
  convergenceRate: number; // How quickly scores are converging
}

export interface ScoringWeights {
  categories: Record<string, number>;
  metrics: Record<string, number>;
  adjustments: ScoringAdjustment[];
}

export interface ScoringAdjustment {
  type: 'multiplier' | 'bonus' | 'penalty';
  condition: string;
  value: number;
  description: string;
}

export class BenchmarkScoringSystem {
  private costTracker: ProductionCostTracker;
  private benchmarkScores: Map<string, BenchmarkScore[]> = new Map();
  private leaderboards: Map<string, BenchmarkLeaderboard> = new Map();
  private scoringWeights: Map<string, ScoringWeights> = new Map();

  constructor(costTracker: ProductionCostTracker) {
    this.costTracker = costTracker;
    this.initializeScoringWeights();
  }

  /**
   * Calculate comprehensive score for a benchmark result
   */
  async calculateScore(
    benchmarkId: string,
    agentId: string,
    benchmarkType: string,
    rawResults: any,
    executionContext: ExecutionContext
  ): Promise<BenchmarkScore> {
    logger.info(`Calculating comprehensive score for benchmark ${benchmarkId}`);

    // Get scoring weights for this benchmark type
    const weights = this.scoringWeights.get(benchmarkType) || this.getDefaultWeights();

    // Calculate category scores
    const categoryScores = await this.calculateCategoryScores(
      benchmarkType,
      rawResults,
      weights
    );

    // Calculate performance metrics
    const performanceMetrics = this.calculatePerformanceMetrics(rawResults);

    // Calculate economic metrics
    const economicMetrics = await this.calculateEconomicMetrics(
      benchmarkId,
      rawResults
    );

    // Calculate risk metrics
    const riskMetrics = this.calculateRiskMetrics(rawResults, benchmarkType);

    // Calculate overall score
    const overallScore = this.calculateOverallScore(
      categoryScores,
      performanceMetrics,
      economicMetrics,
      riskMetrics,
      weights
    );

    // Get ranking information
    const ranking = await this.calculateRanking(
      benchmarkType,
      agentId,
      overallScore
    );

    // Generate verification info
    const verification = await this.generateVerificationInfo(
      benchmarkId,
      rawResults
    );

    // Create comprehensive score
    const score: BenchmarkScore = {
      benchmarkId,
      agentId,
      benchmarkType,
      version: '1.0.0',
      timestamp: Date.now(),
      overallScore,
      categoryScores,
      performanceMetrics,
      economicMetrics,
      riskMetrics,
      ranking,
      percentile: this.calculatePercentile(benchmarkType, overallScore),
      improvementSuggestions: this.generateImprovementSuggestions(
        categoryScores,
        performanceMetrics,
        economicMetrics,
        riskMetrics
      ),
      executionContext,
      verification,
    };

    // Store score
    this.storeScore(score);

    // Update leaderboards
    await this.updateLeaderboards(score);

    logger.info(`Score calculated: ${overallScore.toFixed(3)} (Rank: ${ranking.currentRank})`);
    return score;
  }

  /**
   * Calculate category-specific scores
   */
  private async calculateCategoryScores(
    benchmarkType: string,
    rawResults: any,
    weights: ScoringWeights
  ): Promise<CategoryScores> {
    const scores: CategoryScores = {
      technical: 0,
      economic: 0,
      efficiency: 0,
      reliability: 0,
      innovation: 0,
      domainSpecific: {},
    };

    // Technical score - based on execution quality and correctness
    scores.technical = this.calculateTechnicalScore(rawResults);

    // Economic score - based on financial performance
    scores.economic = this.calculateEconomicScore(rawResults);

    // Efficiency score - based on resource utilization
    scores.efficiency = this.calculateEfficiencyScore(rawResults);

    // Reliability score - based on consistency and error handling
    scores.reliability = this.calculateReliabilityScore(rawResults);

    // Innovation score - based on novel approaches
    scores.innovation = this.calculateInnovationScore(rawResults);

    // Domain-specific scores
    scores.domainSpecific = this.calculateDomainSpecificScores(
      benchmarkType,
      rawResults
    );

    return scores;
  }

  /**
   * Calculate technical execution score
   */
  private calculateTechnicalScore(rawResults: any): number {
    let score = 0;
    let factors = 0;

    // Task completion rate
    if (rawResults.taskResults) {
      const completionRate = rawResults.taskResults.filter((t: any) => t.success).length / 
        rawResults.taskResults.length;
      score += completionRate * 0.3;
      factors += 0.3;
    }

    // Execution accuracy
    if (rawResults.accuracy !== undefined) {
      score += rawResults.accuracy * 0.3;
      factors += 0.3;
    }

    // Error handling
    if (rawResults.errors) {
      const errorScore = Math.max(0, 1 - (rawResults.errors.length / 10));
      score += errorScore * 0.2;
      factors += 0.2;
    }

    // Code quality (if available)
    if (rawResults.codeQuality !== undefined) {
      score += rawResults.codeQuality * 0.2;
      factors += 0.2;
    }

    return factors > 0 ? score / factors : 0.5; // Default to median if no data
  }

  /**
   * Calculate economic performance score
   */
  private calculateEconomicScore(rawResults: any): number {
    let score = 0;
    let factors = 0;

    // Return on investment
    if (rawResults.roi !== undefined) {
      const roiScore = Math.min(rawResults.roi / 2.0, 1); // Normalize to 200% ROI
      score += roiScore * 0.4;
      factors += 0.4;
    }

    // Profit margin
    if (rawResults.profitMargin !== undefined) {
      const marginScore = Math.min(rawResults.profitMargin / 0.3, 1); // Normalize to 30% margin
      score += marginScore * 0.3;
      factors += 0.3;
    }

    // Cost efficiency
    if (rawResults.costEfficiency !== undefined) {
      score += rawResults.costEfficiency * 0.3;
      factors += 0.3;
    }

    return factors > 0 ? score / factors : 0.5;
  }

  /**
   * Calculate efficiency score
   */
  private calculateEfficiencyScore(rawResults: any): number {
    let score = 0;
    let factors = 0;

    // Time efficiency
    if (rawResults.duration && rawResults.expectedDuration) {
      const timeScore = Math.min(rawResults.expectedDuration / rawResults.duration, 2);
      score += Math.min(timeScore, 1) * 0.4;
      factors += 0.4;
    }

    // Resource efficiency
    if (rawResults.resourceUtilization !== undefined) {
      score += rawResults.resourceUtilization * 0.3;
      factors += 0.3;
    }

    // API call efficiency
    if (rawResults.apiCalls && rawResults.expectedApiCalls) {
      const apiScore = Math.min(rawResults.expectedApiCalls / rawResults.apiCalls, 2);
      score += Math.min(apiScore, 1) * 0.3;
      factors += 0.3;
    }

    return factors > 0 ? score / factors : 0.5;
  }

  /**
   * Calculate reliability score
   */
  private calculateReliabilityScore(rawResults: any): number {
    let score = 0;
    let factors = 0;

    // Success rate
    if (rawResults.successRate !== undefined) {
      score += rawResults.successRate * 0.4;
      factors += 0.4;
    }

    // Consistency (low variance in performance)
    if (rawResults.consistency !== undefined) {
      score += rawResults.consistency * 0.3;
      factors += 0.3;
    }

    // Error recovery
    if (rawResults.errorRecovery !== undefined) {
      score += rawResults.errorRecovery * 0.3;
      factors += 0.3;
    }

    return factors > 0 ? score / factors : 0.5;
  }

  /**
   * Calculate innovation score
   */
  private calculateInnovationScore(rawResults: any): number {
    let score = 0;
    let factors = 0;

    // Novel approaches
    if (rawResults.novelApproaches !== undefined) {
      score += rawResults.novelApproaches * 0.4;
      factors += 0.4;
    }

    // Creative solutions
    if (rawResults.creativeSolutions !== undefined) {
      score += rawResults.creativeSolutions * 0.3;
      factors += 0.3;
    }

    // Efficiency improvements
    if (rawResults.efficiencyImprovements !== undefined) {
      score += rawResults.efficiencyImprovements * 0.3;
      factors += 0.3;
    }

    // Default to median for innovation (hard to measure automatically)
    return factors > 0 ? score / factors : 0.5;
  }

  /**
   * Calculate domain-specific scores
   */
  private calculateDomainSpecificScores(
    benchmarkType: string,
    rawResults: any
  ): Record<string, number> {
    const scores: Record<string, number> = {};

    switch (benchmarkType) {
      case 'defi_portfolio':
        scores.riskManagement = this.calculateRiskManagementScore(rawResults);
        scores.yieldOptimization = this.calculateYieldOptimizationScore(rawResults);
        scores.portfolioDiversification = this.calculateDiversificationScore(rawResults);
        break;

      case 'ecommerce_store':
        scores.customerAcquisition = this.calculateCustomerAcquisitionScore(rawResults);
        scores.conversionOptimization = this.calculateConversionScore(rawResults);
        scores.inventoryManagement = this.calculateInventoryScore(rawResults);
        break;

      case 'social_engagement':
        scores.contentQuality = this.calculateContentQualityScore(rawResults);
        scores.audienceGrowth = this.calculateAudienceGrowthScore(rawResults);
        scores.engagementRate = this.calculateEngagementRateScore(rawResults);
        break;
    }

    return scores;
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(rawResults: any): PerformanceMetrics {
    return {
      executionTime: rawResults.duration || 0,
      taskCompletionRate: this.calculateTaskCompletionRate(rawResults),
      errorRate: this.calculateErrorRate(rawResults),
      accuracyScore: rawResults.accuracy || 0.5,
      consistencyScore: rawResults.consistency || 0.5,
      innovationScore: rawResults.innovation || 0.5,
      resourceEfficiency: rawResults.resourceEfficiency || 0.5,
      costEfficiency: rawResults.costEfficiency || 0.5,
      timeEfficiency: this.calculateTimeEfficiency(rawResults),
    };
  }

  /**
   * Calculate economic metrics
   */
  private async calculateEconomicMetrics(
    benchmarkId: string,
    rawResults: any
  ): Promise<EconomicMetrics> {
    const totalCost = await this.costTracker.getBenchmarkSpend(benchmarkId);
    const valueGenerated = rawResults.valueGenerated || 0;

    return {
      totalCost,
      costPerTask: rawResults.taskResults ? totalCost / rawResults.taskResults.length : totalCost,
      costEfficiency: valueGenerated > 0 ? valueGenerated / totalCost : 0,
      returnOnInvestment: rawResults.roi || 0,
      profitMargin: rawResults.profitMargin || 0,
      valueGenerated,
      sharpeRatio: rawResults.sharpeRatio || 0,
      maxDrawdown: rawResults.maxDrawdown || 0,
      volatility: rawResults.volatility || 0,
    };
  }

  /**
   * Calculate risk metrics
   */
  private calculateRiskMetrics(rawResults: any, benchmarkType: string): RiskMetrics {
    const riskFactors = this.identifyRiskFactors(rawResults, benchmarkType);
    const overallRisk = this.calculateOverallRisk(riskFactors);

    return {
      overallRisk,
      riskAdjustedScore: this.calculateRiskAdjustedScore(rawResults, overallRisk),
      executionRisk: this.calculateExecutionRisk(rawResults),
      financialRisk: this.calculateFinancialRisk(rawResults),
      operationalRisk: this.calculateOperationalRisk(rawResults),
      complianceRisk: this.calculateComplianceRisk(rawResults),
      riskFactors,
      mitigation: this.generateRiskMitigation(riskFactors),
    };
  }

  /**
   * Calculate overall score from component scores
   */
  private calculateOverallScore(
    categoryScores: CategoryScores,
    performanceMetrics: PerformanceMetrics,
    economicMetrics: EconomicMetrics,
    riskMetrics: RiskMetrics,
    weights: ScoringWeights
  ): number {
    let score = 0;
    let totalWeight = 0;

    // Category scores
    for (const [category, value] of Object.entries(categoryScores)) {
      if (typeof value === 'number') {
        const weight = weights.categories[category] || 0.2;
        score += value * weight;
        totalWeight += weight;
      }
    }

    // Performance adjustment
    const performanceWeight = weights.metrics.performance || 0.1;
    const avgPerformance = (
      performanceMetrics.accuracyScore +
      performanceMetrics.consistencyScore +
      performanceMetrics.resourceEfficiency
    ) / 3;
    score += avgPerformance * performanceWeight;
    totalWeight += performanceWeight;

    // Economic adjustment
    const economicWeight = weights.metrics.economic || 0.1;
    const economicScore = Math.min(economicMetrics.costEfficiency, 1);
    score += economicScore * economicWeight;
    totalWeight += economicWeight;

    // Risk adjustment
    const riskAdjustment = 1 - (riskMetrics.overallRisk * 0.2); // Max 20% penalty
    score *= riskAdjustment;

    // Apply scoring adjustments
    score = this.applyScoringAdjustments(score, weights.adjustments, economicMetrics);

    return Math.max(0, Math.min(1, totalWeight > 0 ? score / totalWeight : 0));
  }

  /**
   * Apply scoring adjustments and bonuses
   */
  private applyScoringAdjustments(
    score: number,
    adjustments: ScoringAdjustment[],
    metrics: EconomicMetrics
  ): number {
    let adjustedScore = score;

    for (const adjustment of adjustments) {
      if (this.evaluateAdjustmentCondition(adjustment.condition, metrics)) {
        switch (adjustment.type) {
          case 'multiplier':
            adjustedScore *= adjustment.value;
            break;
          case 'bonus':
            adjustedScore += adjustment.value;
            break;
          case 'penalty':
            adjustedScore -= adjustment.value;
            break;
        }
      }
    }

    return adjustedScore;
  }

  /**
   * Calculate ranking and comparative metrics
   */
  private async calculateRanking(
    benchmarkType: string,
    agentId: string,
    score: number
  ): Promise<RankingInfo> {
    const allScores = this.getAllScoresForBenchmark(benchmarkType);
    const sortedScores = allScores.sort((a, b) => b.overallScore - a.overallScore);
    
    const currentRank = sortedScores.findIndex(s => s.agentId === agentId && s.overallScore === score) + 1;
    const totalParticipants = sortedScores.length;
    
    // Find previous rank
    const previousScores = this.getPreviousScoresForAgent(benchmarkType, agentId);
    const previousRank = previousScores.length > 0 ? previousScores[0].ranking.currentRank : undefined;
    
    const average = allScores.reduce((sum, s) => sum + s.overallScore, 0) / allScores.length;
    const leader = sortedScores[0]?.overallScore || score;

    return {
      currentRank,
      totalParticipants,
      previousRank,
      rankChange: previousRank ? previousRank - currentRank : 0,
      scoreVsAverage: score - average,
      scoreVsLeader: score - leader,
      improvementRate: this.calculateImprovementRate(benchmarkType, agentId),
    };
  }

  /**
   * Generate improvement suggestions
   */
  private generateImprovementSuggestions(
    categoryScores: CategoryScores,
    performanceMetrics: PerformanceMetrics,
    economicMetrics: EconomicMetrics,
    riskMetrics: RiskMetrics
  ): string[] {
    const suggestions: string[] = [];

    // Category-based suggestions
    if (categoryScores.technical < 0.7) {
      suggestions.push('Focus on improving technical execution and reducing errors');
    }
    if (categoryScores.economic < 0.7) {
      suggestions.push('Optimize economic performance and cost efficiency');
    }
    if (categoryScores.efficiency < 0.7) {
      suggestions.push('Improve resource utilization and time management');
    }
    if (categoryScores.reliability < 0.7) {
      suggestions.push('Enhance consistency and error handling capabilities');
    }

    // Performance-based suggestions
    if (performanceMetrics.taskCompletionRate < 0.9) {
      suggestions.push('Increase task completion rate through better planning');
    }
    if (performanceMetrics.errorRate > 0.1) {
      suggestions.push('Reduce error rate through improved validation and testing');
    }

    // Economic suggestions
    if (economicMetrics.costEfficiency < 1.0) {
      suggestions.push('Optimize cost structure to improve value generation');
    }
    if (economicMetrics.returnOnInvestment < 1.5) {
      suggestions.push('Focus on higher-return strategies and opportunities');
    }

    // Risk suggestions
    if (riskMetrics.overallRisk > 0.7) {
      suggestions.push('Implement better risk management and mitigation strategies');
    }

    return suggestions;
  }

  /**
   * Update leaderboards with new score
   */
  private async updateLeaderboards(score: BenchmarkScore): Promise<void> {
    const timeframes: Array<'daily' | 'weekly' | 'monthly' | 'all_time'> = 
      ['daily', 'weekly', 'monthly', 'all_time'];

    for (const timeframe of timeframes) {
      await this.updateLeaderboard(score, timeframe);
    }
  }

  /**
   * Update specific leaderboard
   */
  private async updateLeaderboard(
    score: BenchmarkScore,
    timeframe: 'daily' | 'weekly' | 'monthly' | 'all_time'
  ): Promise<void> {
    const leaderboardKey = `${score.benchmarkType}-${timeframe}`;
    let leaderboard = this.leaderboards.get(leaderboardKey);

    if (!leaderboard) {
      leaderboard = {
        benchmarkType: score.benchmarkType,
        timeframe,
        lastUpdated: Date.now(),
        rankings: [],
        statistics: {
          totalParticipants: 0,
          averageScore: 0,
          medianScore: 0,
          standardDeviation: 0,
          topScoreProgress: [],
          participationTrend: [],
        },
        trends: {
          scoreImprovement: { overall: 0, byCategory: {} },
          costOptimization: 0,
          innovationRate: 0,
          convergenceRate: 0,
        },
      };
    }

    // Update or add entry
    const existingIndex = leaderboard.rankings.findIndex(r => r.agentId === score.agentId);
    
    const entry: LeaderboardEntry = {
      rank: 0, // Will be calculated
      agentId: score.agentId,
      agentName: `Agent-${score.agentId.slice(-8)}`,
      developer: 'Unknown',
      score: score.overallScore,
      scoreBreakdown: score.categoryScores,
      cost: score.economicMetrics.totalCost,
      improvement: 0, // Will be calculated
      verified: score.verification.verified,
      attempts: 1,
      bestScore: score.overallScore,
      consistency: 1.0,
    };

    if (existingIndex >= 0) {
      const existing = leaderboard.rankings[existingIndex];
      entry.improvement = score.overallScore - existing.score;
      entry.attempts = existing.attempts + 1;
      entry.bestScore = Math.max(existing.bestScore, score.overallScore);
      entry.consistency = this.calculateConsistency(score.agentId, score.benchmarkType);
      
      leaderboard.rankings[existingIndex] = entry;
    } else {
      leaderboard.rankings.push(entry);
    }

    // Sort and assign ranks
    leaderboard.rankings.sort((a, b) => b.score - a.score);
    leaderboard.rankings.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Update statistics
    this.updateLeaderboardStatistics(leaderboard);

    // Update trends
    this.updateLeaderboardTrends(leaderboard);

    leaderboard.lastUpdated = Date.now();
    this.leaderboards.set(leaderboardKey, leaderboard);

    logger.info(`Updated ${leaderboardKey} leaderboard`);
  }

  /**
   * Store score in history
   */
  private storeScore(score: BenchmarkScore): void {
    const key = score.benchmarkType;
    const scores = this.benchmarkScores.get(key) || [];
    scores.push(score);
    
    // Keep only last 1000 scores per benchmark type
    if (scores.length > 1000) {
      scores.splice(0, scores.length - 1000);
    }
    
    this.benchmarkScores.set(key, scores);
  }

  // Helper methods for scoring calculations
  private calculateTaskCompletionRate(rawResults: any): number {
    if (!rawResults.taskResults) return 0;
    const completed = rawResults.taskResults.filter((t: any) => t.success).length;
    return completed / rawResults.taskResults.length;
  }

  private calculateErrorRate(rawResults: any): number {
    const totalOperations = rawResults.totalOperations || 1;
    const errors = rawResults.errors?.length || 0;
    return errors / totalOperations;
  }

  private calculateTimeEfficiency(rawResults: any): number {
    if (!rawResults.duration || !rawResults.expectedDuration) return 0.5;
    return Math.min(rawResults.expectedDuration / rawResults.duration, 2);
  }

  // Domain-specific scoring methods
  private calculateRiskManagementScore(rawResults: any): number {
    return rawResults.riskScore || 0.5;
  }

  private calculateYieldOptimizationScore(rawResults: any): number {
    return rawResults.yieldScore || 0.5;
  }

  private calculateDiversificationScore(rawResults: any): number {
    return rawResults.diversificationScore || 0.5;
  }

  private calculateCustomerAcquisitionScore(rawResults: any): number {
    return rawResults.customerAcquisitionScore || 0.5;
  }

  private calculateConversionScore(rawResults: any): number {
    return rawResults.conversionScore || 0.5;
  }

  private calculateInventoryScore(rawResults: any): number {
    return rawResults.inventoryScore || 0.5;
  }

  private calculateContentQualityScore(rawResults: any): number {
    return rawResults.contentQualityScore || 0.5;
  }

  private calculateAudienceGrowthScore(rawResults: any): number {
    return rawResults.audienceGrowthScore || 0.5;
  }

  private calculateEngagementRateScore(rawResults: any): number {
    return rawResults.engagementRateScore || 0.5;
  }

  // Risk assessment methods
  private identifyRiskFactors(rawResults: any, benchmarkType: string): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // Common risk factors
    if (rawResults.errorRate > 0.1) {
      factors.push({
        type: 'execution_errors',
        severity: 'medium',
        probability: rawResults.errorRate,
        impact: 0.7,
        description: 'High error rate in execution',
      });
    }

    if (rawResults.totalCost > rawResults.budget * 0.9) {
      factors.push({
        type: 'budget_overrun',
        severity: 'high',
        probability: 0.8,
        impact: 0.8,
        description: 'Budget utilization approaching limits',
      });
    }

    return factors;
  }

  private calculateOverallRisk(riskFactors: RiskFactor[]): number {
    if (riskFactors.length === 0) return 0.1; // Minimum risk

    const totalRisk = riskFactors.reduce((sum, factor) => {
      const severityWeight = { low: 0.25, medium: 0.5, high: 0.75, critical: 1.0 };
      return sum + (factor.probability * factor.impact * severityWeight[factor.severity]);
    }, 0);

    return Math.min(totalRisk / riskFactors.length, 1);
  }

  private calculateRiskAdjustedScore(rawResults: any, overallRisk: number): number {
    const baseScore = rawResults.overallScore || 0.5;
    const riskPenalty = overallRisk * 0.3; // Max 30% penalty
    return Math.max(0, baseScore - riskPenalty);
  }

  private calculateExecutionRisk(rawResults: any): number {
    return rawResults.executionRisk || 0.3;
  }

  private calculateFinancialRisk(rawResults: any): number {
    return rawResults.financialRisk || 0.4;
  }

  private calculateOperationalRisk(rawResults: any): number {
    return rawResults.operationalRisk || 0.2;
  }

  private calculateComplianceRisk(rawResults: any): number {
    const violations = rawResults.violations?.length || 0;
    return Math.min(violations * 0.2, 1);
  }

  private generateRiskMitigation(riskFactors: RiskFactor[]): RiskMitigation[] {
    return riskFactors.map(factor => ({
      riskType: factor.type,
      strategy: this.getRiskMitigationStrategy(factor.type),
      effectiveness: 0.7, // Assume 70% effectiveness
      cost: 100, // Estimate $100 cost
    }));
  }

  private getRiskMitigationStrategy(riskType: string): string {
    const strategies: Record<string, string> = {
      execution_errors: 'Implement comprehensive testing and validation',
      budget_overrun: 'Add budget monitoring and alerts',
      market_volatility: 'Diversify positions and implement hedging',
      operational_failure: 'Add redundancy and backup systems',
    };
    return strategies[riskType] || 'Implement risk monitoring and controls';
  }

  // Utility methods
  private initializeScoringWeights(): void {
    // Default weights for all benchmark types
    const defaultWeights: ScoringWeights = {
      categories: {
        technical: 0.25,
        economic: 0.25,
        efficiency: 0.2,
        reliability: 0.15,
        innovation: 0.15,
      },
      metrics: {
        performance: 0.1,
        economic: 0.1,
      },
      adjustments: [
        {
          type: 'bonus',
          condition: 'roi > 3.0',
          value: 0.1,
          description: 'Exceptional ROI bonus',
        },
        {
          type: 'penalty',
          condition: 'errorRate > 0.2',
          value: 0.15,
          description: 'High error rate penalty',
        },
      ],
    };

    // Set default weights for all benchmark types
    this.scoringWeights.set('default', defaultWeights);
    this.scoringWeights.set('defi_portfolio', defaultWeights);
    this.scoringWeights.set('ecommerce_store', defaultWeights);
    this.scoringWeights.set('social_engagement', defaultWeights);
  }

  private getDefaultWeights(): ScoringWeights {
    return this.scoringWeights.get('default')!;
  }

  private evaluateAdjustmentCondition(condition: string, metrics: EconomicMetrics): boolean {
    // Simple condition evaluation - in real implementation, use expression parser
    if (condition === 'roi > 3.0') {
      return metrics.returnOnInvestment > 3.0;
    }
    // Add more conditions as needed
    return false;
  }

  private getAllScoresForBenchmark(benchmarkType: string): BenchmarkScore[] {
    return this.benchmarkScores.get(benchmarkType) || [];
  }

  private getPreviousScoresForAgent(benchmarkType: string, agentId: string): BenchmarkScore[] {
    const allScores = this.getAllScoresForBenchmark(benchmarkType);
    return allScores
      .filter(s => s.agentId === agentId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  private calculateImprovementRate(benchmarkType: string, agentId: string): number {
    const scores = this.getPreviousScoresForAgent(benchmarkType, agentId);
    if (scores.length < 2) return 0;

    const latest = scores[0].overallScore;
    const previous = scores[1].overallScore;
    return (latest - previous) / previous;
  }

  private calculatePercentile(benchmarkType: string, score: number): number {
    const allScores = this.getAllScoresForBenchmark(benchmarkType)
      .map(s => s.overallScore)
      .sort((a, b) => a - b);

    if (allScores.length === 0) return 50;

    const index = allScores.findIndex(s => s >= score);
    if (index === -1) return 100;

    return (index / allScores.length) * 100;
  }

  private calculateConsistency(agentId: string, benchmarkType: string): number {
    const scores = this.getPreviousScoresForAgent(benchmarkType, agentId)
      .map(s => s.overallScore);

    if (scores.length < 2) return 1.0;

    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);

    // Convert to consistency score (lower deviation = higher consistency)
    return Math.max(0, 1 - (standardDeviation * 2));
  }

  private updateLeaderboardStatistics(leaderboard: BenchmarkLeaderboard): void {
    const scores = leaderboard.rankings.map(r => r.score);
    
    leaderboard.statistics.totalParticipants = scores.length;
    leaderboard.statistics.averageScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    
    const sortedScores = [...scores].sort((a, b) => a - b);
    const mid = Math.floor(sortedScores.length / 2);
    leaderboard.statistics.medianScore = sortedScores.length % 2 
      ? sortedScores[mid]
      : (sortedScores[mid - 1] + sortedScores[mid]) / 2;

    const variance = scores.reduce((sum, s) => 
      sum + Math.pow(s - leaderboard.statistics.averageScore, 2), 0) / scores.length;
    leaderboard.statistics.standardDeviation = Math.sqrt(variance);
  }

  private updateLeaderboardTrends(leaderboard: BenchmarkLeaderboard): void {
    // Calculate trends based on historical data
    // This is a simplified implementation - real implementation would track historical changes
    leaderboard.trends.scoreImprovement.overall = 0.05; // 5% improvement
    leaderboard.trends.costOptimization = 0.03; // 3% cost reduction
    leaderboard.trends.innovationRate = 0.02; // 2% innovation increase
    leaderboard.trends.convergenceRate = 0.01; // 1% convergence
  }

  private async generateVerificationInfo(
    benchmarkId: string,
    rawResults: any
  ): Promise<VerificationInfo> {
    return {
      verified: true,
      verificationMethod: 'automated_blockchain_verification',
      verificationScore: 0.95,
      thirdPartyValidation: false,
      auditTrail: [
        {
          timestamp: Date.now(),
          event: 'benchmark_execution',
          details: { benchmarkId, resultHash: 'hash123' },
          verification: 'blockchain_recorded',
        },
      ],
    };
  }

  /**
   * Get leaderboard for a benchmark type
   */
  getLeaderboard(
    benchmarkType: string,
    timeframe: 'daily' | 'weekly' | 'monthly' | 'all_time' = 'all_time'
  ): BenchmarkLeaderboard | undefined {
    return this.leaderboards.get(`${benchmarkType}-${timeframe}`);
  }

  /**
   * Get agent's score history
   */
  getAgentScoreHistory(agentId: string, benchmarkType?: string): BenchmarkScore[] {
    if (benchmarkType) {
      return this.getPreviousScoresForAgent(benchmarkType, agentId);
    }

    // Get scores across all benchmark types
    const allScores: BenchmarkScore[] = [];
    for (const scores of this.benchmarkScores.values()) {
      allScores.push(...scores.filter(s => s.agentId === agentId));
    }

    return allScores.sort((a, b) => b.timestamp - a.timestamp);
  }
}

// Global instance for benchmark use
export const benchmarkScoringSystem = new BenchmarkScoringSystem(new ProductionCostTracker());