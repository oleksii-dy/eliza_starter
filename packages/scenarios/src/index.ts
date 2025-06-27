// Export all example scenarios
export { default as truthVsLieScenario } from './truth-vs-lie.js';
export { default as researchTaskScenario } from './research-task.js';
export { default as codingChallengeScenario } from './coding-challenge.js';
export { default as workflowPlanningScenario } from './workflow-planning.js';

import { truthVsLieScenario } from './truth-vs-lie.js';
import { researchTaskScenario } from './research-task.js';
import { codingChallengeScenario } from './coding-challenge.js';
import { workflowPlanningScenario } from './workflow-planning.js';

// Import plugin test scenarios
import { pluginTestScenarios } from './plugin-scenarios/index.js';
export { pluginTestScenarios } from './plugin-scenarios/index.js';

// Import rolodex scenarios
import {
  entityIntroductionScenario,
  relationshipBuildingScenario,
  trustEvolutionScenario,
  complexNetworkScenario,
  followUpManagementScenario,
} from './rolodex/index.js';

// Import sandbox scenarios
import { sandboxScenarios } from './sandbox/index.js';

// Import real-world scenarios
import { realWorldScenarios } from './real-world-scenarios/index.js';

// Import autocoder scenarios
import {
  autocoderBasicTestSuite,
  autocoderComprehensiveBenchmarks,
  autocoderSwarmCoordinationSuite,
  autocoderArtifactManagementSuite,
  autocoderGitHubIntegrationSuite,
} from './autocoder-scenarios/index.js';

// Export default test character and project
export { defaultTestCharacter } from './default-agent.js';
export { scenariosProject } from './project.js';

export {
  entityIntroductionScenario,
  relationshipBuildingScenario,
  trustEvolutionScenario,
  complexNetworkScenario,
  followUpManagementScenario,
} from './rolodex/index.js';

export { sandboxScenarios } from './sandbox/index.js';

// Export autocoder scenarios
export {
  autocoderBasicTestSuite,
  autocoderComprehensiveBenchmarks,
  autocoderSwarmCoordinationSuite,
  autocoderArtifactManagementSuite,
  autocoderGitHubIntegrationSuite,
} from './autocoder-scenarios/index.js';

// Export real-world scenarios
export { 
  realWorldScenarios,
  realWorldScenarioCategories,
  realWorldScenarioMetadata,
  proctorAgentScenario,
  aiProductDevelopmentFactoryScenario,
  intelligentTaskAutomationHubScenario,
  distributedDevelopmentTeamSimulationScenario,
  getRealWorldScenarioByCategory,
  getRealWorldScenarioById,
  getAllRealWorldScenarios,
  getRealWorldScenarioMetadata,
  validateRealWorldScenarioRequirements,
} from './real-world-scenarios/index.js';

// Export individual example scenarios
export const exampleScenarios = [
  truthVsLieScenario,
  researchTaskScenario,
  codingChallengeScenario,
  workflowPlanningScenario,
];

// Rolodex scenarios
export const rolodexScenarios = [
  entityIntroductionScenario,
  relationshipBuildingScenario,
  trustEvolutionScenario,
  complexNetworkScenario,
  followUpManagementScenario,
];

// AutoCoder scenario suites (flattened for easier access)
export const autocoderScenarios = [
  ...autocoderBasicTestSuite.scenarios,
  ...autocoderComprehensiveBenchmarks.scenarios,
  ...autocoderSwarmCoordinationSuite.scenarios,
  ...autocoderArtifactManagementSuite.scenarios,
  ...autocoderGitHubIntegrationSuite.scenarios,
];

export const autocoderScenarioSuites = [
  autocoderBasicTestSuite,
  autocoderComprehensiveBenchmarks,
  autocoderSwarmCoordinationSuite,
  autocoderArtifactManagementSuite,
  autocoderGitHubIntegrationSuite,
];

// Export all scenarios including plugin tests and real-world scenarios
export const allScenarios = [
  ...exampleScenarios,
  ...pluginTestScenarios,
  ...rolodexScenarios,
  ...sandboxScenarios,
  ...realWorldScenarios,
  ...autocoderScenarios,
];

// Default export includes all scenarios
export default allScenarios;

// Array of all built-in scenarios
export const builtInScenarios = [
  truthVsLieScenario,
  researchTaskScenario,
  codingChallengeScenario,
  workflowPlanningScenario,
];

// Export scenarios alias for compatibility
export const scenarios = allScenarios;

// Export test runner and related utilities
export {
  ConsolidatedScenarioTestRunner,
  ScenarioManifestValidator,
  runScenarioTests,
} from './test-runner.js';

// Scenario categories
export const scenarioCategories = {
  reasoning: [truthVsLieScenario],
  research: [researchTaskScenario],
  coding: [codingChallengeScenario],
  planning: [workflowPlanningScenario],
  integration: pluginTestScenarios,
  rolodex: rolodexScenarios,
  sandbox: sandboxScenarios,
  'real-world': realWorldScenarios,
  autocoder: autocoderScenarios,
  'autocoder-basic': autocoderBasicTestSuite.scenarios,
  'autocoder-advanced': autocoderComprehensiveBenchmarks.scenarios,
  'autocoder-swarm': autocoderSwarmCoordinationSuite.scenarios,
  'autocoder-artifacts': autocoderArtifactManagementSuite.scenarios,
  'autocoder-github': autocoderGitHubIntegrationSuite.scenarios,
};

// Get scenarios by category
export function getScenariosByCategory(category: string) {
  return scenarioCategories[category as keyof typeof scenarioCategories] || [];
}

// Get scenario by ID
export function getScenarioById(id: string) {
  return allScenarios.find((scenario) => scenario.id === id);
}