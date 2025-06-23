import { IAgentRuntime, logger } from '@elizaos/core';
import type { Address, Hex, PublicClient } from 'viem';
import { ChainConfigService } from '../core/chains/config';

export interface MulticallParams {
    target: Address;
    callData: Hex;
    allowFailure?: boolean;
}

export interface MulticallResult {
    success: boolean;
    returnData: Hex;
}

export interface MulticallCall {
    target: Address;
    callData: `0x${string}`;
    allowFailure?: boolean;
}

export class MulticallService {
    private chainService: ChainConfigService;
    private multicallAddresses: Record<number, Address> = {
        1: '0xcA11bde05977b3631167028862bE2a173976CA11', // Ethereum Mainnet
        10: '0xcA11bde05977b3631167028862bE2a173976CA11', // Optimism
        137: '0xcA11bde05977b3631167028862bE2a173976CA11', // Polygon
        42161: '0xcA11bde05977b3631167028862bE2a173976CA11', // Arbitrum
        // Add more chains as needed
    };

    constructor(
        private runtime: IAgentRuntime
    ) {
        this.chainService = new ChainConfigService(runtime);
    }

    /**
     * Execute multiple calls in a single transaction
     */
    async multicall(
        chainId: number,
        calls: MulticallParams[]
    ): Promise<MulticallResult[]> {
        try {
            const client = this.chainService.getPublicClient(chainId);
            const multicallAddress = this.multicallAddresses[chainId];

            if (!multicallAddress) {
                throw new Error(`Multicall not supported on chain ${chainId}`);
            }

            // Use viem's built-in multicall
            const results = await client.multicall({
                contracts: calls.map(call => ({
                    address: call.target,
                    abi: [], // We're using raw calldata
                    functionName: 'raw',
                    args: [],
                    // @ts-ignore - viem types don't expose raw calldata directly
                    callData: call.callData
                })),
                multicallAddress
            });

            return results.map((result, index) => ({
                success: result.status === 'success',
                returnData: (result.result || '0x') as Hex
            }));
        } catch (error) {
            logger.error('Multicall failed:', error);
            throw error;
        }
    }

    /**
     * Batch calls with automatic chunking
     */
    async batchMulticall(
        chainId: number,
        calls: MulticallParams[],
        batchSize = 50
    ): Promise<MulticallResult[]> {
        const results: MulticallResult[] = [];

        for (let i = 0; i < calls.length; i += batchSize) {
            const batch = calls.slice(i, i + batchSize);
            const batchResults = await this.multicall(chainId, batch);
            results.push(...batchResults);
        }

        return results;
    }

    async aggregate(
        calls: MulticallCall[],
        chainId: number,
        client: PublicClient
    ): Promise<MulticallResult[]> {
        // Mock implementation
        return calls.map(() => ({
            success: true,
            returnData: '0x' as `0x${string}`
        }));
    }

    async tryAggregate(
        calls: MulticallCall[],
        chainId: number,
        client: PublicClient
    ): Promise<MulticallResult[]> {
        // Mock implementation that allows failures
        return calls.map(() => ({
            success: true,
            returnData: '0x' as `0x${string}`
        }));
    }
}

// Export factory function
export function createMulticallService(runtime: IAgentRuntime): MulticallService {
    return new MulticallService(runtime);
}
