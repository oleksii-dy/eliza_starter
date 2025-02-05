import { describe, it, expect, beforeEach, vi, MockedFunction  } from 'vitest';
import { TransferService } from '../../services/transfer';
import { IAssetsProvider } from '../../services/transfer/interfaces';
import { IAgentRuntime, Memory, State } from '@elizaos/core';
import {
  RoochTransport,
  RoochTransportRequestOptions
} from '@roochnetwork/rooch-sdk/dist/esm';
import { Assets } from '../../types';

describe('TransferService', () => {
  let service: TransferService;
  let mockAssetsProvider: {
    get: MockedFunction<(runtime: IAgentRuntime, message: Memory, state: State) => Promise<Assets>>
  };
  let mockRuntime: IAgentRuntime;
  let mockTransport: RoochTransport;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mocks
    mockAssetsProvider = {
      get: vi.fn()
    };

    mockRuntime = {
        getSetting: vi.fn().mockImplementation((key: string) => {
            if (key === "BITCOIN_PRIVATE_KEY") {
                return "KzJhi6kxdDjxeUecy16s4nppDUpzLDGdtWqZCyDKezFqJ9YJgphv";
            }
            return null;
        })
    } as any;

    // Create mock transport with type-safe request method
    mockTransport = {
      request: vi.fn().mockImplementation(async (input: RoochTransportRequestOptions) => {
        if (input.method === 'rooch_getChainID'){
            return 2;
        } else if (input.method === 'rooch_executeViewFunction'){
            if (input.params.length > 0 && (input.params[0] as any).function_id == "0x0000000000000000000000000000000000000000000000000000000000000002::account::sequence_number") {
                return {
                    return_values: [{
                        decoded_value: 1
                    }]
                }
            }

            throw new Error(`Unexpected method: ${input.method}, params: ${JSON.stringify(input.params)}`);
        } else if (input.method === 'rooch_executeRawTransaction') {
          return {
            execution_info: { status: { type: 'executed' } },
            sequence_info: { tx_order: '1' }
          };
        }

        throw new Error(`Unexpected method: ${input.method}, params: ${JSON.stringify(input.params)}`);
      })
    };

    service = new TransferService(
      mockAssetsProvider,
      mockRuntime,
      mockTransport
    );
  });


  it('should successfully transfer coins', async () => {
    // Arrange
    const params = {
      recipient: '0x123',
      amount: '1',
      symbol: 'RGAS'
    };

    mockAssetsProvider.get.mockResolvedValue({
      coins: [{
        symbol: 'RGAS',
        name: 'Rooch Gas Coin',
        balance: '100000000000',
        decimals: 8,
        coinType: '0x3::gas::RGas'
      }],
      utxos: []
    });

    // Act
    const result = await service.transfer(params);

    // Assert
    expect(result.error).toBeUndefined();
    expect(result.success).toBe(true);
    expect(result.txOrder).toBe('1');
  });


  it('should handle transfer execution failure', async () => {
    // Arrange
    const params = {
      recipient: '0x123',
      amount: '1',
      symbol: 'RGAS'
    };

    mockAssetsProvider.get.mockResolvedValue({
      coins: [{
        symbol: 'RGAS',
        name: 'RGAS',
        balance: '100000000000',
        decimals: 8,
        coinType: '0x3::gas::RGas'
      }],
      utxos: [],
    });

    // Mock transport to return failed status
    mockTransport.request = vi.fn().mockImplementation(async (input: RoochTransportRequestOptions) => {
        if (input.method === 'rooch_getChainID'){
            return 2;
        } else if (input.method === 'rooch_executeViewFunction'){
            if (input.params.length > 0 && (input.params[0] as any).function_id == "0x0000000000000000000000000000000000000000000000000000000000000002::account::sequence_number") {
                return {
                    return_values: [{
                        decoded_value: 1
                    }]
                }
            }

            throw new Error(`Unexpected method: ${input.method}, params: ${JSON.stringify(input.params)}`);
        } else if (input.method === 'rooch_executeRawTransaction') {
          return {
            sequence_info: { tx_order: 1 },
            execution_info: { status: { type: 'failed' } }
          };
        }

        throw new Error(`Unexpected method: ${input.method}, params: ${JSON.stringify(input.params)}`);
    })

    // Act
    const result = await service.transfer(params);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Transfer failed: failed');
  });


  it('should handle transport request error', async () => {
    // Arrange
    const params = {
      recipient: '0x123',
      amount: '1',
      symbol: 'RGAS'
    };

    mockAssetsProvider.get.mockResolvedValue({
        coins: [{
          symbol: 'RGAS',
          name: 'RGAS',
          balance: '100000000000',
          decimals: 8,
          coinType: '0x3::gas::RGas'
        }],
        utxos: [],
    });

     // Mock transport to throw error
    mockTransport.request = vi.fn().mockImplementation(async (input: RoochTransportRequestOptions) => {
        throw new Error('Network error');
    })

    // Act
    const result = await service.transfer(params);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Transfer failed: Network error');
  });

});