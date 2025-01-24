import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { TestDatabaseManager } from "../../setup/TestDatabaseManager";
import { SupportedDatabases } from "../../../index";
import { v4 as uuidv4 } from "uuid";
import { TradePerformance } from "../../../types";

describe("Trade Performance Operations", () => {
    let testDbManager: TestDatabaseManager;
    let db: SupportedDatabases;
    let tokenAddress: string;
    let recommenderId: string;
    let initialTrade: TradePerformance;

    beforeAll(async () => {
        testDbManager = TestDatabaseManager.getInstance();
        await testDbManager.initialize();
        db = testDbManager.getDatabase();

        tokenAddress = `token-${uuidv4()}`;
        recommenderId = uuidv4();

        // Add required token performance record
        await db.upsertTokenPerformance({
            tokenAddress,
            symbol: "TEST",
            priceChange24h: 10,
            volumeChange24h: 5000,
            trade_24h_change: 200,
            liquidity: 10000,
            liquidityChange24h: 5,
            holderChange24h: 50,
            rugPull: false,
            isScam: false,
            marketCapChange24h: 12.3,
            sustainedGrowth: true,
            rapidDump: false,
            suspiciousVolume: false,
            validationTrust: 0.9,
            balance: 1000,
            initialMarketCap: 100000,
            lastUpdated: new Date(),
        });

        // Add required recommender
        await db.addRecommender({
            id: recommenderId,
            address: `test-address-${uuidv4()}`,
        });

        initialTrade = {
            token_address: tokenAddress,
            recommender_id: recommenderId,
            buy_price: 100,
            sell_price: 0,
            buy_timeStamp: new Date().toISOString(),
            sell_timeStamp: "",
            buy_amount: 50,
            sell_amount: 0,
            buy_sol: 5,
            received_sol: 0,
            buy_value_usd: 500,
            sell_value_usd: 0,
            profit_usd: 0,
            profit_percent: 0,
            buy_market_cap: 1000000,
            sell_market_cap: 0,
            market_cap_change: 0,
            buy_liquidity: 100000,
            sell_liquidity: 0,
            liquidity_change: 0,
            last_updated: new Date().toISOString(),
            rapidDump: false,
        };
    });

    afterAll(async () => {
        await testDbManager.cleanup();
    });

    it("should add trade performance", async () => {
        const success = await db.addTradePerformance(initialTrade, false);
        expect(success).toBe(true);

        const savedTrade = await db.getTradePerformance(
            tokenAddress,
            recommenderId,
            initialTrade.buy_timeStamp,
            false
        );

        expect(savedTrade).toMatchObject({
            token_address: tokenAddress,
            recommender_id: recommenderId,
            buy_price: 100,
            buy_amount: 50,
            buy_sol: 5,
            buy_value_usd: 500,
            buy_market_cap: 1000000,
            buy_liquidity: 100000,
            rapidDump: false,
        });
    });

    it("should add simulation trade performance", async () => {
        const success = await db.addTradePerformance(initialTrade, true);
        expect(success).toBe(true);

        const savedTrade = await db.getTradePerformance(
            tokenAddress,
            recommenderId,
            initialTrade.buy_timeStamp,
            true
        );

        expect(savedTrade).toMatchObject({
            token_address: tokenAddress,
            recommender_id: recommenderId,
        });
    });

    it("should update trade performance on sell", async () => {
        const sellDetails = {
            sell_price: 150,
            sell_timeStamp: new Date().toISOString(),
            sell_amount: 50,
            received_sol: 7.5,
            sell_value_usd: 750,
            profit_usd: 250,
            profit_percent: 50,
            sell_market_cap: 1200000,
            market_cap_change: 200000,
            sell_liquidity: 120000,
            liquidity_change: 20000,
            rapidDump: false,
            sell_recommender_id: null,
        };

        const success = await db.updateTradePerformanceOnSell(
            tokenAddress,
            recommenderId,
            initialTrade.buy_timeStamp,
            sellDetails,
            false
        );
        expect(success).toBe(true);

        const updatedTrade = await db.getTradePerformance(
            tokenAddress,
            recommenderId,
            initialTrade.buy_timeStamp,
            false
        );

        expect(updatedTrade).toMatchObject({
            sell_price: sellDetails.sell_price,
            sell_amount: sellDetails.sell_amount,
            received_sol: sellDetails.received_sol,
            sell_value_usd: sellDetails.sell_value_usd,
            profit_usd: sellDetails.profit_usd,
            profit_percent: sellDetails.profit_percent,
            sell_market_cap: sellDetails.sell_market_cap,
            market_cap_change: sellDetails.market_cap_change,
            sell_liquidity: sellDetails.sell_liquidity,
            liquidity_change: sellDetails.liquidity_change,
            rapidDump: sellDetails.rapidDump,
        });
    });

    it("should get latest trade performance", async () => {
        const latestTrade = await db.getLatestTradePerformance(
            tokenAddress,
            recommenderId,
            false
        );

        expect(latestTrade).not.toBeNull();
        expect(latestTrade?.token_address).toBe(tokenAddress);
        expect(latestTrade?.recommender_id).toBe(recommenderId);
        expect(latestTrade?.sell_price).toBeDefined();
    });

    it("should handle non-existent trade lookup", async () => {
        const nonExistentTrade = await db.getTradePerformance(
            "non-existent",
            "non-existent",
            new Date().toISOString(),
            false
        );
        expect(nonExistentTrade).toBeNull();
    });

    it("should handle latest trade lookup for non-existent trade", async () => {
        const nonExistentTrade = await db.getLatestTradePerformance(
            "non-existent",
            "non-existent",
            false
        );
        expect(nonExistentTrade).toBeNull();
    });
});
