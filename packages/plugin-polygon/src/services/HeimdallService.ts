import type { OfflineSigner } from '@cosmjs/proto-signing';
import { DirectSecp256k1HdWallet, coins, DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import type { SigningStargateClient, StargateClientOptions } from '@cosmjs/stargate';
import { SigningStargateClient as ConcreteSigningStargateClient } from '@cosmjs/stargate';
import { Service, type IAgentRuntime, logger } from '@elizaos/core';

// Configuration keys expected from the runtime settings
const HEIMDALL_RPC_URL_KEY = 'HEIMDALL_RPC_URL';
const PRIVATE_KEY_KEY = 'PRIVATE_KEY';

/**
 * Enum representing voting options for governance proposals.
 * These values match the Cosmos SDK VoteOption enum values.
 */
export enum VoteOption {
  VOTE_OPTION_UNSPECIFIED = 0,
  VOTE_OPTION_YES = 1,
  VOTE_OPTION_ABSTAIN = 2,
  VOTE_OPTION_NO = 3,
  VOTE_OPTION_NO_WITH_VETO = 4,
}

// Type for standard Cosmos SDK MsgVote
interface MsgVote {
  typeUrl: string;
  value: {
    proposalId: string | number;
    voter: string;
    option: VoteOption;
  };
}

// Interface for Content types in proposals
export interface TextProposal {
  title: string;
  description: string;
}

export interface ParamChange {
  subspace: string;
  key: string;
  value: string;
}

export interface ParameterChangeProposal {
  title: string;
  description: string;
  changes: ParamChange[];
}

export type ProposalContent = TextProposal | ParameterChangeProposal;

// Interface for cosmos sdk transaction return type
interface BroadcastTxSuccess {
  code: number;
  height: number;
  rawLog: string;
  transactionHash: string;
  gasUsed: number;
  gasWanted: number;
}

/**
 * Service for interacting with the Polygon Heimdall layer,
 * primarily for governance actions.
 */
export class HeimdallService extends Service {
  static override serviceType = 'heimdall';
  override capabilityDescription =
    'Provides access to Polygon Heimdall layer for governance operations.';

  private heimdallRpcUrl: string | null = null;
  private privateKey: string | null = null;

  // Fee defaults for Heimdall transactions in MATIC - can be made configurable if needed
  private static readonly DEFAULT_GAS_LIMIT = '200000';
  private static readonly DEFAULT_FEE_AMOUNT = '5000000000000000'; // 0.005 MATIC
  private static readonly DEFAULT_DENOM = 'matic';

  // initializeHeimdallClient will be called by the static start method
  private async initializeHeimdallClient(): Promise<void> {
    if (!this.runtime) {
      logger.error('Agent runtime is not available for HeimdallService.');
      throw new Error('Agent runtime not available.');
    }

    this.heimdallRpcUrl = this.runtime.getSetting(HEIMDALL_RPC_URL_KEY);
    this.privateKey = this.runtime.getSetting(PRIVATE_KEY_KEY);

    if (!this.heimdallRpcUrl) {
      logger.error(`Heimdall RPC URL setting (${HEIMDALL_RPC_URL_KEY}) not found.`);
      throw new Error('Heimdall RPC URL is not configured.');
    }
    if (!this.privateKey) {
      logger.error(`Heimdall private key setting (${PRIVATE_KEY_KEY}) not found.`);
      throw new Error('Heimdall private key is not configured.');
    }
    logger.info('HeimdallService initialized with necessary configurations.');
  }

  static async start(runtime: IAgentRuntime): Promise<HeimdallService> {
    logger.info('Starting HeimdallService...');
    const service = new HeimdallService(runtime);
    await service.initializeHeimdallClient();
    return service;
  }

  static async stop(runtime: IAgentRuntime): Promise<void> {
    logger.info('Stopping HeimdallService...');
    const service = runtime.getService<HeimdallService>(HeimdallService.serviceType);
    if (service) {
      await service.stop();
    }
  }

  async stop(): Promise<void> {
    logger.info('HeimdallService instance stopped.');
    this.heimdallRpcUrl = null;
    this.privateKey = null;
  }

  private async getSigner(): Promise<OfflineSigner> {
    if (!this.privateKey) {
      logger.error('Heimdall private key is not available in getSigner.');
      throw new Error('Heimdall private key is not configured for HeimdallService.');
    }
    try {
      // Convert hex private key to Uint8Array
      // Ensure the private key starts with 0x for consistency, then strip it for Buffer conversion
      const hexKey = this.privateKey.startsWith('0x')
        ? this.privateKey.substring(2)
        : this.privateKey;
      if (!/^[0-9a-fA-F]{64}$/.test(hexKey)) {
        logger.error('Invalid private key format. Expected 64 hex characters.');
        throw new Error('Invalid private key format.');
      }
      const privateKeyBytes = Uint8Array.from(Buffer.from(hexKey, 'hex'));

      const signer = await DirectSecp256k1Wallet.fromKey(privateKeyBytes, 'heimdall');
      return signer;
    } catch (error) {
      logger.error(
        'Failed to create Heimdall signer from private key.',
        error instanceof Error ? error.message : String(error)
      );
      throw new Error('Failed to create Heimdall signer.');
    }
  }

  public async getSigningClient(): Promise<SigningStargateClient> {
    if (!this.heimdallRpcUrl) {
      logger.error('Heimdall RPC URL is not available in getSigningClient.');
      throw new Error('Heimdall RPC URL is not configured for HeimdallService.');
    }

    try {
      const signer = await this.getSigner();
      const options: StargateClientOptions = {};
      const client = await ConcreteSigningStargateClient.connectWithSigner(
        this.heimdallRpcUrl,
        signer,
        options
      );
      logger.debug('Successfully connected to Heimdall RPC with signer.');
      return client;
    } catch (error) {
      logger.error(
        'Failed to connect to Heimdall RPC with signer.',
        error instanceof Error ? error.message : String(error)
      );
      throw new Error('Failed to connect to Heimdall RPC with signer.');
    }
  }

  /**
   * Asserts that a transaction was successful by checking its code.
   * @param result The broadcast tx result to check
   * @throws Error if the transaction failed
   */
  private assertIsBroadcastTxSuccess(result: {
    code?: number;
    rawLog?: string;
  }): asserts result is BroadcastTxSuccess {
    if ('code' in result && result.code !== 0) {
      const message = result.rawLog || 'Transaction failed';
      throw new Error(`Error when broadcasting tx: ${message}`);
    }
  }

  /**
   * Vote on a Heimdall governance proposal.
   *
   * @param proposalId The ID of the proposal to vote on
   * @param option The vote option (YES, NO, etc.)
   * @returns The transaction hash if successful
   */
  public async voteOnProposal(proposalId: string | number, option: VoteOption): Promise<string> {
    logger.info(`Attempting to vote on proposal ${proposalId} with option ${VoteOption[option]}`);

    try {
      // Step 1: Get the signing client and first account/signer
      const client = await this.getSigningClient();
      const signer = await this.getSigner();
      const accounts = await signer.getAccounts();
      if (accounts.length === 0) {
        throw new Error('No accounts found in wallet');
      }
      const voter = accounts[0].address;
      logger.debug(`Voter address: ${voter}`);

      // Step 2: Construct the MsgVote with the proper typeUrl
      const msgVote: MsgVote = {
        typeUrl: '/cosmos.gov.v1beta1.MsgVote',
        value: {
          proposalId: proposalId.toString(), // Ensure proposalId is a string
          voter: voter,
          option: option,
        },
      };

      // Step 3: Prepare fee
      const fee = {
        amount: coins(HeimdallService.DEFAULT_FEE_AMOUNT, HeimdallService.DEFAULT_DENOM),
        gas: HeimdallService.DEFAULT_GAS_LIMIT,
      };

      // Step 4: Broadcast the transaction
      logger.debug('Broadcasting vote transaction...');
      const result = await client.signAndBroadcast(voter, [msgVote], fee);

      // Step 5: Check for success and return tx hash
      this.assertIsBroadcastTxSuccess(result);
      logger.info(
        `Successfully voted on proposal ${proposalId}, tx hash: ${result.transactionHash}`
      );
      return result.transactionHash;
    } catch (error) {
      // Convert error to a more user-friendly format
      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message;
        // Add more specific error handling based on error messages
        if (errorMessage.includes('insufficient fee')) {
          errorMessage =
            'Insufficient fee for Heimdall transaction. Try increasing the fee amount.';
        } else if (
          errorMessage.includes('proposal not found') ||
          errorMessage.includes('not found')
        ) {
          errorMessage = `Proposal ${proposalId} not found or no longer in voting period.`;
        } else if (errorMessage.includes('already voted')) {
          errorMessage = `This account has already voted on proposal ${proposalId}.`;
        }
      } else {
        errorMessage = String(error);
      }

      logger.error(`Failed to vote on proposal ${proposalId}:`, errorMessage);
      throw new Error(`Vote failed: ${errorMessage}`);
    }
  }

  public async submitProposal(
    content: ProposalContent,
    initialDepositAmount: string,
    initialDepositDenom = 'matic'
  ): Promise<string> {
    const contentType = 'changes' in content ? 'ParameterChangeProposal' : 'TextProposal';
    logger.info(`Attempting to submit ${contentType}`);

    try {
      // Step 1: Get the signing client and first account/signer
      const client = await this.getSigningClient();
      const signer = await this.getSigner();
      const accounts = await signer.getAccounts();
      if (accounts.length === 0) {
        throw new Error('No accounts found in wallet');
      }
      const proposer = accounts[0].address;
      logger.debug(`Proposal from address: ${proposer}`);

      // Step 2: Construct the proposal content based on its type
      let typeUrl: string;
      if ('changes' in content) {
        // It's a ParameterChangeProposal
        typeUrl = '/cosmos.params.v1beta1.ParameterChangeProposal';
        logger.debug(`Parameter change proposal: ${content.title}`);
        // The content is passed directly as the 'content' field in MsgSubmitProposal
      } else {
        // It's a TextProposal
        typeUrl = '/cosmos.gov.v1beta1.TextProposal';
        logger.debug(`Text proposal: ${content.title}`);
        // The content is passed directly as the 'content' field in MsgSubmitProposal
      }

      // Step 3: Construct the MsgSubmitProposal
      const msgSubmitProposal = {
        typeUrl: '/cosmos.gov.v1beta1.MsgSubmitProposal',
        value: {
          content: {
            typeUrl,
            value: content, // When using cosmjs, this will get properly converted/encoded
          },
          initialDeposit: coins(initialDepositAmount, initialDepositDenom),
          proposer,
        },
      };

      // Step 4: Prepare fee
      const fee = {
        amount: coins(HeimdallService.DEFAULT_FEE_AMOUNT, HeimdallService.DEFAULT_DENOM),
        gas: HeimdallService.DEFAULT_GAS_LIMIT,
      };

      // Step 5: Broadcast the transaction
      logger.debug('Broadcasting submit proposal transaction...');
      const result = await client.signAndBroadcast(proposer, [msgSubmitProposal], fee);

      // Step 6: Check for success and return tx hash
      this.assertIsBroadcastTxSuccess(result);
      logger.info(`Successfully submitted proposal, tx hash: ${result.transactionHash}`);
      return result.transactionHash;
    } catch (error) {
      // Convert error to a more user-friendly format
      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message;
        // Add more specific error handling
        if (errorMessage.includes('insufficient fee')) {
          errorMessage =
            'Insufficient fee for Heimdall transaction. Try increasing the fee amount.';
        } else if (errorMessage.includes('minimum deposit')) {
          errorMessage = 'The initial deposit is below the minimum required for proposals.';
        }
      } else {
        errorMessage = String(error);
      }

      logger.error('Failed to submit proposal:', errorMessage);
      throw new Error(`Proposal submission failed: ${errorMessage}`);
    }
  }

  public async transferHeimdallTokens(
    recipientAddress: string,
    amount: string,
    denom = 'matic'
  ): Promise<string> {
    logger.info(`Attempting to transfer ${amount} ${denom} to ${recipientAddress} on Heimdall`);

    try {
      // Step 1: Get the signing client and first account/signer
      const client = await this.getSigningClient();
      const signer = await this.getSigner();
      const accounts = await signer.getAccounts();
      if (accounts.length === 0) {
        throw new Error('No accounts found in wallet');
      }
      const sender = accounts[0].address;
      logger.debug(`Sender address: ${sender}`);

      // Validate recipient address
      if (!recipientAddress.startsWith('heimdall')) {
        throw new Error(
          `Invalid recipient address format: ${recipientAddress}. Must start with "heimdall"`
        );
      }

      // Step 2: Construct the MsgSend for token transfer
      const msgSend = {
        typeUrl: '/cosmos.bank.v1beta1.MsgSend',
        value: {
          fromAddress: sender,
          toAddress: recipientAddress,
          amount: coins(amount, denom),
        },
      };

      // Step 3: Prepare fee
      const fee = {
        amount: coins(HeimdallService.DEFAULT_FEE_AMOUNT, HeimdallService.DEFAULT_DENOM),
        gas: HeimdallService.DEFAULT_GAS_LIMIT,
      };

      // Step 4: Broadcast the transaction
      logger.debug(`Broadcasting transfer transaction to ${recipientAddress}...`);
      const result = await client.signAndBroadcast(sender, [msgSend], fee);

      // Step 5: Check for success and return tx hash
      this.assertIsBroadcastTxSuccess(result);
      logger.info(
        `Successfully transferred ${amount} ${denom} to ${recipientAddress}, tx hash: ${result.transactionHash}`
      );
      return result.transactionHash;
    } catch (error) {
      // Convert error to a more user-friendly format
      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message;
        // Add more specific error handling
        if (errorMessage.includes('insufficient fee')) {
          errorMessage =
            'Insufficient fee for Heimdall transaction. Try increasing the fee amount.';
        } else if (errorMessage.includes('insufficient funds')) {
          errorMessage = `Insufficient funds to transfer ${amount} ${denom}. Check your balance on Heimdall.`;
        }
      } else {
        errorMessage = String(error);
      }

      logger.error(`Failed to transfer tokens to ${recipientAddress}:`, errorMessage);
      throw new Error(`Transfer failed: ${errorMessage}`);
    }
  }
}

// Example of how this service might be registered in your plugin's main file (e.g., src/index.ts)
/*
import { ElizaOSAgent } from "@elizaos/core";
import { HeimdallService } from "./services/HeimdallService";

export default class MyPolygonPlugin extends ElizaOSAgent {
	async onReady() {
		await super.onReady();

		// Register the HeimdallService
		if (this.runtime) {
			this.runtime.registerService(HeimdallService.serviceType, async (runtime) => {
				return HeimdallService.start(runtime);
			});
			logger.info("MyPolygonPlugin: HeimdallService registered.");
		} else {
			logger.error("MyPolygonPlugin: Runtime not available to register HeimdallService.");
		}

		// You can now access the service via runtime.getService<HeimdallService>(HeimdallService.serviceType)
		// Example:
		// const heimdallService = this.runtime?.getService<HeimdallService>(HeimdallService.serviceType);
		// if (heimdallService) {
		//   const client = await heimdallService.getSigningClient();
		//   logger.info("Got Heimdall client from service:", client?.registry?.toString());
		// }
	}
}
*/
