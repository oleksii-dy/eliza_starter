import {
  type Evaluator,
  type IAgentRuntime,
  type Memory,
  type State,
  logger
} from '@elizaos/core';
import type { SPARCWorkflowService } from '../services/sparc.js';

export const sparcComplianceEvaluator: Evaluator = {
  name: 'SPARC_COMPLIANCE',
  description: 'Evaluates SPARC methodology compliance and quality',

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    // Run this evaluator when SPARC-related actions are performed
    const sparcActions = ['CAPTURE_FEATURE', 'IMPLEMENT_FEATURE', 'REVIEW_PR'];
    const lastAction = message.content.action;
    
    return sparcActions.includes(lastAction || '');
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    didRespond?: boolean,
    response?: Memory[]
  ) => {
    try {
      logger.info('[SPARCComplianceEvaluator] Evaluating SPARC compliance');

      const sparcService = runtime.getService('SPARC_WORKFLOW') as SPARCWorkflowService;
      
      if (!sparcService) {
        logger.warn('[SPARCComplianceEvaluator] SPARC service not available');
        return;
      }

      const currentPhase = sparcService.getCurrentPhase();
      const qualityGates = await sparcService.generateQualityGates(currentPhase);

      // Evaluate quality gates
      const failedGates = qualityGates.filter(gate => !gate.passed);
      const blockingFailures = failedGates.filter(gate => gate.blocking);

      // Calculate overall compliance score
      const totalGates = qualityGates.length;
      const passedGates = qualityGates.filter(gate => gate.passed).length;
      const complianceScore = totalGates > 0 ? passedGates / totalGates : 1;

      // Log evaluation results
      logger.info(`[SPARCComplianceEvaluator] Phase: ${currentPhase}, Compliance: ${Math.round(complianceScore * 100)}%`);

      if (blockingFailures.length > 0) {
        logger.warn(`[SPARCComplianceEvaluator] Blocking failures detected:`, 
          blockingFailures.map(f => f.name));
      }

      // Store evaluation results in memory
      const evaluationMemory = {
        type: 'sparc_evaluation',
        phase: currentPhase,
        complianceScore,
        qualityGates: qualityGates.map(gate => ({
          name: gate.name,
          passed: gate.passed,
          score: gate.score,
          blocking: gate.blocking
        })),
        failedGates: failedGates.map(gate => gate.name),
        blockingFailures: blockingFailures.map(gate => gate.name),
        timestamp: Date.now(),
        messageId: message.id
      };

      // Create memory for the evaluation
      await runtime.createMemory({
        id: runtime.agentId,
        entityId: runtime.agentId,
        agentId: runtime.agentId,
        roomId: message.roomId,
        content: {
          text: `SPARC Compliance Evaluation: ${Math.round(complianceScore * 100)}% (Phase: ${currentPhase})`,
          metadata: evaluationMemory
        },
        createdAt: Date.now()
      }, 'evaluations');

      // If there are blocking failures, recommend corrective actions
      if (blockingFailures.length > 0) {
        const recommendations = generateRecommendations(blockingFailures);
        
        await runtime.createMemory({
          id: runtime.agentId,
          entityId: runtime.agentId,
          agentId: runtime.agentId,
          roomId: message.roomId,
          content: {
            text: `SPARC Compliance Recommendations: ${recommendations.join('; ')}`,
            metadata: {
              type: 'sparc_recommendations',
              recommendations,
              relatedEvaluation: evaluationMemory.timestamp
            }
          },
          createdAt: Date.now()
        }, 'evaluations');
      }

    } catch (error) {
      logger.error('[SPARCComplianceEvaluator] Evaluation failed:', error);
    }
  }
};

function generateRecommendations(blockingFailures: Array<{ name: string; details: string }>): string[] {
  const recommendations: string[] = [];

  for (const failure of blockingFailures) {
    switch (failure.name) {
      case 'test-coverage':
        recommendations.push('Increase test coverage by adding unit and integration tests');
        break;
      case 'security-compliance':
        recommendations.push('Address security vulnerabilities and add security tests');
        break;
      case 'architecture-consistency':
        recommendations.push('Review and refactor architecture to ensure consistency');
        break;
      case 'requirements-clarity':
        recommendations.push('Clarify requirements and add more detailed acceptance criteria');
        break;
      case 'integration-tests':
        recommendations.push('Add comprehensive integration tests for all components');
        break;
      default:
        recommendations.push(`Address ${failure.name} quality gate failure`);
    }
  }

  return recommendations;
}