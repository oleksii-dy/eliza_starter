import { Service, IAgentRuntime, logger } from '@elizaos/core';
import pino from 'pino';

/**
 * Cost Tracking Service for Midnight Network transactions
 * Tracks real costs of sending messages, generating proofs, and contract interactions
 */
export class CostTrackingService extends Service {
  static serviceType = 'cost-tracking';
  serviceType = 'cost-tracking';
  capabilityDescription = 'Track real costs of Midnight Network operations';

  private logger: pino.Logger;
  private costHistory: Map<string, NetworkCost[]> = new Map();
  private totalCosts: Map<string, number> = new Map();

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.logger = pino({ name: 'CostTrackingService' });
  }

  static async start(runtime: IAgentRuntime): Promise<CostTrackingService> {
    const service = new CostTrackingService(runtime);
    await service.initialize();
    return service;
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Cost Tracking Service...');

      // Initialize cost tracking for this agent
      this.costHistory.set(this.runtime.agentId, []);
      this.totalCosts.set(this.runtime.agentId, 0);

      logger.info('Cost Tracking Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Cost Tracking Service:', error);
      throw error;
    }
  }

  /**
   * Record the cost of a network operation
   */
  async recordCost(operation: NetworkOperation): Promise<void> {
    try {
      const cost: NetworkCost = {
        id: `cost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        agentId: this.runtime.agentId,
        operation: operation.type,
        description: operation.description,
        midnightCost: operation.midnightCost,
        gasCost: operation.gasCost || 0,
        proofCost: operation.proofCost || 0,
        timestamp: new Date(),
        transactionHash: operation.transactionHash,
        metadata: operation.metadata || {},
      };

      // Add to history
      const agentCosts = this.costHistory.get(this.runtime.agentId) || [];
      agentCosts.push(cost);
      this.costHistory.set(this.runtime.agentId, agentCosts);

      // Update total
      const currentTotal = this.totalCosts.get(this.runtime.agentId) || 0;
      const newTotal = currentTotal + cost.midnightCost + cost.gasCost + cost.proofCost;
      this.totalCosts.set(this.runtime.agentId, newTotal);

      this.logger.info('Cost recorded', {
        operation: cost.operation,
        midnightCost: cost.midnightCost,
        totalCost: newTotal,
        transactionHash: cost.transactionHash,
      });
    } catch (error) {
      this.logger.error('Failed to record cost:', error);
    }
  }

  /**
   * Get cost breakdown for secret message sharing
   */
  async getSecretSharingCosts(): Promise<SecretSharingCostBreakdown> {
    const agentCosts = this.costHistory.get(this.runtime.agentId) || [];

    const messageOperations = agentCosts.filter(
      (cost) =>
        cost.operation === 'GROUP_MESSAGE' ||
        cost.operation === 'SECRET_SHARE' ||
        cost.operation === 'ZK_PROOF_GENERATION'
    );

    const breakdown: SecretSharingCostBreakdown = {
      totalMidnightCost: 0,
      totalGasCost: 0,
      totalProofCost: 0,
      operationCosts: {
        messageSending: 0,
        proofGeneration: 0,
        contractInteraction: 0,
        secretSharing: 0,
      },
      transactionCount: messageOperations.length,
      averageCostPerMessage: 0,
      costHistory: messageOperations,
    };

    for (const cost of messageOperations) {
      breakdown.totalMidnightCost += cost.midnightCost;
      breakdown.totalGasCost += cost.gasCost;
      breakdown.totalProofCost += cost.proofCost;

      switch (cost.operation) {
        case 'GROUP_MESSAGE':
          breakdown.operationCosts.messageSending += cost.midnightCost;
          break;
        case 'SECRET_SHARE':
          breakdown.operationCosts.secretSharing += cost.midnightCost;
          break;
        case 'ZK_PROOF_GENERATION':
          breakdown.operationCosts.proofGeneration += cost.proofCost;
          break;
        case 'CONTRACT_INTERACTION':
          breakdown.operationCosts.contractInteraction += cost.gasCost;
          break;
      }
    }

    if (breakdown.transactionCount > 0) {
      const totalCost =
        breakdown.totalMidnightCost + breakdown.totalGasCost + breakdown.totalProofCost;
      breakdown.averageCostPerMessage = totalCost / breakdown.transactionCount;
    }

    return breakdown;
  }

  /**
   * Calculate estimated cost for sharing a secret message
   */
  calculateSecretMessageCost(messageLength: number, recipientCount: number): CostEstimate {
    // Base costs for Midnight Network operations
    const baseCosts = {
      proofGeneration: 0.001, // Per ZK proof
      contractCall: 0.002, // Per contract interaction
      messageStorage: 0.0001, // Per byte
      networkFee: 0.0005, // Base network fee
    };

    const estimate: CostEstimate = {
      proofCost: baseCosts.proofGeneration * recipientCount, // One proof per recipient
      gasCost: baseCosts.contractCall * Math.ceil(recipientCount / 10), // Batch recipients
      storageCost: baseCosts.messageStorage * messageLength,
      networkFee: baseCosts.networkFee,
      totalCost: 0,
      breakdown: {
        'ZK Proof Generation': baseCosts.proofGeneration * recipientCount,
        'Contract Interaction': baseCosts.contractCall * Math.ceil(recipientCount / 10),
        'Message Storage': baseCosts.messageStorage * messageLength,
        'Network Fee': baseCosts.networkFee,
      },
    };

    estimate.totalCost =
      estimate.proofCost + estimate.gasCost + estimate.storageCost + estimate.networkFee;

    return estimate;
  }

  /**
   * Get total costs for this agent
   */
  getTotalCosts(): number {
    return this.totalCosts.get(this.runtime.agentId) || 0;
  }

  /**
   * Get cost history for this agent
   */
  getCostHistory(): NetworkCost[] {
    return this.costHistory.get(this.runtime.agentId) || [];
  }

  /**
   * Get cost comparison across all agents
   */
  getCostComparison(): { [agentId: string]: number } {
    const comparison: { [agentId: string]: number } = {};

    for (const [agentId, total] of this.totalCosts.entries()) {
      comparison[agentId] = total;
    }

    return comparison;
  }

  /**
   * Record secret message sharing cost
   */
  async recordSecretShareCost(
    secretMessage: string,
    recipientCount: number,
    transactionHash: string
  ): Promise<void> {
    const estimate = this.calculateSecretMessageCost(secretMessage.length, recipientCount);

    await this.recordCost({
      type: 'SECRET_SHARE',
      description: `Shared secret message to ${recipientCount} recipients`,
      midnightCost: estimate.totalCost,
      gasCost: estimate.gasCost,
      proofCost: estimate.proofCost,
      transactionHash,
      metadata: {
        messageLength: secretMessage.length,
        recipientCount,
        costBreakdown: estimate.breakdown,
      },
    });
  }

  /**
   * Generate cost report for secret sharing verification
   */
  async generateCostReport(): Promise<string> {
    const breakdown = await this.getSecretSharingCosts();
    const totalCost = this.getTotalCosts();

    return `
## 💰 Secret Sharing Cost Report - ${this.runtime.agentId}

### Total Costs Incurred
- **MIDNIGHT Tokens**: ${breakdown.totalMidnightCost.toFixed(6)} MIDNIGHT
- **Gas Costs**: ${breakdown.totalGasCost.toFixed(6)} MIDNIGHT  
- **ZK Proof Costs**: ${breakdown.totalProofCost.toFixed(6)} MIDNIGHT
- **Total**: ${totalCost.toFixed(6)} MIDNIGHT

### Operation Breakdown
- **Message Sending**: ${breakdown.operationCosts.messageSending.toFixed(6)} MIDNIGHT
- **Proof Generation**: ${breakdown.operationCosts.proofGeneration.toFixed(6)} MIDNIGHT
- **Contract Interactions**: ${breakdown.operationCosts.contractInteraction.toFixed(6)} MIDNIGHT
- **Secret Sharing**: ${breakdown.operationCosts.secretSharing.toFixed(6)} MIDNIGHT

### Transaction Statistics  
- **Total Transactions**: ${breakdown.transactionCount}
- **Average Cost/Message**: ${breakdown.averageCostPerMessage.toFixed(6)} MIDNIGHT

### Cost Efficiency
- **Cost per Character**: ${(totalCost / 100).toFixed(8)} MIDNIGHT/char (estimated)
- **ZK Proof Efficiency**: ${breakdown.totalProofCost > 0 ? (breakdown.transactionCount / breakdown.totalProofCost).toFixed(2) : 'N/A'} proofs/MIDNIGHT
`;
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping Cost Tracking Service...');
    this.logger.info('Cost Tracking Service stopped');
  }
}

// Types for cost tracking
export interface NetworkOperation {
  type: 'GROUP_MESSAGE' | 'SECRET_SHARE' | 'ZK_PROOF_GENERATION' | 'CONTRACT_INTERACTION';
  description: string;
  midnightCost: number;
  gasCost?: number;
  proofCost?: number;
  transactionHash?: string;
  metadata?: any;
}

export interface NetworkCost {
  id: string;
  agentId: string;
  operation: string;
  description: string;
  midnightCost: number;
  gasCost: number;
  proofCost: number;
  timestamp: Date;
  transactionHash?: string;
  metadata: any;
}

export interface SecretSharingCostBreakdown {
  totalMidnightCost: number;
  totalGasCost: number;
  totalProofCost: number;
  operationCosts: {
    messageSending: number;
    proofGeneration: number;
    contractInteraction: number;
    secretSharing: number;
  };
  transactionCount: number;
  averageCostPerMessage: number;
  costHistory: NetworkCost[];
}

export interface CostEstimate {
  proofCost: number;
  gasCost: number;
  storageCost: number;
  networkFee: number;
  totalCost: number;
  breakdown: { [operation: string]: number };
}
