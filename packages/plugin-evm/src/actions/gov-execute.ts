import {
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  elizaLogger,
  ActionExample,
  type Action,
} from '@elizaos/core';
import { encodeAbiParameters, parseAbiParameters } from 'viem';
import { type WalletProvider, initWalletProvider } from '../providers/wallet';
import { executeProposalTemplate } from '../templates';
import type { ExecuteProposalParams, SupportedChain, Transaction } from '../types';
import governorArtifacts from '../contracts/artifacts/OZGovernor.json';
import {
  type ByteArray,
  type Hex,
  type Address,
  encodeFunctionData,
  keccak256,
  stringToHex,
} from 'viem';

export { executeProposalTemplate };

export class ExecuteAction {
  constructor(private walletProvider: WalletProvider) {
    this.walletProvider = walletProvider;
  }

  async execute(params: ExecuteProposalParams): Promise<Transaction> {
    const walletClient = this.walletProvider.getWalletClient(params.chain);

    if (!walletClient.account) {
      throw new Error('Wallet account is not available');
    }

    const descriptionHash = keccak256(stringToHex(params.description));

    const txData = encodeFunctionData({
      abi: governorArtifacts.abi,
      functionName: 'execute',
      args: [params.targets, params.values, params.calldatas, descriptionHash],
    });

    try {
      const chainConfig = this.walletProvider.getChainConfigs(params.chain);

      // Log current block before sending transaction
      const publicClient = this.walletProvider.getPublicClient(params.chain);

      const hash = await walletClient.sendTransaction({
        account: walletClient.account,
        to: params.governor,
        value: BigInt(0),
        data: txData as Hex,
        chain: chainConfig,
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
      });

      return {
        hash,
        from: walletClient.account?.address as `0x${string}`,
        to: params.governor,
        value: BigInt(0),
        data: txData as Hex,
        chainId: this.walletProvider.getChainConfigs(params.chain).id,
        logs: receipt.logs,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Vote failed: ${errorMessage}`);
    }
  }
}

export const executeAction = {
  name: 'execute',
  description: 'Execute a DAO governance proposal',
  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
    options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ) => {
    try {
      // Ensure options is provided
      if (!options) {
        throw new Error('Options parameter is required');
      }

      // Validate required fields
      if (
        !options.chain ||
        !options.governor ||
        !options.proposalId ||
        !options.targets ||
        !options.values ||
        !options.calldatas ||
        !options.description
      ) {
        throw new Error('Missing required parameters for execute proposal');
      }

      // Convert options to ExecuteProposalParams
      const executeParams: ExecuteProposalParams = {
        chain: options.chain as SupportedChain,
        governor: options.governor as Address,
        proposalId: String(options.proposalId),
        targets: options.targets as Address[],
        values: (options.values as string[]).map((v) => BigInt(v)),
        calldatas: options.calldatas as `0x${string}`[],
        description: String(options.description),
      };

      const walletProvider = await initWalletProvider(runtime);
      const action = new ExecuteAction(walletProvider);
      const result = await action.execute(executeParams);

      if (callback) {
        callback({
          text: `Successfully executed proposal ${executeParams.proposalId} on ${executeParams.chain}. Transaction hash: ${result.hash}`,
        });
      }

      return {
        data: {
          hash: result.hash,
          from: result.from,
          to: result.to,
          chainId: result.chainId,
          proposalId: executeParams.proposalId,
        },
        values: {
          success: true,
          transactionHash: result.hash,
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error in execute handler:', errorMessage);
      if (callback) {
        callback({ text: `Error: ${errorMessage}` });
      }
      return {
        data: {
          error: errorMessage,
        },
        values: {
          success: false,
          error: errorMessage,
        },
      };
    }
  },
  validate: async (runtime: IAgentRuntime) => {
    const privateKey = runtime.getSetting('EVM_PRIVATE_KEY');
    return typeof privateKey === 'string' && privateKey.startsWith('0x');
  },
  examples: [
    // Multi-action: Execute + Monitor workflow
    [
      {
        name: '{{user}}',
        content: {
          text: 'Execute proposal 123 and monitor the results',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll execute proposal 123 and monitor the transaction results to ensure successful completion.",
          thought: 'Governance execution requires careful monitoring. First execute the proposal, then verify the execution completed successfully and the intended changes took effect.',
          actions: ['EVM_GOVERNANCE_EXECUTE', 'MONITOR_TRANSACTION'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Execute proposal 123 on the governor at 0x1234567890123456789012345678901234567890 on Ethereum',
          action: 'EVM_GOVERNANCE_EXECUTE',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll execute proposal 123 on the Ethereum governor contract. This will implement the approved governance changes.",
          action: 'EVM_GOVERNANCE_EXECUTE',
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'The proposal passed and is queued. Now execute it and verify the changes',
          action: 'EVM_GOVERNANCE_EXECUTE',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll execute the queued proposal and verify that the governance changes have been successfully implemented.",
          thought: 'Final step in governance workflow: execute the queued proposal and confirm the protocol changes are live. This completes the democratic governance process.',
          action: 'EVM_GOVERNANCE_EXECUTE',
          workflowContext: {
            step: 'governance-completion',
            goal: 'implement-changes',
          },
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Execute multiple proposals that are ready: 15, 16, and 17',
          action: 'EVM_GOVERNANCE_EXECUTE',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll execute proposals 15, 16, and 17 in sequence. This batch execution will implement all the approved governance changes efficiently.",
          thought: "Batch governance execution: multiple approved proposals need to be executed. I'll process them sequentially to implement all approved changes.",
          action: 'EVM_GOVERNANCE_EXECUTE',
          workflowContext: {
            step: 'batch-execution',
            proposalIds: ['15', '16', '17'],
          },
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Proposal execution complete! Hash: 0xdef456',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Excellent! Proposal execution completed successfully. The governance changes are now live. I can help you monitor the effects or participate in other governance activities.',
          workflowSuggestion: {
            nextActions: ['MONITOR_GOVERNANCE', 'GOVERNANCE_SUMMARY'],
            context: 'post-execution',
          },
        },
      },
    ],
  ],
  similes: ['EXECUTE_PROPOSAL', 'GOVERNANCE_EXECUTE'],
}; // TODO: add more examples
