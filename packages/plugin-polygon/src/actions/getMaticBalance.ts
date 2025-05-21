import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
  elizaLogger,
} from '@elizaos/core';
import { ethers } from 'ethers';
import { PolygonRpcService } from '../services/PolygonRpcService';
import { initWalletProvider } from '../providers/PolygonWalletProvider';

export const getMaticBalanceAction: Action = {
  name: 'GET_MATIC_BALANCE',
  description: "Gets the MATIC balance for the agent's address on Polygon (L2).",
  validate: async () => true,
  handler: async (runtime: IAgentRuntime, message: Memory, state: State) => {
    const rpcService = runtime.getService<PolygonRpcService>(PolygonRpcService.serviceType);
    if (!rpcService) throw new Error('PolygonRpcService not available');

    try {
      const polygonWalletProvider = await initWalletProvider(runtime);
      if (!polygonWalletProvider) {
        throw new Error(
          'Failed to initialize PolygonWalletProvider - check that PRIVATE_KEY is configured correctly'
        );
      }
      const agentAddress = polygonWalletProvider.getAddress();
      if (!agentAddress) throw new Error('Could not determine agent address from provider');

      logger.info(`Fetching MATIC balance for address: ${agentAddress}`);
      const balanceWei = await rpcService.getBalance(agentAddress, 'L2');
      elizaLogger.info(`Balance: ${balanceWei}`);
      const balanceMatic = ethers.formatEther(balanceWei);
      return {
        text: `Your MATIC balance (${agentAddress}): ${balanceMatic}`,
        actions: ['GET_MATIC_BALANCE'],
        data: {
          address: agentAddress,
          balanceWei: balanceWei.toString(),
          balanceMatic,
        },
      };
    } catch (error) {
      logger.error('Error getting MATIC balance:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const userMessage = errorMessage.includes('private key')
        ? 'There was an issue with the wallet configuration. Please ensure PRIVATE_KEY is correctly set.'
        : `Error retrieving MATIC balance: ${errorMessage}`;

      return {
        text: userMessage,
        success: false,
        actions: ['GET_MATIC_BALANCE'],
        data: { error: errorMessage }, // Added data field for error consistency
      };
    }
  },
  examples: [],
};
