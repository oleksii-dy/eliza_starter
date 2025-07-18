import { elizaLogger } from '@elizaos/core';
import { BaseNearService } from './base/BaseService';
import { WalletService } from './WalletService';
import { NearPluginError, NearErrorCode } from '../core/errors';
import NodeCache from 'node-cache';

interface OnChainMessage {
  id: string;
  roomId: string;
  sender: string;
  content: string;
  timestamp: number;
  edited: boolean;
  deleted: boolean;
}

export class OnChainMessagingService extends BaseNearService {
  static serviceType = 'near-messaging';
  capabilityDescription = 'Manages on-chain messaging for agents';

  static async start(runtime: any): Promise<OnChainMessagingService> {
    const service = new OnChainMessagingService();
    await service.initialize(runtime);
    return service;
  }

  private walletService!: WalletService;
  private messagingContract?: string;
  private cache: NodeCache;

  constructor() {
    super();
    this.cache = new NodeCache({ stdTTL: 300 }); // 5 minute cache
  }

  async onInitialize(): Promise<void> {
    const walletService = this.runtime.getService<WalletService>('near-wallet' as any);
    if (!walletService) {
      throw new Error('WalletService is required for OnChainMessagingService');
    }
    this.walletService = walletService;

    // Get messaging contract address from settings
    this.messagingContract = this.runtime.getSetting('NEAR_MESSAGING_CONTRACT');

    if (!this.messagingContract) {
      throw new NearPluginError(
        NearErrorCode.INVALID_CONFIG,
        'NEAR_MESSAGING_CONTRACT not configured. Please set the messaging contract address in your environment.'
      );
    }

    // Test contract connection
    await this.testContractConnection();

    elizaLogger.info(
      `OnChainMessagingService initialized with contract: ${this.messagingContract}`
    );
  }

  private async testContractConnection(): Promise<void> {
    // Skip contract verification in test mode
    if (process.env.SKIP_CONTRACT_VERIFICATION === 'true') {
      elizaLogger.info('Skipping messaging contract verification in test mode');
      return;
    }

    if (!this.messagingContract) {
      throw new NearPluginError(NearErrorCode.INVALID_CONFIG, 'No messaging contract configured');
    }

    try {
      const account = await this.walletService.getAccount();
      const result = await account.viewFunction({
        contractId: this.messagingContract,
        methodName: 'get_info',
        args: {},
      });

      elizaLogger.info('Messaging contract connection successful:', result);
    } catch (error: any) {
      throw new NearPluginError(
        NearErrorCode.RPC_ERROR,
        `Failed to connect to messaging contract at ${this.messagingContract}: ${error.message}`,
        error
      );
    }
  }

  async sendMessage(roomId: string, content: string): Promise<string> {
    if (!this.messagingContract) {
      throw new NearPluginError(NearErrorCode.INVALID_CONFIG, 'No messaging contract configured');
    }

    try {
      const account = await this.walletService.getAccount();

      const result = await account.functionCall({
        contractId: this.messagingContract,
        methodName: 'send_message',
        args: {
          room_id: roomId,
          content,
        },
        gas: 50000000000000n, // 50 TGas
        attachedDeposit: 1n, // 1 yoctoNEAR for storage
      });

      const messageId = result.receipts_outcome[0]?.outcome?.logs?.[0]?.match(/MSG\d+/)?.[0];
      if (!messageId) {
        throw new Error('Failed to extract message ID from transaction result');
      }

      elizaLogger.success(`Sent message ${messageId} to room ${roomId}`);
      return messageId;
    } catch (error: any) {
      throw new NearPluginError(
        NearErrorCode.TRANSACTION_FAILED,
        `Failed to send message: ${error.message}`,
        error
      );
    }
  }

  async sendDirectMessage(recipient: string, content: string): Promise<string> {
    if (!this.messagingContract) {
      throw new NearPluginError(NearErrorCode.INVALID_CONFIG, 'No messaging contract configured');
    }

    try {
      const account = await this.walletService.getAccount();

      const result = await account.functionCall({
        contractId: this.messagingContract,
        methodName: 'send_direct_message',
        args: {
          recipient,
          content,
        },
        gas: 50000000000000n, // 50 TGas
        attachedDeposit: 1n,
      });

      const messageId = result.receipts_outcome[0]?.outcome?.logs?.[0]?.match(/MSG\d+/)?.[0];
      if (!messageId) {
        throw new Error('Failed to extract message ID from transaction result');
      }

      elizaLogger.success(`Sent direct message ${messageId} to ${recipient}`);
      return messageId;
    } catch (error: any) {
      throw new NearPluginError(
        NearErrorCode.TRANSACTION_FAILED,
        `Failed to send direct message: ${error.message}`,
        error
      );
    }
  }

  async editMessage(messageId: string, newContent: string): Promise<void> {
    if (!this.messagingContract) {
      throw new NearPluginError(NearErrorCode.INVALID_CONFIG, 'No messaging contract configured');
    }

    try {
      const account = await this.walletService.getAccount();

      await account.functionCall({
        contractId: this.messagingContract,
        methodName: 'edit_message',
        args: {
          message_id: messageId,
          new_content: newContent,
        },
        gas: 30000000000000n, // 30 TGas
        attachedDeposit: 1n,
      });

      elizaLogger.success(`Edited message ${messageId}`);
    } catch (error: any) {
      throw new NearPluginError(
        NearErrorCode.TRANSACTION_FAILED,
        `Failed to edit message: ${error.message}`,
        error
      );
    }
  }

  async deleteMessage(messageId: string): Promise<void> {
    if (!this.messagingContract) {
      throw new NearPluginError(NearErrorCode.INVALID_CONFIG, 'No messaging contract configured');
    }

    try {
      const account = await this.walletService.getAccount();

      await account.functionCall({
        contractId: this.messagingContract,
        methodName: 'delete_message',
        args: {
          message_id: messageId,
        },
        gas: 30000000000000n, // 30 TGas
        attachedDeposit: 1n,
      });

      elizaLogger.success(`Deleted message ${messageId}`);
    } catch (error: any) {
      throw new NearPluginError(
        NearErrorCode.TRANSACTION_FAILED,
        `Failed to delete message: ${error.message}`,
        error
      );
    }
  }

  async getRoomMessages(roomId: string, fromIndex = 0, limit = 50): Promise<OnChainMessage[]> {
    if (!this.messagingContract) {
      throw new NearPluginError(NearErrorCode.INVALID_CONFIG, 'No messaging contract configured');
    }

    // Check cache first
    const cacheKey = `room:${roomId}:${fromIndex}:${limit}`;
    const cached = this.cache.get<OnChainMessage[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const account = await this.walletService.getAccount();

      const messages = await account.viewFunction({
        contractId: this.messagingContract,
        methodName: 'get_room_messages',
        args: {
          room_id: roomId,
          from_index: fromIndex,
          limit,
        },
      });

      if (!messages || !Array.isArray(messages)) {
        return [];
      }

      const formatted: OnChainMessage[] = messages.map((msg: any) => ({
        id: msg.id,
        roomId: msg.room_id,
        sender: msg.sender,
        content: msg.content,
        timestamp: parseInt(msg.timestamp),
        edited: msg.edited || false,
        deleted: msg.deleted || false,
      }));

      // Cache for 5 minutes
      this.cache.set(cacheKey, formatted);
      return formatted;
    } catch (error: any) {
      throw new NearPluginError(
        NearErrorCode.RPC_ERROR,
        `Failed to get room messages: ${error.message}`,
        error
      );
    }
  }

  async getDirectMessages(otherUser: string, fromIndex = 0, limit = 50): Promise<OnChainMessage[]> {
    if (!this.messagingContract) {
      throw new NearPluginError(NearErrorCode.INVALID_CONFIG, 'No messaging contract configured');
    }

    try {
      const account = await this.walletService.getAccount();

      const messages = await account.viewFunction({
        contractId: this.messagingContract,
        methodName: 'get_direct_messages',
        args: {
          other_user: otherUser,
          from_index: fromIndex,
          limit,
        },
      });

      if (!messages || !Array.isArray(messages)) {
        return [];
      }

      return messages.map((msg: any) => ({
        id: msg.id,
        roomId: `dm:${msg.sender}:${msg.recipient}`,
        sender: msg.sender,
        content: msg.content,
        timestamp: parseInt(msg.timestamp),
        edited: msg.edited || false,
        deleted: msg.deleted || false,
      }));
    } catch (error: any) {
      throw new NearPluginError(
        NearErrorCode.RPC_ERROR,
        `Failed to get direct messages: ${error.message}`,
        error
      );
    }
  }

  async blockUser(userId: string): Promise<void> {
    if (!this.messagingContract) {
      throw new NearPluginError(NearErrorCode.INVALID_CONFIG, 'No messaging contract configured');
    }

    try {
      const account = await this.walletService.getAccount();

      await account.functionCall({
        contractId: this.messagingContract,
        methodName: 'block_user',
        args: {
          user_id: userId,
        },
        gas: 30000000000000n, // 30 TGas
        attachedDeposit: 1n,
      });

      elizaLogger.success(`Blocked user ${userId}`);
    } catch (error: any) {
      throw new NearPluginError(
        NearErrorCode.TRANSACTION_FAILED,
        `Failed to block user: ${error.message}`,
        error
      );
    }
  }

  async unblockUser(userId: string): Promise<void> {
    if (!this.messagingContract) {
      throw new NearPluginError(NearErrorCode.INVALID_CONFIG, 'No messaging contract configured');
    }

    try {
      const account = await this.walletService.getAccount();

      await account.functionCall({
        contractId: this.messagingContract,
        methodName: 'unblock_user',
        args: {
          user_id: userId,
        },
        gas: 30000000000000n, // 30 TGas
        attachedDeposit: 1n,
      });

      elizaLogger.success(`Unblocked user ${userId}`);
    } catch (error: any) {
      throw new NearPluginError(
        NearErrorCode.TRANSACTION_FAILED,
        `Failed to unblock user: ${error.message}`,
        error
      );
    }
  }

  protected async checkHealth(): Promise<void> {
    await this.testContractConnection();
  }

  protected async onCleanup(): Promise<void> {
    this.cache.flushAll();
  }

  async stop(): Promise<void> {
    await this.cleanup();
  }
}
