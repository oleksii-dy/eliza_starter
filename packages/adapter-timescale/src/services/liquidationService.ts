import { elizaLogger } from "@elizaos/core";
import { TimescaleDBAdapter } from "../index";

export class LiquidationService {
    private dbAdapter: TimescaleDBAdapter;
    private monitoringInterval?: NodeJS.Timeout;

    constructor(connectionString: string) {
        this.dbAdapter = new TimescaleDBAdapter(connectionString);
    }

    async init(): Promise<void> {
        try {
            await this.dbAdapter.init();
            elizaLogger.info("LiquidationService initialized successfully");
        } catch (error) {
            elizaLogger.error(
                "Failed to initialize LiquidationService:",
                error
            );
            throw error;
        }
    }

    startMonitoring(
        callback: (liquidations: any[]) => void,
        intervalMs: number = 5000
    ): void {
        let lastCheckTime = new Date();

        const checkForNewLiquidations = async () => {
            try {
                const currentTime = new Date();
                const liquidations = await this.dbAdapter.getLiquidations({
                    startTime: lastCheckTime,
                    endTime: currentTime,
                });

                if (liquidations.length > 0) {
                    callback(liquidations);
                }

                lastCheckTime = currentTime;
            } catch (error) {
                elizaLogger.error("Error monitoring liquidations:", error);
            }
        };

        this.monitoringInterval = setInterval(
            checkForNewLiquidations,
            intervalMs
        );
        elizaLogger.info(
            `Started monitoring liquidations with interval: ${intervalMs}ms`
        );
    }

    stopMonitoring(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = undefined;
            elizaLogger.info("Stopped monitoring liquidations");
        }
    }

    async getHistoricalLiquidations(
        interval: "1h" | "4h" | "12h" | "24h",
        startTime: Date,
        endTime: Date
    ): Promise<any[]> {
        try {
            return await this.dbAdapter.getAggregatedLiquidations({
                interval,
                startTime,
                endTime,
            });
        } catch (error) {
            elizaLogger.error("Error fetching historical liquidations:", error);
            throw error;
        }
    }

    async getMarketLiquidations(
        marketId: string,
        limit: number = 100
    ): Promise<any[]> {
        try {
            return await this.dbAdapter.getLiquidationsByMarket({
                marketId,
                limit,
            });
        } catch (error) {
            elizaLogger.error("Error fetching market liquidations:", error);
            throw error;
        }
    }

    async getLiquidationVolume(
        startTime: Date,
        endTime: Date
    ): Promise<number> {
        try {
            return await this.dbAdapter.getTotalLiquidationVolume({
                startTime,
                endTime,
            });
        } catch (error) {
            elizaLogger.error("Error fetching liquidation volume:", error);
            throw error;
        }
    }

    async cleanup(): Promise<void> {
        this.stopMonitoring();
        await this.dbAdapter.cleanup();
    }
}

export default LiquidationService;
