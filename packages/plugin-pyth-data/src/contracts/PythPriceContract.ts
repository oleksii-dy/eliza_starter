import { ethers, Provider } from 'ethers';
import { Connection, PublicKey } from '@solana/web3.js';
import { elizaLogger } from "@elizaos/core";

interface PriceUpdate {
    price: bigint;
    conf: bigint;
    expo: number;
    publishTime: bigint;
}

export interface PythPriceContractConfig {
    network: string;
    provider: Provider | Connection;
    contractAddress: string;
    pythProgramKey?: PublicKey;
}

export class PythPriceContract {
    private readonly config: PythPriceContractConfig;
    private readonly isEVM: boolean;

    constructor(config: PythPriceContractConfig) {
        this.config = config;
        this.isEVM = !config.pythProgramKey;
        elizaLogger.info('PythPriceContract initialized', { network: config.network, isEVM: this.isEVM });
    }

    // Get price feed data from smart contract
    async getPriceFeed(priceId: string) {
        try {
            if (this.isEVM) {
                return this.getEVMPriceFeed(priceId);
            }
            return this.getSolanaPriceFeed(priceId);
        } catch (error) {
            elizaLogger.error("Failed to get price feed from contract", {
                error: error instanceof Error ? error.message : String(error),
                priceId
            });
            throw error;
        }
    }

    // Get EVM chain price feed
    private async getEVMPriceFeed(priceId: string) {
        const abi = [
            "function getPrice(bytes32 id) view returns (PythStructs.Price memory price)",
            "function getEmaPrice(bytes32 id) view returns (PythStructs.Price memory price)",
            "function getValidTimePeriod() view returns (uint validTimePeriod)"
        ];
        
        const contract = new ethers.Contract(
            this.config.contractAddress,
            abi,
            this.config.provider as Provider
        );

        const price = await contract.getPrice(priceId);
        return {
            price: price.price,
            conf: price.conf,
            expo: price.expo,
            publishTime: price.publishTime
        };
    }

    // Get Solana chain price feed
    private async getSolanaPriceFeed(priceId: string) {
        if (!this.config.pythProgramKey) {
            throw new Error("Pyth program key required for Solana price feeds");
        }

        const connection = this.config.provider as Connection;
        const priceAccount = new PublicKey(priceId);
        
        const accountInfo = await connection.getAccountInfo(priceAccount);
        if (!accountInfo) {
            throw new Error(`No account info found for price ID: ${priceId}`);
        }

        // Parse Pyth price account data
        // This is a simplified version - actual implementation would need proper parsing
        return {
            price: accountInfo.data.readBigInt64LE(0),
            conf: accountInfo.data.readBigInt64LE(8),
            expo: accountInfo.data.readInt32LE(16),
            publishTime: accountInfo.data.readBigInt64LE(20)
        };
    }

    // Validate price feed
    async validatePriceFeed(priceId: string, options: {
        minConfidence?: number;
        maxAge?: number;
    } = {}) {
        const feed = await this.getPriceFeed(priceId);
        const now = Math.floor(Date.now() / 1000);

        return {
            isValid: true,
            price: feed.price,
            confidence: feed.conf,
            age: now - Number(feed.publishTime),
            validationResults: {
                confidence: options.minConfidence ? feed.conf >= options.minConfidence : true,
                age: options.maxAge ? (now - Number(feed.publishTime)) <= options.maxAge : true
            }
        };
    }

    // Subscribe to price updates
    async subscribeToPriceUpdates(priceId: string, callback: (price: PriceUpdate) => void) {
        elizaLogger.info('Subscribing to price updates', { priceId, network: this.config.network });

        if (this.isEVM) {
            const contract = new ethers.Contract(
                this.config.contractAddress,
                ["event PriceUpdate(bytes32 indexed id, int64 price, uint64 conf, int32 expo, uint publishTime)"],
                this.config.provider as Provider
            );

            contract.on("PriceUpdate", (id, price, conf, expo, publishTime) => {
                if (id === priceId) {
                    elizaLogger.debug('Received EVM price update', { priceId, price: price.toString() });
                    callback({ 
                        price: BigInt(price.toString()),
                        conf: BigInt(conf.toString()),
                        expo: Number(expo),
                        publishTime: BigInt(publishTime.toString())
                    });
                }
            });
        } else {
            // For Solana, set up websocket subscription
            const connection = this.config.provider as Connection;
            const priceAccount = new PublicKey(priceId);
            
            connection.onAccountChange(priceAccount, (accountInfo) => {
                const price = accountInfo.data.readBigInt64LE(0);
                const conf = accountInfo.data.readBigInt64LE(8);
                const expo = accountInfo.data.readInt32LE(16);
                const publishTime = accountInfo.data.readBigInt64LE(20);
                
                elizaLogger.debug('Received Solana price update', { priceId, price: price.toString() });
                callback({ price, conf, expo, publishTime });
            });
        }

        elizaLogger.info('Price update subscription established', { priceId });
    }
} 