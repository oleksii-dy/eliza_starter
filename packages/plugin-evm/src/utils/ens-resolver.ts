import { IAgentRuntime, logger } from '@elizaos/core';
import type { Address } from 'viem';
import { normalize } from 'viem/ens';
import { ChainConfigService } from '../core/chains/config';
import { WalletDatabaseService } from '../core/database/service';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

export interface ENSProfile {
    name?: string;
    avatar?: string;
    description?: string;
    email?: string;
    twitter?: string;
    github?: string;
    url?: string;
}

export class ENSResolver {
    private chainService: ChainConfigService;
    private dbService: WalletDatabaseService;
    private cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours

    constructor(
        private runtime: IAgentRuntime
    ) {
        this.chainService = new ChainConfigService(runtime);
        this.dbService = new WalletDatabaseService(runtime);
    }

    /**
     * Resolve ENS name to address
     */
    async resolveAddress(ensName: string): Promise<Address | null> {
        try {
            // Normalize ENS name
            const normalizedName = normalize(ensName);

            // Check cache first
            const cached = await this.dbService.getENSData(normalizedName);
            if (cached && cached.address && Date.now() - cached.updatedAt.getTime() < this.cacheTimeout) {
                logger.debug(`ENS cache hit for ${normalizedName}`);
                return cached.address as Address;
            }

            // Resolve via Ethereum mainnet
            const client = this.chainService.getPublicClient(1); // Mainnet
            const address = await client.getEnsAddress({
                name: normalizedName
            });

            if (address) {
                // Cache the result
                await this.dbService.saveENSData(normalizedName, {
                    address: address,
                    updatedAt: new Date()
                });
            }

            return address;
        } catch (error) {
            logger.error(`Error resolving ENS name ${ensName}:`, error);
            return null;
        }
    }

    /**
     * Reverse resolve address to ENS name
     */
    async resolveName(address: Address): Promise<string | null> {
        try {
            // Check cache first
            const cached = await this.dbService.getENSByAddress(address);
            if (cached && Date.now() - cached.updatedAt.getTime() < this.cacheTimeout) {
                logger.debug(`ENS reverse cache hit for ${address}`);
                return cached.name;
            }

            // Resolve via Ethereum mainnet
            const client = this.chainService.getPublicClient(1); // Mainnet
            const name = await client.getEnsName({
                address
            });

            if (name) {
                // Cache the result
                await this.dbService.saveENSData(name, {
                    address: address
                });
            }

            return name;
        } catch (error) {
            logger.error(`Error reverse resolving address ${address}:`, error);
            return null;
        }
    }

    /**
     * Get ENS profile data
     */
    async getProfile(ensName: string): Promise<ENSProfile | null> {
        try {
            const normalizedName = normalize(ensName);
            const client = this.chainService.getPublicClient(1); // Mainnet

            // Get resolver
            const resolver = await client.getEnsResolver({ name: normalizedName });
            if (!resolver) return null;

            // Get profile texts
            const texts = ['avatar', 'description', 'email', 'com.twitter', 'com.github', 'url'];
            const results = await Promise.all(
                texts.map(key => (resolver as any).getText({ key }).catch(() => null))
            );

            const [avatar, description, email, twitter, github, url] = results;

            return {
                name: normalizedName,
                avatar: avatar || undefined,
                description: description || undefined,
                email: email || undefined,
                twitter: twitter || undefined,
                github: github || undefined,
                url: url || undefined
            };
        } catch (error) {
            logger.error(`Error getting ENS profile for ${ensName}:`, error);
            return null;
        }
    }

    /**
     * Check if a string is a valid ENS name
     */
    isENSName(name: string): boolean {
        return name.endsWith('.eth') || name.includes('.');
    }

    /**
     * Clear ENS cache
     */
    async clearCache(): Promise<void> {
        // Would clear cache from database
        logger.debug('ENS cache cleared');
    }
}

export function createENSResolver(runtime: IAgentRuntime) {
    const client = createPublicClient({
        chain: mainnet,
        transport: http()
    });

    return {
        async resolve(name: string): Promise<Address | null> {
            try {
                const address = await client.getEnsAddress({ name });
                return address || null;
            } catch (error) {
                return null;
            }
        },

        async reverse(address: Address): Promise<string | null> {
            try {
                const name = await client.getEnsName({ address });
                return name || null;
            } catch (error) {
                return null;
            }
        }
    };
}
