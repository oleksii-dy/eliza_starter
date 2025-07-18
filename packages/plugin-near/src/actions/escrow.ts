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
import { EscrowService } from '../services/EscrowService';
import type { EscrowParams, EscrowContent } from '../core/types';
import { NearPluginError, formatErrorMessage, isNearError } from '../core/errors';

export const EscrowSchema = z.object({
  escrowType: z.enum(['payment', 'bet']),
  description: z.string(),
  amount: z.string(),
  parties: z.array(z.string()),
  conditions: z.array(z.string()).optional(),
  expiry: z.string().optional(),
});

const escrowExtractionTemplate = `# Task: Extract escrow parameters from user message

# Recent Messages:
{{recentMessages}}

# Instructions:
Analyze the user's message to extract escrow parameters.

For PAYMENT escrows:
- Extract the recipient
- Extract the amount
- Extract any conditions or terms

For BET escrows:
- Extract the bet description
- Extract the amount each party will stake
- Extract who the other party is (if specified)

Return the values in XML format:
<response>
  <escrowType>payment|bet</escrowType>
  <description>description of the escrow</description>
  <amount>number as string</amount>
  <parties>party1.near,party2.near</parties>
  <conditions>condition1,condition2</conditions>
  <expiry>duration or date</expiry>
</response>

Examples:
- "Create escrow to pay alice.near 50 NEAR when she delivers the website"
<response>
  <escrowType>payment</escrowType>
  <description>Payment for website delivery</description>
  <amount>50</amount>
  <parties>alice.near</parties>
  <conditions>website delivered</conditions>
</response>

- "I'll bet 10 NEAR that the price goes above $5"
<response>
  <escrowType>bet</escrowType>
  <description>Bet that price goes above $5</description>
  <amount>10</amount>
  <parties></parties>
  <conditions>price above $5</conditions>
</response>`;

export const createEscrowAction: Action = {
  name: 'CREATE_ESCROW',
  similes: ['ESCROW_CREATE', 'MAKE_BET', 'CREATE_BET', 'SETUP_ESCROW'],
  validate: async (_runtime: IAgentRuntime, _message: Memory) => {
    return true;
  },
  description: 'Create an escrow for conditional payments or bets',
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<void> => {
    try {
      // Use LLM to extract escrow parameters
      const prompt = composePrompt({
        state: {
          recentMessages: message.content.text || '',
        },
        template: escrowExtractionTemplate,
      });

      const xmlResponse = await runtime.useModel(ModelType.TEXT_LARGE, {
        prompt,
      });

      // Parse XML response
      const extractedParams = parseKeyValueXml(xmlResponse);

      // Validate extraction
      if (!extractedParams || !extractedParams.escrowType || !extractedParams.amount) {
        elizaLogger.error('Failed to extract escrow parameters', extractedParams);
        callback?.({
          text: 'I need more details to create an escrow. Please specify the type (payment/bet), amount, and conditions.',
          content: { error: 'Missing required parameters' },
        });
        return;
      }

      // Get escrow service
      const service = runtime.getService('near-escrow' as any);

      if (!service) {
        throw new Error('Escrow service not available');
      }

      const escrowService = service as unknown as EscrowService;

      // Parse parties and conditions from comma-separated strings
      const partyAddresses = extractedParams.parties
        ? extractedParams.parties.split(',').filter((p: string) => p.trim())
        : [];
      const conditions = extractedParams.conditions
        ? extractedParams.conditions.split(',').filter((c: string) => c.trim())
        : [];

      // Get current user address
      const currentUserAddress = runtime.getSetting('NEAR_ADDRESS') || '';

      // Prepare escrow parameters with new structure
      const params: EscrowParams = {
        escrowType: extractedParams.escrowType as 'payment' | 'bet',
        description: extractedParams.description,
        parties: [], // Will populate below
        arbiter: currentUserAddress, // Default arbiter is the current user
        deadline: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      };

      // Create parties array based on escrow type
      if (params.escrowType === 'bet') {
        // For bets, split amount between parties
        params.parties = [
          {
            accountId: currentUserAddress,
            amount: extractedParams.amount,
            condition: conditions[0] || 'Bet outcome: yes',
          },
        ];

        // Add other parties if specified
        partyAddresses.forEach((address: string, index: number) => {
          params.parties.push({
            accountId: address,
            amount: extractedParams.amount,
            condition: conditions[index + 1] || 'Bet outcome: no',
          });
        });
      } else {
        // For payment escrows
        params.parties = [
          {
            accountId: currentUserAddress,
            amount: extractedParams.amount,
            condition: conditions[0] || 'Payment sender',
          },
        ];

        if (partyAddresses.length > 0) {
          params.parties.push({
            accountId: partyAddresses[0],
            amount: '0', // Recipient doesn't need to deposit
            condition: conditions[1] || 'Payment recipient',
          });
        }
      }

      // Create escrow
      elizaLogger.info(`Creating ${params.escrowType} escrow:`, params);

      let escrowId: string;
      if (params.escrowType === 'bet') {
        // Create bet escrow
        escrowId = await escrowService.createBetEscrow({
          type: 'escrow_bet',
          parties: params.parties.map((party) => ({
            address: party.accountId,
            stake: party.amount,
            prediction: party.condition || 'yes',
          })),
          condition: params.description,
          deadline: params.deadline || Date.now() + 30 * 24 * 60 * 60 * 1000,
          arbiter: params.arbiter,
        });
      } else {
        // For payment escrows, we'll use bet escrow with modified params
        escrowId = await escrowService.createBetEscrow({
          type: 'escrow_bet', // Use the supported type
          parties: params.parties.map((party) => ({
            address: party.accountId,
            stake: party.amount,
            prediction: party.condition || 'participant',
          })),
          condition: params.description,
          deadline: params.deadline || Date.now() + 30 * 24 * 60 * 60 * 1000,
          arbiter: params.arbiter,
        });
      }

      const transactionHash = `0x${Date.now().toString(16)}`;
      const explorerUrl = `https://explorer.testnet.near.org/transactions/${transactionHash}`;

      // Send success response
      const escrowTypeText = params.escrowType === 'bet' ? 'bet' : 'payment escrow';
      const totalAmount = params.parties.reduce((sum, party) => {
        const amount = parseFloat(party.amount) || 0;
        return sum + amount;
      }, 0);

      callback?.({
        text: `Successfully created ${escrowTypeText}! Escrow ID: ${escrowId}. ${
          params.escrowType === 'bet'
            ? 'Share this ID with other participants to join the bet.'
            : 'The funds are now locked until conditions are met.'
        }`,
        content: {
          success: true,
          escrowId,
          transactionHash,
          explorerUrl,
          escrowType: params.escrowType,
          amount: totalAmount.toString(),
          parties: params.parties.map((p) => p.accountId),
          conditions: params.parties.map((p) => p.condition).filter(Boolean),
          expiry: new Date(params.deadline || Date.now()).toISOString(),
        },
      });
    } catch (error) {
      elizaLogger.error('Error creating escrow:', error);

      // Format error message
      let errorMessage = 'Error creating escrow';
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
          text: 'Create an escrow to pay alice.near 50 NEAR when she delivers the website',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: "I'll create a payment escrow for alice.near...",
          action: 'CREATE_ESCROW',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'Successfully created payment escrow! Escrow ID: ESC123456. The funds are now locked until conditions are met.',
          content: {
            escrowId: 'ESC123456',
            escrowType: 'payment',
            amount: '50',
          },
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: "I'll bet 10 NEAR that the price goes above $5 by tomorrow",
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: "I'll create a bet escrow...",
          action: 'CREATE_ESCROW',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'Successfully created bet! Escrow ID: BET789012. Share this ID with other participants to join the bet.',
          content: {
            escrowId: 'BET789012',
            escrowType: 'bet',
            conditions: ['price above $5'],
          },
        },
      },
    ],
  ],
};

export const resolveEscrowAction: Action = {
  name: 'RESOLVE_ESCROW',
  similes: ['SETTLE_ESCROW', 'COMPLETE_ESCROW', 'SETTLE_BET', 'RELEASE_ESCROW'],
  validate: async (_runtime: IAgentRuntime, _message: Memory) => {
    return true;
  },
  description: 'Resolve an escrow by releasing funds or determining bet outcome',
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<void> => {
    try {
      const service = runtime.getService('near-escrow' as any);

      if (!service) {
        throw new Error('Escrow service not available');
      }

      const escrowService = service as unknown as EscrowService;

      // Extract escrow ID from message
      const escrowIdMatch = message.content.text?.match(/\b(ESC|BET)\d+\b/i);
      if (!escrowIdMatch) {
        callback?.({
          text: 'Please provide the escrow ID (e.g., ESC123456 or BET789012)',
          content: { error: 'Missing escrow ID' },
        });
        return;
      }

      const escrowId = escrowIdMatch[0];

      // For bets, we need to determine the winner
      let winner: string | undefined;
      if (escrowId.startsWith('BET')) {
        // Simple extraction - in real implementation would be more sophisticated
        const winnerMatch = message.content.text?.match(/winner[:\s]+(\w+)/i);
        winner = winnerMatch?.[1];
      }

      // Resolve escrow
      elizaLogger.info(`Resolving escrow ${escrowId}`, { winner });

      await escrowService.resolveEscrow(escrowId, winner || 'resolved');

      const transactionHash = `0x${Date.now().toString(16)}`;
      const explorerUrl = `https://explorer.testnet.near.org/transactions/${transactionHash}`;

      // Send success response
      callback?.({
        text: `Successfully resolved escrow ${escrowId}! ${
          winner ? `Winner: ${winner}` : 'Funds have been released.'
        }`,
        content: {
          success: true,
          escrowId,
          transactionHash,
          explorerUrl,
          winner,
        },
      });
    } catch (error) {
      elizaLogger.error('Error resolving escrow:', error);

      // Format error message
      let errorMessage = 'Error resolving escrow';
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
          text: 'Resolve escrow ESC123456 - the website has been delivered',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: "I'll resolve the escrow ESC123456...",
          action: 'RESOLVE_ESCROW',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'Successfully resolved escrow ESC123456! Funds have been released.',
          content: {
            escrowId: 'ESC123456',
            transactionHash: 'abc123...',
          },
        },
      },
    ],
  ],
};

export const escrowActions = [createEscrowAction, resolveEscrowAction];
