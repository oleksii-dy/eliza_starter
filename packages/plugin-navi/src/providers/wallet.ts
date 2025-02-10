import type {
    IAgentRuntime,
    ICacheManager,
    Memory,
    Provider,
    State,
} from "@elizaos/core";

import { NAVISDKClient } from "navi-sdk";
import NodeCache from "node-cache";
import * as path from "node:path";
import { parseAccount } from "../utils";

export class WalletProvider {
    private client: NAVISDKClient;
    private cache: NodeCache;
    private cacheKey = "navi/wallet";

    constructor(
        mnemonic: string,
        networkType: string,
        private cacheManager: ICacheManager,
    ) {
        this.client = new NAVISDKClient({
            mnemonic,
            networkType,
            numberOfAccounts: 1
        });
        this.cache = new NodeCache({ stdTTL: 300 }); // Cache TTL set to 5 minutes
    }

    get address(): string {
        return this.client.account.address;
    }

    private async readFromCache<T>(key: string): Promise<T | null> {
        const cached = await this.cacheManager.get<T>(
            path.join(this.cacheKey, key),
        );
        return cached;
    }

    private async writeToCache<T>(key: string, data: T): Promise<void> {
        await this.cacheManager.set(path.join(this.cacheKey, key), data, {
            expires: Date.now() + 5 * 60 * 1000,
        });
    }

    private async getCachedData<T>(key: string): Promise<T | null> {
        // Check in-memory cache first
        const cachedData = this.cache.get<T>(key);
        if (cachedData) {
            return cachedData;
        }

        // Check file-based cache
        const fileCachedData = await this.readFromCache<T>(key);
        if (fileCachedData) {
            // Populate in-memory cache
            this.cache.set(key, fileCachedData);
            return fileCachedData;
        }
        return null;
    }

    private async setCachedData<T>(cacheKey: string, data: T): Promise<void> {
        // Set in-memory cache
        this.cache.set(cacheKey, data);

        // Write to file-based cache
        await this.writeToCache(cacheKey, data);
    }

    async getBalances(): Promise<Record<string, number>> {
        return await this.client.getAllBalances();
    }

    async getNaviPortfolios(): Promise<Map<string, {
        borrowBalance: number;
        supplyBalance: number;
    }>> {
        return await this.client.getAllNaviPortfolios();
    }

    async fetchPortfolioValue(): Promise<Map<string, {
        borrowBalance: number;
        supplyBalance: number;
    }>> {
        try {
            const cacheKey = `portfolio-${this.address}`;
            const cachedValue =
                await this.getCachedData<Map<string, {
                    borrowBalance: number;
                    supplyBalance: number;
                }>>(cacheKey);

            if (cachedValue) {
                console.log("Cache hit for fetchPortfolioValue", cachedValue);
                return cachedValue;
            }
            console.log("Cache miss for fetchPortfolioValue");

            const portfolios = await this.getNaviPortfolios();
            this.setCachedData(cacheKey, portfolios);
            console.log("Fetched portfolio:", portfolios);
            return portfolios;
        } catch (error) {
            console.error("Error fetching portfolio:", error);
            throw error;
        }
    }

    formatBalanceWithKey(key: string, balance: number): string {
        let result = `Wallet Address: ${this.address}\nToken Name\tBalance`;
        if (balance > 0) {
            result += `\n${key}\t${balance}`;
        } else {
            result += `\nNo Balance.`;
        }
        return result;
    }

    formatBalance(balances: Record<string, number>): string {
        let result = `Wallet Address: ${this.address}\nToken Name\tBalance`;
        let hasData = false;
        for (const [tokenName, balance] of Object.entries(balances)) {
            if (balance > 0) {
                result += `\n${tokenName}\t${balance}`;
                hasData = true;
            }
        }
        if (!hasData) {
            result += `\nNo Balance.`;
        }
        return result;
    }

    formatBalanceWithRuntime(
        runtime: IAgentRuntime,
        balances: Record<string, number>,
    ): string {
        const formatBalance = this.formatBalance(balances);
        return `${runtime.character.name}\n${formatBalance}`;
    }

    formatPortfolio(
        runtime: IAgentRuntime,
        portfolio: Map<string, {
            borrowBalance: number;
            supplyBalance: number;
        }>,
    ): string {
        let result = `${runtime.character.name}\nWallet Address: ${this.address}\nToken Name\tSupply Balance\tBorrow Balance`;
        let hasData = false;
        portfolio.forEach((value, key) => {
            if (value.supplyBalance > 0 || value.borrowBalance > 0) {
                result += `\n${key}\t${value.supplyBalance}\t${value.borrowBalance}`;
                hasData = true;
            }
        })

        if (!hasData) {
            result += `\nNo data.`;
        }
        return result;
    }

    async getFormattedBalance(runtime: IAgentRuntime): Promise<string> {
        try {
            const balances = await this.getBalances();
            return this.formatBalanceWithRuntime(runtime, balances);
        } catch (error) {
            console.error("Error generating balance report:", error);
            return "Unable to fetch wallet information. Please try again later.";
        }
    }

    async getFormattedPortfolio(runtime: IAgentRuntime): Promise<string> {
        try {
            const portfolio = await this.fetchPortfolioValue();
            return this.formatPortfolio(runtime, portfolio);
        } catch (error) {
            console.error("Error generating portfolio report:", error);
            return "Unable to fetch wallet information. Please try again later.";
        }
    }
}

const walletProvider: Provider = {
    get: async (
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State,
    ): Promise<WalletProvider | null> => {
        const naviAccount = parseAccount(runtime);

        try {
            const network = runtime.getSetting("NAVI_NETWORK");
            return new WalletProvider(
                naviAccount,
                network,
                runtime.cacheManager,
            );
        } catch (error) {
            console.error("Error in wallet provider:", error);
            return null;
        }
    },
};

// Module exports
export { walletProvider };
