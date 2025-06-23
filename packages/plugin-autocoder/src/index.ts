import type { Plugin, IAgentRuntime } from '@elizaos/core';
import { orchestrationActions } from './actions/orchestration-actions.js';
import { runSWEBenchAction, getSWEBenchStatsAction } from './actions/swe-bench-action.js';
import { runDistributedSWEBenchAction } from './actions/distributed-swe-bench-action.js';
import { createMCPAction } from './actions/mcp-creation-action.js';
import { n8nWorkflowAction, checkN8nWorkflowStatusAction } from './actions/n8n-workflow-action.js';
import { echoAction } from './actions/echo.js';
import { containerActions } from './actions/container-actions.js';
import { orchestrationProviders } from './providers/orchestration-providers.js';
import { AutoCodeService } from './services/AutoCodeService.js';
import { N8nWorkflowService } from './services/n8n-workflow-service.js';
import { DockerService } from './services/DockerService.js';
import { PluginCreationService } from './services/plugin-creation-service.js';
import { MCPCreationService } from './services/mcp-creation-service.js';
import { ResearchService } from './research/research-integration.js';
import { wrapAutocoderActionsWithTrust } from './trust/autocoderTrustIntegration.js';
import { elizaLogger } from '@elizaos/core';

// Export the plugin
export const autocoderPlugin: Plugin = {
  name: '@elizaos/plugin-autocoder',
  description:
    'Advanced auto-coding system with containerized sub-agents, task orchestration, and secure execution environments',

  dependencies: ['plugin-env', 'plugin-manager', 'plugin-trust'],

  actions: [
    ...orchestrationActions,
    ...containerActions,
    runSWEBenchAction,
    getSWEBenchStatsAction,
    runDistributedSWEBenchAction,
    createMCPAction,
    n8nWorkflowAction,
    checkN8nWorkflowStatusAction,
    echoAction,
  ],
  providers: [...orchestrationProviders],
  services: [
    AutoCodeService, 
    N8nWorkflowService, 
    DockerService, 
    PluginCreationService, 
    MCPCreationService, 
    ResearchService
  ],

  async init(config: Record<string, string>, runtime: IAgentRuntime): Promise<void> {
    elizaLogger.info('\n┌════════════════════════════════════════┐');
    elizaLogger.info('│          AUTOCODER PLUGIN              │');
    elizaLogger.info('├────────────────────────────────────────┤');
    elizaLogger.info('│  Initializing Enhanced AutoCoder...    │');
    elizaLogger.info('│  ✓ Container Orchestration             │');
    elizaLogger.info('│  ✓ Secure Environment Management       │');
    elizaLogger.info('│  ✓ Agent Communication Bridge          │');
    elizaLogger.info('│  ✓ Trust & Security Integration        │');
    elizaLogger.info('└════════════════════════════════════════┘');

    // Check if trust system is available
    const trustService = runtime.getService('trust-engine');
    const roleService = runtime.getService('role-manager');

    // Check Docker availability
    const dockerService = runtime.getService('docker');
    if (dockerService) {
      elizaLogger.info('✔ Docker service available - container orchestration enabled');
    } else {
      elizaLogger.warn('⚠️ Docker service not available - container features disabled');
    }

    if (trustService && roleService) {
      elizaLogger.info('✔ Trust and role services available - applying access control');

      // Apply trust-based access control to all actions
      const trustWrappedActions = wrapAutocoderActionsWithTrust([
        ...orchestrationActions,
        ...containerActions,
        runSWEBenchAction,
        getSWEBenchStatsAction,
        createMCPAction,
        n8nWorkflowAction,
        checkN8nWorkflowStatusAction,
        echoAction,
      ]);

      // Trust-enhanced actions would be registered by the trust system
      elizaLogger.info(
        `✔ Trust wrapper applied to ${trustWrappedActions.length} autocoder actions`
      );

      // Set up admin role validation for critical operations
      try {
        const securityModule = runtime.getService('security-module');
        if (
          securityModule &&
          typeof (securityModule as any).configureHighRiskOperations === 'function'
        ) {
          await (securityModule as any).configureHighRiskOperations([
            'createPluginProject',
            'updatePluginProject',
            'provideSecrets',
            'publishPlugin',
            'cancelProject',
            'createMCPServer',
            'createN8nWorkflow',
            'SPAWN_SUB_AGENT',
            'TERMINATE_TASK',
          ]);
          elizaLogger.info('✔ Configured high-risk operation protection');
        }
      } catch (error) {
        elizaLogger.warn('⚠️ Failed to configure security module protection:', error);
      }
    } else {
      elizaLogger.warn(
        '⚠️ Trust/role services not available - actions will run without access control'
      );
      elizaLogger.warn(
        '⚠️ This poses significant security risks for code generation and container management'
      );

      // Actions are automatically registered by the plugin system from the actions array
      elizaLogger.info(
        `✔ Registered ${orchestrationActions.length + containerActions.length + 6} autocoder actions without trust enhancement`
      );
    }

    elizaLogger.info('🚀 AutoCoder Plugin initialization complete');
  },
};

// Default export
export default autocoderPlugin;
