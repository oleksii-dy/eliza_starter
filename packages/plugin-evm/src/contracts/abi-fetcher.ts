import { IAgentRuntime, logger } from '@elizaos/core';
import type { Address, Abi } from 'viem';
import { ChainConfigService } from '../core/chains/config';
import { WalletDatabaseService } from '../core/database/service';

export class ABIFetcher {
    private chainService: ChainConfigService;
    private dbService: WalletDatabaseService;

    constructor(
        private runtime: IAgentRuntime
    ) {
        this.chainService = new ChainConfigService(runtime);
        this.dbService = new WalletDatabaseService(runtime);
    }

    /**
     * Fetch ABI for a contract
     */
    async fetchABI(
        contractAddress: Address,
        chainId: number
    ): Promise<Abi | null> {
        try {
            // Check cache first
            const cached = await this.dbService.getContractAbi(contractAddress, chainId);
            if (cached) {
                logger.debug(`ABI cache hit for ${contractAddress} on chain ${chainId}`);
                return cached.abi as Abi;
            }

            // Try to fetch from Etherscan or block explorer
            const abi = await this.fetchFromBlockExplorer(contractAddress, chainId);
            
            if (abi) {
                // Cache the result
                await this.dbService.saveContractAbi(
                    contractAddress,
                    chainId,
                    abi as any[],
                    {
                        source: 'etherscan'
                    }
                );
            }

            return abi;
        } catch (error) {
            logger.error(`Error fetching ABI for ${contractAddress}:`, error);
            return null;
        }
    }

    private async fetchFromBlockExplorer(
        contractAddress: Address,
        chainId: number
    ): Promise<Abi | null> {
        // This would integrate with Etherscan or other block explorers
        // For now, return null
        return null;
    }
}

// Export factory function
export function createABIFetcher(runtime: IAgentRuntime): ABIFetcher {
    return new ABIFetcher(runtime);
}
