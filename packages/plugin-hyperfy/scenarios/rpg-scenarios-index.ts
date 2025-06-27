import { rpgBasicScenarios } from './rpg-basic-connection';
import { rpgQuestScenarios } from './rpg-quest-scenarios';
import { rpgSelfImprovementScenarios } from './rpg-self-improvement';

// Re-export individual scenario collections
export { rpgBasicScenarios } from './rpg-basic-connection';
export { rpgQuestScenarios } from './rpg-quest-scenarios';
export { rpgSelfImprovementScenarios } from './rpg-self-improvement';

// Individual scenario exports for direct access
export { basicRPGConnectionScenario, singlePlayerLevelUpScenario } from './rpg-basic-connection';

export {
  questCompletionScenario,
  multiAgentTradingScenario,
  cooperativeQuestScenario,
} from './rpg-quest-scenarios';

export {
  selfImprovementGamingScenario,
  collaborativeSelfImprovementScenario,
} from './rpg-self-improvement';

// Complete collection of all RPG scenarios
export const allRPGScenarios = [
  ...rpgBasicScenarios,
  ...rpgQuestScenarios,
  ...rpgSelfImprovementScenarios,
];

// Scenario collections by category
export const rpgScenarioCategories = {
  basic: rpgBasicScenarios,
  quests: rpgQuestScenarios,
  selfImprovement: rpgSelfImprovementScenarios,
};

// Scenario metadata for easy discovery
export const rpgScenarioMetadata = {
  totalScenarios: allRPGScenarios.length,
  categories: Object.keys(rpgScenarioCategories),
  tags: [
    'hyperfy',
    'rpg',
    'connection',
    'basic',
    'leveling',
    'single-player',
    'progression',
    'quest',
    'npc',
    'fetch',
    'kill',
    'trading',
    'multi-agent',
    'items',
    'cooperation',
    'teamwork',
    'self-improvement',
    'autocoder',
    'long-running',
    'assessment',
    'collaboration',
  ],
  estimatedDurations: {
    basic: '30 seconds - 10 minutes',
    quests: '10-15 minutes',
    selfImprovement: '30-40 minutes',
  },
  requirements: {
    plugins: ['@elizaos/plugin-hyperfy'],
    optionalPlugins: ['@elizaos/plugin-autocoder', '@elizaos/plugin-autonomy'],
    services: ['Hyperfy world server running on localhost:3000'],
  },
};

// Quick scenario selection helpers
export const getScenariosByTag = (tag: string) => {
  return allRPGScenarios.filter((scenario) => scenario.tags.includes(tag));
};

export const getScenariosByCategory = (category: keyof typeof rpgScenarioCategories) => {
  return rpgScenarioCategories[category] || [];
};

export const getScenariosByDuration = (maxDurationMs: number) => {
  return allRPGScenarios.filter(
    (scenario) => (scenario.execution?.maxDuration || 0) <= maxDurationMs
  );
};

export const getQuickTestScenarios = () => {
  return getScenariosByDuration(300000); // 5 minutes or less
};

export const getLongRunningScenarios = () => {
  return allRPGScenarios.filter(
    (scenario) => (scenario.execution?.maxDuration || 0) > 900000 // More than 15 minutes
  );
};

// Scenario execution helpers
export const getRecommendedScenarioOrder = () => {
  return [
    'Basic RPG Connection Test', // 1. Verify basic connectivity
    'Single Player Level-Up Challenge', // 2. Test core gameplay mechanics
    'Quest Completion Challenge', // 3. Test quest system
    'Multi-Agent Trading Challenge', // 4. Test player interaction
    'Cooperative Quest Challenge', // 5. Test team coordination
    'Self-Improvement Gaming Marathon', // 6. Test self-assessment
    'Collaborative Self-Improvement Gaming', // 7. Test collaborative improvement
  ];
};

export const getScenarioByName = (name: string) => {
  return allRPGScenarios.find((scenario) => scenario.name === name);
};

// Development and testing utilities
export const validateAllScenarios = () => {
  const issues: string[] = [];

  for (const scenario of allRPGScenarios) {
    // Check required fields
    if (!scenario.id) {
      issues.push(`${scenario.name}: Missing ID`);
    }
    if (!scenario.actors || scenario.actors.length === 0) {
      issues.push(`${scenario.name}: No actors defined`);
    }
    if (
      !scenario.verification ||
      !scenario.verification.rules ||
      scenario.verification.rules.length === 0
    ) {
      issues.push(`${scenario.name}: No verification rules defined`);
    }

    // Check actor plugins
    for (const actor of scenario.actors || []) {
      if (!actor.plugins || !actor.plugins.includes('@elizaos/plugin-hyperfy')) {
        issues.push(`${scenario.name}: Actor ${actor.name} missing hyperfy plugin`);
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
};

// Export default collection
export default allRPGScenarios;
