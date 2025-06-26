/**
 * Multi-Agent Sandbox Development Team Plugin
 * Enables spawning specialized development teams in E2B sandboxes
 */

import type { Plugin } from '@elizaos/core';
import { SandboxManager } from './SandboxManager.js';
import { MockSandboxManager } from './MockSandboxManager.js';
import { WebSocketBridge } from './WebSocketBridge.js';
import { spawnDevTeamAction } from './actions/spawnDevTeam.js';
import { delegateTaskAction } from './actions/delegateTask.js';

// Additional actions for sandbox management
export const sandboxActions = [
  spawnDevTeamAction,
  delegateTaskAction,
  // Add more actions as needed:
  // - monitorTeamAction
  // - syncProjectFilesAction
  // - destroySandboxAction
  // - getTeamStatusAction
];

export const sandboxServices = [SandboxManager, MockSandboxManager, WebSocketBridge];

export const sandboxPlugin: Plugin = {
  name: 'sandbox-dev-team',
  description: 'Multi-agent development teams in E2B sandboxes',

  actions: sandboxActions,
  services: sandboxServices,

  config: {
    E2B_API_KEY: 'E2B API key for sandbox creation',
    HOST_URL: 'Host server URL for WebSocket connections (default: http://localhost:3000)',
    SANDBOX_TEMPLATE: 'E2B template ID (default: eliza-dev-team)',
    MAX_SANDBOXES: 'Maximum number of concurrent sandboxes (default: 5)',
    SANDBOX_TIMEOUT: 'Sandbox timeout in minutes (default: 60)',
  },

  async init(config: Record<string, string>) {
    // Validate required configuration
    if (!config.E2B_API_KEY && !process.env.E2B_API_KEY) {
      console.warn('⚠️  E2B_API_KEY not configured. Sandbox functionality will be limited.');
      console.log(
        '   Set E2B_API_KEY in your environment or configuration to enable full functionality.'
      );
    }

    // Set default values
    if (!config.HOST_URL && !process.env.HOST_URL) {
      process.env.HOST_URL = 'http://localhost:3000';
    }

    if (!config.SANDBOX_TEMPLATE && !process.env.SANDBOX_TEMPLATE) {
      process.env.SANDBOX_TEMPLATE = 'eliza-dev-team';
    }

    if (!config.MAX_SANDBOXES && !process.env.MAX_SANDBOXES) {
      process.env.MAX_SANDBOXES = '5';
    }

    if (!config.SANDBOX_TIMEOUT && !process.env.SANDBOX_TIMEOUT) {
      process.env.SANDBOX_TIMEOUT = '60';
    }

    console.log('🏗️  Sandbox Development Team plugin initialized');
    console.log(`   Template: ${config.SANDBOX_TEMPLATE || process.env.SANDBOX_TEMPLATE}`);
    console.log(`   Max Sandboxes: ${config.MAX_SANDBOXES || process.env.MAX_SANDBOXES}`);
  },
};

// Export everything for external use
export { SandboxManager, WebSocketBridge, spawnDevTeamAction, delegateTaskAction };

export type { SandboxEnvironment, AgentConfig, ProjectFile } from './SandboxManager.js';

export type { BridgeConfig, RoomMessage } from './WebSocketBridge.js';

export type {
  ProjectSpecification,
  TaskAssignment,
  TaskDelegationRequest,
} from './actions/spawnDevTeam.js';

// Default export
export default sandboxPlugin;
