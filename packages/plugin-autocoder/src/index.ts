import { echoAction } from './actions/echo.js';
import { orchestrationActions } from './actions/orchestration-actions.js';
import { containerActions } from './actions/container-actions.js';
import { createMCPAction } from './actions/mcp-creation-action.js';
import { n8nWorkflowAction, checkN8nWorkflowStatusAction } from './actions/n8n-workflow-action.js';
import {
  createPluginAction,
  checkPluginStatusAction,
  createPluginWithWorkflowsAction,
  // Legacy exports for backward compatibility
  convertN8nToPluginAction,
  checkN8nPluginStatusAction,
  createN8nPluginFromDescriptionAction,
} from './actions/n8n-to-plugin-action.js';
import { testResearchAction } from './actions/research-action.js';
import { runBenchmarkAction } from './actions/benchmark-action.js';
import { orchestrationProviders } from './providers/orchestration-providers.js';
import { AutoCodeService } from './services/AutoCodeService.js';
import { N8nWorkflowService } from './services/n8n-workflow-service.js';
import { N8nToPluginService } from './services/n8n-to-plugin-service.js';
import { ResearchService } from './research/research-integration.js';
import { PluginCreationService } from './services/plugin-creation-service.js';
import { MCPCreationService } from './services/mcp-creation-service.js';
import { DockerService } from './services/DockerService.js';
import type { Action, Plugin } from '@elizaos/core';
import { wrapAutocoderActionsWithTrust } from './trust/autocoderTrustIntegration.js';
import { elizaLogger } from '@elizaos/core';

// Export the plugin
export const autocoderPlugin: Plugin = {
  name: 'autocoder',
  description: 'Automated coding assistant with orchestration capabilities',
  init: async (runtime: any) => {
    const skipTrust = runtime.getSetting('SKIP_TRUST_ENHANCEMENT') === 'true';
    elizaLogger.info(
      `Initializing autocoder plugin ${skipTrust ? 'without' : 'with'} trust enhancement...`
    );

    if (!skipTrust) {
      try {
        // Trust-enhanced actions
        const trustActions = wrapAutocoderActionsWithTrust([
          createMCPAction,
          n8nWorkflowAction,
          checkN8nWorkflowStatusAction,
          echoAction,
          createPluginAction,
          checkPluginStatusAction,
          createPluginWithWorkflowsAction,
          testResearchAction,
          runBenchmarkAction,
        ]);

        // Combine all actions
        const allActions = [...trustActions, ...orchestrationActions, ...containerActions];

        // Actions are automatically registered by the plugin system from the actions array
        elizaLogger.info(
          `✔ Registered ${allActions.length} autocoder actions with trust enhancement`
        );
      } catch (error) {
        elizaLogger.error('Failed to initialize autocoder plugin:', error);
        throw error;
      }
    } else {
      // Actions are automatically registered by the plugin system from the actions array
      elizaLogger.info(
        `✔ Registered ${orchestrationActions.length + containerActions.length + 9} autocoder actions without trust enhancement`
      );
    }

    elizaLogger.info('✔ Autocoder plugin initialized successfully');
  },
  actions: [
    createMCPAction,
    n8nWorkflowAction,
    checkN8nWorkflowStatusAction,
    echoAction,
    createPluginAction,
    checkPluginStatusAction,
    createPluginWithWorkflowsAction,
    testResearchAction,
    runBenchmarkAction,
    ...orchestrationActions,
    ...containerActions,
  ],
  providers: [...orchestrationProviders],
  services: [
    AutoCodeService,
    N8nWorkflowService,
    N8nToPluginService,
    PluginCreationService,
    MCPCreationService,
    ResearchService,
    DockerService,
  ],

  // Optional: Specify dependencies if needed
  // dependencies: []
};

// Export actions
export {
  createMCPAction,
  n8nWorkflowAction,
  checkN8nWorkflowStatusAction,
  createPluginAction,
  checkPluginStatusAction,
  createPluginWithWorkflowsAction,
  // Legacy exports
  convertN8nToPluginAction,
  checkN8nPluginStatusAction,
  createN8nPluginFromDescriptionAction,
  testResearchAction,
  runBenchmarkAction,
  echoAction,
};

// Export services
export {
  AutoCodeService,
  N8nWorkflowService,
  N8nToPluginService,
  ResearchService,
  PluginCreationService,
  MCPCreationService,
  DockerService,
};

// Default export
export default autocoderPlugin;

// Define action names for runtime registration
export const AUTO_CODE_ACTIONS = {
  MCP_CREATION: 'createMCP',
  N8N_WORKFLOW: 'createN8nWorkflow',
  CHECK_N8N_STATUS: 'checkN8nWorkflowStatus',
  CREATE_PLUGIN: 'createPlugin',
  CHECK_PLUGIN_STATUS: 'checkPluginStatus',
  CREATE_PLUGIN_WITH_WORKFLOWS: 'createPluginWithWorkflows',
  RESEARCH: 'testResearch',
  BENCHMARK: 'runBenchmark',
  ECHO: 'echo',
};

// Service names for easy reference
export const AUTO_CODE_SERVICES = {
  AUTO_CODE: 'auto-code',
  N8N_WORKFLOW: 'n8n-workflow',
  N8N_TO_PLUGIN: 'n8n-to-plugin',
  RESEARCH: 'research',
  PLUGIN_CREATION: 'plugin-creation',
  MCP_CREATION: 'mcp-creation',
  DOCKER: 'docker',
};

// Backward compatibility mapping
export const ACTION_ALIASES = {
  convertN8nToPlugin: 'createPlugin',
  checkN8nPluginStatus: 'checkPluginStatus',
  createN8nPluginFromDescription: 'createPluginWithWorkflows',
};
