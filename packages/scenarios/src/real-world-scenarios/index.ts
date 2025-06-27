/**
 * Real-World Scenarios Index
 * 
 * Comprehensive real-world scenarios that test production capabilities using actual APIs,
 * real credentials, and end-to-end workflows. These scenarios demonstrate the full potential
 * of the ElizaOS platform in production environments.
 */

// Import scenario proctor system
import proctorAgentScenario, { proctorAgentActor } from './proctor-agent.js';
export { proctorAgentScenario, proctorAgentActor };
export type { ProctorCredentials, CredentialRequest, CredentialGrant } from './proctor-agent.js';

// Import individual real-world scenarios
import aiProductDevelopmentFactoryScenario from './01-ai-product-development-factory.js';
import intelligentTaskAutomationHubScenario from './02-intelligent-task-automation-hub.js';
import distributedDevelopmentTeamSimulationScenario from './03-distributed-development-team-simulation.js';

export { aiProductDevelopmentFactoryScenario, intelligentTaskAutomationHubScenario, distributedDevelopmentTeamSimulationScenario };

// Export scenario collections
export const realWorldScenarios = [
  proctorAgentScenario,
  aiProductDevelopmentFactoryScenario,
  intelligentTaskAutomationHubScenario,
  distributedDevelopmentTeamSimulationScenario,
];

// Categorized scenarios
export const realWorldScenarioCategories = {
  'infrastructure': [proctorAgentScenario],
  'product-development': [aiProductDevelopmentFactoryScenario],
  'automation': [intelligentTaskAutomationHubScenario],
  'team-collaboration': [distributedDevelopmentTeamSimulationScenario],
};

// Scenario metadata for discovery and filtering
export const realWorldScenarioMetadata = {
  proctorAgent: {
    id: 'proctor-agent-initialization',
    name: 'Scenario Proctor Agent Initialization',
    description: 'Privileged agent managing API credentials and security oversight',
    category: 'security-infrastructure',
    complexity: 'high',
    duration: '1 minute',
    cost: '$0',
    realApis: true,
    prerequisites: ['All production API keys configured'],
  },
  aiProductFactory: {
    id: 'ai-product-development-factory',
    name: 'AI Product Development Factory',
    description: 'Complete product development from conception to deployment',
    category: 'real-world-production',
    complexity: 'very-high',
    duration: '30-45 minutes',
    cost: '$10-25',
    realApis: true,
    prerequisites: ['GitHub', 'E2B', 'Vercel', 'AWS S3', 'OpenAI'],
  },
  taskAutomationHub: {
    id: 'intelligent-task-automation-hub',
    name: 'Intelligent Task Automation Hub',
    description: 'Comprehensive automation with cron jobs, webhooks, and workflows',
    category: 'real-world-automation',
    complexity: 'very-high',
    duration: '20-30 minutes',
    cost: '$5-15',
    realApis: true,
    prerequisites: ['GitHub', 'Slack', 'Discord', 'AWS Lambda', 'PostgreSQL'],
  },
  distributedTeam: {
    id: 'distributed-development-team-simulation',
    name: 'Distributed Development Team Simulation',
    description: 'Multi-agent team collaboration with real Git workflows',
    category: 'real-world-collaboration',
    complexity: 'very-high',
    duration: '45-60 minutes',
    cost: '$15-30',
    realApis: true,
    prerequisites: ['GitHub', 'E2B', 'AWS', 'Database'],
  },
};

// Helper functions for scenario management
export function getRealWorldScenarioByCategory(category: string) {
  return realWorldScenarioCategories[category as keyof typeof realWorldScenarioCategories] || [];
}

export function getRealWorldScenarioById(id: string) {
  return realWorldScenarios.find(scenario => 
    scenario.id === id || 
    scenario.name.toLowerCase().includes(id.toLowerCase())
  );
}

export function getAllRealWorldScenarios() {
  return realWorldScenarios;
}

export function getRealWorldScenarioMetadata() {
  return realWorldScenarioMetadata;
}

// Validation helpers
export function validateRealWorldScenarioRequirements(scenarioId: string) {
  const metadata = Object.values(realWorldScenarioMetadata).find(
    meta => meta.id === scenarioId
  );
  
  if (!metadata) {
    throw new Error(`Unknown real-world scenario: ${scenarioId}`);
  }
  
  return {
    scenario: metadata,
    requirements: metadata.prerequisites,
    estimatedCost: metadata.cost,
    estimatedDuration: metadata.duration,
    complexity: metadata.complexity,
  };
}

// Export default collection
export default realWorldScenarios;