import { IAgentRuntime, logger } from '@elizaos/core';
import {
  type PublicClient,
  type Address,
  type Hash,
  type Hex,
  parseAbi,
  decodeFunctionData,
  decodeEventLog,
} from 'viem';
import type {
  TransactionRequest,
  SimulationResult,
  StateChange,
} from '../interfaces/IWalletService';
import type { ChainConfigService } from '../chains/config';

export interface SimulatorOptions {
  includeTrace?: boolean;
  includeLogs?: boolean;
  forkBlock?: number;
  timeout?: number;
}

export class TransactionSimulator {
  constructor(
    private runtime: IAgentRuntime,
    private chainService: ChainConfigService
  ) {}

  async simulate(
    tx: TransactionRequest,
    options: SimulatorOptions = {}
  ): Promise<SimulationResult> {
    try {
      const chainId = tx.chainId || 1;
      const client = this.chainService.getPublicClient(chainId);

      // Try different simulation methods
      try {
        // Method 1: Use Tenderly if available
        if (this.runtime.getSetting('TENDERLY_API_KEY')) {
          return await this.simulateWithTenderly(tx, options);
        }
      } catch (error) {
        logger.warn('Tenderly simulation failed, falling back to RPC methods');
      }

      // Method 2: Use debug_traceCall if available
      try {
        return await this.simulateWithDebugTrace(client, tx, options);
      } catch (error) {
        logger.warn('Debug trace simulation failed, falling back to eth_call');
      }

      // Method 3: Basic eth_call simulation
      return await this.simulateWithEthCall(client, tx);
    } catch (error) {
      logger.error('Transaction simulation failed:', error);
      throw error;
    }
  }

  private async simulateWithTenderly(
    tx: TransactionRequest,
    options: SimulatorOptions
  ): Promise<SimulationResult> {
    const apiKey = this.runtime.getSetting('TENDERLY_API_KEY');
    const projectSlug = this.runtime.getSetting('TENDERLY_PROJECT_SLUG') || 'default';
    const username = this.runtime.getSetting('TENDERLY_USERNAME');

    if (!apiKey || !username) {
      throw new Error('Tenderly credentials not configured');
    }

    const response = await fetch(
      `https://api.tenderly.co/api/v1/account/${username}/project/${projectSlug}/simulate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Access-Key': apiKey,
        },
        body: JSON.stringify({
          network_id: String(tx.chainId || 1),
          from: tx.from,
          to: tx.to,
          input: tx.data,
          value: tx.value?.toString(),
          gas: tx.gas?.toString(),
          gas_price: tx.gasPrice?.toString(),
          block_number: options.forkBlock,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Tenderly API error: ${response.statusText}`);
    }

    const result = await response.json();

    return this.parseTenderlyResult(result);
  }

  private parseTenderlyResult(result: any): SimulationResult {
    const sim = result.simulation;

    return {
      success: sim.status === 'success',
      gasUsed: BigInt(sim.gas_used || 0),
      gasPrice: BigInt(sim.gas_price || 0),
      error: sim.error_message,
      logs: sim.logs?.map((log: any) => ({
        address: log.address,
        topics: log.topics,
        data: log.data,
      })),
      stateChanges: sim.state_changes?.map((change: any) => ({
        address: change.address,
        key: change.key,
        oldValue: change.original,
        newValue: change.value,
      })),
      warnings: this.extractWarnings(sim),
    };
  }

  private async simulateWithDebugTrace(
    client: PublicClient,
    tx: TransactionRequest,
    options: SimulatorOptions
  ): Promise<SimulationResult> {
    // Prepare transaction for tracing
    const traceTx = {
      from: tx.from,
      to: tx.to,
      value: tx.value ? (`0x${tx.value.toString(16)}` as `0x${string}`) : ('0x0' as `0x${string}`),
      data: tx.data || ('0x' as `0x${string}`),
      gas: tx.gas ? (`0x${tx.gas.toString(16)}` as `0x${string}`) : undefined,
    };

    // Use debug_traceCall RPC method
    const trace = await (client as any).request({
      method: 'debug_traceCall',
      params: [
        traceTx,
        options.forkBlock ? `0x${options.forkBlock.toString(16)}` : 'latest',
        {
          tracer: 'callTracer',
          tracerConfig: {
            onlyTopCall: false,
            withLog: options.includeLogs,
          },
        },
      ],
    });

    return this.parseDebugTrace(trace as any, tx);
  }

  private parseDebugTrace(trace: any, tx: TransactionRequest): SimulationResult {
    const success = trace.error === undefined;
    const gasUsed = BigInt(parseInt(trace.gasUsed || '0', 16));

    // Extract logs if available
    const logs =
      trace.logs?.map((log: any) => ({
        address: log.address,
        topics: log.topics,
        data: log.data,
      })) || [];

    // Extract state changes from trace
    const stateChanges: StateChange[] = [];
    if (trace.stateDiff) {
      Object.entries(trace.stateDiff).forEach(([address, diff]: [string, any]) => {
        if (diff.storage) {
          Object.entries(diff.storage).forEach(([key, values]: [string, any]) => {
            stateChanges.push({
              address: address as Address,
              key: key as Hex,
              oldValue: values['*']?.from || '0x0',
              newValue: values['*']?.to || '0x0',
            });
          });
        }
      });
    }

    return {
      success,
      gasUsed,
      gasPrice: tx.gasPrice || 0n,
      error: trace.error,
      logs,
      stateChanges,
      warnings: this.extractWarningsFromTrace(trace),
    };
  }

  private async simulateWithEthCall(
    client: PublicClient,
    tx: TransactionRequest
  ): Promise<SimulationResult> {
    try {
      // Estimate gas first
      const gasLimit = await client.estimateGas({
        account: tx.from,
        to: tx.to,
        value: tx.value,
        data: tx.data,
      });

      // Try to execute the call
      const result = await client.call({
        account: tx.from,
        to: tx.to,
        value: tx.value,
        data: tx.data,
        gas: gasLimit,
      });

      // Get current gas price
      const gasPrice = await client.getGasPrice();

      return {
        success: true,
        gasUsed: gasLimit,
        gasPrice,
        logs: [], // eth_call doesn't provide logs
        stateChanges: [], // eth_call doesn't provide state changes
        warnings: [],
      };
    } catch (error: any) {
      // Parse revert reason if available
      let errorMessage = error.message;
      if (error.data) {
        try {
          // Try to decode custom error
          errorMessage = this.decodeRevertReason(error.data);
        } catch {
          // Keep original error message
        }
      }

      return {
        success: false,
        gasUsed: 0n,
        gasPrice: 0n,
        error: errorMessage,
        logs: [],
        stateChanges: [],
        warnings: [],
      };
    }
  }

  private decodeRevertReason(data: Hex): string {
    // Check for standard revert string (Error(string))
    if (data.startsWith('0x08c379a0')) {
      try {
        const decoded = decodeFunctionData({
          abi: parseAbi(['function Error(string)']),
          data: data as `0x${string}`,
        });
        return decoded.args[0] as string;
      } catch {
        // Continue to other decoding methods
      }
    }

    // Check for panic error (Panic(uint256))
    if (data.startsWith('0x4e487b71')) {
      try {
        const decoded = decodeFunctionData({
          abi: parseAbi(['function Panic(uint256)']),
          data: data as `0x${string}`,
        });
        const panicCode = decoded.args[0] as bigint;
        return `Panic: ${this.getPanicReason(Number(panicCode))}`;
      } catch {
        // Continue to other decoding methods
      }
    }

    // Return raw data if we can't decode
    return `Raw revert data: ${data}`;
  }

  private getPanicReason(code: number): string {
    const panicReasons: Record<number, string> = {
      0x00: 'Generic compiler panic',
      0x01: 'Assertion failed',
      0x11: 'Arithmetic overflow/underflow',
      0x12: 'Division by zero',
      0x21: 'Invalid enum value',
      0x22: 'Storage byte array incorrectly encoded',
      0x31: 'pop() on empty array',
      0x32: 'Array index out of bounds',
      0x41: 'Insufficient funds for transfer',
      0x51: 'Invalid internal function',
    };
    return panicReasons[code] || `Unknown panic code: ${code}`;
  }

  private extractWarnings(simulation: any): string[] {
    const warnings: string[] = [];

    // Check for common issues
    if (simulation.gas_used > 10000000) {
      warnings.push('High gas usage detected (>10M gas)');
    }

    if (simulation.state_changes?.length > 100) {
      warnings.push('Large number of state changes detected');
    }

    if (
      simulation.logs?.some(
        (log: any) =>
          log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' &&
          BigInt(log.data || 0) === 0n
      )
    ) {
      warnings.push('Zero-value token transfer detected');
    }

    return warnings;
  }

  private extractWarningsFromTrace(trace: any): string[] {
    const warnings: string[] = [];

    // Check trace depth
    let maxDepth = 0;
    const countDepth = (call: any, depth = 0): void => {
      maxDepth = Math.max(maxDepth, depth);
      if (call.calls) {
        call.calls.forEach((c: any) => countDepth(c, depth + 1));
      }
    };
    countDepth(trace);

    if (maxDepth > 10) {
      warnings.push(`Deep call stack detected (depth: ${maxDepth})`);
    }

    // Check for failed internal calls
    const checkFailedCalls = (call: any): void => {
      if (call.error && call.type !== 'CALL') {
        warnings.push(`Internal call failed: ${call.error}`);
      }
      if (call.calls) {
        call.calls.forEach(checkFailedCalls);
      }
    };
    checkFailedCalls(trace);

    return warnings;
  }

  async simulateBatch(
    transactions: TransactionRequest[],
    options: SimulatorOptions = {}
  ): Promise<SimulationResult[]> {
    // Simulate transactions in sequence to account for state changes
    const results: SimulationResult[] = [];

    for (let i = 0; i < transactions.length; i++) {
      try {
        const result = await this.simulate(transactions[i], options);
        results.push(result);

        // If a transaction fails and we're doing atomic simulation, stop
        if (!result.success && options.includeTrace) {
          break;
        }
      } catch (error) {
        results.push({
          success: false,
          gasUsed: 0n,
          gasPrice: 0n,
          error: `Simulation failed: ${error}`,
          logs: [],
          stateChanges: [],
          warnings: [],
        });

        if (options.includeTrace) {
          break;
        }
      }
    }

    return results;
  }

  async checkContractSafety(
    contractAddress: Address,
    chainId: number
  ): Promise<{
    isVerified: boolean;
    hasProxy: boolean;
    implementation?: Address;
    warnings: string[];
  }> {
    const warnings: string[] = [];

    try {
      // Check if contract exists
      const client = this.chainService.getPublicClient(chainId);
      const code = await client.getBytecode({ address: contractAddress });

      if (!code || code === '0x') {
        warnings.push('No contract code at this address');
        return { isVerified: false, hasProxy: false, warnings };
      }

      // Check for proxy patterns in bytecode
      const hasProxy = this.detectProxyPattern(code);
      if (hasProxy) {
        warnings.push('Contract appears to be a proxy');
      }

      // Check for dangerous opcodes
      if (code.includes('ff')) {
        // SELFDESTRUCT
        warnings.push('Contract contains SELFDESTRUCT opcode');
      }

      // Try to get implementation address if proxy
      let implementation: Address | undefined;
      if (hasProxy) {
        try {
          // EIP-1967 implementation slot
          const implSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
          const implData = await client.getStorageAt({
            address: contractAddress,
            slot: implSlot as `0x${string}`,
          });

          if (
            implData &&
            implData !== '0x0000000000000000000000000000000000000000000000000000000000000000'
          ) {
            implementation = `0x${implData.slice(-40)}` as Address;
          }
        } catch {
          // Ignore errors getting implementation
        }
      }

      return {
        isVerified: false, // Would need to check with block explorer API
        hasProxy,
        implementation,
        warnings,
      };
    } catch (error) {
      warnings.push(`Safety check failed: ${error}`);
      return { isVerified: false, hasProxy: false, warnings };
    }
  }

  private detectProxyPattern(bytecode: Hex): boolean {
    // Common proxy patterns
    const proxyPatterns = [
      '363d3d373d3d3d363d73', // Minimal proxy
      '366000600037611000600036600073', // Vyper create_forwarder_to
      '0x608060405260043610', // OpenZeppelin proxy
    ];

    return proxyPatterns.some((pattern) => bytecode.toLowerCase().includes(pattern.toLowerCase()));
  }
}

// Export factory function
export function createTransactionSimulator(
  runtime: IAgentRuntime,
  chainService: ChainConfigService
): TransactionSimulator {
  return new TransactionSimulator(runtime, chainService);
}
