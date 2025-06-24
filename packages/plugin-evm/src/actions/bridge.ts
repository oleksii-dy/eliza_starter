import type { ActionResult, HandlerCallback, IAgentRuntime, Memory, State } from '@elizaos/core';
import {
  type Action,
  composePromptFromState,
  ModelType,
  parseKeyValueXml,
  elizaLogger,
  logger,
} from '@elizaos/core';
import {
  type ExtendedChain,
  type RouteExtended,
  type ExecutionOptions,
  createConfig,
  executeRoute,
  getRoutes,
  getStatus,
  resumeRoute,
  getToken,
  EVM,
} from '@lifi/sdk';

import { parseUnits, formatUnits, parseAbi, type Address } from 'viem';
import { type WalletProvider, initWalletProvider } from '../providers/wallet';
import { bridgeTemplate } from '../templates';
import type { BridgeParams, Transaction } from '../types';

export { bridgeTemplate };

interface BridgeExecutionStatus {
  route: RouteExtended;
  isComplete: boolean;
  error?: string;
  transactionHashes: string[];
  currentStep: number;
  totalSteps: number;
}

export class BridgeAction {
  private config;
  private activeRoutes: Map<string, BridgeExecutionStatus> = new Map();

  constructor(private walletProvider: WalletProvider) {
    // Configure LiFi SDK with EVM providers - THIS IS THE KEY FIX!
    this.config = createConfig({
      integrator: 'eliza-agent',
      providers: [
        EVM({
          getWalletClient: async () => {
            // Default to first available chain if specific chain not specified
            const firstChain = Object.keys(this.walletProvider.chains)[0];
            return this.walletProvider.getWalletClient(firstChain as any) as any;
          },
          switchChain: async (chainId: number) => {
            logger.debug(`LiFi requesting chain switch to ${chainId}...`);
            const chainName = this.getChainNameById(chainId);
            return this.walletProvider.getWalletClient(chainName as any) as any;
          },
        }),
      ],
      // Custom chains configuration
      chains: Object.values(this.walletProvider.chains).map((config) => ({
        id: config.id,
        name: config.name,
        key: config.name.toLowerCase(),
        chainType: 'EVM',
        nativeToken: {
          ...config.nativeCurrency,
          chainId: config.id,
          address: '0x0000000000000000000000000000000000000000',
          coinKey: config.nativeCurrency.symbol,
        },
        metamask: {
          chainId: `0x${config.id.toString(16)}`,
          chainName: config.name,
          nativeCurrency: config.nativeCurrency,
          rpcUrls: [config.rpcUrls.default.http[0]],
          blockExplorerUrls: [config?.blockExplorers?.default?.url],
        },
        diamondAddress: '0x0000000000000000000000000000000000000000',
        coin: config.nativeCurrency.symbol,
        mainnet: true,
      })) as ExtendedChain[],
      // Enable automatic route optimization
      routeOptions: {
        maxPriceImpact: 0.4, // 40% max price impact
        slippage: 0.005, // 0.5% slippage tolerance
      },
    });
  }

  private getChainNameById(chainId: number): string {
    const chain = Object.entries(this.walletProvider.chains).find(
      ([_, config]) => config.id === chainId,
    );
    if (!chain) {
      throw new Error(`Chain with ID ${chainId} not found`);
    }
    return chain[0];
  }

  /**
   * Resolves a token symbol or address to a valid contract address using LiFi SDK
   */
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

  /**
   * Get token decimals for proper amount parsing - works for any token
   */
  private async getTokenDecimals(tokenAddress: string, chainName: string): Promise<number> {
    const chainConfig = this.walletProvider.getChainConfigs(chainName as any);

    // Check if the token is the native currency (ETH, MATIC, BNB, etc.)
    if (
      tokenAddress === '0x0000000000000000000000000000000000000000' ||
      tokenAddress.toUpperCase() === chainConfig.nativeCurrency.symbol.toUpperCase()
    ) {
      return chainConfig.nativeCurrency.decimals;
    }

    // For ERC20 tokens, read decimals from contract
    try {
      const decimalsAbi = parseAbi(['function decimals() view returns (uint8)']);
      const decimals = await this.walletProvider.getPublicClient(chainName as any).readContract({
        address: tokenAddress as Address,
        abi: decimalsAbi,
        functionName: 'decimals',
      });
      return decimals;
    } catch (error) {
      elizaLogger.error(`Failed to get decimals for token ${tokenAddress} on ${chainName}:`, error);
      // Default to 18 decimals if we can't determine
      return 18;
    }
  }

  private createExecutionOptions(
    routeId: string,
    onProgress?: (status: BridgeExecutionStatus) => void,
  ): ExecutionOptions {
    return {
      // Gas optimization hook - modify transaction requests for better gas prices
      updateTransactionRequestHook: async (txRequest: any) => {
        // Get current gas prices and optimize
        try {
          // Add 10% buffer to gas limit for safety
          if (txRequest.gas) {
            txRequest.gas = (BigInt(txRequest.gas) * BigInt(110)) / BigInt(100);
          }

          // Optimize gas price based on network conditions
          if (txRequest.gasPrice) {
            // Add 5% to ensure faster execution
            txRequest.gasPrice = (BigInt(txRequest.gasPrice) * BigInt(105)) / BigInt(100);
          }

          return txRequest;
        } catch (error) {
          console.warn('⚠️ Gas optimization failed, using default values:', error);
          return txRequest;
        }
      },

      // Exchange rate update handler for better UX
      acceptExchangeRateUpdateHook: async (params: {
        toToken: any;
        oldToAmount: string;
        newToAmount: string;
      }) => {
        const { toToken, oldToAmount, newToAmount } = params;
        const oldAmountFormatted = formatUnits(BigInt(oldToAmount), toToken.decimals);
        const newAmountFormatted = formatUnits(BigInt(newToAmount), toToken.decimals);
        const priceChange =
          ((Number(newToAmount) - Number(oldToAmount)) / Number(oldToAmount)) * 100;

        logger.debug(`Exchange rate changed for ${toToken.symbol}:`);
        logger.debug(`Old amount: ${oldAmountFormatted}`);
        logger.debug(`New amount: ${newAmountFormatted}`);
        logger.debug(`Change: ${priceChange.toFixed(2)}%`);

        // Auto-accept if change is less than 2%
        if (Math.abs(priceChange) < 2) {
          logger.debug('Auto-accepting exchange rate change (< 2%)');
          return true;
        }

        // For larger changes, we could implement user confirmation logic
        // For now, auto-accept changes up to 5%
        if (Math.abs(priceChange) < 5) {
          logger.debug('Accepting exchange rate change (< 5%)');
          return true;
        }

        logger.debug('Rejecting exchange rate change (> 5%)');
        return false;
      },

      // Route monitoring and progress tracking
      updateRouteHook: (updatedRoute: RouteExtended) => {
        const status = this.updateRouteStatus(routeId, updatedRoute);

        logger.debug(`Route ${routeId} progress: ${status.currentStep}/${status.totalSteps}`);

        // Log transaction hashes as they become available
        status.transactionHashes.forEach((hash, index) => {
          logger.debug(`Transaction ${index + 1}: ${hash}`);
        });

        if (onProgress) {
          onProgress(status);
        }
      },

      // Chain switching handler
      switchChainHook: async (chainId: number) => {
        logger.debug(`Switching to chain ${chainId}...`);
        try {
          const chainName = this.getChainNameById(chainId);
          const walletClient = this.walletProvider.getWalletClient(chainName as any);
          logger.debug('Chain switch successful');
          return walletClient as any; // Type cast to resolve compatibility issues
        } catch (error) {
          logger.error('Chain switch failed:', error);
          throw error;
        }
      },

      // Enable background execution for better UX
      executeInBackground: false,

      // Disable message signing for compatibility with smart accounts
      disableMessageSigning: false,
    };
  }

  private updateRouteStatus(routeId: string, route: RouteExtended): BridgeExecutionStatus {
    const transactionHashes: string[] = [];
    let currentStep = 0;
    let isComplete = false;
    let error: string | undefined;

    // Extract transaction hashes and progress from route
    route.steps.forEach((step, stepIndex) => {
      if (step.execution?.process) {
        step.execution.process.forEach((process) => {
          if (process.txHash) {
            transactionHashes.push(process.txHash);
          }
          if (process.status === 'DONE') {
            currentStep = Math.max(currentStep, stepIndex + 1);
          }
          if (process.status === 'FAILED') {
            error = `Step ${stepIndex + 1} failed: ${process.error || 'Unknown error'}`;
          }
        });
      }
    });

    isComplete = currentStep === route.steps.length && !error;

    const status: BridgeExecutionStatus = {
      route,
      isComplete,
      error,
      transactionHashes,
      currentStep,
      totalSteps: route.steps.length,
    };

    this.activeRoutes.set(routeId, status);
    return status;
  }

  /**
   * Poll bridge status using LiFi's getStatus API for cross-chain completion monitoring
   */
  private async pollBridgeStatus(
    txHash: string,
    fromChainId: number,
    toChainId: number,
    tool: string,
    routeId: string,
    maxAttempts: number = 60,
    intervalMs: number = 5000,
  ): Promise<BridgeExecutionStatus> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));

        const status = await getStatus({
          txHash,
          fromChain: fromChainId,
          toChain: toChainId,
          bridge: tool,
        });

        logger.debug(
          `Poll attempt ${attempt}/${maxAttempts}: ${status.status}${status.substatus ? ` (${status.substatus})` : ''}`,
        );

        // Map LiFi status to our internal status
        const routeStatus = this.activeRoutes.get(routeId);
        if (!routeStatus) {
          throw new Error(`Route ${routeId} not found in active routes`);
        }

        // Update status based on LiFi response
        let isComplete = false;
        let error: string | undefined;

        if (status.status === 'DONE') {
          isComplete = true;
          logger.debug('Bridge completed successfully!');
        } else if (status.status === 'FAILED') {
          error = `Bridge failed: ${status.substatus || 'Unknown error'}`;
          logger.debug(`Bridge failed: ${error}`);
        } else if (status.status === 'PENDING') {
          logger.debug(`Bridge still pending: ${status.substatus || 'Processing...'}`);
        }

        // Update the route status
        const updatedStatus: BridgeExecutionStatus = {
          ...routeStatus,
          isComplete,
          error,
          currentStep: isComplete ? routeStatus.totalSteps : routeStatus.currentStep,
        };

        this.activeRoutes.set(routeId, updatedStatus);

        // Return if complete or failed
        if (isComplete || error) {
          return updatedStatus;
        }
      } catch (statusError) {
        console.warn(`⚠️ Status check attempt ${attempt} failed:`, statusError);

        // If we're near the end, treat it as a timeout
        if (attempt >= maxAttempts - 5) {
          logger.debug('Status polling timed out, but transaction may still be processing...');
        }
      }
    }

    // If we reach here, polling timed out
    const routeStatus = this.activeRoutes.get(routeId);
    if (routeStatus) {
      const timeoutStatus: BridgeExecutionStatus = {
        ...routeStatus,
        error: `Bridge status polling timed out after ${(maxAttempts * intervalMs) / 1000}s. Transaction may still be processing on the destination chain.`,
      };
      this.activeRoutes.set(routeId, timeoutStatus);
      return timeoutStatus;
    }

    throw new Error('Route status polling failed completely');
  }

  async bridge(
    params: BridgeParams,
    onProgress?: (status: BridgeExecutionStatus) => void,
  ): Promise<Transaction> {
    const walletClient = this.walletProvider.getWalletClient(params.fromChain);
    const fromAddress = walletClient.account?.address;

    if (!fromAddress) {
      throw new Error('Wallet account address not available');
    }

    logger.debug('   Initiating bridge operation...');
    logger.debug(`From: ${params.fromChain} → To: ${params.toChain}`);
    logger.debug(`Amount: ${params.amount} tokens`);

    // Resolve token symbols to addresses first
    const fromChainConfig = this.walletProvider.getChainConfigs(params.fromChain);
    const toChainConfig = this.walletProvider.getChainConfigs(params.toChain);

    const resolvedFromToken = await this.resolveTokenAddress(params.fromToken, fromChainConfig.id);
    const resolvedToToken = await this.resolveTokenAddress(params.toToken, toChainConfig.id);

    logger.debug('Resolved tokens:');
    logger.debug(`${params.fromToken} on ${params.fromChain} → ${resolvedFromToken}`);
    logger.debug(`${params.toToken} on ${params.toChain} → ${resolvedToToken}`);

    // Get token decimals for proper amount parsing - THIS IS THE KEY FIX!
    const fromTokenDecimals = await this.getTokenDecimals(resolvedFromToken, params.fromChain);
    logger.debug(`Token decimals: ${fromTokenDecimals} for ${params.fromToken}`);

    // Parse amount with correct decimals (not hardcoded 18!)
    const fromAmountParsed = parseUnits(params.amount, fromTokenDecimals);
    logger.debug(`Parsed amount: ${params.amount} → ${fromAmountParsed.toString()}`);

    // Get optimal routes with latest 2025 SDK
    const routesResult = await getRoutes({
      fromChainId: fromChainConfig.id,
      toChainId: toChainConfig.id,
      fromTokenAddress: resolvedFromToken,
      toTokenAddress: resolvedToToken,
      fromAmount: fromAmountParsed.toString(), // Use correctly parsed amount!
      fromAddress,
      toAddress: params.toAddress || fromAddress,
      options: {
        order: 'RECOMMENDED', // Use recommended routing for best optimization
        slippage: 0.005, // 0.5% slippage
        maxPriceImpact: 0.4, // 40% max price impact
        allowSwitchChain: true,
      },
    });

    if (!routesResult.routes.length) {
      throw new Error(
        `No bridge routes found for ${params.fromToken} (${resolvedFromToken}) on ${params.fromChain} to ${params.toToken} (${resolvedToToken}) on ${params.toChain}. Please verify the token exists on both chains or try a different token pair.`,
      );
    }

    // Select the best route (first one is already optimized by LiFi)
    const selectedRoute = routesResult.routes[0];
    const routeId = `bridge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.debug(`Selected route ${routeId}:`);
    logger.debug(`Gas cost: ${(selectedRoute as any).gasCostUSD || 'Unknown'} USD`);
    logger.debug(`Steps: ${selectedRoute.steps.length}`);
    logger.debug(`Tools: ${selectedRoute.steps.map((s) => s.tool).join(' → ')}`);

    try {
      // Execute route with advanced options and monitoring - but NO PROGRESS CALLBACK TO PREVENT LOOP!
      const executionOptions = this.createExecutionOptions(routeId, undefined); // No progress callback!
      const executedRoute = await executeRoute(selectedRoute, executionOptions);

      // Get the source chain transaction hash for status monitoring
      const sourceSteps = executedRoute.steps.filter((step) =>
        step.execution?.process?.some((p) => p.txHash),
      );

      if (!sourceSteps.length) {
        throw new Error('No transaction hashes found in executed route');
      }

      // Get the main transaction hash from the source chain
      const mainTxHash = sourceSteps[0].execution?.process?.find((p) => p.txHash)?.txHash;
      if (!mainTxHash) {
        throw new Error('No transaction hash found in route execution');
      }

      logger.debug(`Source transaction: ${mainTxHash}`);

      // For cross-chain bridges, we need to poll the status
      const bridgeTool = selectedRoute.steps[0].tool;
      logger.debug(`Using bridge tool: ${bridgeTool}`);

      // Start status polling for cross-chain completion
      const finalStatus = await this.pollBridgeStatus(
        mainTxHash,
        fromChainConfig.id,
        toChainConfig.id,
        bridgeTool,
        routeId,
      );

      // Call progress callback one final time with completion status
      if (onProgress) {
        onProgress(finalStatus);
      }

      if (finalStatus.error) {
        throw new Error(finalStatus.error);
      }

      if (!finalStatus.isComplete) {
        logger.debug(
          '⚠️ Bridge execution may still be in progress. Check destination chain manually.',
        );
        // Don't throw error - the source transaction succeeded
      }

      logger.debug('Bridge initiated successfully!');
      logger.debug(`Source transaction: ${mainTxHash}`);
      logger.debug('Monitor completion on destination chain');

      return {
        hash: mainTxHash as `0x${string}`,
        from: fromAddress,
        to: (params.toAddress || fromAddress) as `0x${string}`,
        value: fromAmountParsed,
        chainId: toChainConfig.id,
      };
    } catch (error) {
      logger.error('Bridge execution failed:', error);

      // Try to get more details about the failure
      const status = this.activeRoutes.get(routeId);
      if (status?.error) {
        throw new Error(`Bridge failed: ${status.error}`);
      }

      throw error;
    } finally {
      // Clean up route tracking
      this.activeRoutes.delete(routeId);
    }
  }

  // Get status of a specific transaction
  async getTransactionStatus(txHash: string, fromChainId: number, toChainId: number, tool: string) {
    try {
      const status = await getStatus({
        txHash,
        fromChain: fromChainId,
        toChain: toChainId,
        bridge: tool,
      });
      return status;
    } catch (error) {
      logger.error('Failed to get transaction status:', error);
      throw error;
    }
  }

  // Resume a failed or interrupted bridge operation
  async resumeBridge(route: RouteExtended, onProgress?: (status: BridgeExecutionStatus) => void) {
    const routeId = `resume_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const executionOptions = this.createExecutionOptions(routeId, onProgress);

    logger.debug('Resuming bridge operation...');

    try {
      const resumedRoute = await resumeRoute(route, executionOptions);
      const finalStatus = this.activeRoutes.get(routeId);

      if (finalStatus?.error) {
        throw new Error(finalStatus.error);
      }

      return resumedRoute;
    } finally {
      this.activeRoutes.delete(routeId);
    }
  }
}

const buildBridgeDetails = async (
  state: State,
  runtime: IAgentRuntime,
  wp: WalletProvider,
): Promise<BridgeParams> => {
  const chains = wp.getSupportedChains();

  // Add balances to state for better context in template
  const balances = await wp.getWalletBalances();
  state.supportedChains = chains.join(' | ');
  state.chainBalances = Object.entries(balances)
    .map(([chain, balance]) => {
      const chainConfig = wp.getChainConfigs(chain as any);
      return `${chain}: ${balance} ${chainConfig.nativeCurrency.symbol}`;
    })
    .join(', ');

  // Compose bridge context
  const bridgeContext = composePromptFromState({
    state,
    template: bridgeTemplate,
  });

  const xmlResponse = await runtime.useModel(ModelType.TEXT_LARGE, {
    prompt: bridgeContext,
  });

  const content = parseKeyValueXml(xmlResponse) as any;

  logger.debug('###### XML RESPONSE', xmlResponse);

  // Validate chains exist
  const fromChain = content.fromChain;
  const toChain = content.toChain;

  if (!fromChain || !toChain) {
    throw new Error(
      `Missing required chain information. Please specify both source and destination chains. Available chains: ${chains.join(', ')}`,
    );
  }

  // Normalize chain names to lowercase to handle case sensitivity issues
  const normalizedFromChain = fromChain?.toLowerCase();
  const normalizedToChain = toChain?.toLowerCase();

  if (!wp.chains[normalizedFromChain]) {
    throw new Error(
      `Source chain ${fromChain} not configured. Available chains: ${chains.join(', ')}`,
    );
  }

  if (!wp.chains[normalizedToChain]) {
    throw new Error(
      `Destination chain ${toChain} not configured. Available chains: ${chains.join(', ')}`,
    );
  }

  const bridgeOptions: BridgeParams = {
    fromChain: normalizedFromChain,
    toChain: normalizedToChain,
    fromToken: content.token,
    toToken: content.token,
    toAddress: content.toAddress,
    amount: content.amount,
  };

  logger.debug('###### BRIDGE OPTIONS', bridgeOptions);

  return bridgeOptions;
};

export const bridgeAction: Action = {
  name: 'EVM_BRIDGE_TOKENS',
  description:
    'Bridges tokens between different chains with gas optimization and advanced monitoring. Returns transaction details, route information, and suggests next actions for cross-chain workflows. Supports multi-step bridging with automatic route finding.',
  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    const walletProvider = await initWalletProvider(runtime);
    const action = new BridgeAction(walletProvider);

    if (!state) {
      state = await runtime.composeState(_message, ['RECENT_MESSAGES'], true);
    }

    let nextSuggestedAction = '';

    try {
      // Get bridge parameters
      const bridgeOptions = await buildBridgeDetails(state, runtime, walletProvider);

      // Execute bridge with progress monitoring
      const bridgeResp = await action.bridge(bridgeOptions, (status) => {
        logger.debug(`Bridge progress: ${status.currentStep}/${status.totalSteps}`);
        if (status.transactionHashes.length > 0) {
          logger.debug(`Recent transactions: ${status.transactionHashes.slice(-2).join(', ')}`);
        }
      });

      if (callback) {
        // Create workflow context for chained actions
        const workflowContext = {
          fromChain: bridgeOptions.fromChain,
          toChain: bridgeOptions.toChain,
          token: bridgeOptions.fromToken,
          amount: bridgeOptions.amount,
          hash: bridgeResp.hash,
          recipient: bridgeResp.to,
        };

        // Determine next suggested action based on context
        let contextualMessage = `Successfully bridged ${bridgeOptions.amount} ${bridgeOptions.fromToken} from ${bridgeOptions.fromChain} to ${bridgeOptions.toChain}\n\nTransaction Hash: ${bridgeResp.hash}\nGas optimized and monitored throughout the process`;

        // If this is part of a workflow, suggest next steps
        if (state?.workflowId) {
          switch (state.currentStep) {
            case 'arbitrage-bridge':
              nextSuggestedAction = 'EVM_SWAP_TOKENS';
              contextualMessage += `\n\nArbitrage bridge completed. Ready to swap on ${bridgeOptions.toChain} for profit realization.`;
              break;
            case 'cross-chain-farming':
              nextSuggestedAction = 'PROVIDE_LIQUIDITY';
              contextualMessage += `\n\nCross-chain bridge completed. Tokens are ready for yield farming on ${bridgeOptions.toChain}.`;
              break;
            case 'multi-chain-swap':
              nextSuggestedAction = 'EVM_SWAP_TOKENS';
              contextualMessage += `\n\nBridge completed. Ready to swap ${bridgeOptions.fromToken} on ${bridgeOptions.toChain} for better rates.`;
              break;
            case 'consolidate-chains':
              nextSuggestedAction = 'PORTFOLIO_SUMMARY';
              contextualMessage += `\n\nCross-chain consolidation completed. Your assets are now unified on ${bridgeOptions.toChain}.`;
              break;
          }
        } else {
          // Suggest common next actions for standalone bridges
          if (bridgeOptions.toChain === 'base' || bridgeOptions.toChain === 'arbitrum') {
            contextualMessage += `\n\nWith tokens on ${bridgeOptions.toChain}, you could:\n- Swap for other assets with lower fees\n- Provide liquidity for yield farming\n- Use for DeFi operations at reduced cost`;
          } else if (bridgeOptions.toChain === 'bsc') {
            contextualMessage +=
              '\n\nWith tokens on BSC, you could:\n- Swap on PancakeSwap for better rates\n- Stake in BSC farms for rewards\n- Bridge to other chains for arbitrage';
          } else if (bridgeOptions.toChain === 'polygon') {
            contextualMessage +=
              '\n\nWith tokens on Polygon, you could:\n- Use for low-cost DeFi operations\n- Provide liquidity in Polygon pools\n- Swap for MATIC ecosystem tokens';
          } else {
            contextualMessage += `\n\nWith tokens on ${bridgeOptions.toChain}, you could:\n- Swap for native ecosystem tokens\n- Provide liquidity for rewards\n- Explore ${bridgeOptions.toChain} DeFi opportunities`;
          }
        }

        callback({
          text: contextualMessage,
          content: {
            success: true,
            hash: bridgeResp.hash,
            recipient: bridgeResp.to,
            fromChain: bridgeOptions.fromChain,
            toChain: bridgeOptions.toChain,
            token: bridgeOptions.fromToken,
            amount: bridgeOptions.amount,
            gasOptimized: true,
            workflowContext,
            nextSuggestedAction,
            actionType: 'EVM_BRIDGE_TOKENS',
          },
        });

        // Create memory for workflow continuation
        if (state?.workflowId) {
          await runtime.createMemory(
            {
              entityId: runtime.agentId,
              roomId: _message.roomId,
              agentId: runtime.agentId,
              content: {
                text: `Bridge completed in workflow ${state.workflowId}: ${bridgeOptions.amount} ${bridgeOptions.fromToken} bridged from ${bridgeOptions.fromChain} to ${bridgeOptions.toChain}`,
                workflowId: state.workflowId,
                actionCompleted: 'bridge',
                bridgeDetails: workflowContext,
                nextAction: nextSuggestedAction,
              },
            },
            'workflow',
          );
        } else {
          // Create regular memory for standalone bridge
          await runtime.createMemory(
            {
              entityId: _message.agentId || runtime.agentId,
              roomId: _message.roomId,
              agentId: _message.agentId || runtime.agentId,
              content: {
                text: contextualMessage,
                action: ['EVM_BRIDGE_TOKENS'],
                bridgeDetails: workflowContext,
              },
            },
            'messages',
          );
        }
      }
      return {
        data: {
          actionName: 'EVM_BRIDGE_TOKENS',
          hash: bridgeResp.hash,
          recipient: bridgeResp.to,
          fromChain: bridgeOptions.fromChain,
          toChain: bridgeOptions.toChain,
          token: bridgeOptions.fromToken,
          amount: bridgeOptions.amount,
          gasOptimized: true,
          workflowId: state?.workflowId,
          nextSuggestedAction,
        },
        values: {
          success: true,
          transactionHash: bridgeResp.hash,
          bridgedAmount: bridgeOptions.amount,
          sourceChain: bridgeOptions.fromChain,
          destinationChain: bridgeOptions.toChain,
          tokenSymbol: bridgeOptions.fromToken,
        },
      };
    } catch (error) {
      logger.error(
        'Error in bridge handler:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      if (callback) {
        callback({
          text: `Bridge failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check your balance, network connectivity, and try again.`,
          content: {
            error: error instanceof Error ? error.message : 'Unknown error',
            success: false,
          },
        });
      }
      return {
        data: {
          actionName: 'EVM_BRIDGE_TOKENS',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        values: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  },
  validate: async (runtime: IAgentRuntime) => {
    const privateKey = runtime.getSetting('EVM_PRIVATE_KEY');
    return typeof privateKey === 'string' && privateKey.startsWith('0x');
  },
  examples: [
    // Multi-action: Bridge + Swap workflow
    [
      {
        name: '{{user}}',
        content: {
          text: 'Bridge 1 ETH from Ethereum to Base and swap for USDC',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll bridge 1 ETH from Ethereum to Base with gas optimization, then swap it for USDC on Base.",
          thought: "Two-step cross-chain strategy: first move ETH to Base for lower fees, then swap for USDC. The bridge enables access to cheaper swap operations on Base.",
          actions: ['EVM_BRIDGE_TOKENS', 'EVM_SWAP_TOKENS'],
        },
      },
    ],
    // Multi-action: Swap + Bridge + Swap workflow
    [
      {
        name: '{{user}}',
        content: {
          text: 'I want to do arbitrage: swap ETH to USDC, bridge to Polygon, then swap back',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll execute your arbitrage strategy: swap ETH to USDC on Ethereum, bridge to Polygon, then swap back to capture the price difference.",
          thought: "Complex arbitrage workflow: convert to stable asset for price comparison, bridge to target chain, then execute the arbitrage swap. Sequential operations to capture cross-chain price differences.",
          actions: ['EVM_SWAP_TOKENS', 'EVM_BRIDGE_TOKENS', 'EVM_SWAP_TOKENS'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Bridge my USDC to BSC then swap for BNB for farming',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll bridge your USDC to BSC first, then help you swap it for BNB to participate in BSC farming opportunities. This cross-chain strategy will give you access to higher yields.",
          thought: "Cross-chain yield farming setup: move stablecoins to BSC first, then convert to native BNB for farming. The bridge opens access to BSC's higher-yield opportunities.",
          action: 'EVM_BRIDGE_TOKENS',
          workflowContext: {
            step: 'cross-chain-farming',
            destination: 'bsc',
            nextAction: 'swap-for-farming',
          },
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Bridge ETH to Arbitrum for arbitrage opportunities',
          action: 'EVM_BRIDGE_TOKENS',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll bridge your ETH to Arbitrum for arbitrage. After bridging, I can help you swap on Arbitrum where you might find better rates due to lower gas fees.",
          thought: "Arbitrage preparation: moving ETH to Arbitrum where lower gas fees enable more profitable arbitrage trades. The bridge positions assets for fee-efficient trading.",
          action: 'EVM_BRIDGE_TOKENS',
          workflowContext: {
            step: 'arbitrage-bridge',
            strategy: 'cross-chain-arbitrage',
          },
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'I want to consolidate all my assets on Polygon. Bridge my tokens there',
          action: 'EVM_BRIDGE_TOKENS',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll help you consolidate your assets on Polygon for unified portfolio management. This will give you access to low-cost DeFi operations and better portfolio tracking.",
          thought: "Portfolio consolidation strategy: moving all assets to Polygon for centralized management and low-fee operations. The bridge unifies scattered assets across chains.",
          action: 'EVM_BRIDGE_TOKENS',
          workflowContext: {
            step: 'consolidate-chains',
            goal: 'unified-portfolio',
          },
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Bridge USDT to Base, then swap for other tokens with lower fees',
          action: 'EVM_BRIDGE_TOKENS',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll bridge your USDT to Base first, then help you swap for other tokens. Base offers significantly lower transaction fees, making this a cost-effective strategy for trading.",
          thought: "Fee optimization workflow: move stablecoins to Base first for dramatically lower swap fees. The bridge enables cost-effective trading operations on the L2.",
          action: 'EVM_BRIDGE_TOKENS',
          workflowContext: {
            step: 'multi-chain-swap',
            optimization: 'fee-reduction',
          },
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Bridge completed! Transaction: 0xabc123. What can I do next?',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Great! Bridge completed successfully. With your tokens on the destination chain, you could: 1) Swap for other assets with lower fees 2) Provide liquidity for yield farming 3) Explore native DeFi opportunities. What would you like to do next?',
          workflowSuggestion: {
            nextActions: ['EVM_SWAP_TOKENS', 'PROVIDE_LIQUIDITY', 'PORTFOLIO_SUMMARY'],
            context: 'post-bridge',
          },
        },
      },
    ],
  ],
  similes: ['CROSS_CHAIN_TRANSFER', 'CHAIN_BRIDGE', 'MOVE_CROSS_CHAIN', 'BRIDGE_TOKENS'],
};

/**
 * Standalone function to check bridge transaction status
 * Use this to check the status of your Base->BSC USDC bridge
 */
export async function checkBridgeStatus(
  txHash: string,
  fromChainId: number,
  toChainId: number,
  tool: string = 'stargateV2Bus',
) {
  try {
    const status = await getStatus({
      txHash,
      fromChain: fromChainId,
      toChain: toChainId,
      bridge: tool,
    });

    logger.debug(
      `Bridge Status: ${status.status}${status.substatus ? ` (${status.substatus})` : ''}`,
    );

    return {
      status: status.status,
      substatus: status.substatus,
      isComplete: status.status === 'DONE',
      isFailed: status.status === 'FAILED',
      isPending: status.status === 'PENDING',
      error: status.status === 'FAILED' ? status.substatus : undefined,
    };
  } catch (error) {
    logger.error('Failed to check bridge status:', error);
    throw error;
  }
}
