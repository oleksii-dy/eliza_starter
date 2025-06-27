import type { Plugin } from '@elizaos/core';
import { executeCodeAction, executeTemplateAction, manageSandboxAction, sandboxFirstAction } from './actions/index.js';
import { githubIssueOrchestratorAction } from './actions/githubIssueOrchestrator.js';
import { agentCoordinationAction } from './actions/agentCoordination.js';
import { e2bProvider } from './providers/e2bProvider.js';
import { E2BService } from './services/E2BService.js';
import { AgentCommunicationBridge } from './services/AgentCommunicationBridge.js';
import { GitHubIntegrationService } from './services/GitHubIntegrationService.js';
import { E2BBasicE2ETestSuite } from './tests/e2e/e2b-basic.js';
import { TemplateExecutionE2ETestSuite } from './tests/e2e/template-execution.js';
import { RealWorldScenariosE2ETestSuite } from './tests/e2e/real-world-scenarios.js';
import { AgentSandboxIntegrationE2ETestSuite } from './__tests__/e2e/agent-sandbox-integration.test.js';
import './types.js'; // Ensure module augmentation is loaded

export const e2bPlugin: Plugin = {
  name: '@elizaos/plugin-e2b',
  description:
    'E2B Code Interpreter plugin for secure code execution in isolated sandboxes with GitHub integration and multi-agent coordination capabilities. Supports Python, JavaScript, and other languages with full filesystem access, package installation, and collaborative development workflows.',

  actions: [
    sandboxFirstAction, // Priority action - intercepts computational requests
    executeCodeAction,
    executeTemplateAction, // Template-based code execution
    manageSandboxAction,
    githubIssueOrchestratorAction, // GitHub issue workflow orchestration
    agentCoordinationAction, // Multi-agent communication and coordination
  ],

  providers: [e2bProvider],

  services: [
    E2BService,
    AgentCommunicationBridge, // Agent-to-agent communication
    GitHubIntegrationService, // GitHub API integration
  ],

  tests: [
    new E2BBasicE2ETestSuite(),
    new TemplateExecutionE2ETestSuite(),
    new RealWorldScenariosE2ETestSuite(),
    new AgentSandboxIntegrationE2ETestSuite(),
  ],

  init: async (config: Record<string, string>, runtime) => {
    // Validate E2B configuration
    const apiKey =
      config.E2B_API_KEY || runtime.getSetting('E2B_API_KEY') || process.env.E2B_API_KEY;

    if (!apiKey) {
      console.warn(
        '⚠️  E2B_API_KEY not provided. Plugin will attempt to use local E2B installation.'
      );
      console.warn('   For cloud E2B features, please set E2B_API_KEY environment variable.');
      console.warn('   Get your API key at: https://e2b.dev');
    } else {
      console.log('✅ E2B plugin initialized with API key');
    }

    // Additional initialization could include:
    // - Validating E2B connectivity
    // - Setting up default sandbox templates
    // - Configuring security policies
    // - Setting up monitoring/logging
  },
};

export default e2bPlugin;

// Export types and services for external use
export type {
  E2BServiceType,
  E2BSandboxOptions,
  E2BExecutionResult,
  E2BSandboxHandle,
} from './types.js';
export { E2BService } from './services/E2BService.js';
