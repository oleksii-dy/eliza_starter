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
import { queueProposalTemplate } from '../templates';
import type { QueueProposalParams, SupportedChain, Transaction } from '../types';
import governorArtifacts from '../contracts/artifacts/OZGovernor.json';
import {
  type ByteArray,
  type Hex,
  encodeFunctionData,
  keccak256,
  stringToHex,
  type Address,
} from 'viem';

export { queueProposalTemplate };

export class QueueAction {
  constructor(private walletProvider: WalletProvider) {
    this.walletProvider = walletProvider;
  }

  async queue(params: QueueProposalParams): Promise<Transaction> {
    const walletClient = this.walletProvider.getWalletClient(params.chain);

    if (!walletClient.account) {
      throw new Error('Wallet account is not available');
    }

    const descriptionHash = keccak256(stringToHex(params.description));

    const txData = encodeFunctionData({
      abi: governorArtifacts.abi,
      functionName: 'queue',
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

export const queueAction = {
  name: 'queue',
  description: 'Queue a DAO governance proposal for execution',
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
        !options.targets ||
        !options.values ||
        !options.calldatas ||
        !options.description
      ) {
        throw new Error('Missing required parameters for queue proposal');
      }

      // Convert options to QueueProposalParams
      const queueParams: QueueProposalParams = {
        chain: options.chain as SupportedChain,
        governor: options.governor as Address,
        targets: options.targets as Address[],
        values: (options.values as string[]).map((v) => BigInt(v)),
        calldatas: options.calldatas as `0x${string}`[],
        description: String(options.description),
      };

      const walletProvider = await initWalletProvider(runtime);
      const action = new QueueAction(walletProvider);
      const result = await action.queue(queueParams);

      if (callback) {
        callback({
          text: `Successfully queued proposal on ${queueParams.chain}. Transaction hash: ${result.hash}`,
        });
      }

      return {
        data: {
          hash: result.hash,
          from: result.from,
          to: result.to,
          chainId: result.chainId,
        },
        values: {
          success: true,
          transactionHash: result.hash,
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error in queue handler:', errorMessage);
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
    // Multi-action: Queue + Execute workflow
    [
      {
        name: '{{user}}',
        content: {
          text: 'Queue proposal 123 and execute it after the timelock',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll queue proposal 123 and execute it after the timelock period expires.",
          thought: "Complete governance implementation: first queue the approved proposal for the timelock period, then execute it to implement the changes. This follows the full governance security process.",
          actions: ['EVM_GOVERNANCE_QUEUE', 'EVM_GOVERNANCE_EXECUTE'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Queue proposal 123 on the governor at 0x1234567890123456789012345678901234567890 on Ethereum',
          action: 'EVM_GOVERNANCE_QUEUE',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll queue proposal 123 for execution. This starts the timelock period before the proposal can be implemented.",
          action: 'EVM_GOVERNANCE_QUEUE',
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'The proposal passed! Queue it for execution and prepare for implementation',
          action: 'EVM_GOVERNANCE_QUEUE',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll queue the passed proposal for execution. This begins the security timelock period before the changes can be implemented.",
          thought: "Governance security step: proposal passed voting, now needs to be queued for the mandatory timelock period. This gives the community time to review before execution.",
          action: 'EVM_GOVERNANCE_QUEUE',
          workflowContext: {
            step: 'governance-queue',
            nextAction: 'await-timelock',
          },
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Queue multiple approved proposals: 15, 16, and 17',
          action: 'EVM_GOVERNANCE_QUEUE',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll queue proposals 15, 16, and 17 for execution. This batch queuing prepares all approved proposals for implementation.",
          thought: "Batch governance processing: multiple proposals passed and need to be queued. I'll queue them all to start their timelock periods for orderly implementation.",
          action: 'EVM_GOVERNANCE_QUEUE',
          workflowContext: {
            step: 'batch-queue',
            proposalIds: ['15', '16', '17'],
          },
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Queue the treasury proposal and notify the community about execution timing',
          action: 'EVM_GOVERNANCE_QUEUE',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll queue the treasury proposal and provide execution timing information for community awareness.",
          thought: "Community coordination: treasury proposals affect everyone, so queuing needs to be followed by clear communication about when execution will occur.",
          action: 'EVM_GOVERNANCE_QUEUE',
          workflowContext: {
            step: 'community-notification',
            importance: 'treasury',
          },
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Proposal queued! Hash: 0xghi789. When can it be executed?',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Proposal successfully queued! It can be executed after the timelock period (typically 2-7 days). I can monitor the timelock and execute it when ready.',
          workflowSuggestion: {
            nextActions: ['MONITOR_TIMELOCK', 'EVM_GOVERNANCE_EXECUTE'],
            context: 'post-queue',
          },
        },
      },
    ],
  ],
  similes: ['QUEUE_PROPOSAL', 'GOVERNANCE_QUEUE'],
}; // TODO: add more examples
