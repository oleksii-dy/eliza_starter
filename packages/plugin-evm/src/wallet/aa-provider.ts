import { IAgentRuntime, logger } from '@elizaos/core';
import { type Address, type Hash, type Hex, encodeFunctionData, toHex } from 'viem';
import type { Chain as _Chain } from 'viem/chains';
import { getChainConfig } from '../core/chains/config';
import type { UserOperation, BundlerJsonRpcResponse } from './types';

export interface AAProviderConfig {
  runtime: IAgentRuntime;
  chainId: number;
  entryPointAddress?: Address;
  bundlerUrl?: string;
  paymasterUrl?: string;
}

export interface PaymasterData {
  paymasterAndData: Hex;
  preVerificationGas?: bigint;
  verificationGasLimit?: bigint;
  callGasLimit?: bigint;
}

export interface UserOpEstimation {
  preVerificationGas: bigint;
  verificationGasLimit: bigint;
  callGasLimit: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}

export class AccountAbstractionProvider {
  private runtime: IAgentRuntime;
  private chainId: number;
  private entryPointAddress: Address;
  private bundlerUrl: string;
  private paymasterUrl?: string;

  constructor(config: AAProviderConfig) {
    this.runtime = config.runtime;
    this.chainId = config.chainId;
    this.entryPointAddress = config.entryPointAddress || this.getDefaultEntryPoint();

    const _chainConfig = getChainConfig(config.chainId);
    this.bundlerUrl = config.bundlerUrl || this.getDefaultBundlerUrl(config.chainId);
    this.paymasterUrl = config.paymasterUrl;
  }

  /**
   * Build a UserOperation for the given transaction
   */
  async buildUserOperation(params: {
    sender: Address;
    nonce: bigint;
    initCode: Hex;
    callData: Hex;
    signature?: Hex;
  }): Promise<UserOperation> {
    try {
      // Get gas estimations
      const estimation = await this.estimateUserOpGas({
        ...params,
        signature: params.signature || '0x',
      });

      // Get current gas prices
      const { maxFeePerGas, maxPriorityFeePerGas } = await this.getGasPrices();

      // Build the UserOperation
      const userOp: UserOperation = {
        sender: params.sender,
        nonce: params.nonce,
        initCode: params.initCode,
        callData: params.callData,
        callGasLimit: estimation.callGasLimit,
        verificationGasLimit: estimation.verificationGasLimit,
        preVerificationGas: estimation.preVerificationGas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        paymasterAndData: '0x',
        signature: params.signature || '0x',
      };

      // If paymaster is configured, get paymaster data
      if (this.paymasterUrl) {
        const paymasterData = await this.getPaymasterData(userOp);
        userOp.paymasterAndData = paymasterData.paymasterAndData;

        // Update gas limits if paymaster suggests different values
        if (paymasterData.preVerificationGas) {
          userOp.preVerificationGas = paymasterData.preVerificationGas;
        }
        if (paymasterData.verificationGasLimit) {
          userOp.verificationGasLimit = paymasterData.verificationGasLimit;
        }
        if (paymasterData.callGasLimit) {
          userOp.callGasLimit = paymasterData.callGasLimit;
        }
      }

      logger.info('UserOperation built successfully', {
        sender: userOp.sender,
        nonce: userOp.nonce.toString(),
      });

      return userOp;
    } catch (error) {
      logger.error('Error building UserOperation:', error);
      throw new Error(
        `Failed to build UserOperation: ${error instanceof Error ? error.message : error}`
      );
    }
  }

  /**
   * Estimate gas for a UserOperation
   */
  async estimateUserOpGas(userOp: Partial<UserOperation>): Promise<UserOpEstimation> {
    try {
      const response = await fetch(this.bundlerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_estimateUserOperationGas',
          params: [
            {
              ...userOp,
              nonce: toHex(userOp.nonce || 0n),
              callGasLimit: toHex(userOp.callGasLimit || 0n),
              verificationGasLimit: toHex(userOp.verificationGasLimit || 0n),
              preVerificationGas: toHex(userOp.preVerificationGas || 0n),
              maxFeePerGas: toHex(userOp.maxFeePerGas || 0n),
              maxPriorityFeePerGas: toHex(userOp.maxPriorityFeePerGas || 0n),
            },
            this.entryPointAddress,
          ],
        }),
      });

      const result: any = await response.json();

      if (result.error) {
        throw new Error(result.error.message);
      }

      if (!result.result) {
        throw new Error('No result from bundler');
      }

      return {
        preVerificationGas: BigInt(result.result.preVerificationGas),
        verificationGasLimit: BigInt(result.result.verificationGasLimit),
        callGasLimit: BigInt(result.result.callGasLimit),
        maxFeePerGas: BigInt(result.result.maxFeePerGas || 0),
        maxPriorityFeePerGas: BigInt(result.result.maxPriorityFeePerGas || 0),
      };
    } catch (error) {
      logger.error('Error estimating UserOperation gas:', error);
      throw new Error(`Failed to estimate gas: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Send a UserOperation to the bundler
   */
  async sendUserOperation(userOp: UserOperation): Promise<Hash> {
    try {
      const response = await fetch(this.bundlerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_sendUserOperation',
          params: [
            {
              sender: userOp.sender,
              nonce: toHex(userOp.nonce),
              initCode: userOp.initCode,
              callData: userOp.callData,
              callGasLimit: toHex(userOp.callGasLimit),
              verificationGasLimit: toHex(userOp.verificationGasLimit),
              preVerificationGas: toHex(userOp.preVerificationGas),
              maxFeePerGas: toHex(userOp.maxFeePerGas),
              maxPriorityFeePerGas: toHex(userOp.maxPriorityFeePerGas),
              paymasterAndData: userOp.paymasterAndData,
              signature: userOp.signature,
            },
            this.entryPointAddress,
          ],
        }),
      });

      const result = (await response.json()) as BundlerJsonRpcResponse<string>;
      if (result.error) {
        throw new Error(result.error.message);
      }

      if (!result.result) {
        throw new Error('No result from bundler');
      }

      const userOpHash = result.result as Hash;
      logger.info('UserOperation sent successfully', { userOpHash });

      return userOpHash;
    } catch (error) {
      logger.error('Error sending UserOperation:', error);
      throw new Error(
        `Failed to send UserOperation: ${error instanceof Error ? error.message : error}`
      );
    }
  }

  /**
   * Get UserOperation receipt
   */
  async getUserOpReceipt(userOpHash: Hash): Promise<{
    success: boolean;
    actualGasCost: bigint;
    actualGasUsed: bigint;
    receipt?: any;
  }> {
    try {
      const response = await fetch(this.bundlerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getUserOperationReceipt',
          params: [userOpHash],
        }),
      });

      const result = (await response.json()) as any;
      if (result?.error) {
        throw new Error(result.error.message);
      }

      if (!result?.result) {
        return {
          success: false,
          actualGasCost: 0n,
          actualGasUsed: 0n,
        };
      }

      const receipt = result.result;
      return {
        success: receipt.success,
        actualGasCost: BigInt(receipt.actualGasCost),
        actualGasUsed: BigInt(receipt.actualGasUsed),
        receipt: receipt.receipt,
      };
    } catch (error) {
      logger.error('Error getting UserOperation receipt:', error);
      throw new Error(`Failed to get receipt: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Get paymaster data for sponsoring the UserOperation
   */
  private async getPaymasterData(userOp: UserOperation): Promise<PaymasterData> {
    if (!this.paymasterUrl) {
      throw new Error('Paymaster URL not configured');
    }

    try {
      const response = await fetch(this.paymasterUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.runtime.getSetting('PAYMASTER_API_KEY')}`,
        },
        body: JSON.stringify({
          userOp: {
            sender: userOp.sender,
            nonce: toHex(userOp.nonce),
            initCode: userOp.initCode,
            callData: userOp.callData,
            callGasLimit: toHex(userOp.callGasLimit),
            verificationGasLimit: toHex(userOp.verificationGasLimit),
            preVerificationGas: toHex(userOp.preVerificationGas),
            maxFeePerGas: toHex(userOp.maxFeePerGas),
            maxPriorityFeePerGas: toHex(userOp.maxPriorityFeePerGas),
          },
          entryPoint: this.entryPointAddress,
          chainId: this.chainId,
        }),
      });

      const result = (await response.json()) as any;
      if (result.error) {
        throw new Error(result.error.message);
      }

      return {
        paymasterAndData: result.paymasterAndData,
        preVerificationGas: result.preVerificationGas
          ? BigInt(result.preVerificationGas)
          : undefined,
        verificationGasLimit: result.verificationGasLimit
          ? BigInt(result.verificationGasLimit)
          : undefined,
        callGasLimit: result.callGasLimit ? BigInt(result.callGasLimit) : undefined,
      };
    } catch (error) {
      logger.error('Error getting paymaster data:', error);
      throw new Error(
        `Failed to get paymaster data: ${error instanceof Error ? error.message : error}`
      );
    }
  }

  /**
   * Build callData for executing a transaction through the smart account
   */
  buildExecuteCallData(params: { to: Address; value: bigint; data: Hex }): Hex {
    // This is for SimpleAccount execute function
    // Different account implementations may have different interfaces
    return encodeFunctionData({
      abi: [
        {
          inputs: [
            { name: 'dest', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'func', type: 'bytes' },
          ],
          name: 'execute',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
      ],
      functionName: 'execute',
      args: [params.to, params.value, params.data],
    });
  }

  /**
   * Build callData for batch execution
   */
  buildBatchExecuteCallData(
    transactions: Array<{
      to: Address;
      value: bigint;
      data: Hex;
    }>
  ): Hex {
    const targets = transactions.map((tx) => tx.to);
    const values = transactions.map((tx) => tx.value);
    const datas = transactions.map((tx) => tx.data);

    return encodeFunctionData({
      abi: [
        {
          inputs: [
            { name: 'dest', type: 'address[]' },
            { name: 'value', type: 'uint256[]' },
            { name: 'func', type: 'bytes[]' },
          ],
          name: 'executeBatch',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
      ],
      functionName: 'executeBatch',
      args: [targets, values, datas],
    });
  }

  /**
   * Get current gas prices
   */
  private async getGasPrices(): Promise<{
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
  }> {
    try {
      const response = await fetch(this.bundlerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_gasPrice',
          params: [],
        }),
      });

      const result = (await response.json()) as any;
      if (result.error) {
        throw new Error(result.error.message);
      }

      const gasPrice = BigInt(result.result);

      // For EIP-1559, use dynamic fee calculation
      const maxPriorityFeePerGas = gasPrice / 10n; // 10% of gas price as priority fee
      const maxFeePerGas = gasPrice * 2n; // 2x gas price as max fee

      return {
        maxFeePerGas,
        maxPriorityFeePerGas,
      };
    } catch (error) {
      logger.warn('Error getting gas prices, using defaults:', error);
      return {
        maxFeePerGas: 30000000000n, // 30 gwei
        maxPriorityFeePerGas: 2000000000n, // 2 gwei
      };
    }
  }

  /**
   * Get supported EntryPoint address
   */
  getSupportedEntryPoint(): Address {
    return this.entryPointAddress;
  }

  /**
   * Get default EntryPoint address
   */
  private getDefaultEntryPoint(): Address {
    // EntryPoint v0.6.0 address (same on all chains)
    return '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';
  }

  /**
   * Get default bundler URL for chain
   */
  private getDefaultBundlerUrl(chainId: number): string {
    // These are example bundler URLs - in production, use proper bundler services
    const bundlerUrls: Record<number, string> = {
      1: 'https://eth-bundler.example.com',
      137: 'https://polygon-bundler.example.com',
      10: 'https://optimism-bundler.example.com',
      42161: 'https://arbitrum-bundler.example.com',
      8453: 'https://base-bundler.example.com',
    };

    const url = bundlerUrls[chainId];
    if (!url) {
      throw new Error(`No default bundler URL for chain ${chainId}`);
    }

    return url;
  }

  /**
   * Wait for UserOperation to be mined
   */
  async waitForUserOp(
    userOpHash: Hash,
    maxAttempts: number = 60,
    intervalMs: number = 1000
  ): Promise<{
    success: boolean;
    receipt?: any;
  }> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const receipt = await this.getUserOpReceipt(userOpHash);
        if (receipt.receipt) {
          return {
            success: receipt.success,
            receipt: receipt.receipt,
          };
        }
      } catch (error) {
        logger.debug('UserOp not yet mined:', error);
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      attempts++;
    }

    throw new Error(`UserOperation ${userOpHash} not mined after ${maxAttempts} attempts`);
  }
}

// Export factory function
export function createAAProvider(config: AAProviderConfig): AccountAbstractionProvider {
  return new AccountAbstractionProvider(config);
}
