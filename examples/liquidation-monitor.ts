import { LiquidationService } from "../packages/adapter-timescale/src/services/liquidationService";
import { config } from "dotenv";

// Load environment variables
config();

async function main() {
    const liquidationService = new LiquidationService(
        process.env.TIMESCALE_DB_URL!
    );

    // Initialize the service
    await liquidationService.init();

    // Example: Monitor real-time liquidations
    liquidationService.startMonitoring((liquidations) => {
        console.log("New liquidations detected:", liquidations);
    });

    // Example: Get historical data
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

    try {
        // Get hourly aggregated data
        const hourlyData = await liquidationService.getHistoricalLiquidations(
            "1h",
            startTime,
            endTime
        );
        console.log("Hourly liquidation data:", hourlyData);

        // Get total volume
        const totalVolume = await liquidationService.getLiquidationVolume(
            startTime,
            endTime
        );
        console.log("Total liquidation volume:", totalVolume);

        // Get specific market data
        const marketId = "YOUR_MARKET_ID";
        const marketData = await liquidationService.getMarketLiquidations(
            marketId
        );
        console.log("Market-specific liquidations:", marketData);
    } catch (error) {
        console.error("Error:", error);
    }

    // Cleanup on process exit
    process.on("SIGINT", async () => {
        await liquidationService.cleanup();
        process.exit(0);
    });
}
