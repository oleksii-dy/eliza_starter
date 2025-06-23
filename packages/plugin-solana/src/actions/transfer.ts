import {
  type Action,
  type ActionExample,
  type Content,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  ModelType,
  type State,
  composePromptFromState,
  logger,
  parseJSONObjectFromText,
} from '@elizaos/core';
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { getWalletKey } from '../keypairUtils';
import { SolanaActionResult } from '../types';
import { TransactionService } from '../services/TransactionService';

/**
 * Interface representing the content of a transfer.
 *
 * @interface TransferContent
 * @extends Content
 * @property {string | null} tokenAddress - The address of the token being transferred, or null for SOL transfers
 * @property {string} recipient - The address of the recipient of the transfer
 * @property {string | number} amount - The amount of the transfer, represented as a string or number
 */
interface TransferContent extends Content {
  tokenAddress: string | null; // null for SOL transfers
  recipient: string;
  amount: string | number;
}

/**
 * Checks if the given transfer content is valid based on the type of transfer.
 * @param {TransferContent} content - The content to be validated for transfer.
 * @returns {boolean} Returns true if the content is valid for transfer, and false otherwise.
 */
function isTransferContent(content: TransferContent): boolean {
  logger.log('Content for transfer', content);

  // Base validation
  if (!content.recipient || typeof content.recipient !== 'string' || !content.amount) {
    return false;
  }

  if (content.tokenAddress === 'null') {
    content.tokenAddress = null;
  }

  return typeof content.amount === 'string' || typeof content.amount === 'number';
}

/**
 * Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.
 *
 * Example responses:
 * For SPL tokens:
 * ```json
 * {
 *    "tokenAddress": "BieefG47jAHCGZBxi2q87RDuHyGZyYC3vAzxpyu8pump",
 *    "recipient": "9jW8FPr6BSSsemWPV22UUCzSqkVdTp6HTyPqeqyuBbCa",
 *    "amount": "1000"
 * }
 * ```
 *
 * For SOL:
 * ```json
 * {
 *    "tokenAddress": null,
 *    "recipient": "9jW8FPr6BSSsemWPV22UUCzSqkVdTp6HTyPqeqyuBbCa",
 *    "amount": 1.5
 * }
 * ```
 *
 * {{recentMessages}}
 *
 * Extract the following information about the requested transfer:
 * - Token contract address (use null for SOL transfers)
 * - Recipient wallet address
 * - Amount to transfer
 */
const transferTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example responses:
For SPL tokens:
\`\`\`json
{
    "tokenAddress": "BieefG47jAHCGZBxi2q87RDuHyGZyYC3vAzxpyu8pump",
    "recipient": "9jW8FPr6BSSsemWPV22UUCzSqkVdTp6HTyPqeqyuBbCa",
    "amount": "1000"
}
\`\`\`

For SOL:
\`\`\`json
{
    "tokenAddress": null,
    "recipient": "9jW8FPr6BSSsemWPV22UUCzSqkVdTp6HTyPqeqyuBbCa",
    "amount": 1.5
}
\`\`\`

{{recentMessages}}

Extract the following information about the requested transfer:
- Token contract address (use null for SOL transfers)
- Recipient wallet address
- Amount to transfer
`;

export default {
  name: 'TRANSFER_SOLANA',
  similes: [
    'TRANSFER_SOL',
    'SEND_TOKEN_SOLANA',
    'TRANSFER_TOKEN_SOLANA',
    'SEND_TOKENS_SOLANA',
    'TRANSFER_TOKENS_SOLANA',
    'SEND_SOL',
    'SEND_TOKEN_SOL',
    'PAY_SOL',
    'PAY_TOKEN_SOL',
    'PAY_TOKENS_SOL',
    'PAY_TOKENS_SOLANA',
    'PAY_SOLANA',
  ],
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    logger.log('Validating transfer from entity:', message.entityId);

    // Check if this is a system/agent action
    if (message.entityId === runtime.agentId) {
      return true;
    }

    // Get trust engine service for trust-based validation
    const trustService = runtime.getService('trust-engine');
    if (!trustService) {
      logger.warn('[Transfer] Trust engine service not available, denying access');
      return false;
    }

    try {
      const trustEngine = (trustService as any).trustEngine;
      if (!trustEngine) {
        logger.warn('[Transfer] Trust engine not initialized, denying access');
        return false;
      }

      // Calculate current trust level
      const trust = await trustEngine.calculateTrust(message.entityId, {
        evaluatorId: runtime.agentId,
        roomId: message.roomId,
      });

      // Require high trust (80) for financial transfers
      const requiredTrust = 80;

      if (trust.overallTrust < requiredTrust) {
        logger.warn(
          `[Transfer] Insufficient trust for transfer: ${trust.overallTrust.toFixed(1)} < ${requiredTrust} for entity ${message.entityId}`
        );
        return false;
      }

      logger.debug(
        `[Transfer] Trust validation passed: ${trust.overallTrust.toFixed(1)} >= ${requiredTrust}`
      );
      return true;
    } catch (error) {
      logger.error('[Transfer] Error during trust validation:', error);
      return false;
    }
  },
  description: 'Transfer SOL or SPL tokens to another address on Solana.',
  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    state: State,
    _options: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<SolanaActionResult> => {
    logger.log('Starting TRANSFER handler...');

    const transferPrompt = composePromptFromState({
      state: state,
      template: transferTemplate,
    });

    const result = await runtime.useModel(ModelType.TEXT_LARGE, {
      prompt: transferPrompt,
    });

    const content = parseJSONObjectFromText(result) as TransferContent;

    if (!isTransferContent(content)) {
      if (callback) {
        callback({
          text: 'Need a valid recipient address and amount to transfer.',
          content: { error: 'Invalid transfer content' },
        });
      }
      return {
        success: false,
        message: 'Need a valid recipient address and amount to transfer.',
        data: { error: 'Invalid transfer content' },
      };
    }

    try {
      const { keypair: senderKeypair } = await getWalletKey(runtime, true);
      if (!senderKeypair) {
        if (callback) {
          callback({
            text: 'Failed to access wallet. Please ensure your wallet is configured correctly.',
            content: { error: 'Wallet not available' },
          });
        }
        return {
          success: false,
          message: 'Failed to access wallet',
          data: { error: 'Wallet not available' },
        };
      }

      const connection = new Connection(
        runtime.getSetting('SOLANA_RPC_URL') || 'https://api.mainnet-beta.solana.com'
      );
      const recipientPubkey = new PublicKey(content.recipient);

      let signature: string;

      // Handle SOL transfer
      if (content.tokenAddress === null) {
        const lamports = Number(content.amount) * 1e9;

        const instruction = SystemProgram.transfer({
          fromPubkey: senderKeypair.publicKey,
          toPubkey: recipientPubkey,
          lamports,
        });

        const messageV0 = new TransactionMessage({
          payerKey: senderKeypair.publicKey,
          recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
          instructions: [instruction],
        }).compileToV0Message();

        const transaction = new VersionedTransaction(messageV0);
        transaction.sign([senderKeypair]);

        signature = await connection.sendTransaction(transaction);

        if (callback) {
          callback({
            text: `Sent ${content.amount} SOL. Transaction hash: ${signature}`,
            content: {
              success: true,
              signature,
              amount: content.amount,
              recipient: content.recipient,
            },
          });
        }
      }
      // Handle SPL token transfer
      else {
        const mintPubkey = new PublicKey(content.tokenAddress);
        const mintInfo = await connection.getParsedAccountInfo(mintPubkey);
        const decimals =
          (mintInfo.value?.data as { parsed: { info: { decimals: number } } })?.parsed?.info
            ?.decimals ?? 9;
        const adjustedAmount = BigInt(Number(content.amount) * 10 ** decimals);

        const senderATA = getAssociatedTokenAddressSync(mintPubkey, senderKeypair.publicKey);
        const recipientATA = getAssociatedTokenAddressSync(mintPubkey, recipientPubkey);

        const instructions = [];

        const recipientATAInfo = await connection.getAccountInfo(recipientATA);
        if (!recipientATAInfo) {
          instructions.push(
            createAssociatedTokenAccountInstruction(
              senderKeypair.publicKey,
              recipientATA,
              recipientPubkey,
              mintPubkey
            )
          );
        }

        instructions.push(
          createTransferInstruction(
            senderATA,
            recipientATA,
            senderKeypair.publicKey,
            adjustedAmount
          )
        );

        const messageV0 = new TransactionMessage({
          payerKey: senderKeypair.publicKey,
          recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
          instructions,
        }).compileToV0Message();

        const transaction = new VersionedTransaction(messageV0);
        transaction.sign([senderKeypair]);

        signature = await connection.sendTransaction(transaction);

        if (callback) {
          callback({
            text: `Sent ${content.amount} tokens to ${content.recipient}\nTransaction hash: ${signature}`,
            content: {
              success: true,
              signature,
              amount: content.amount,
              recipient: content.recipient,
            },
          });
        }
      }

      return {
        success: true,
        message:
          content.tokenAddress === null
            ? `Sent ${content.amount} SOL to ${content.recipient}. Transaction: ${signature}`
            : `Sent ${content.amount} tokens to ${content.recipient}. Transaction: ${signature}`,
        data: {
          transactionId: signature,
          amount: content.amount.toString(),
          recipient: content.recipient,
          tokenAddress: content.tokenAddress || undefined,
          sender: senderKeypair.publicKey.toBase58(),
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Error during transfer:', error);
      if (callback) {
        callback({
          text: `Transfer failed: ${errorMessage}`,
          content: { error: errorMessage },
        });
      }
      return {
        success: false,
        message: `Transfer failed: ${errorMessage}`,
        data: { error: errorMessage },
      };
    }
  },

  examples: [
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Send 1.5 SOL to 9jW8FPr6BSSsemWPV22UUCzSqkVdTp6HTyPqeqyuBbCa',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: 'Sending SOL now...',
          actions: ['TRANSFER_SOLANA'],
        },
      },
    ],
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Send 69 $DEGENAI BieefG47jAHCGZBxi2q87RDuHyGZyYC3vAzxpyu8pump to 9jW8FPr6BSSsemWPV22UUCzSqkVdTp6HTyPqeqyuBbCa',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: 'Sending the tokens now...',
          actions: ['TRANSFER_SOLANA'],
        },
      },
    ],
  ] as ActionExample[][],
} as Action;
