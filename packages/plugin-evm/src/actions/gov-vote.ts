import {
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  elizaLogger,
  ActionExample,
  type Action,
} from '@elizaos/core';
import { type WalletProvider, initWalletProvider } from '../providers/wallet';
import { voteTemplate } from '../templates';
import type { VoteParams, SupportedChain, Transaction } from '../types';
import governorArtifacts from '../contracts/artifacts/OZGovernor.json';
import { type ByteArray, type Hex, encodeFunctionData, type Address } from 'viem';

export { voteTemplate };

export class VoteAction {
  constructor(private walletProvider: WalletProvider) {
    this.walletProvider = walletProvider;
  }

  async vote(params: VoteParams): Promise<Transaction> {
    const walletClient = this.walletProvider.getWalletClient(params.chain);

    if (!walletClient.account) {
      throw new Error('Wallet account is not available');
    }

    const proposalId = BigInt(params.proposalId.toString());
    const support = BigInt(params.support.toString());

    const txData = encodeFunctionData({
      abi: governorArtifacts.abi,
      functionName: 'castVote',
      args: [proposalId, support],
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

export const voteAction = {
  name: 'vote',
  description: 'Vote for a DAO governance proposal',
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
      if (!options.chain || !options.governor || !options.proposalId || !options.support) {
        throw new Error('Missing required parameters for vote');
      }

      // Convert options to VoteParams
      const voteParams: VoteParams = {
        chain: options.chain as SupportedChain,
        governor: options.governor as Address,
        proposalId: String(options.proposalId),
        support: Number(options.support),
      };

      const walletProvider = await initWalletProvider(runtime);
      const action = new VoteAction(walletProvider);
      const voteResult = await action.vote(voteParams);

      // Create workflow context for chained actions
      const workflowContext = {
        chain: voteParams.chain,
        governor: voteParams.governor,
        proposalId: voteParams.proposalId,
        support: voteParams.support,
        hash: voteResult.hash,
      };

      // Determine vote type for messaging
      const voteTypeMap: Record<number, string> = {
        0: 'AGAINST',
        1: 'FOR',
        2: 'ABSTAIN',
      };
      const voteType = voteTypeMap[voteParams.support] || 'UNKNOWN';

      // Determine next suggested action based on context
      let nextSuggestedAction = '';
      let contextualMessage = `Successfully cast ${voteType} vote on proposal ${voteParams.proposalId}\nTransaction Hash: ${voteResult.hash}`;

      // If this is part of a governance workflow, suggest next steps
      if (_state?.workflowId) {
        switch (_state.currentStep) {
          case 'governance-participation':
            nextSuggestedAction = 'EVM_GOVERNANCE_QUEUE';
            contextualMessage +=
              '\n\nVote cast successfully. If the proposal passes, I can help queue it for execution.';
            break;
          case 'multi-proposal-voting':
            nextSuggestedAction = 'EVM_GOVERNANCE_VOTE';
            contextualMessage +=
              '\n\nVote cast. Ready to vote on the next proposal in your governance workflow.';
            break;
          case 'dao-coordination':
            nextSuggestedAction = 'GOVERNANCE_SUMMARY';
            contextualMessage +=
              '\n\nYour vote has been recorded. I can provide a summary of your governance participation.';
            break;
        }
      } else {
        // Suggest common next actions for standalone votes
        contextualMessage +=
          '\n\nYour governance participation is recorded. You could:\n- Monitor proposal progress\n- Queue the proposal if it passes\n- Participate in other governance activities';
      }

      if (callback) {
        callback({
          text: contextualMessage,
          content: {
            success: true,
            hash: voteResult.hash,
            proposalId: voteParams.proposalId,
            voteType,
            governor: voteParams.governor,
            chain: voteParams.chain,
            workflowContext,
            nextSuggestedAction,
            actionType: 'EVM_GOVERNANCE_VOTE',
          },
        });

        // Create memory for workflow continuation
        if (_state?.workflowId) {
          await runtime.createMemory(
            {
              entityId: runtime.agentId,
              roomId: _message.roomId,
              agentId: runtime.agentId,
              content: {
                text: `Governance vote completed in workflow ${_state.workflowId}: ${voteType} vote on proposal ${voteParams.proposalId}`,
                workflowId: _state.workflowId,
                actionCompleted: 'vote',
                voteDetails: workflowContext,
                nextAction: nextSuggestedAction,
              },
            },
            'workflow',
          );
        }
      }

      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error in vote handler:', errorMessage);
      if (callback) {
        callback({ text: `Error: ${errorMessage}` });
      }
      return false;
    }
  },
  template: voteTemplate,
  validate: async (runtime: IAgentRuntime) => {
    const privateKey = runtime.getSetting('EVM_PRIVATE_KEY');
    return typeof privateKey === 'string' && privateKey.startsWith('0x');
  },
  examples: [
    // Multi-action: Vote + Queue workflow
    [
      {
        name: '{{user}}',
        content: {
          text: 'I want to participate in governance. Vote FOR the treasury proposal, then help me queue it if it passes',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll vote FOR the treasury proposal and queue it for execution if it passes.",
          thought: 'Complete governance participation: cast my vote to support the proposal, then monitor results and queue for execution if approved. This ensures full follow-through on governance decisions.',
          actions: ['EVM_GOVERNANCE_VOTE', 'EVM_GOVERNANCE_QUEUE'],
        },
      },
    ],
    // Multi-action: Vote on multiple proposals
    [
      {
        name: '{{user}}',
        content: {
          text: 'I need to vote on multiple proposals today. Start with voting FOR proposal 15, then AGAINST proposal 16',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll vote FOR proposal 15 and AGAINST proposal 16 as part of your governance participation session.",
          thought: "Batch governance voting: user has multiple proposals to vote on with different positions. I'll execute their voting strategy across multiple proposals efficiently.",
          actions: ['EVM_GOVERNANCE_VOTE', 'EVM_GOVERNANCE_VOTE'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Vote yes on proposal 123 on the governor at 0x1234567890123456789012345678901234567890 on Ethereum',
          action: 'EVM_GOVERNANCE_VOTE',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll cast a FOR vote on proposal 123. This shows your support for the proposal and contributes to the governance process.",
          action: 'EVM_GOVERNANCE_VOTE',
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Vote no on proposal 456 on the governor at 0xabcdef1111111111111111111111111111111111 on Ethereum',
          action: 'EVM_GOVERNANCE_VOTE',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll cast an AGAINST vote on proposal 456. Your opposition will be recorded in the governance system.",
          action: 'EVM_GOVERNANCE_VOTE',
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Abstain from voting on proposal 789 on the governor at 0x0000111122223333444455556666777788889999 on Ethereum',
          action: 'EVM_GOVERNANCE_VOTE',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll cast an ABSTAIN vote on proposal 789. This shows participation while remaining neutral on the proposal outcome.",
          action: 'EVM_GOVERNANCE_VOTE',
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Vote FOR the protocol upgrade and then monitor for queuing',
          action: 'EVM_GOVERNANCE_VOTE',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll vote FOR the protocol upgrade and monitor the results to help queue it for execution if it passes.",
          thought: "Strategic governance: supporting protocol upgrades requires follow-through to ensure implementation. After voting, I'll monitor results and facilitate the next steps.",
          action: 'EVM_GOVERNANCE_VOTE',
          workflowContext: {
            step: 'governance-participation',
            goal: 'complete-governance-cycle',
          },
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Cast multiple votes on today\'s governance proposals with my voting strategy',
          action: 'EVM_GOVERNANCE_VOTE',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll execute your voting strategy across today's governance proposals. This ensures consistent participation in all active governance decisions.",
          thought: "Systematic governance participation: user has a voting strategy to apply across multiple proposals. I'll execute their position consistently across all relevant proposals.",
          action: 'EVM_GOVERNANCE_VOTE',
          workflowContext: {
            step: 'multi-proposal-voting',
            goal: 'batch-governance-participation',
          },
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Vote cast successfully! Hash: 0xabc123',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Excellent! Your FOR vote has been recorded. I can help you monitor the proposal progress and queue it for execution if it passes.',
          workflowSuggestion: {
            nextActions: ['EVM_GOVERNANCE_QUEUE', 'MONITOR_PROPOSAL'],
            context: 'post-vote',
          },
        },
      },
    ],
  ],
  similes: ['VOTE', 'GOVERNANCE_VOTE', 'CAST_VOTE'],
}; // TODO: add more examples
