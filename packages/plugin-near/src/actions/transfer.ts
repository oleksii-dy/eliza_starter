import {
  type ActionExample,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  elizaLogger,
  type Action,
  ModelType,
  composePrompt,
  parseKeyValueXml,
} from '@elizaos/core';
import { z } from 'zod';
import { TransactionService } from '../services/TransactionService';
import { NearPluginError, formatErrorMessage, isNearError } from '../core/errors';
import type { TransferContent, TransferParams } from '../core/types';

export const TransferSchema = z.object({
  recipient: z.string(),
  amount: z.string(),
  tokenAddress: z.string().optional().nullable(),
});

const transferExtractionTemplate = `# Task: Extract NEAR transfer parameters from user message

# Recent Messages:
{{recentMessages}}

# Instructions:
Analyze the user's message to extract:
1. The recipient address (NEAR account like alice.near or alice.testnet)
2. The amount to transfer
3. The token (NEAR if not specified, or token contract like usdc.fakes.testnet)

Return the values in XML format:
<response>
  <recipient>account.near</recipient>
  <amount>number as string</amount>
  <tokenAddress>token-contract.near or empty for NEAR</tokenAddress>
</response>

Examples:
- "Send 5 NEAR to alice.near"
<response>
  <recipient>alice.near</recipient>
  <amount>5</amount>
  <tokenAddress></tokenAddress>
</response>

- "Transfer 100 USDC to bob.testnet"
<response>
  <recipient>bob.testnet</recipient>
  <amount>100</amount>
  <tokenAddress>usdc.fakes.testnet</tokenAddress>
</response>

Note: If no domain is specified for recipient, assume .near for mainnet or .testnet for testnet.
For common tokens: USDC, USDT, DAI, REF - use the .fakes.testnet suffix on testnet.`;

export const executeTransfer: Action = {
  name: 'SEND_NEAR',
  similes: ['TRANSFER_NEAR', 'SEND_TOKENS', 'TRANSFER_TOKENS', 'PAY_NEAR'],
  validate: async (_runtime: IAgentRuntime, _message: Memory) => {
    return true;
  },
  description: 'Send NEAR tokens or NEP-141 tokens to another account',
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<void> => {
    try {
      // Use LLM to extract transfer parameters
      const prompt = composePrompt({
        state: {
          recentMessages: message.content.text || '',
        },
        template: transferExtractionTemplate,
      });

      const xmlResponse = await runtime.useModel(ModelType.TEXT_LARGE, {
        prompt,
      });

      // Parse XML response
      const extractedParams = parseKeyValueXml(xmlResponse);

      // Validate extraction
      if (!extractedParams || !extractedParams.recipient || !extractedParams.amount) {
        elizaLogger.error('Failed to extract transfer parameters', extractedParams);
        callback?.({
          text: 'I need the recipient address and amount to make a transfer. For example: "Send 5 NEAR to alice.near"',
          content: { error: 'Missing required parameters' },
        });
        return;
      }

      // Get transaction service
      const transactionService = runtime.getService(
        'near-transaction' as any
      ) as TransactionService;

      if (!transactionService) {
        throw new Error('Transaction service not available');
      }

      // Prepare transfer parameters
      const params: TransferParams = {
        recipient: extractedParams.recipient,
        amount: extractedParams.amount,
        tokenId: extractedParams.tokenAddress || undefined,
      };

      // Execute transfer
      elizaLogger.info(
        `Executing transfer: ${params.amount} ${params.tokenId || 'NEAR'} to ${params.recipient}`
      );

      const result = params.tokenId
        ? await transactionService.sendToken(params)
        : await transactionService.sendNear(params);

      // Send success response
      const tokenSymbol = params.tokenId || 'NEAR';
      callback?.({
        text: `Successfully transferred ${params.amount} ${tokenSymbol} to ${params.recipient}`,
        content: {
          success: true,
          transactionHash: result.transactionHash,
          explorerUrl: result.explorerUrl,
          recipient: params.recipient,
          amount: params.amount,
          token: tokenSymbol,
        },
      });
    } catch (error) {
      elizaLogger.error('Error during NEAR transfer:', error);

      // Format error message
      let errorMessage = 'Error transferring tokens';
      if (isNearError(error)) {
        errorMessage = formatErrorMessage(error);
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      callback?.({
        text: errorMessage,
        content: {
          error: errorMessage,
          details: error,
        },
      });
    }
  },

  examples: [
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Send 1.5 NEAR to alice.near',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: "I'll send 1.5 NEAR to alice.near now...",
          action: 'SEND_NEAR',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'Successfully transferred 1.5 NEAR to alice.near',
          content: {
            transactionHash: '4jK3x...',
            explorerUrl: 'https://explorer.testnet.near.org/transactions/4jK3x...',
          },
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Transfer 100 USDC to bob.near',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: "I'll transfer 100 USDC to bob.near...",
          action: 'SEND_NEAR',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'Successfully transferred 100 USDC to bob.near',
          content: {
            transactionHash: '7mN9y...',
            token: 'usdc.fakes.testnet',
          },
        },
      },
    ],
  ],
};
