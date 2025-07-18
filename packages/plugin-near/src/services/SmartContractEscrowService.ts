import { elizaLogger } from '@elizaos/core';
import { BaseNearService } from './base/BaseService';
import { WalletService } from './WalletService';
import { utils } from 'near-api-js';
import type { EscrowParams, EscrowContent } from '../core/types';
import { NearPluginError, NearErrorCode } from '../core/errors';
import NodeCache from 'node-cache';

interface EscrowContract {
  escrowId: string;
  escrowType: string;
  parties: Array<{
    accountId: string;
    amount: string;
    condition?: string;
    hasDeposited: boolean;
    hasApproved: boolean;
  }>;
  arbiter: string;
  description: string;
  state: 'pending' | 'active' | 'resolved' | 'cancelled';
  createdAt: number;
  deadline: number;
  totalAmount: string;
  winner?: string;
}

export class SmartContractEscrowService extends BaseNearService {
  static serviceType = 'near-escrow';
  capabilityDescription = 'Manages escrow contracts on NEAR blockchain';

  static async start(runtime: any): Promise<SmartContractEscrowService> {
    const service = new SmartContractEscrowService();
    await service.initialize(runtime);
    return service;
  }

  private walletService!: WalletService;
  private escrowContract?: string;
  private cache: NodeCache;

  constructor() {
    super();
    this.cache = new NodeCache({ stdTTL: 300 }); // 5 minute cache
  }

  async onInitialize(): Promise<void> {
    const walletService = this.runtime.getService<WalletService>('near-wallet' as any);
    if (!walletService) {
      throw new Error('WalletService is required for SmartContractEscrowService');
    }
    this.walletService = walletService;

    // Get escrow contract address from settings
    this.escrowContract = this.runtime.getSetting('NEAR_ESCROW_CONTRACT');

    if (!this.escrowContract) {
      throw new NearPluginError(
        NearErrorCode.INVALID_CONFIG,
        'NEAR_ESCROW_CONTRACT not configured. Please set the escrow contract address in your environment.'
      );
    }

    // Test contract connection
    await this.testContractConnection();

    elizaLogger.info(
      `SmartContractEscrowService initialized with contract: ${this.escrowContract}`
    );
  }

  private async testContractConnection(): Promise<void> {
    // Skip contract verification in test mode
    if (process.env.SKIP_CONTRACT_VERIFICATION === 'true') {
      elizaLogger.info('Skipping escrow contract verification in test mode');
      return;
    }

    if (!this.escrowContract) {
      throw new NearPluginError(NearErrorCode.INVALID_CONFIG, 'No escrow contract configured');
    }

    try {
      const account = await this.walletService.getAccount();
      const result = await account.viewFunction({
        contractId: this.escrowContract,
        methodName: 'get_info',
        args: {},
      });

      elizaLogger.info('Escrow contract connection successful:', result);
    } catch (error: any) {
      throw new NearPluginError(
        NearErrorCode.RPC_ERROR,
        `Failed to connect to escrow contract at ${this.escrowContract}: ${error.message}`,
        error
      );
    }
  }

  async createEscrow(params: EscrowParams): Promise<string> {
    if (!this.escrowContract) {
      throw new NearPluginError(NearErrorCode.INVALID_CONFIG, 'No escrow contract configured');
    }

    try {
      const account = await this.walletService.getAccount();

      // Convert NEAR amounts to yoctoNEAR
      const parties = params.parties.map((party) => ({
        account_id: party.accountId,
        deposit: utils.format.parseNearAmount(party.amount) || '0',
        condition: party.condition,
      }));

      const result = await account.functionCall({
        contractId: this.escrowContract,
        methodName: 'create_escrow',
        args: {
          escrow_type: params.escrowType,
          parties,
          arbiter: params.arbiter,
          description: params.description,
          deadline: params.deadline || Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days default
        },
        gas: 100000000000000n, // 100 TGas
        attachedDeposit: 1n, // 1 yoctoNEAR for storage
      });

      const escrowId = result.receipts_outcome[0]?.outcome?.logs?.[0]?.match(/ESC\d+/)?.[0];
      if (!escrowId) {
        throw new Error('Failed to extract escrow ID from transaction result');
      }

      elizaLogger.success(`Created escrow ${escrowId} on-chain`);
      return escrowId;
    } catch (error: any) {
      throw new NearPluginError(
        NearErrorCode.TRANSACTION_FAILED,
        `Failed to create escrow: ${error.message}`,
        error
      );
    }
  }

  async deposit(escrowId: string, amount: string): Promise<void> {
    if (!this.escrowContract) {
      throw new NearPluginError(NearErrorCode.INVALID_CONFIG, 'No escrow contract configured');
    }

    try {
      const account = await this.walletService.getAccount();
      const depositAmount = utils.format.parseNearAmount(amount);

      if (!depositAmount) {
        throw new Error('Invalid deposit amount');
      }

      await account.functionCall({
        contractId: this.escrowContract,
        methodName: 'deposit',
        args: { escrow_id: escrowId },
        gas: 50000000000000n, // 50 TGas
        attachedDeposit: BigInt(depositAmount),
      });

      elizaLogger.success(`Deposited ${amount} NEAR to escrow ${escrowId}`);
    } catch (error: any) {
      throw new NearPluginError(
        NearErrorCode.TRANSACTION_FAILED,
        `Failed to deposit to escrow: ${error.message}`,
        error
      );
    }
  }

  async resolveEscrow(escrowId: string, winnerId: string): Promise<void> {
    if (!this.escrowContract) {
      throw new NearPluginError(NearErrorCode.INVALID_CONFIG, 'No escrow contract configured');
    }

    try {
      const account = await this.walletService.getAccount();

      await account.functionCall({
        contractId: this.escrowContract,
        methodName: 'resolve_escrow',
        args: {
          escrow_id: escrowId,
          winner_id: winnerId,
        },
        gas: 100000000000000n, // 100 TGas
        attachedDeposit: 1n,
      });

      elizaLogger.success(`Resolved escrow ${escrowId} in favor of ${winnerId}`);
    } catch (error: any) {
      throw new NearPluginError(
        NearErrorCode.TRANSACTION_FAILED,
        `Failed to resolve escrow: ${error.message}`,
        error
      );
    }
  }

  async cancelEscrow(escrowId: string): Promise<void> {
    if (!this.escrowContract) {
      throw new NearPluginError(NearErrorCode.INVALID_CONFIG, 'No escrow contract configured');
    }

    try {
      const account = await this.walletService.getAccount();

      await account.functionCall({
        contractId: this.escrowContract,
        methodName: 'cancel_escrow',
        args: { escrow_id: escrowId },
        gas: 100000000000000n, // 100 TGas
        attachedDeposit: 1n,
      });

      elizaLogger.success(`Cancelled escrow ${escrowId}`);
    } catch (error: any) {
      throw new NearPluginError(
        NearErrorCode.TRANSACTION_FAILED,
        `Failed to cancel escrow: ${error.message}`,
        error
      );
    }
  }

  async getEscrow(escrowId: string): Promise<EscrowContract | null> {
    if (!this.escrowContract) {
      throw new NearPluginError(NearErrorCode.INVALID_CONFIG, 'No escrow contract configured');
    }

    // Check cache first
    const cacheKey = `escrow:${escrowId}`;
    const cached = this.cache.get<EscrowContract>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const account = await this.walletService.getAccount();

      const escrow = await account.viewFunction({
        contractId: this.escrowContract,
        methodName: 'get_escrow',
        args: { escrow_id: escrowId },
      });

      if (!escrow) {
        return null;
      }

      // Convert on-chain format to our format
      const formatted: EscrowContract = {
        escrowId: escrow.escrow_id,
        escrowType: escrow.escrow_type,
        parties: escrow.parties.map((p: any) => ({
          accountId: p.account_id,
          amount: utils.format.formatNearAmount(p.deposit.toString()),
          condition: p.condition,
          hasDeposited: p.has_deposited,
          hasApproved: p.has_approved,
        })),
        arbiter: escrow.arbiter,
        description: escrow.description,
        state: escrow.state.toLowerCase(),
        createdAt: parseInt(escrow.created_at),
        deadline: parseInt(escrow.deadline),
        totalAmount: utils.format.formatNearAmount(escrow.total_amount.toString()),
        winner: escrow.winner,
      };

      // Cache for 5 minutes
      this.cache.set(cacheKey, formatted);
      return formatted;
    } catch (error: any) {
      throw new NearPluginError(
        NearErrorCode.RPC_ERROR,
        `Failed to get escrow details: ${error.message}`,
        error
      );
    }
  }

  async getUserEscrows(accountId: string): Promise<string[]> {
    if (!this.escrowContract) {
      throw new NearPluginError(NearErrorCode.INVALID_CONFIG, 'No escrow contract configured');
    }

    try {
      const account = await this.walletService.getAccount();

      const escrows = await account.viewFunction({
        contractId: this.escrowContract,
        methodName: 'get_user_escrows',
        args: { account_id: accountId },
      });

      return escrows || [];
    } catch (error: any) {
      throw new NearPluginError(
        NearErrorCode.RPC_ERROR,
        `Failed to get user escrows: ${error.message}`,
        error
      );
    }
  }

  async getActiveEscrows(fromIndex = 0, limit = 10): Promise<EscrowContract[]> {
    if (!this.escrowContract) {
      throw new NearPluginError(NearErrorCode.INVALID_CONFIG, 'No escrow contract configured');
    }

    try {
      const account = await this.walletService.getAccount();

      const escrows = await account.viewFunction({
        contractId: this.escrowContract,
        methodName: 'get_active_escrows',
        args: {
          from_index: fromIndex,
          limit: limit,
        },
      });

      if (!escrows || !Array.isArray(escrows)) {
        return [];
      }

      return escrows.map((escrow: any) => ({
        escrowId: escrow.escrow_id,
        escrowType: escrow.escrow_type,
        parties: escrow.parties.map((p: any) => ({
          accountId: p.account_id,
          amount: utils.format.formatNearAmount(p.deposit.toString()),
          condition: p.condition,
          hasDeposited: p.has_deposited,
          hasApproved: p.has_approved,
        })),
        arbiter: escrow.arbiter,
        description: escrow.description,
        state: escrow.state.toLowerCase(),
        createdAt: parseInt(escrow.created_at),
        deadline: parseInt(escrow.deadline),
        totalAmount: utils.format.formatNearAmount(escrow.total_amount.toString()),
        winner: escrow.winner,
      }));
    } catch (error: any) {
      throw new NearPluginError(
        NearErrorCode.RPC_ERROR,
        `Failed to get active escrows: ${error.message}`,
        error
      );
    }
  }

  formatEscrowContent(escrow: EscrowContract): EscrowContent {
    return {
      escrowId: escrow.escrowId,
      escrowType: escrow.escrowType,
      amount: escrow.totalAmount,
      parties: escrow.parties.map((p) => p.accountId),
      conditions: escrow.parties.map((p) => p.condition).filter(Boolean) as string[],
    };
  }

  protected async checkHealth(): Promise<void> {
    await this.testContractConnection();
  }

  protected async onCleanup(): Promise<void> {
    this.cache.flushAll();
  }

  // Add the missing stop method
  async stop(): Promise<void> {
    await this.cleanup();
  }
}
