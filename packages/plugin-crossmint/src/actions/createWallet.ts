import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  logger,
  ModelType,
} from '@elizaos/core';
import { CrossMintUniversalWalletService } from '../services/CrossMintUniversalWalletService';
import { CrossMintError } from '../types/crossmint';

/**
 * Create Wallet Action for CrossMint
 * Enables agents to create MPC or custodial wallets using CrossMint
 */
export const createWalletAction: Action = {
  name: 'CREATE_CROSSMINT_WALLET',
  similes: ['CREATE_WALLET', 'NEW_WALLET', 'GENERATE_WALLET'],
  description: 'Create a new MPC or custodial wallet using CrossMint',

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const crossmintService = runtime.getService<CrossMintUniversalWalletService>('crossmint-universal-wallet');
    return !!crossmintService;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ) => {
    try {
      const crossmintService = runtime.getService<CrossMintUniversalWalletService>('crossmint-universal-wallet');
      if (!crossmintService) {
        throw new CrossMintError('CrossMint service not available');
      }

      // Extract wallet creation details from message using LLM
      const walletDetailsPrompt = `
        Extract wallet creation details from this message: "${message.content.text}"
        
        Return JSON with these fields:
        {
          "type": "mpc or custodial (default: mpc)",
          "network": "blockchain network (ethereum, polygon, solana, etc.)",
          "name": "wallet name or description",
          "userId": "user identifier if specified"
        }
        
        If any field is missing, set reasonable defaults. MPC wallets are preferred for security.
      `;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt: walletDetailsPrompt,
        maxTokens: 200,
      });

      let walletDetails;
      try {
        walletDetails = JSON.parse(response);
      } catch {
        // Fallback defaults
        walletDetails = {
          type: 'mpc',
          network: 'ethereum',
          name: 'ElizaOS Wallet',
          userId: message.entityId,
        };
      }

      // Set defaults
      walletDetails.type = walletDetails.type || 'mpc';
      walletDetails.network = walletDetails.network || 'ethereum';
      walletDetails.name = walletDetails.name || 'ElizaOS Wallet';
      walletDetails.userId = walletDetails.userId || message.entityId;

      // Validate network support
      if (!crossmintService.isChainSupported(walletDetails.network)) {
        throw new CrossMintError(`Network ${walletDetails.network} is not supported by CrossMint`);
      }

      // Create wallet
      const wallet = await crossmintService.createWallet({
        type: walletDetails.type,
        chain: walletDetails.network,
        name: walletDetails.name,
        metadata: {
          userId: walletDetails.userId,
          source: 'eliza-agent',
          messageId: message.id,
          roomId: message.roomId,
          createdBy: 'agent',
        },
      });

      const responseText = `✅ CrossMint Wallet Created

**Wallet ID:** ${wallet.id}
**Address:** ${wallet.address}
**Type:** ${wallet.type.toUpperCase()} ${wallet.type === 'mpc' ? '(Multi-Party Computation)' : '(Custodial)'}
**Network:** ${wallet.chain}
**Name:** ${walletDetails.name}
**Status:** ${wallet.isActive ? 'Active' : 'Inactive'}

${wallet.type === 'mpc' 
  ? 'This is an MPC wallet providing enhanced security through distributed key management.'
  : 'This is a custodial wallet managed by CrossMint.'
}`;

      await callback?.({
        text: responseText,
        thought: `Created ${wallet.type} wallet on ${wallet.chain} network`,
        actions: ['CREATE_CROSSMINT_WALLET'],
      });

      return {
        text: responseText,
        data: {
          wallet,
          walletDetails,
        },
      };
    } catch (error) {
      logger.error('Error creating CrossMint wallet:', error);
      
      const errorMessage = `❌ Failed to create wallet: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      await callback?.({
        text: errorMessage,
        thought: 'Failed to create CrossMint wallet',
        actions: ['CREATE_CROSSMINT_WALLET'],
      });

      return {
        text: errorMessage,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  examples: [
    [
      {
        name: 'User',
        content: {
          text: 'Create an MPC wallet on Ethereum for me',
        },
      },
      {
        name: 'Agent',
        content: {
          text: '✅ CrossMint Wallet Created\n\n**Wallet ID:** wallet-123...\n**Address:** 0x742d35Cc6639C0532fBa4c81D63eD2c0c57C1234\n**Type:** MPC (Multi-Party Computation)\n**Network:** ethereum\n**Name:** ElizaOS Wallet\n**Status:** Active\n\nThis is an MPC wallet providing enhanced security through distributed key management.',
          thought: 'Created MPC wallet on ethereum network',
          actions: ['CREATE_CROSSMINT_WALLET'],
        },
      },
    ],
    [
      {
        name: 'User',
        content: {
          text: 'I need a new Solana wallet called "Trading Wallet"',
        },
      },
      {
        name: 'Agent',
        content: {
          text: '✅ CrossMint Wallet Created\n\n**Wallet ID:** wallet-456...\n**Address:** 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM\n**Type:** MPC (Multi-Party Computation)\n**Network:** solana\n**Name:** Trading Wallet\n**Status:** Active\n\nThis is an MPC wallet providing enhanced security through distributed key management.',
          thought: 'Created MPC wallet on solana network',
          actions: ['CREATE_CROSSMINT_WALLET'],
        },
      },
    ],
  ],
};