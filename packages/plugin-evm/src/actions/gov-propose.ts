import {
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  type ActionResult,
  elizaLogger,
  ActionExample,
  type Action,
} from '@elizaos/core';
import { encodeAbiParameters, parseAbiParameters } from 'viem';
import { type WalletProvider, initWalletProvider } from '../providers/wallet';
import { proposeTemplate } from '../templates';
import type { ProposeProposalParams, SupportedChain, Transaction } from '../types';
import governorArtifacts from '../contracts/artifacts/OZGovernor.json';
import { type ByteArray, type Hex, encodeFunctionData, type Address } from 'viem';

export { proposeTemplate };

export class ProposeAction {
  constructor(private walletProvider: WalletProvider) {
    this.walletProvider = walletProvider;
  }

  async propose(params: ProposeProposalParams): Promise<Transaction> {
    const walletClient = this.walletProvider.getWalletClient(params.chain);

    if (!walletClient.account) {
      throw new Error('Wallet account is not available');
    }

    const txData = encodeFunctionData({
      abi: governorArtifacts.abi,
      functionName: 'propose',
      args: [params.targets, params.values, params.calldatas, params.description],
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

export const proposeAction = {
  name: 'propose',
  description: 'Execute a DAO governance proposal and enable chaining with voting actions, status checks, or related governance workflows',
  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
    options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
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
        throw new Error('Missing required parameters for proposal');
      }

      // Validate array lengths match
      const targets = options.targets as Address[];
      const values = options.values as string[];
      const calldatas = options.calldatas as `0x${string}`[];

      if (targets.length !== values.length || targets.length !== calldatas.length) {
        throw new Error('targets, values, and calldatas arrays must have the same length');
      }

      // Convert options to ProposeProposalParams
      const proposeParams: ProposeProposalParams = {
        chain: options.chain as SupportedChain,
        governor: options.governor as Address,
        targets: options.targets as Address[],
        values: (options.values as string[]).map((v) => BigInt(v)),
        calldatas: options.calldatas as `0x${string}`[],
        description: String(options.description),
      };

      const walletProvider = await initWalletProvider(runtime);
      const action = new ProposeAction(walletProvider);
      const result = await action.propose(proposeParams);

      if (callback) {
        await callback({
          text: `Successfully submitted proposal to governor ${proposeParams.governor}\nTransaction hash: ${result.hash}\n\nYou can now vote on this proposal or check its status once it becomes active.`,
          content: {
            success: true,
            proposalData: {
              targets: proposeParams.targets,
              values: proposeParams.values,
              calldatas: proposeParams.calldatas,
              description: proposeParams.description,
              governor: proposeParams.governor,
              chain: proposeParams.chain,
              transactionHash: result.hash,
            },
          },
        });
      }

      return {
        data: {
          actionName: 'propose',
          transactionHash: result.hash,
          governor: proposeParams.governor,
          chain: proposeParams.chain,
          targets: proposeParams.targets,
          values: proposeParams.values,
          calldatas: proposeParams.calldatas,
          description: proposeParams.description,
          from: result.from,
          to: result.to,
          logs: result.logs,
        },
        values: {
          success: true,
          transactionHash: result.hash,
          proposalCreated: true,
          governorAddress: proposeParams.governor,
          chainName: proposeParams.chain,
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error in propose handler:', errorMessage);
      if (callback) {
        await callback({ text: `Error creating proposal: ${errorMessage}` });
      }
      return {
        data: {
          actionName: 'propose',
          error: errorMessage,
          governor: options?.governor as string | undefined,
          chain: options?.chain as string | undefined,
        },
        values: {
          success: false,
          error: errorMessage,
        },
      };
    }
  },
  template: proposeTemplate,
  validate: async (runtime: IAgentRuntime) => {
    const privateKey = runtime.getSetting('EVM_PRIVATE_KEY');
    return typeof privateKey === 'string' && privateKey.startsWith('0x');
  },
  examples: [
    // Multi-action: Propose + Vote workflow
    [
      {
        name: '{{user}}',
        content: {
          text: 'Create a proposal to update the fee to 5% and then vote for it',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'I\'ll create the fee update proposal and then cast a vote for it.',
          thought: "Complete governance participation: create the proposal first to initiate the democratic process, then cast my vote to support the change. This demonstrates full engagement in governance.",
          actions: ['EVM_GOVERNANCE_PROPOSE', 'EVM_GOVERNANCE_VOTE'],
        },
      },
    ],
    // Multi-action: Check + Propose workflow  
    [
      {
        name: '{{user}}',
        content: {
          text: 'Check the current proposals and create a new one if none are pending',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'I\'ll check the current proposal status and create a new one if needed.',
          thought: "Governance oversight workflow: first review existing proposals to avoid duplication, then create new proposal if the issue hasn't been addressed. This ensures efficient governance.",
          actions: ['CHECK_PROPOSALS', 'EVM_GOVERNANCE_PROPOSE'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Propose transferring 1e18 tokens on the governor at 0x1234567890123456789012345678901234567890 on Ethereum',
          action: 'EVM_GOVERNANCE_PROPOSE',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'I\'ll submit your governance proposal to transfer tokens on Ethereum.',
          action: 'EVM_GOVERNANCE_PROPOSE',
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'I want to propose updating the protocol parameters. Create the proposal and help me vote on it',
          action: 'EVM_GOVERNANCE_PROPOSE',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'I\'ll create the protocol parameter update proposal and then help you vote on it once it becomes active.',
          thought: "Full governance workflow: proposing protocol changes requires creating the proposal first, then participating in the voting process. This ensures proper democratic governance.",
          action: 'EVM_GOVERNANCE_PROPOSE',
          workflowContext: {
            step: 'governance-initiation',
            nextAction: 'vote-on-proposal',
          },
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Create a treasury funding proposal, then coordinate with the community to vote',
          action: 'EVM_GOVERNANCE_PROPOSE',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'I\'ll create the treasury funding proposal and then help coordinate community voting efforts.',
          thought: "Community governance coordination: create the proposal first to define the funding request, then organize community support for democratic approval.",
          action: 'EVM_GOVERNANCE_PROPOSE',
          workflowContext: {
            step: 'community-governance',
            goal: 'coordinate-voting',
          },
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Submit a governance proposal for the new tokenomics model',
          action: 'EVM_GOVERNANCE_PROPOSE',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'I\'ll submit the tokenomics model proposal to governance. This is a significant protocol change that will require community discussion and voting.',
          thought: "Major protocol governance: tokenomics changes are critical proposals that need careful community consideration. I'll submit it properly formatted for governance review.",
          action: 'EVM_GOVERNANCE_PROPOSE',
          workflowContext: {
            step: 'protocol-governance',
            importance: 'critical',
          },
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Proposal submitted! Hash: 0xabc123. What happens next?',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Great! Your proposal is now submitted to governance. Next steps: 1) Wait for voting period to begin 2) Rally community support 3) Cast your vote 4) Monitor results. I can help with all of these.',
          workflowSuggestion: {
            nextActions: ['EVM_GOVERNANCE_VOTE', 'MONITOR_PROPOSAL', 'COMMUNITY_OUTREACH'],
            context: 'post-proposal',
          },
        },
      },
    ],
  ],
  similes: ['PROPOSE', 'GOVERNANCE_PROPOSE'],
}; // TODO: add more examples
