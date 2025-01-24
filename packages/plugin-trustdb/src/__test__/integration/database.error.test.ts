import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { TestDatabaseManager } from "../setup/TestDatabaseManager";
import { SupportedDatabases } from "../../index";
import { v4 as uuidv4 } from "uuid";

describe("Error Handling", () => {
    let testDbManager: TestDatabaseManager;
    let db: SupportedDatabases;

    beforeAll(async () => {
        testDbManager = TestDatabaseManager.getInstance();
        await testDbManager.initialize();
        db = testDbManager.getDatabase();
    });

    afterAll(async () => {
        await testDbManager.cleanup();
    });

    describe("Recommender Operations", () => {
        it("should handle duplicate recommender address", async () => {
            const address = `duplicate-${uuidv4()}`;
            const recommender1 = { id: uuidv4(), address };
            const recommender2 = { id: uuidv4(), address };

            const result1 = await db.addRecommender(recommender1);
            expect(result1).toBe(recommender1.id);

            const result2 = await db.addRecommender(recommender2);
            expect(result2).toBeNull();
        });

        it("should handle invalid UUID format", async () => {
            const invalidId = "not-a-uuid";
            const result = await db.getRecommender(invalidId);
            expect(result).toBeNull();
        });
    });

    describe("Token Operations", () => {
        it("should handle non-existent token for performance update", async () => {
            const nonExistentToken = `nonexistent-${uuidv4()}`;
            const success = await db.updateTokenBalance(nonExistentToken, 1000);
            expect(success).toBe(false);
        });

        it("should handle invalid token performance data", async () => {
            const performance = {
                tokenAddress: `token-${uuidv4()}`,
                symbol: "TEST",
                priceChange24h: NaN,
                volumeChange24h: Infinity,
                trade_24h_change: -Infinity,
                liquidity: NaN,
                liquidityChange24h: 0,
                holderChange24h: 0,
                rugPull: false,
                isScam: false,
                marketCapChange24h: 0,
                sustainedGrowth: false,
                rapidDump: false,
                suspiciousVolume: false,
                validationTrust: 0,
                balance: 0,
                initialMarketCap: 0,
                lastUpdated: new Date(),
            };

            const success = await db.upsertTokenPerformance(performance);
            expect(success).toBe(false);
        });
    });

    describe("Trade Operations", () => {
        it("should handle missing foreign key constraints", async () => {
            const trade = {
                token_address: `nonexistent-${uuidv4()}`,
                recommender_id: uuidv4(),
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

            const success = await db.addTradePerformance(trade, false);
            expect(success).toBe(false);
        });

        it("should handle invalid sell update for non-existent trade", async () => {
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
                `nonexistent-${uuidv4()}`,
                uuidv4(),
                new Date().toISOString(),
                sellDetails,
                false
            );
            expect(success).toBe(false);
        });
    });

    describe("Transaction Operations", () => {
        it("should handle duplicate transaction hash", async () => {
            const tokenAddress = `token-${uuidv4()}`;
            await db.upsertTokenPerformance({
                tokenAddress,
                symbol: "TEST",
                priceChange24h: 0,
                volumeChange24h: 0,
                trade_24h_change: 0,
                liquidity: 0,
                liquidityChange24h: 0,
                holderChange24h: 0,
                rugPull: false,
                isScam: false,
                marketCapChange24h: 0,
                sustainedGrowth: false,
                rapidDump: false,
                suspiciousVolume: false,
                validationTrust: 0,
                balance: 0,
                initialMarketCap: 0,
                lastUpdated: new Date(),
            });

            const txHash = `tx-${uuidv4()}`;
            const transaction1 = {
                tokenAddress,
                transactionHash: txHash,
                type: "buy" as const,
                amount: 100,
                price: 10,
                isSimulation: false,
                timestamp: new Date().toISOString(),
            };

            const transaction2 = {
                ...transaction1,
                amount: 200,
            };

            const success1 = await db.addTransaction(transaction1);
            expect(success1).toBe(true);

            const success2 = await db.addTransaction(transaction2);
            expect(success2).toBe(false);
        });
    });

    describe("Concurrent Operations", () => {
        it("should handle concurrent recommender creation", async () => {
            const address = `concurrent-${uuidv4()}`;
            const promises = Array(5)
                .fill(null)
                .map(() => db.addRecommender({ id: uuidv4(), address }));

            const results = await Promise.all(promises);
            const successfulAdds = results.filter(Boolean);
            expect(successfulAdds).toHaveLength(1);
        });

        it("should handle concurrent token performance updates", async () => {
            const tokenAddress = `token-${uuidv4()}`;
            const basePerformance = {
                tokenAddress,
                symbol: "TEST",
                priceChange24h: 0,
                volumeChange24h: 0,
                trade_24h_change: 0,
                liquidity: 0,
                liquidityChange24h: 0,
                holderChange24h: 0,
                rugPull: false,
                isScam: false,
                marketCapChange24h: 0,
                sustainedGrowth: false,
                rapidDump: false,
                suspiciousVolume: false,
                validationTrust: 0,
                balance: 0,
                initialMarketCap: 0,
                lastUpdated: new Date(),
            };

            const promises = Array(5)
                .fill(null)
                .map((_, i) =>
                    db.upsertTokenPerformance({
                        ...basePerformance,
                        balance: i * 100,
                    })
                );

            const results = await Promise.all(promises);
            expect(results.filter(Boolean)).not.toHaveLength(0);
        });
    });
});
