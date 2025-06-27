import { Scenario } from '../types';
import { defiYieldOptimizationScenario } from './scenario-01-defi-yield-optimization';
import { nftArbitrageScenario } from './scenario-02-nft-arbitrage';
import { leveragedFarmingScenario } from './scenario-03-leveraged-farming';
import { gamingDefiComboScenario } from './scenario-04-gaming-defi-combo';
import { optionsStrategyScenario } from './scenario-05-options-strategy';
import { socialTradingScenario } from './scenario-06-social-trading';
import { multiProtocolLendingScenario } from './scenario-07-multi-protocol-lending';
import { mevProtectionTradingScenario } from './scenario-08-mev-protection-trading';
import { governanceMiningScenario } from './scenario-09-governance-mining';
import { crossChainPerpetualsScenario } from './scenario-10-cross-chain-perpetuals';

// Export all scenarios
export const walletScenarios: Scenario[] = [
  defiYieldOptimizationScenario,
  nftArbitrageScenario,
  leveragedFarmingScenario,
  gamingDefiComboScenario,
  optionsStrategyScenario,
  socialTradingScenario,
  multiProtocolLendingScenario,
  mevProtectionTradingScenario,
  governanceMiningScenario,
  crossChainPerpetualsScenario,
];

// Export individual scenarios
export {
  defiYieldOptimizationScenario,
  nftArbitrageScenario,
  leveragedFarmingScenario,
  gamingDefiComboScenario,
  optionsStrategyScenario,
  socialTradingScenario,
  multiProtocolLendingScenario,
  mevProtectionTradingScenario,
  governanceMiningScenario,
  crossChainPerpetualsScenario,
};

// Helper to get scenario by ID
export function getScenarioById(id: string): Scenario | undefined {
  return walletScenarios.find(scenario => scenario.id === id);
}

// Helper to get scenarios by category
export function getScenariosByCategory(category: string): Scenario[] {
  return walletScenarios.filter(scenario => scenario.category === category);
}

// Helper to get scenarios by tag
export function getScenariosByTag(tag: string): Scenario[] {
  return walletScenarios.filter(scenario => scenario.tags?.includes(tag));
}

// Scenario validation helper
export function validateScenario(scenario: Scenario): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Basic validation
  if (!scenario.id) errors.push('Scenario must have an ID');
  if (!scenario.name) errors.push('Scenario must have a name');
  if (!scenario.actors || scenario.actors.length === 0) {
    errors.push('Scenario must have at least one actor');
  }
  
  // Validate actors have required plugins
  scenario.actors.forEach((actor, index) => {
    if (!actor.plugins || actor.plugins.length === 0) {
      errors.push(`Actor ${index} must have at least one plugin`);
    }
  });
  
  // Validate execution strategy
  if (!scenario.execution.strategy) {
    errors.push('Scenario must have an execution strategy');
  }
  
  // Validate verification rules
  if (!scenario.verification.rules || scenario.verification.rules.length === 0) {
    errors.push('Scenario must have verification rules');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Get required plugins for all scenarios
export function getRequiredPlugins(): Set<string> {
  const plugins = new Set<string>();
  
  walletScenarios.forEach(scenario => {
    scenario.actors.forEach(actor => {
      actor.plugins?.forEach(plugin => plugins.add(plugin));
    });
  });
  
  return plugins;
}

// Get missing plugins (comparing with what's needed)
export function getMissingPlugins(): string[] {
  const required = getRequiredPlugins();
  const corePlugins = ['plugin-evm', 'plugin-solana']; // Already exist
  const missing: string[] = [];
  
  required.forEach(plugin => {
    if (!corePlugins.includes(plugin)) {
      missing.push(plugin);
    }
  });
  
  return missing;
} 