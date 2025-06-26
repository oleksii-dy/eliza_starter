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

    // Load individual scenario modules to avoid circular dependency
    try {
      const { default: truthVsLie } = await import('./truth-vs-lie.js');
      if (truthVsLie) {
        allScenarios.push(truthVsLie);
      }
    } catch (error) {
      console.warn('Could not load truth-vs-lie scenario:', error);
    }

    try {
      const { default: researchTask } = await import('./research-task.js');
      if (researchTask) {
        allScenarios.push(researchTask);
      }
    } catch (error) {
      console.warn('Could not load research-task scenario:', error);
    }

    try {
      const { default: codingChallenge } = await import('./coding-challenge.js');
      if (codingChallenge) {
        allScenarios.push(codingChallenge);
      }
    } catch (error) {
      console.warn('Could not load coding-challenge scenario:', error);
    }

    try {
      const { default: workflowPlanning } = await import('./workflow-planning.js');
      if (workflowPlanning) {
        allScenarios.push(workflowPlanning);
      }
    } catch (error) {
      console.warn('Could not load workflow-planning scenario:', error);
    }

    // Load plugin test scenarios
    try {
      const { pluginTestScenarios } = await import('./plugin-tests/index.js');
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
          const { pluginTestScenarios } = await import('./plugin-tests/index.js');
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
  return ['reasoning', 'research', 'coding', 'planning', 'integration', 'rolodex'];
}
