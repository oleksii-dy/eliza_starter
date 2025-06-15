import {
  type Provider,
  type IAgentRuntime,
  type Memory,
  type State,
  logger
} from '@elizaos/core';
import type { SPARCWorkflowService } from '../services/sparc.js';

export const sparcPhaseProvider: Provider = {
  name: 'SPARC_PHASE',
  description: 'Provides current SPARC methodology phase and workflow context',

  get: async (runtime: IAgentRuntime, _message: Memory, _state?: State) => {
    try {
      const sparcService = runtime.getService('SPARC_WORKFLOW') as SPARCWorkflowService;
      
      if (!sparcService) {
        logger.warn('[SPARCPhaseProvider] SPARC service not available');
        return null;
      }

      const currentPhase = sparcService.getCurrentPhase();
      const qualityGates = await sparcService.generateQualityGates(currentPhase);

      return {
        currentPhase,
        phaseDescription: getPhaseDescription(currentPhase),
        qualityGates: qualityGates.map(gate => ({
          name: gate.name,
          passed: gate.passed,
          score: gate.score,
          threshold: gate.threshold,
          blocking: gate.blocking
        })),
        nextPhase: getNextPhase(currentPhase),
        methodology: {
          name: 'SPARC',
          phases: ['Research', 'Specification', 'Pseudocode', 'Architecture', 'Refinement', 'Completion'],
          principles: [
            'Test-Driven Development',
            'Quality Gates Validation',
            'Comprehensive Documentation',
            'Security-First Design',
            'Performance Optimization'
          ]
        }
      };
    } catch (error) {
      logger.error('[SPARCPhaseProvider] Error fetching SPARC context:', error);
      return null;
    }
  }
};

function getPhaseDescription(phase: string): string {
  const descriptions = {
    'Research': 'Comprehensive domain and technical research phase',
    'Specification': 'Requirements definition and constraint identification',
    'Pseudocode': 'High-level algorithm and data flow design',
    'Architecture': 'Detailed component and system design',
    'Refinement': 'TDD implementation with quality validation',
    'Completion': 'Final validation and deployment preparation'
  };
  
  return descriptions[phase as keyof typeof descriptions] || 'Unknown phase';
}

function getNextPhase(currentPhase: string): string | null {
  const phaseOrder = ['Research', 'Specification', 'Pseudocode', 'Architecture', 'Refinement', 'Completion'];
  const currentIndex = phaseOrder.indexOf(currentPhase);
  
  if (currentIndex === -1 || currentIndex === phaseOrder.length - 1) {
    return null;
  }
  
  return phaseOrder[currentIndex + 1];
}