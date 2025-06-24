import {
  type Action,
  type ActionResult,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  ModelType,
  type State,
  parseKeyValueXml,
  composePromptFromState,
  elizaLogger,
} from '@elizaos/core';
import {
  type Hex,
  formatEther,
  parseEther,
  parseAbi,
  encodeFunctionData,
  parseUnits,
  type Address,
} from 'viem';
import { getToken } from '@lifi/sdk';

import { type WalletProvider, initWalletProvider } from '../providers/wallet';
import { transferTemplate } from '../templates';
import type { Transaction, TransferParams } from '../types';

// Exported for tests
export class TransferAction {
  constructor(private walletProvider: WalletProvider) {}

  async transfer(params: TransferParams): Promise<Transaction> {
    const walletClient = this.walletProvider.getWalletClient(params.fromChain);

    if (!walletClient.account) {
      throw new Error('Wallet account is not available');
    }

    const chainConfig = this.walletProvider.getChainConfigs(params.fromChain);

    try {
      let hash: Hex;
      let to: Address;
      let value: bigint;
      let data: Hex;

      // Check if this is a token transfer or native transfer
      if (
        params.token &&
        params.token !== 'null' &&
        params.token.toUpperCase() !== chainConfig.nativeCurrency.symbol.toUpperCase()
      ) {
        // This is an ERC20 token transfer
        console.log(
          `Processing ${params.token} token transfer of ${params.amount} to ${params.toAddress}`,
        );

        // First, resolve the token address
        const tokenAddress = await this.resolveTokenAddress(params.token, chainConfig.id);

        // Check if token was resolved properly
        if (tokenAddress === params.token && !tokenAddress.startsWith('0x')) {
          throw new Error(
            `Token ${params.token} not found on ${params.fromChain}. Please check the token symbol.`,
          );
        }

        // Get token decimals
        const decimalsAbi = parseAbi(['function decimals() view returns (uint8)']);
        const decimals = await this.walletProvider.getPublicClient(params.fromChain).readContract({
          address: tokenAddress as Address,
          abi: decimalsAbi,
          functionName: 'decimals',
        });

        // Validate amount before parsing
        if (!params.amount || isNaN(parseFloat(params.amount))) {
          throw new Error('Invalid amount for token transfer');
        }

        // Parse amount with correct decimals
        const amountInTokenUnits = parseUnits(params.amount, decimals);

        // Encode the ERC20 transfer function
        const transferData = encodeFunctionData({
          abi: parseAbi(['function transfer(address to, uint256 amount)']),
          functionName: 'transfer',
          args: [params.toAddress, amountInTokenUnits],
        });

        // For token transfers, we send to the token contract with 0 ETH value
        to = tokenAddress as Address;
        value = 0n;
        data = transferData;
      } else {
        // This is a native ETH transfer
        console.log(
          `Processing native ${chainConfig.nativeCurrency.symbol} transfer of ${params.amount} to ${params.toAddress}`,
        );

        // Validate amount before parsing
        if (!params.amount || isNaN(parseFloat(params.amount))) {
          throw new Error('Invalid amount for native transfer');
        }

        to = params.toAddress;
        value = parseEther(params.amount);
        data = params.data || ('0x' as Hex);
      }

      const transactionParams = {
        account: walletClient.account,
        to,
        value,
        data,
        chain: walletClient.chain,
      };

      hash = await walletClient.sendTransaction(transactionParams);
      console.log(`Transaction sent successfully. Hash: ${hash}`);

      return {
        hash,
        from: walletClient.account.address,
        to: params.toAddress, // Always return the recipient address, not the contract
        value,
        data,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Transfer failed: ${errorMessage}`);
    }
  }

  private async resolveTokenAddress(
    tokenSymbolOrAddress: string,
    chainId: number,
  ): Promise<string> {
    // If it's already a valid address (starts with 0x and is 42 chars), return as is
    if (tokenSymbolOrAddress.startsWith('0x') && tokenSymbolOrAddress.length === 42) {
      return tokenSymbolOrAddress;
    }

    // If it's the zero address (native token), return as is
    if (tokenSymbolOrAddress === '0x0000000000000000000000000000000000000000') {
      return tokenSymbolOrAddress;
    }

    try {
      // Use LiFi SDK to resolve token symbol to address
      const token = await getToken(chainId, tokenSymbolOrAddress);
      return token.address;
    } catch (error) {
      elizaLogger.error(
        `Failed to resolve token ${tokenSymbolOrAddress} on chain ${chainId}:`,
        error,
      );
      // If LiFi fails, return original value and let downstream handle the error
      return tokenSymbolOrAddress;
    }
  }
}

const buildTransferDetails = async (
  state: State,
  _message: Memory,
  runtime: IAgentRuntime,
  wp: WalletProvider,
): Promise<TransferParams> => {
  const chains = wp.getSupportedChains();

  // Add balances to state for better context in template
  const balances = await wp.getWalletBalances();
  state.chainBalances = Object.entries(balances)
    .map(([chain, balance]) => {
      const chainConfig = wp.getChainConfigs(chain as any);
      return `${chain}: ${balance} ${chainConfig.nativeCurrency.symbol}`;
    })
    .join(', ');

  state = await runtime.composeState(_message, ['RECENT_MESSAGES'], true);
  state.supportedChains = chains.join(' | ');

  const context = composePromptFromState({
    state,
    template: transferTemplate,
  });

  const xmlResponse = await runtime.useModel(ModelType.TEXT_SMALL, {
    prompt: context,
  });

  const parsedXml = parseKeyValueXml(xmlResponse);

  if (!parsedXml) {
    throw new Error('Failed to parse XML response from LLM for transfer details.');
  }

  const transferDetails = parsedXml as unknown as TransferParams;

  // Validate required fields
  if (!transferDetails.fromChain) {
    throw new Error(
      `Missing source chain. Please specify which chain to transfer from. Available chains: ${chains.toString()}`,
    );
  }

  if (!transferDetails.toAddress) {
    throw new Error('Missing recipient address. Please specify where to send the tokens.');
  }

  if (!transferDetails.amount) {
    throw new Error('Missing transfer amount. Please specify how much to transfer.');
  }

  // Validate amount is a valid number
  const amountNum = parseFloat(transferDetails.amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    throw new Error('Invalid transfer amount. Amount must be a positive number.');
  }

  // Normalize chain name to lowercase to handle case sensitivity issues
  const normalizedChainName = transferDetails.fromChain.toLowerCase();

  // Check if the normalized chain name exists in the supported chains
  const existingChain = wp.chains[normalizedChainName];

  if (!existingChain) {
    throw new Error(
      `The chain ${
        transferDetails.fromChain
      } not configured yet. Add the chain or choose one from configured: ${chains.toString()}`,
    );
  }

  // Update the transferDetails with the normalized chain name
  transferDetails.fromChain = normalizedChainName as any;

  return transferDetails;
};

export const transferAction: Action = {
  name: 'EVM_TRANSFER_TOKENS',
  description:
    'Transfers native tokens (ETH, BNB, etc.) or ERC20 tokens (USDC, USDT, etc.) between addresses on the same chain. Returns transaction details and suggests next actions for DeFi workflows like swapping or bridging.',
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    _options: any,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    if (!state) {
      state = (await runtime.composeState(message)) as State;
    }

    const walletProvider = await initWalletProvider(runtime);
    const action = new TransferAction(walletProvider);

    // Compose transfer context
    const paramOptions = await buildTransferDetails(state, message, runtime, walletProvider);

    let nextSuggestedAction = '';

    try {
      const transferResp = await action.transfer(paramOptions);

      // Determine token symbol for display
      const chainConfig = walletProvider.getChainConfigs(paramOptions.fromChain);
      const tokenSymbol =
        paramOptions.token &&
        paramOptions.token !== 'null' &&
        paramOptions.token.toUpperCase() !== chainConfig.nativeCurrency.symbol.toUpperCase()
          ? paramOptions.token.toUpperCase()
          : chainConfig.nativeCurrency.symbol;

      if (callback) {
        // Create workflow context for chained actions
        const workflowContext = {
          chain: paramOptions.fromChain,
          token: tokenSymbol,
          amount: paramOptions.amount,
          recipient: transferResp.to,
          hash: transferResp.hash,
        };

        // Determine next suggested action based on context
        let contextualMessage = `Successfully transferred ${paramOptions.amount} ${tokenSymbol} to ${paramOptions.toAddress}\nTransaction Hash: ${transferResp.hash}`;

        // If this is part of a workflow, suggest next steps
        if (state?.workflowId) {
          switch (state.currentStep) {
            case 'prepare-swap':
              nextSuggestedAction = 'EVM_SWAP_TOKENS';
              contextualMessage +=
                '\n\nFunds are ready for swapping. Would you like me to proceed with the swap?';
              break;
            case 'prepare-bridge':
              nextSuggestedAction = 'EVM_BRIDGE_TOKENS';
              contextualMessage +=
                '\n\nFunds are ready for bridging. Would you like me to bridge them to another chain?';
              break;
            case 'consolidate-funds':
              nextSuggestedAction = 'EVM_SWAP_TOKENS';
              contextualMessage +=
                '\n\nFunds consolidated successfully. Ready for DeFi operations or portfolio rebalancing.';
              break;
          }
        } else {
          // Suggest common next actions for standalone transfers
          if (tokenSymbol === 'ETH' && parseFloat(paramOptions.amount) > 0.1) {
            contextualMessage +=
              '\n\nWith this amount of ETH, you could:\n- Swap for other tokens\n- Bridge to other chains\n- Use for DeFi operations';
          } else if (['USDC', 'USDT', 'DAI'].includes(tokenSymbol)) {
            contextualMessage +=
              '\n\nWith stablecoins ready, you could:\n- Swap for other assets\n- Provide liquidity\n- Lend on DeFi platforms';
          }
        }

        callback({
          text: contextualMessage,
          content: {
            success: true,
            hash: transferResp.hash,
            amount: paramOptions.amount,
            token: tokenSymbol,
            recipient: transferResp.to,
            chain: paramOptions.fromChain,
            workflowContext,
            nextSuggestedAction,
            actionType: 'EVM_TRANSFER_TOKENS',
          },
        });

        // Create memory for workflow continuation
        if (state?.workflowId) {
          await runtime.createMemory(
            {
              entityId: runtime.agentId,
              roomId: message.roomId,
              agentId: runtime.agentId,
              content: {
                text: `Transfer completed in workflow ${state.workflowId}: ${paramOptions.amount} ${tokenSymbol} transferred`,
                workflowId: state.workflowId,
                actionCompleted: 'transfer',
                transferDetails: workflowContext,
                nextAction: nextSuggestedAction,
              },
            },
            'workflow',
          );
        }
      }
      return {
        data: {
          actionName: 'EVM_TRANSFER_TOKENS',
          hash: transferResp.hash,
          amount: paramOptions.amount,
          token: tokenSymbol,
          recipient: transferResp.to,
          chain: paramOptions.fromChain,
          workflowId: state?.workflowId,
          nextSuggestedAction,
        },
        values: {
          success: true,
          transactionHash: transferResp.hash,
          transferredAmount: paramOptions.amount,
          tokenSymbol,
          recipientAddress: transferResp.to,
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error during token transfer:', errorMessage);
      if (callback) {
        callback({
          text: `Error transferring tokens: ${errorMessage}`,
          content: { error: errorMessage },
        });
      }
      return {
        data: {
          actionName: 'EVM_TRANSFER_TOKENS',
          error: errorMessage,
          attemptedAmount: paramOptions?.amount,
          attemptedToken: paramOptions?.token,
          attemptedChain: paramOptions?.fromChain,
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
    // Multi-action: Transfer + Swap workflow
    [
      {
        name: '{{user}}',
        content: {
          text: 'Transfer 1 ETH to my trading wallet and swap it for USDC',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll transfer 1 ETH to your trading wallet first, then swap it for USDC.",
          thought: "The user wants to move ETH and then swap it. I need to transfer first to get the funds positioned correctly, then execute the swap. This is a common DeFi workflow pattern.",
          actions: ['EVM_TRANSFER_TOKENS', 'EVM_SWAP_TOKENS'],
        },
      },
    ],
    // Multi-action: Transfer + Bridge workflow
    [
      {
        name: '{{user}}',
        content: {
          text: 'Send my USDC to the bridge wallet and bridge to Polygon',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll transfer your USDC to the bridge wallet and then bridge it to Polygon for lower fees.",
          thought: "This requires two steps: first consolidate USDC to a bridge wallet, then execute the cross-chain bridge. The transfer prepares the funds for the bridge operation.",
          actions: ['EVM_TRANSFER_TOKENS', 'EVM_BRIDGE_TOKENS'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Send 100 USDC to my DeFi wallet 0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll transfer 100 USDC to your DeFi wallet. This will prepare your funds for DeFi operations like swapping, lending, or providing liquidity.",
          actions: ['EVM_TRANSFER_TOKENS'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'I want to do some DeFi farming. First transfer 0.5 ETH to prepare for swapping',
          action: 'EVM_TRANSFER_TOKENS',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll transfer 0.5 ETH to prepare for your DeFi farming strategy. After the transfer, I can help you swap it for the farming tokens you need.",
          thought: "User is starting a DeFi farming workflow. The transfer is the first step to position funds correctly before swapping for farming tokens. I should remember this context for the next action.",
          action: 'EVM_TRANSFER_TOKENS',
          workflowContext: {
            step: 'prepare-swap',
            goal: 'defi-farming',
          },
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Transfer my ETH and then bridge it to Base for lower fees',
          action: 'EVM_TRANSFER_TOKENS',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll transfer your ETH first, then bridge it to Base to take advantage of lower transaction fees. This is a great strategy for frequent transactions.",
          thought: "This is a cross-chain fee optimization strategy. First transfer to consolidate, then bridge to a cheaper L2. The transfer sets up the bridge operation.",
          action: 'EVM_TRANSFER_TOKENS',
          workflowContext: {
            step: 'prepare-bridge',
            destination: 'base',
          },
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Consolidate my funds by transferring from multiple wallets, then swap for stablecoins',
          action: 'EVM_TRANSFER_TOKENS',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll help you consolidate funds from multiple wallets and then swap them for stablecoins. This is a good strategy for portfolio management and risk reduction.",
          thought: "Portfolio rebalancing workflow: consolidate scattered funds first, then convert to stablecoins for risk management. The transfer aggregates assets before the swap.",
          action: 'EVM_TRANSFER_TOKENS',
          workflowContext: {
            step: 'consolidate-funds',
            nextAction: 'swap-to-stablecoins',
          },
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Transfer complete! Transaction hash: 0xabc123',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Great! Transfer completed successfully. With your ETH ready, you could: 1) Swap for other tokens 2) Bridge to other chains 3) Use for DeFi operations. What would you like to do next?',
          workflowSuggestion: {
            nextActions: ['EVM_SWAP_TOKENS', 'EVM_BRIDGE_TOKENS'],
            context: 'post-transfer',
          },
        },
      },
    ],
  ],
  similes: ['EVM_TRANSFER', 'EVM_SEND_TOKENS', 'EVM_TOKEN_TRANSFER', 'EVM_MOVE_TOKENS'],
};
