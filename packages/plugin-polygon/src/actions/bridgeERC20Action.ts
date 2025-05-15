import {
  type Action,
  type Content,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
  composePromptFromState,
  ModelType,
  type ActionExample,
  TemplateType,
} from '@elizaos/core';
import { PolygonBridgeService } from '../services/PolygonBridgeService';

interface BridgeERC20Params {
  tokenAddress: string;
  amount: string;
  recipient?: string;
}

// Template for parsing user input
const bridgeTemplate = {
  name: 'Bridge ERC20 Tokens',
  description:
    'Bridge ERC20 tokens from Ethereum (L1) to Polygon (L2) using the Polygon bridge. Respond with a valid JSON object containing the extracted parameters.',
  parameters: {
    type: 'object',
    properties: {
      tokenAddress: {
        type: 'string',
        description: 'Address of the ERC20 token on Ethereum (L1)',
      },
      amount: {
        type: 'string',
        description: 'Amount of tokens to bridge (e.g., "10.5" or "1")',
      },
      recipient: {
        type: 'string',
        description: 'Optional: Address on Polygon to receive the tokens. Defaults to sender.',
      },
    },
    required: ['tokenAddress', 'amount'],
  },
};

// Examples to help users understand how to use the action
const examples: ActionExample[] = [
  {
    input: 'Bridge 5 POL tokens to Polygon',
    output: 'Starting bridge deposit of 5 POL tokens to Polygon...',
  },
  {
    input: 'Send 1.5 USDC from Ethereum to Polygon',
    output: 'Starting bridge deposit of 1.5 USDC tokens to Polygon...',
  },
];

/**
 * Action to bridge ERC20 tokens from Ethereum (L1) to Polygon (L2)
 */
export const bridgeERC20Action: Action = {
  name: 'BRIDGE_ERC20_TO_POLYGON',
  similes: ['BRIDGE_TOKENS_TO_L2', 'DEPOSIT_TO_POLYGON'],
  description: 'Bridge ERC20 tokens from Ethereum (L1) to Polygon (L2).',
  examples,
  validate: async (runtime: IAgentRuntime, _m: Memory, _s: State | undefined): Promise<boolean> => {
    logger.debug('Validating BRIDGE_ERC20_TO_POLYGON...');
    
    // Check for required settings
    const checks = [
      runtime.getSetting('PRIVATE_KEY'),
      runtime.getSetting('ETHEREUM_RPC_URL'),
      runtime.getSetting('POLYGON_RPC_URL'),
    ];
    
    if (checks.some((check) => !check)) {
      logger.error('Required settings (PRIVATE_KEY, ETHEREUM_RPC_URL, POLYGON_RPC_URL) missing.');
      return false;
    }
    
    // Check if services are available
    try {
      const bridgeService = runtime.getService<PolygonBridgeService>(PolygonBridgeService.serviceType);
      if (!bridgeService) {
        throw new Error('PolygonBridgeService not available');
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      logger.error(`Service initialization failed during validation: ${errMsg}`);
      return false;
    }
    
    return true;
  },
  
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    _o: any,
    cb: HandlerCallback | undefined,
    _rs: Memory[] | undefined
  ) => {
    logger.info('Handling BRIDGE_ERC20_TO_POLYGON for:', message.id);
    
    try {
      // Get bridge service
      const bridgeService = runtime.getService<PolygonBridgeService>(PolygonBridgeService.serviceType);
      if (!bridgeService) {
        throw new Error('PolygonBridgeService not available');
      }
      
      // Extract parameters from user input
      const prompt = composePromptFromState({
        state,
        template: bridgeTemplate as unknown as TemplateType,
      });
      
      const modelResponse = await runtime.useModel(ModelType.LARGE, { prompt });
      let paramsJson: BridgeERC20Params;
      
      try {
        const responseText = modelResponse || '';
        const jsonString = responseText.replace(/^```json\n?|\n?```$/g, '');
        paramsJson = JSON.parse(jsonString);
      } catch (e) {
        logger.error('Failed to parse LLM response for bridge params:', modelResponse, e);
        throw new Error('Could not understand bridge parameters.');
      }
      
      // Validate required parameters
      if (!paramsJson.tokenAddress || !paramsJson.amount) {
        throw new Error('Missing required parameters: tokenAddress or amount');
      }
      
      // Convert amount to Wei (bigint)
      let amountWei: bigint;
      try {
        // Handle different decimal input formats and convert to Wei
        const amountFloat = parseFloat(paramsJson.amount);
        if (isNaN(amountFloat)) {
          throw new Error(`Invalid amount format: ${paramsJson.amount}`);
        }
        amountWei = BigInt(Math.floor(amountFloat * 1e18));
      } catch (e) {
        throw new Error(`Failed to convert amount "${paramsJson.amount}" to Wei: ${e instanceof Error ? e.message : String(e)}`);
      }
      
      if (amountWei <= 0n) {
        throw new Error('Amount must be greater than 0');
      }
      
      // Execute bridge deposit with enhanced options
      logger.info(`Starting bridge deposit of ${paramsJson.amount} tokens from ${paramsJson.tokenAddress}...`);
      
      // Inform user that the process has started
      if (cb) {
        await cb({
          text: `Starting bridge deposit of ${paramsJson.amount} tokens to Polygon...\nThis process requires two transactions (approve and deposit) and may take a few minutes.`,
          actions: ['BRIDGE_ERC20_TO_POLYGON'],
          source: message.content.source,
        });
      }
      
      // Set options for the bridge deposit
      const bridgeOptions = {
        approvalTimeoutMs: 300000, // 5 minutes timeout for approval
        gasPriceMultiplier: 1.1, // Slightly higher gas price for faster processing
        skipConfirmation: false, // Wait for confirmations
      };
      
      const result = await bridgeService.bridgeDeposit(
        paramsJson.tokenAddress,
        amountWei,
        paramsJson.recipient,
        bridgeOptions
      );
      
      // Create success message with detailed information
      const successMessage = `
Bridge deposit completed successfully!
- Token Address: ${result.tokenAddress}
- Amount: ${paramsJson.amount}
- Deposit Transaction: ${result.depositTxHash}
${result.approvalTxHash ? `- Approval Transaction: ${result.approvalTxHash}` : '- No approval needed (already approved)'}
- Recipient: ${result.recipientAddress}

The tokens should appear on Polygon in approximately 20-30 minutes.
      `.trim();
      
      logger.info(`Bridge deposit successful: ${result.depositTxHash}`);
      
      if (cb) {
        await cb({
          text: successMessage,
          content: { success: true, ...result },
          actions: ['BRIDGE_ERC20_TO_POLYGON'],
          source: message.content.source,
        });
      }
      
      return { success: true, ...result };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error('BRIDGE_ERC20_TO_POLYGON handler error:', errMsg, error);
      
      // Provide a more user-friendly error message based on error type
      let userErrorMsg = `Error bridging tokens: ${errMsg}`;
      
      if (errMsg.includes('timed out')) {
        userErrorMsg = 'The approval transaction is taking longer than expected. This could be due to network congestion. You can check your wallet or block explorer for the transaction status.';
      } else if (errMsg.includes('insufficient funds')) {
        userErrorMsg = 'You don\'t have enough ETH to pay for the transaction gas costs. Please add more ETH to your wallet and try again.';
      } else if (errMsg.includes('rejected') || errMsg.includes('denied')) {
        userErrorMsg = 'The transaction was rejected. Please check your wallet and try again.';
      }
      
      if (cb) {
        await cb({
          text: userErrorMsg,
          actions: ['BRIDGE_ERC20_TO_POLYGON'],
          source: message.content.source,
        });
      }
      
      return { success: false, error: errMsg };
    }
  },
}; 