import {
  type Action,
  type ActionExample,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  ModelType,
  type State,
  composePromptFromState,
  logger,
  parseKeyValueXml,
} from '@elizaos/core';
import {
  Connection,
  PublicKey,
  StakeProgram,
  Authorized,
  Lockup,
  LAMPORTS_PER_SOL,
  Transaction,
  Keypair,
} from '@solana/web3.js';
import { getWalletKey } from '../keypairUtils';
import { SolanaActionResult } from '../types';
import { TransactionService } from '../services/TransactionService';

const stakeTemplate = `Extract the following information about the requested staking from the user's message.

{{recentMessages}}

Extract the following information about the requested staking:
- Amount of SOL to stake
- Validator address (optional - if not provided, we'll use a default)

Return an XML object with these fields:
<response>
  <amount>Amount of SOL to stake as a number</amount>
  <validatorAddress>Validator address if provided</validatorAddress>
</response>

Use empty tags for any values that cannot be determined.

## Example Output Format
<response>
  <amount>1.5</amount>
  <validatorAddress>7Np41oeYqPefeNQEHSv1UDhYrehxin3NStELsSKCT4K2</validatorAddress>
</response>`;

export const stakeSOL: Action = {
  name: 'STAKE_SOL',
  similes: ['STAKE_SOLANA', 'DELEGATE_SOL', 'STAKE_TO_VALIDATOR', 'EARN_STAKING_REWARDS'],
  enabled: false, // Disabled by default - potentially dangerous, can stake funds and lock them up
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    // Check if this is a system/agent action
    if (message.entityId === runtime.agentId) {
      return true;
    }

    // Get trust engine service for trust-based validation
    const trustService = runtime.getService('trust-engine');
    if (!trustService) {
      logger.warn('[Stake] Trust engine service not available, denying access');
      return false;
    }

    try {
      const trustEngine = (trustService as any).trustEngine;
      if (!trustEngine) {
        logger.warn('[Stake] Trust engine not initialized, denying access');
        return false;
      }

      // Calculate current trust level
      const trust = await trustEngine.calculateTrust(message.entityId, {
        evaluatorId: runtime.agentId,
        roomId: message.roomId,
      });

      // Require moderate trust (70) for staking operations (can be recovered)
      const requiredTrust = 70;

      if (trust.overallTrust < requiredTrust) {
        logger.warn(
          `[Stake] Insufficient trust for stake: ${trust.overallTrust.toFixed(1)} < ${requiredTrust} for entity ${message.entityId}`
        );
        return false;
      }

      logger.debug(
        `[Stake] Trust validation passed: ${trust.overallTrust.toFixed(1)} >= ${requiredTrust}`
      );
      return true;
    } catch (error) {
      logger.error('[Stake] Error during trust validation:', error);
      return false;
    }
  },
  description: 'Stake SOL to a validator to earn staking rewards on the Solana network.',
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    _options: { [key: string]: unknown } | undefined,
    callback?: HandlerCallback
  ): Promise<SolanaActionResult> => {
    state = await runtime.composeState(message, ['RECENT_MESSAGES']);

    try {
      const stakePrompt = composePromptFromState({
        state,
        template: stakeTemplate,
      });

      const result = await runtime.useModel(ModelType.TEXT_LARGE, {
        prompt: stakePrompt,
      });

      const parsedResult = parseKeyValueXml(result);
      if (!parsedResult) {
        callback?.({ text: 'Failed to parse staking parameters from request' });
        return {
          success: false,
          message: 'Failed to parse staking parameters',
          data: { error: 'Parse error' },
        };
      }

      const response = {
        amount: parseFloat(parsedResult.amount || '0'),
        validatorAddress: parsedResult.validatorAddress,
      };

      if (!parsedResult.amount || response.amount <= 0) {
        callback?.({ text: 'Please specify a valid amount of SOL to stake' });
        return {
          success: false,
          message: 'Please specify a valid amount of SOL to stake',
          data: { error: 'Invalid stake amount' },
        };
      }

      const connection = new Connection(
        runtime.getSetting('SOLANA_RPC_URL') || 'https://api.mainnet-beta.solana.com'
      );

      const { keypair: walletKeypair } = await getWalletKey(runtime, true);
      if (!walletKeypair) {
        callback?.({
          text: 'Failed to access wallet. Please ensure your wallet is configured correctly.',
        });
        return {
          success: false,
          message: 'Failed to access wallet',
          data: { error: 'Wallet not available' },
        };
      }

      const transactionService = runtime.getService<TransactionService>('transaction');

      // Create a new stake account
      const stakeAccount = Keypair.generate();
      const lamports = response.amount * LAMPORTS_PER_SOL;

      // Use a default validator if none provided
      const validatorPubkey = response.validatorAddress
        ? new PublicKey(response.validatorAddress)
        : new PublicKey('7Np41oeYqPefeNQEHSv1UDhYrehxin3NStELsSKCT4K2'); // Example: Marinade validator

      // Get minimum rent exemption
      const rentExemption = await connection.getMinimumBalanceForRentExemption(StakeProgram.space);

      // Create stake account
      const createAccountTx = StakeProgram.createAccount({
        fromPubkey: walletKeypair.publicKey,
        stakePubkey: stakeAccount.publicKey,
        authorized: new Authorized(walletKeypair.publicKey, walletKeypair.publicKey),
        lockup: new Lockup(0, 0, walletKeypair.publicKey),
        lamports: lamports + rentExemption,
      });

      // Delegate stake to validator
      const delegateInstruction = StakeProgram.delegate({
        stakePubkey: stakeAccount.publicKey,
        authorizedPubkey: walletKeypair.publicKey,
        votePubkey: validatorPubkey,
      });

      // Use transaction service for better error handling and retries
      if (transactionService) {
        // Create a new transaction and add all instructions
        const transaction = new Transaction();

        // Add create account instructions
        if ('instructions' in createAccountTx && Array.isArray(createAccountTx.instructions)) {
          createAccountTx.instructions.forEach((ix) => transaction.add(ix));
        }

        // Add delegate instruction
        transaction.add(delegateInstruction);

        const signature = await transactionService.sendTransaction(transaction, [walletKeypair], {
          priorityFee: 10000,
          simulateFirst: true,
        });

        logger.info('Stake delegation successful', {
          validator: validatorPubkey.toString(),
          amount: response.amount,
          signature,
        });

        if (callback) {
          await callback({
            text: `Successfully staked ${response.amount} SOL to validator ${validatorPubkey.toString()}\nTransaction: ${signature}`,
            actions: ['STAKE_SOL'],
          });
        }

        return {
          success: true,
          message: `Successfully staked ${response.amount} SOL to validator ${validatorPubkey.toString()}`,
          data: {
            amount: response.amount.toString(),
            validator: validatorPubkey.toString(),
            signature,
          },
        };
      } else {
        // Fallback to direct transaction handling
        const transaction = new Transaction();
        createAccountTx.instructions.forEach((ix) => transaction.add(ix));
        transaction.add(delegateInstruction);

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = walletKeypair.publicKey;
        transaction.sign(walletKeypair, stakeAccount);

        const signature = await connection.sendRawTransaction(transaction.serialize());
        await connection.confirmTransaction(signature, 'confirmed');

        callback?.({
          text: `Successfully staked ${response.amount} SOL! Transaction ID: ${signature}`,
          content: {
            success: true,
            txid: signature,
            stakeAccount: stakeAccount.publicKey.toBase58(),
            validator: validatorPubkey.toBase58(),
          },
        });

        return {
          success: true,
          message: `Successfully staked ${response.amount} SOL to validator ${validatorPubkey.toBase58()}`,
          data: {
            transactionId: signature,
            amount: response.amount.toString(),
            stakeAccount: stakeAccount.publicKey.toBase58(),
            validator: validatorPubkey.toBase58(),
          },
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Error during SOL staking:', error);
      callback?.({
        text: `Staking failed: ${errorMessage}`,
        content: { error: errorMessage },
      });
      return {
        success: false,
        message: `Staking failed: ${errorMessage}`,
        data: { error: errorMessage },
      };
    }
  },
  examples: [
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Stake 10 SOL',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: "I'll help you stake 10 SOL to earn rewards",
          actions: ['STAKE_SOL'],
        },
      },
    ],
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Stake 5 SOL to validator 7Np41oeYqPefeNQEHSv1UDhYrehxin3NStELsSKCT4K2',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: "I'll stake 5 SOL to that validator for you",
          actions: ['STAKE_SOL'],
        },
      },
    ],
  ] as ActionExample[][],
};
