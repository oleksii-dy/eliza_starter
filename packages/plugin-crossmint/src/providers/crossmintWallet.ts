import { type Provider, type IAgentRuntime, type Memory, type State, logger } from '@elizaos/core';
import { CrossMintUniversalWalletService } from '../services/CrossMintUniversalWalletService';

/**
 * CrossMint Wallet Provider
 * Provides wallet information and capabilities to the agent context
 */
export const crossmintWalletProvider: Provider = {
  name: 'CROSSMINT_WALLET',
  description:
    'Provides CrossMint MPC wallet status, supported blockchain networks, and enterprise infrastructure capabilities when agent needs to manage cross-chain transactions or X.402 payments',
  position: 5,

  get: async (runtime: IAgentRuntime, _message: Memory, _state: State) => {
    try {
      const crossmintService = runtime.getService<CrossMintUniversalWalletService>(
        'crossmint-universal-wallet'
      );

      if (!crossmintService) {
        return {
          text: '',
          values: {},
        };
      }

      // Get wallet information
      const wallets = await crossmintService.getWallets();
      const supportedChains = await crossmintService.getSupportedChains();

      const walletSummary = wallets.map((wallet) => ({
        id: wallet.id,
        address: wallet.address,
        type: wallet.type,
        chain: wallet.chain,
        isActive: wallet.isActive,
      }));

      const text = `[CROSSMINT WALLET CAPABILITIES]
Available Wallets: ${wallets.length}
${wallets.map((w) => `- ${w.type.toUpperCase()} wallet on ${w.chain}: ${w.address.slice(0, 8)}...${w.address.slice(-6)}`).join('\n')}

Supported Networks: ${supportedChains.map((c) => c.name).join(', ')}

Capabilities:
- MPC (Multi-Party Computation) wallets for enhanced security
- X.402 payment protocol support
- Cross-chain transfers
- NFT minting and management
- Enterprise-grade blockchain infrastructure

Available Actions:
- CREATE_X402_PAYMENT: Create HTTP-native payment requests
- CROSSMINT_TRANSFER: Transfer tokens using MPC wallets
- CREATE_CROSSMINT_WALLET: Create new MPC or custodial wallets
- MINT_NFT: Mint NFTs using CrossMint infrastructure
- CHECK_PAYMENT_STATUS: Verify X.402 payment status
[/CROSSMINT WALLET CAPABILITIES]`;

      return {
        text,
        values: {
          crossmintWalletsCount: wallets.length,
          crossmintSupportedChains: supportedChains.map((c) => c.id),
          crossmintCapabilities: [
            'X402_PAYMENTS',
            'MPC_WALLETS',
            'CROSS_CHAIN_TRANSFERS',
            'NFT_INFRASTRUCTURE',
            'ENTERPRISE_BLOCKCHAIN',
          ],
          crossmintWallets: walletSummary,
        },
        data: {
          crossmintWallets: wallets,
          crossmintSupportedChains: supportedChains,
        },
      };
    } catch (error) {
      logger.error('Error in CrossMint wallet provider:', error);

      return {
        text: '[CROSSMINT WALLET]\nCrossMint wallet service temporarily unavailable\n[/CROSSMINT WALLET]',
        values: {
          crossmintWalletsCount: 0,
          crossmintError: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  },
};
