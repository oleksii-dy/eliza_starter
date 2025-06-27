import type { Plugin } from '@elizaos/core';
import { type IAgentRuntime, logger } from '@elizaos/core';
import { z } from 'zod';

// Services
import { MidnightNetworkService } from './services/MidnightNetworkService.js';
import { SecureMessagingService } from './services/SecureMessagingService.js';
import { NetworkMessagingService } from './services/NetworkMessagingService.js';
import { CostTrackingService } from './services/CostTrackingService.js';
import { PaymentService } from './services/PaymentService.js';
import { AgentDiscoveryService } from './services/AgentDiscoveryService.js';

// Actions
import { sendSecureMessageAction } from './actions/sendSecureMessage.js';
import { sendGroupMessage } from './actions/sendGroupMessage.js';
import { shareSecretAction } from './actions/shareSecret.js';
import { verifySecretsAction } from './actions/verifySecrets.js';
import { createChatRoomAction } from './actions/createChatRoom.js';
import { joinChatRoomAction } from './actions/joinChatRoom.js';
import { sendPaymentAction } from './actions/sendPayment.js';
import { requestPaymentAction } from './actions/requestPayment.js';
import { discoverAgentsAction } from './actions/discoverAgents.js';

// Providers
import { midnightWalletProvider } from './providers/midnightWallet.js';
import { networkStateProvider } from './providers/networkState.js';
import { chatRoomProvider } from './providers/chatRoom.js';
import { secretMessageProvider } from './providers/secretMessage.js';

// Test suites
import { MidnightNetworkTestSuite } from './tests/index.js';

// Scenarios
import { midnightNetworkScenarios } from '../scenarios/index.js';

/**
 * Configuration schema for the Midnight Network plugin
 */
const configSchema = z.object({
  MIDNIGHT_NETWORK_URL: z
    .string()
    .min(1, 'Midnight Network URL is required')
    .default('https://rpc.midnight.network'),
  MIDNIGHT_INDEXER_URL: z
    .string()
    .min(1, 'Midnight Indexer URL is required')
    .default('https://indexer.midnight.network'),
  MIDNIGHT_WALLET_MNEMONIC: z.string().min(1, 'Midnight wallet mnemonic is required'),
  MIDNIGHT_PROOF_SERVER_URL: z
    .string()
    .min(1, 'Midnight proof server URL is required')
    .default('https://proof.midnight.network'),
  MIDNIGHT_NETWORK_ID: z.string().default('mainnet'),
  MIDNIGHT_ZK_CONFIG_URL: z
    .string()
    .min(1, 'ZK config URL is required')
    .default('https://zk-config.midnight.network'),
});

export type MidnightConfig = z.infer<typeof configSchema>;

/**
 * Main Midnight Network plugin for ElizaOS
 * Provides secure communication, payment, and agent discovery using zero-knowledge proofs
 */
export const midnightPlugin: Plugin = {
  name: '@elizaos/plugin-midnight',
  description:
    'Midnight Network integration for secure agent communication and payments using zero-knowledge proofs',

  config: {
    MIDNIGHT_NETWORK_URL: process.env.MIDNIGHT_NETWORK_URL,
    MIDNIGHT_INDEXER_URL: process.env.MIDNIGHT_INDEXER_URL,
    MIDNIGHT_WALLET_MNEMONIC: process.env.MIDNIGHT_WALLET_MNEMONIC,
    MIDNIGHT_PROOF_SERVER_URL: process.env.MIDNIGHT_PROOF_SERVER_URL,
    MIDNIGHT_NETWORK_ID: process.env.MIDNIGHT_NETWORK_ID,
    MIDNIGHT_ZK_CONFIG_URL: process.env.MIDNIGHT_ZK_CONFIG_URL,
  },

  async init(config: Record<string, string>, runtime: IAgentRuntime) {
    logger.info('Initializing Midnight Network plugin...');

    try {
      const validatedConfig = await configSchema.parseAsync(config);

      // Set validated environment variables
      for (const [key, value] of Object.entries(validatedConfig)) {
        if (value) {
          process.env[key] = value;
        }
      }

      logger.info(`Midnight Network plugin initialized successfully for agent: ${runtime.agentId}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Invalid Midnight Network plugin configuration: ${error.errors.map((e) => e.message).join(', ')}`
        );
      }
      throw error;
    }
  },

  services: [
    MidnightNetworkService as any,
    SecureMessagingService as any,
    NetworkMessagingService as any,
    CostTrackingService as any,
    PaymentService as any,
    AgentDiscoveryService as any,
  ],

  actions: [
    sendSecureMessageAction,
    sendGroupMessage,
    shareSecretAction,
    verifySecretsAction,
    createChatRoomAction,
    joinChatRoomAction,
    sendPaymentAction,
    requestPaymentAction,
    discoverAgentsAction,
  ],

  providers: [
    midnightWalletProvider,
    networkStateProvider,
    chatRoomProvider,
    secretMessageProvider,
  ],

  tests: [
    {
      name: 'Real Midnight Network Integration Tests',
      tests: MidnightNetworkTestSuite,
    },
  ],

  routes: [
    {
      name: 'midnight-network-status',
      path: '/api/midnight/status',
      type: 'GET',
      handler: async (_req: any, res: any) => {
        try {
          const status = {
            connected: true,
            networkId: process.env.MIDNIGHT_NETWORK_ID,
            timestamp: new Date().toISOString(),
          };
          res.json(status);
        } catch (_error) {
          res.status(500).json({ error: 'Failed to get network status' });
        }
      },
    },
    {
      name: 'midnight-wallet-info',
      path: '/api/midnight/wallet',
      type: 'GET',
      handler: async (_req: any, res: any) => {
        try {
          // This would return wallet info without exposing private keys
          const walletInfo = {
            hasWallet: !!process.env.MIDNIGHT_WALLET_MNEMONIC,
            networkId: process.env.MIDNIGHT_NETWORK_ID,
          };
          res.json(walletInfo);
        } catch (_error) {
          res.status(500).json({ error: 'Failed to get wallet info' });
        }
      },
    },
  ],

  events: {
    MESSAGE_RECEIVED: [
      async (_params) => {
        logger.debug('Midnight plugin received MESSAGE_RECEIVED event');
        // Handle incoming messages for secure communication
      },
    ],
    WORLD_JOINED: [
      async (_params) => {
        logger.debug('Midnight plugin received WORLD_JOINED event');
        // Initialize agent in midnight network when joining a world
      },
    ],
  },

  dependencies: [],

  scenarios: midnightNetworkScenarios,
};

export default midnightPlugin;

// Re-export key types and utilities
export * from './types/index.js';
export * from './utils/index.js';
export {
  MidnightNetworkService,
  SecureMessagingService,
  NetworkMessagingService,
  CostTrackingService,
  PaymentService,
  AgentDiscoveryService,
};
