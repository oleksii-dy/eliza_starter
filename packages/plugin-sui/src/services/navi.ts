import { NAVISDKClient, NetworkType, CoinInfo, PoolConfig, OptionType } from "@navi-labs/sdk";
import { elizaLogger, Service, ServiceType } from "@elizaos/core";

export class NaviService implements Service {
    private client: NAVISDKClient;
    private network: NetworkType;
    public serviceType = ServiceType.TRANSCRIPTION;

    constructor(network: NetworkType = "mainnet") {
        this.network = network;
    }

    async initialize(): Promise<void> {
        this.client = new NAVISDKClient({
            networkType: this.network,
            numberOfAccounts: 1
        });
    }

    public getNetwork(): NetworkType {
        return this.network;
    }

    public getAddress(): string {
        return this.client.accounts[0].getPublicKey();
    }

    async getPoolInfo(coinType?: CoinInfo) {
        try {
            return await this.client.getPoolInfo(coinType);
        } catch (error) {
            elizaLogger.error("Error getting pool info:", error);
            throw error;
        }
    }

    async getReserveDetail(coinType: CoinInfo) {
        try {
            return await this.client.getReserveDetail(coinType);
        } catch (error) {
            elizaLogger.error("Error getting reserve detail:", error);
            throw error;
        }
    }

    async getHealthFactor(address: string) {
        try {
            return await this.client.getHealthFactor(address);
        } catch (error) {
            elizaLogger.error("Error getting health factor:", error);
            throw error;
        }
    }

    async getDynamicHealthFactor(
        address: string,
        coinType: CoinInfo,
        estimateSupply: number,
        estimateBorrow: number,
        isIncrease: boolean = true
    ) {
        try {
            return await this.client.getDynamicHealthFactor(
                address,
                coinType,
                estimateSupply,
                estimateBorrow,
                isIncrease
            );
        } catch (error) {
            elizaLogger.error("Error getting dynamic health factor:", error);
            throw error;
        }
    }

    async getAllNaviPortfolios() {
        try {
            return await this.client.getAllNaviPortfolios();
        } catch (error) {
            elizaLogger.error("Error getting all Navi portfolios:", error);
            throw error;
        }
    }

    async getAllBalances() {
        try {
            return await this.client.getAllBalances();
        } catch (error) {
            elizaLogger.error("Error getting all balances:", error);
            throw error;
        }
    }

    async getAvailableRewards(address?: string, option: OptionType = OptionType.OptionSupply) {
        try {
            return await this.client.getAddressAvailableRewards(address, option);
        } catch (error) {
            elizaLogger.error("Error getting available rewards:", error);
            throw error;
        }
    }

    async getClaimedRewardsHistory(userAddress?: string, page: number = 1, size: number = 400) {
        try {
            return await this.client.getClaimedRewardsHistory(userAddress, page, size);
        } catch (error) {
            elizaLogger.error("Error getting claimed rewards history:", error);
            throw error;
        }
    }
} 