// Export all example scenarios
export { default as truthVsLieScenario } from './truth-vs-lie.js';
export { default as researchTaskScenario } from './research-task.js';
export { default as codingChallengeScenario } from './coding-challenge.js';
export { default as workflowPlanningScenario } from './workflow-planning.js';

import { truthVsLieScenario } from './truth-vs-lie.js';
import { researchTaskScenario } from './research-task.js';
import { codingChallengeScenario } from './coding-challenge.js';
import { workflowPlanningScenario } from './workflow-planning.js';

// Array of all built-in scenarios
export const builtInScenarios = [
  truthVsLieScenario,
  researchTaskScenario,
  codingChallengeScenario,
  workflowPlanningScenario,
];

// Scenario categories
export const scenarioCategories = {
  reasoning: [truthVsLieScenario],
  research: [researchTaskScenario],
  coding: [codingChallengeScenario],
  planning: [workflowPlanningScenario],
};

// Get scenarios by category
export function getScenariosByCategory(category: string) {
  return scenarioCategories[category as keyof typeof scenarioCategories] || [];
}

// Get scenario by ID
export function getScenarioById(id: string) {
  return builtInScenarios.find(scenario => scenario.id === id);
}