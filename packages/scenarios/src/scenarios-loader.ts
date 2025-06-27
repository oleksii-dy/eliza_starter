/**
 * Scenarios Loader - Handles dynamic loading of scenarios to avoid circular dependencies
 * This module provides a clean interface for loading scenarios without creating import cycles.
 */

import type { Scenario } from './types.js';

/**
 * Dynamically loads all scenarios without creating circular dependencies
 * Uses dynamic imports to break the circular dependency chain
 */
export async function loadAllScenarios(): Promise<Scenario[]> {
  try {
    console.log('📦 Loading scenarios dynamically...');

    // Create an empty array to collect scenarios
    const allScenarios: Scenario[] = [];

    // Load plugin scenarios
    try {
      const { default: researchKnowledge } = await import('./plugin-scenarios/01-research-knowledge-integration.js');
      if (researchKnowledge) {
        allScenarios.push(researchKnowledge);
      }
    } catch (error) {
      console.warn('Could not load research-knowledge scenario:', error);
    }

    try {
      const { default: githubTodo } = await import('./plugin-scenarios/02-github-todo-workflow.js');
      if (githubTodo) {
        allScenarios.push(githubTodo);
      }
    } catch (error) {
      console.warn('Could not load github-todo scenario:', error);
    }

    try {
      const { default: planningExecution } = await import('./plugin-scenarios/03-planning-execution.js');
      if (planningExecution) {
        allScenarios.push(planningExecution);
      }
    } catch (error) {
      console.warn('Could not load planning-execution scenario:', error);
    }

    try {
      const { default: secretsIntegration } = await import('./plugin-scenarios/05-secrets-integration-workflow.js');
      if (secretsIntegration) {
        allScenarios.push(secretsIntegration);
      }
    } catch (error) {
      console.warn('Could not load secrets-integration scenario:', error);
    }

    try {
      const { default: blockchainDefi } = await import('./plugin-scenarios/06-blockchain-defi-workflow.js');
      if (blockchainDefi) {
        allScenarios.push(blockchainDefi);
      }
    } catch (error) {
      console.warn('Could not load blockchain-defi scenario:', error);
    }

    try {
      const { default: pluginManager } = await import('./plugin-scenarios/07-plugin-manager-system.js');
      if (pluginManager) {
        allScenarios.push(pluginManager);
      }
    } catch (error) {
      console.warn('Could not load plugin-manager scenario:', error);
    }

    try {
      const { default: paymentBasic } = await import('./plugin-scenarios/60-payment-basic-flow.js');
      if (paymentBasic) {
        allScenarios.push(paymentBasic);
      }
    } catch (error) {
      console.warn('Could not load payment-basic scenario:', error);
    }

    // Load plugin test scenarios
    try {
      const { pluginTestScenarios } = await import('./plugin-scenarios/index.js');
      if (pluginTestScenarios && Array.isArray(pluginTestScenarios)) {
        allScenarios.push(...pluginTestScenarios);
      }
    } catch (error) {
      console.warn('Could not load plugin test scenarios:', error);
    }

    // Load rolodex scenarios
    try {
      const rolodexModule = await import('./rolodex/index.js');
      const rolodexScenarios = [
        rolodexModule.entityIntroductionScenario,
        rolodexModule.relationshipBuildingScenario,
        rolodexModule.trustEvolutionScenario,
        rolodexModule.complexNetworkScenario,
        rolodexModule.followUpManagementScenario,
      ].filter(Boolean);

      allScenarios.push(...rolodexScenarios);
    } catch (error) {
      console.warn('Could not load rolodex scenarios:', error);
    }

    // Load wallet scenarios
    try {
      const { walletScenarios } = await import('./wallet-scenarios/index.js');
      if (walletScenarios && Array.isArray(walletScenarios)) {
        allScenarios.push(...walletScenarios);
      }
    } catch (error) {
      console.warn('Could not load wallet scenarios:', error);
    }

    console.log(`📦 Successfully loaded ${allScenarios.length} scenarios`);
    return allScenarios;
  } catch (error) {
    console.error('Failed to load scenarios:', error);
    return [];
  }
}

/**
 * Loads scenarios by category to avoid loading all scenarios when only specific ones are needed
 */
export async function loadScenariosByCategory(category: string): Promise<Scenario[]> {
  const scenarios: Scenario[] = [];

  try {
    switch (category.toLowerCase()) {
      case 'reasoning':
        try {
          const { default: truthVsLie } = await import('./truth-vs-lie.js');
          if (truthVsLie) {
            scenarios.push(truthVsLie);
          }
        } catch (error) {
          console.warn('Could not load reasoning scenarios:', error);
        }
        break;

      case 'research':
        try {
          const { default: researchTask } = await import('./research-task.js');
          if (researchTask) {
            scenarios.push(researchTask);
          }
        } catch (error) {
          console.warn('Could not load research scenarios:', error);
        }
        break;

      case 'coding':
        try {
          const { default: codingChallenge } = await import('./coding-challenge.js');
          if (codingChallenge) {
            scenarios.push(codingChallenge);
          }
        } catch (error) {
          console.warn('Could not load coding scenarios:', error);
        }
        break;

      case 'planning':
        try {
          const { default: workflowPlanning } = await import('./workflow-planning.js');
          if (workflowPlanning) {
            scenarios.push(workflowPlanning);
          }
        } catch (error) {
          console.warn('Could not load planning scenarios:', error);
        }
        break;

      case 'integration':
        try {
          const { pluginTestScenarios } = await import('./plugin-scenarios/index.js');
          if (pluginTestScenarios && Array.isArray(pluginTestScenarios)) {
            scenarios.push(...pluginTestScenarios);
          }
        } catch (error) {
          console.warn('Could not load integration scenarios:', error);
        }
        break;

      case 'rolodex':
        try {
          const rolodexModule = await import('./rolodex/index.js');
          const rolodexScenarios = [
            rolodexModule.entityIntroductionScenario,
            rolodexModule.relationshipBuildingScenario,
            rolodexModule.trustEvolutionScenario,
            rolodexModule.complexNetworkScenario,
            rolodexModule.followUpManagementScenario,
          ].filter(Boolean);

          scenarios.push(...rolodexScenarios);
        } catch (error) {
          console.warn('Could not load rolodex scenarios:', error);
        }
        break;

      case 'wallet':
      case 'defi':
        try {
          const { walletScenarios } = await import('./wallet-scenarios/index.js');
          if (walletScenarios && Array.isArray(walletScenarios)) {
            scenarios.push(...walletScenarios);
          }
        } catch (error) {
          console.warn('Could not load wallet scenarios:', error);
        }
        break;

      default:
        console.warn(`Unknown scenario category: ${category}`);
        return await loadAllScenarios();
    }
  } catch (error) {
    console.error(`Failed to load scenarios for category ${category}:`, error);
  }

  return scenarios;
}

/**
 * Loads a specific scenario by ID
 */
export async function loadScenarioById(id: string): Promise<Scenario | null> {
  try {
    const allScenarios = await loadAllScenarios();
    return allScenarios.find((scenario) => scenario.id === id) || null;
  } catch (error) {
    console.error(`Failed to load scenario with ID ${id}:`, error);
    return null;
  }
}

/**
 * Get available scenario categories without loading all scenarios
 */
export function getAvailableCategories(): string[] {
  return ['reasoning', 'research', 'coding', 'planning', 'integration', 'rolodex', 'wallet', 'defi'];
}
