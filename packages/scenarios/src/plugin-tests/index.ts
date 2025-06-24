import type { Scenario } from '../types.js';

// Core plugin test scenarios
import scenario_01_research_knowledge_integration from './01-research-knowledge-integration.js';
import scenario_02_github_todo_workflow from './02-github-todo-workflow.js';
import scenario_03_planning_execution from './03-planning-execution.js';
import scenario_03_plugin_development_workflow from './03-plugin-development-workflow.js';
import scenario_04_plugin_workflow_edge_cases from './04-plugin-workflow-edge-cases.js';
import scenario_04_rolodex_relationship_management from './04-rolodex-relationship-management.js';
import scenario_05_secrets_integration_workflow from './05-secrets-integration-workflow.js';
import scenario_05_stagehand_web_research from './05-stagehand-web-research.js';
import scenario_06_blockchain_defi_workflow from './06-blockchain-defi-workflow.js';
import scenario_07_plugin_manager_system from './07-plugin-manager-system.js';
import scenario_08_secrets_security_workflow from './08-secrets-security-workflow.js';
import scenario_09_complex_investigation from './09-complex-investigation.js';
import scenario_10_automated_deployment from './10-automated-deployment.js';
import scenario_11_crisis_response from './11-crisis-response.js';
import scenario_12_knowledge_graph from './12-knowledge-graph.js';
import scenario_13_blockchain_analytics from './13-blockchain-analytics.js';
import scenario_14_competitive_intelligence from './14-competitive-intelligence.js';
import scenario_15_automated_documentation from './15-automated-documentation.js';
import scenario_16_smart_contract_audit from './16-smart-contract-audit.js';
import scenario_17_dependency_resolution from './17-dependency-resolution.js';
import scenario_18_social_media_analysis from './18-social-media-analysis.js';
import scenario_19_bug_triage from './19-bug-triage.js';
import scenario_20_cross_chain_assets from './20-cross-chain-assets.js';

// Rolodex scenarios
import scenario_51_rolodex_component_storage from './51-rolodex-component-storage.js';

// Payment scenarios
import scenario_60_payment_basic_flow from './60-payment-basic-flow.js';
import scenario_61_payment_trust_exemptions from './61-payment-trust-exemptions.js';
import scenario_62_payment_confirmation_flow from './62-payment-confirmation-flow.js';
import scenario_63_payment_insufficient_funds from './63-payment-insufficient-funds.js';
import scenario_64_payment_multi_currency from './64-payment-multi-currency.js';
import scenario_65_payment_multi_agent from './65-payment-multi-agent.js';

// Plugin test scenarios for testing specific plugin functionality
export const pluginTestScenarios: Scenario[] = [
  scenario_01_research_knowledge_integration,
  scenario_02_github_todo_workflow,
  scenario_03_planning_execution,
  scenario_03_plugin_development_workflow,
  scenario_04_plugin_workflow_edge_cases,
  scenario_04_rolodex_relationship_management,
  scenario_05_secrets_integration_workflow,
  scenario_05_stagehand_web_research,
  scenario_06_blockchain_defi_workflow,
  scenario_07_plugin_manager_system,
  scenario_08_secrets_security_workflow,
  scenario_09_complex_investigation,
  scenario_10_automated_deployment,
  scenario_11_crisis_response,
  scenario_12_knowledge_graph,
  scenario_13_blockchain_analytics,
  scenario_14_competitive_intelligence,
  scenario_15_automated_documentation,
  scenario_16_smart_contract_audit,
  scenario_17_dependency_resolution,
  scenario_18_social_media_analysis,
  scenario_19_bug_triage,
  scenario_20_cross_chain_assets,
  scenario_51_rolodex_component_storage,
  // Payment scenarios
  scenario_60_payment_basic_flow,
  scenario_61_payment_trust_exemptions,
  scenario_62_payment_confirmation_flow,
  scenario_63_payment_insufficient_funds,
  scenario_64_payment_multi_currency,
  scenario_65_payment_multi_agent,
];

export default pluginTestScenarios;
