import type { Plugin } from '@elizaos/core';
import { CodeGenerationService } from './services/CodeGenerationService';
import { GitHubService } from './services/GitHubService';
import { SecretsManagerService } from './services/SecretsManagerService';
import { generateCodeAction } from './actions/generate-code';
import { projectsProvider } from './providers/projects-provider';
import autoCoderScenariosTestSuite from './__tests__/e2e/scenarios';

// Export types
export * from './types';

// Export services
export {
  CodeGenerationService,
  type CodeGenerationRequest,
  type GenerationResult,
} from './services/CodeGenerationService';
// SandboxBridge is deprecated - use E2B service directly
export { GitHubService } from './services/GitHubService';
export { SecretsManagerService } from './services/SecretsManagerService';

// Export actions
export { generateCodeAction };

// Export provider
export { projectsProvider };

/**
 * AutoCoder Plugin for ElizaOS
 *
 * Advanced code generation system using Claude Code in E2B sandboxes.
 * Supports creating plugins, agents, workflows, MCP servers, and full-stack apps.
 *
 * Features:
 * - Claude Code integration for intelligent code generation
 * - E2B sandboxed execution environments
 * - Multi-step project planning with forms
 * - Automated QA with linting, type checking, and testing
 * - GitHub repository creation and deployment
 * - API key and secrets management
 * - Real-time code generation with quality assurance
 */
export const autocoderPlugin: Plugin = {
  name: '@elizaos/plugin-autocoder',
  description:
    'Advanced code generation plugin using Claude Code in sandboxed environments. Automates complete project creation with quality assurance.',

  services: [CodeGenerationService, GitHubService, SecretsManagerService],
  actions: [generateCodeAction],
  providers: [projectsProvider],

  // Dependencies
  dependencies: ['@elizaos/plugin-forms', '@elizaos/plugin-e2b'],
  testDependencies: ['@elizaos/plugin-forms', '@elizaos/plugin-e2b'],

  // E2E Test Suites - Real runtime integration tests
  tests: [autoCoderScenariosTestSuite],
};

// Default export
export default autocoderPlugin;
