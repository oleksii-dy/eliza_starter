import type { IAgentRuntime, Plugin } from '@elizaos/core';
import { orchestrationActions } from './actions/orchestration-actions.js';
import { pluginCreationActions } from './actions/plugin-creation-actions.js';
import { createMCPAction } from './actions/mcp-creation-action.js';
import { n8nWorkflowAction, checkN8nWorkflowStatusAction } from './actions/n8n-workflow-action.js';
import { echoAction } from './actions/echo.js';
import { platformWorkflowAction } from './actions/platform-workflow-action.js';
import { secretsWorkflowAction } from './actions/secrets-workflow-action.js';
import { N8nWorkflowService } from './services/N8nWorkflowService.js';
import { DockerService } from './services/DockerService.js';
import { PluginCreationService } from './services/PluginCreationService.js';
import { MCPCreationService } from './services/McpCreationService.js';
import { elizaLogger } from '@elizaos/core';

// Export the plugin
export const autocoderPlugin: Plugin = {
  name: '@elizaos/plugin-autocoder',
  description:
    'Advanced auto-coding system with AI-powered plugin, MCP, and workflow generation. Integrates with plugin-plugin-manager for platform registry management.',

  dependencies: ['plugin-plugin-manager'],

  actions: [
    ...orchestrationActions,
    ...pluginCreationActions,
    createMCPAction,
    n8nWorkflowAction,
    checkN8nWorkflowStatusAction,
    echoAction,
    platformWorkflowAction,
    secretsWorkflowAction,
  ],
  providers: [],
  services: [
    N8nWorkflowService,
    DockerService,
    PluginCreationService,
    MCPCreationService
  ],

  async init(config: Record<string, string>, runtime: IAgentRuntime): Promise<void> {
    elizaLogger.info('\n┌════════════════════════════════════════┐');
    elizaLogger.info('│         ELIZAOS AUTOCODER              │');
    elizaLogger.info('├────────────────────────────────────────┤');
    elizaLogger.info('│  Initializing Generation Services...   │');
    elizaLogger.info('│  ✓ AI-Powered Code Generation          │');
    elizaLogger.info('│  ✓ Container Orchestration             │');
    elizaLogger.info('│  ✓ Plugin & MCP Generation             │');
    elizaLogger.info('│  ✓ N8n Workflow Creation               │');
    elizaLogger.info('│  ✓ SWE-bench Evaluation                │');
    elizaLogger.info('│  ✓ Secure Sandbox Environment          │');
    elizaLogger.info('│  ✓ Complete Platform Workflow          │');
    elizaLogger.info('│  ✓ Intelligent Secrets Management      │');
    elizaLogger.info('│  ✓ Registry Integration                 │');
    elizaLogger.info('└════════════════════════════════════════┘');

    // Check if plugin-plugin-manager is available for registry integration
    const pluginManagerService = runtime.getService('plugin-manager');
    const platformRegistryService = runtime.getService('platform-registry');

    if (pluginManagerService || platformRegistryService) {
      elizaLogger.info('✔ Plugin Manager available - registry integration enabled');
    } else {
      elizaLogger.warn('⚠️ Plugin Manager not available - registry integration disabled');
    }

    // Check Docker availability
    const dockerService = runtime.getService('docker');
    if (dockerService) {
      elizaLogger.info('✔ Docker service available - container orchestration enabled');
    } else {
      elizaLogger.warn('⚠️ Docker service not available - container features disabled');
    }

    // Check if trust system is available
    const trustService = runtime.getService('trust-engine');
    const roleService = runtime.getService('role-manager');

    if (trustService && roleService) {
      elizaLogger.info('✔ Trust and role services available - applying access control');

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
            'PLATFORM_WORKFLOW',
            'SECRETS_WORKFLOW',
          ]);
          elizaLogger.info('✔ Configured high-risk operation protection for AutoCoder');
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
    }

    elizaLogger.info('🚀 ElizaOS AutoCoder initialization complete');
  },
};

// Default export
export default autocoderPlugin;
