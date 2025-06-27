import { AgentKitService } from './services/AgentKitService';
import { CustodialWalletService } from './services/CustodialWalletService';
import { walletProvider } from './provider';
import { _getAgentKitActions, createAgentKitActionsFromService } from './actions';
import { custodialWalletActions } from './actions/custodial-wallet';
import { custodialWalletRoutes } from './api/walletRoutes';
import type { Plugin, IAgentRuntime } from '@elizaos/core';
import { AgentKitTestSuite } from './__tests__/e2e/agentkit.test';
import { CustodialWalletTestSuite } from './__tests__/e2e/custodial-wallet.test';
import { AgentKitUserScenariosTestSuite } from './__tests__/e2e/user-scenarios.test';

export const agentKitPlugin: Plugin = {
  name: '@elizaos/plugin-agentkit',
  description: 'AgentKit plugin for ElizaOS',

  // Plugin-level configuration including component defaults
  config: {
    defaultEnabled: true,
    category: 'blockchain',
    componentDefaults: {
      actions: {
        // All AgentKit actions disabled by default (too risky for financial operations)
        CREATE_CUSTODIAL_WALLET: { enabled: false, category: 'wallet', permissions: ['financial'] },
        LIST_CUSTODIAL_WALLETS: { enabled: false, category: 'wallet', permissions: ['financial'] },
        TRANSFER_WALLET_OWNERSHIP: { enabled: false, category: 'wallet', permissions: ['admin'] },
        ADD_WALLET_CONTROLLER: { enabled: false, category: 'wallet', permissions: ['admin'] },
        // Dynamic CDP actions will be disabled by default when registered
      },
      providers: {
        WALLET_PROVIDER: { enabled: true, category: 'wallet', permissions: [] },
      },
      services: {
        AGENTKIT_SERVICE: { enabled: true, autoStart: true },
        CUSTODIAL_WALLET_SERVICE: { enabled: true, autoStart: true },
      },
    },
  },

  services: [AgentKitService, CustodialWalletService],
  providers: [walletProvider],
  actions: [
    custodialWalletActions[0], // createCustodialWalletAction
    custodialWalletActions[1], // listCustodialWalletsAction
    custodialWalletActions[2], // transferWalletOwnershipAction
    custodialWalletActions[3], // addWalletControllerAction
  ],

  routes: custodialWalletRoutes,

  tests: [
    new AgentKitTestSuite(),
    new CustodialWalletTestSuite(),
    new AgentKitUserScenariosTestSuite(),
  ],

  async init(config: Record<string, string>, runtime: IAgentRuntime): Promise<void> {
    console.info('\n┌════════════════════════════════════════┐');
    console.info('│          AGENTKIT PLUGIN               │');
    console.info('├────────────────────────────────────────┤');
    console.info('│  Initializing AgentKit Plugin...       │');
    console.info('│  Version: 0.0.1                        │');
    console.info('└════════════════════════════════════════┘');

    // Register custodial wallet service manually (it's optional)
    try {
      await runtime.registerService(CustodialWalletService);
    } catch (error) {
      console.warn(
        '⚠️ Failed to register Custodial Wallet service:',
        error instanceof Error ? error.message : String(error)
      );
      console.info('This is expected if wallet encryption passphrase is not configured');
    }

    // Register actions dynamically when service is available - but all disabled by default
    const agentKitService = runtime.getService<AgentKitService>('agentkit');
    if (agentKitService && agentKitService.isReady()) {
      const dynamicActions = await createAgentKitActionsFromService(runtime);
      // Don't register actions automatically - they're disabled by default for security
      console.info(
        `⚠️ Found ${dynamicActions.length} AgentKit actions - all disabled by default for security`
      );
      console.info(
        'Use runtime.enableComponent() to enable specific financial actions after trust verification'
      );
    } else {
      console.warn('⚠️ AgentKit service not available - actions will not be registered');
    }

    // Register custodial wallet actions if service is available - but disabled by default
    const custodialService = runtime.getService<CustodialWalletService>('custodial-wallet');
    if (custodialService && custodialService.isReady()) {
      // Don't register custodial actions automatically - they're disabled by default for security
      console.info(
        `⚠️ Found ${custodialWalletActions.length} custodial wallet actions - all disabled by default for security`
      );
      console.info(
        'Use runtime.enableComponent() to enable specific wallet actions after trust verification'
      );
    } else {
      console.warn(
        '⚠️ Custodial Wallet service not available - custodial actions will not be registered'
      );
    }
  },
};

export default agentKitPlugin;
