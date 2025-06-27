import type { IAgentRuntime, Plugin } from '@elizaos/core';
import { orchestrationActions } from './actions/orchestration-actions.ts';
import { pluginCreationActions } from './actions/plugin-creation-actions.ts';
import { createMCPAction } from './actions/mcp-creation-action.ts';
import { n8nWorkflowAction, checkN8nWorkflowStatusAction } from './actions/n8n-workflow-action.ts';
import { echoAction } from './actions/echo.ts';
import { platformWorkflowAction } from './actions/platform-workflow-action.ts';
import { secretsWorkflowAction } from './actions/secrets-workflow-action.ts';
import { spawnE2BAgentsAction } from './actions/spawn-e2b-agents.ts';
import { generateContractAction } from './actions/generateContract.ts';
import { generateDAppAction } from './actions/generateDApp.ts';
import { runBenchmarkAction } from './actions/runBenchmark.ts';
import { requestSecretsFormAction } from './actions/requestSecretsForm.ts';
import { N8nWorkflowService } from './services/N8nWorkflowService.ts';
import { DockerService } from './services/DockerService.ts';
import { PluginCreationService } from './services/PluginCreationService.ts';
import { MCPCreationService } from './services/McpCreationService.ts';
import { E2BAgentOrchestrator } from './services/E2BAgentOrchestrator.ts';
import { GitWorkflowManager } from './services/GitWorkflowManager.ts';
import { ContractGenerationService } from './services/ContractGenerationService.ts';
import { BenchmarkService } from './services/BenchmarkService.ts';
import { RoomContextProvider } from './providers/RoomContextProvider.ts';
import { AutocoderPlanProvider } from './providers/AutocoderPlanProvider.ts';
import { elizaLogger } from '@elizaos/core';
import { WebSocketAgentServer } from './services/WebSocketAgentServer.ts';
import { E2BAgentClient } from './services/E2BAgentClient.ts';
import { codeReviewAction } from './actions/code-review.ts';
import { ProjectComplexityEstimator } from './services/ProjectComplexityEstimator.ts';
import { SecretsFormWebSocketService } from './services/SecretsFormWebSocketService.ts';
import { ConfigurationService } from './services/ConfigurationService.ts';

// Export the plugin
export const autocoderPlugin: Plugin = {
  name: '@elizaos/plugin-autocoder',
  description:
    'Advanced auto-coding system with AI-powered plugin, MCP, and workflow generation. Includes smart contract generation, full-stack dApp development, EVM/SVM blockchain support, and automated benchmarking. Integrates with plugin-plugin-manager for platform registry management.',

  dependencies: ['plugin-plugin-manager', 'plugin-e2b', 'plugin-evm'],

  actions: [
    ...orchestrationActions,
    ...pluginCreationActions,
    createMCPAction,
    n8nWorkflowAction,
    checkN8nWorkflowStatusAction,
    echoAction,
    platformWorkflowAction,
    secretsWorkflowAction,
    spawnE2BAgentsAction,
    generateContractAction,
    generateDAppAction,
    runBenchmarkAction,
    requestSecretsFormAction,
    codeReviewAction,
  ],
  providers: [new RoomContextProvider(), new AutocoderPlanProvider()],
  services: [
    ConfigurationService, // Initialize first for other services to use
    N8nWorkflowService,
    DockerService,
    PluginCreationService,
    MCPCreationService,
    E2BAgentOrchestrator,
    GitWorkflowManager,
    ContractGenerationService,
    BenchmarkService,
    WebSocketAgentServer,
    E2BAgentClient,
    ProjectComplexityEstimator,
    SecretsFormWebSocketService,
  ],

  async init(config: Record<string, string>, runtime: IAgentRuntime): Promise<void> {
    elizaLogger.info('\n┌════════════════════════════════════════┐');
    elizaLogger.info('│         ELIZAOS AUTOCODER              │');
    elizaLogger.info('├────────────────────────────────────────┤');
    elizaLogger.info('│  Initializing Generation Services...   │');
    elizaLogger.info('│  ✓ Environment-Based Configuration     │');
    elizaLogger.info('│  ✓ AI-Powered Code Generation          │');
    elizaLogger.info('│  ✓ Container Orchestration             │');
    elizaLogger.info('│  ✓ Plugin & MCP Generation             │');
    elizaLogger.info('│  ✓ N8n Workflow Creation               │');
    elizaLogger.info('│  ✓ SWE-bench Evaluation                │');
    elizaLogger.info('│  ✓ Secure Sandbox Environment          │');
    elizaLogger.info('│  ✓ Complete Platform Workflow          │');
    elizaLogger.info('│  ✓ Dynamic Secrets Form Injection      │');
    elizaLogger.info('│  ✓ Registry Integration                 │');
    elizaLogger.info('│  ✓ E2B Agent Sandboxing                │');
    elizaLogger.info('│  ✓ Git-based Collaboration             │');
    elizaLogger.info('│  ✓ Multi-Agent Orchestration           │');
    elizaLogger.info('│  ✓ Smart Contract Generation           │');
    elizaLogger.info('│  ✓ Full-Stack dApp Development         │');
    elizaLogger.info('│  ✓ EVM & SVM Blockchain Support        │');
    elizaLogger.info('│  ✓ Automated Testing & Benchmarking    │');
    elizaLogger.info('└════════════════════════════════════════┘');

    // Display configuration summary
    const configService = runtime.getService('autocoder-config') as ConfigurationService;
    if (configService) {
      const configSummary = configService.getConfigSummary();
      elizaLogger.info('📋 Configuration Summary:', {
        environment: configSummary.environment,
        hasE2BKey: configSummary.e2b.hasApiKey,
        hasAIKeys: configSummary.ai.hasAnthropicKey || configSummary.ai.hasOpenAIKey,
        preferredModel: configSummary.ai.preferredModel,
        defaultNetwork: configSummary.contracts.defaultNetwork,
        benchmarksEnabled: configSummary.benchmarks.enabled,
        sandboxIsolation: configSummary.security.enableSandboxIsolation,
        debugLogging: configSummary.development.enableDebugLogging,
      });
    }

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

    // Check E2B availability
    const e2bService = runtime.getService('e2b');
    if (e2bService) {
      elizaLogger.info('✔ E2B service available - agent sandboxing enabled');
    } else {
      elizaLogger.warn('⚠️ E2B service not available - sandboxed agents disabled');
    }

    // Check contract generation services
    const contractService = runtime.getService('contract-generation');
    const benchmarkService = runtime.getService('benchmark');
    if (contractService && benchmarkService) {
      elizaLogger.info(
        '✔ Contract generation services available - blockchain development enabled'
      );
    } else {
      elizaLogger.warn(
        '⚠️ Contract generation services not available - blockchain features disabled'
      );
    }

    // Check EVM support
    const evmService = runtime.getService('evm');
    if (evmService) {
      elizaLogger.info('✔ EVM service available - Ethereum/Base/Arbitrum/Polygon support enabled');
    } else {
      elizaLogger.warn('⚠️ EVM service not available - EVM blockchain features disabled');
    }

    // Check GitHub availability
    const githubService = runtime.getService('github-integration');
    if (githubService) {
      elizaLogger.info('✔ GitHub service available - Git collaboration enabled');
    } else {
      elizaLogger.warn('⚠️ GitHub service not available - Git workflow features disabled');
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
            'GENERATE_CONTRACT',
            'GENERATE_DAPP',
            'RUN_BENCHMARK',
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
