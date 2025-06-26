import type { TestSuite } from '../../types/core';

// Helper function to create test messages
function _createTestMessage(id: string, text: string, actions?: string[]) {
  const baseId = '00000000-0000-0000-0000-';
  return {
    id: baseId + id.padStart(12, '0'),
    entityId: baseId + (Number.parseInt(id) + 1).toString().padStart(12, '0'),
    roomId: baseId + (Number.parseInt(id) + 2).toString().padStart(12, '0'),
    agentId: 'test-agent-id',
    content: {
      text,
      actions: actions || [],
    },
    createdAt: Date.now(),
  };
}

// Helper function to simulate action execution with timeout
async function _executeActionWithTimeout(
  action: any,
  runtime: any,
  message: any,
  timeoutMs = 5000
) {
  return Promise.race([
    action.handler(runtime, message, {}, {}, async () => []),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Action execution timeout')), timeoutMs)
    ),
  ]);
}

export class AgentKitTestSuite implements TestSuite {
  name = 'agentkit-e2e';
  description = 'E2E tests for AgentKit plugin';

  tests = [
    {
      name: 'Plugin should load successfully',
      fn: async (runtime: any) => {
        // Check that the plugin loaded
        const plugins = runtime.plugins || [];
        const agentKitPlugin = plugins.find((p: any) => p.name === '@elizaos/plugin-agentkit');

        if (!agentKitPlugin) {
          throw new Error('AgentKit plugin not found in runtime plugins');
        }

        console.log('✅ AgentKit plugin loaded successfully');
      },
    },
    {
      name: 'AgentKit service should be available',
      fn: async (runtime: any) => {
        const agentKitService = runtime.getService('agentkit');

        if (!agentKitService) {
          console.warn(
            '⚠️  AgentKit service not available - CDP credentials may not be configured'
          );
          // This is not a failure - the service is optional
          return;
        }

        if (!agentKitService.isReady()) {
          throw new Error('AgentKit service is available but not ready');
        }

        console.log('✅ AgentKit service is available and ready');
      },
    },
    {
      name: 'Custodial wallet service should be available',
      fn: async (runtime: any) => {
        const walletService = runtime.getService('custodial-wallet');

        if (!walletService) {
          console.warn(
            '⚠️  Custodial wallet service not available - encryption passphrase may not be configured'
          );
          // This is not a failure - the service is optional
          return;
        }

        console.log('✅ Custodial wallet service is available');
      },
    },
    {
      name: 'Wallet provider should be registered',
      fn: async (runtime: any) => {
        const providers = runtime.providers || [];
        const walletProvider = providers.find((p: any) => p.name === 'agentKitWallet');

        if (!walletProvider) {
          throw new Error('Wallet provider not found in runtime providers');
        }

        console.log('✅ Wallet provider registered successfully');
      },
    },
    {
      name: 'Actions should be registered when services are available',
      fn: async (runtime: any) => {
        const actions = runtime.actions || [];
        const agentKitActions = actions.filter(
          (a: any) =>
            a.name.includes('TRANSFER') ||
            a.name.includes('BALANCE') ||
            a.name.includes('CDP_') ||
            a.name.includes('CUSTODIAL_')
        );

        if (agentKitActions.length === 0) {
          console.warn('⚠️  No AgentKit actions registered - services may not be available');
          // This is not a failure - actions are only registered when services are available
          return;
        }

        console.log(`✅ ${agentKitActions.length} AgentKit actions registered`);
      },
    },
  ];
}

export default new AgentKitTestSuite();
