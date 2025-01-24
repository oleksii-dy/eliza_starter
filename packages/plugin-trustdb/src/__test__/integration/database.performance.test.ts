import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { TestDatabaseManager } from "../setup/TestDatabaseManager";
import { SupportedDatabases } from "../../index";
import { v4 as uuidv4 } from "uuid";
import {
    Recommender,
    TokenPerformance,
    TokenRecommendation,
} from "../../types";

describe("Performance Testing", () => {
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

    it("should handle large batch operations", async () => {
        const batchSize = 1000;
        const recommenders: Recommender[] = [];
        const tokens: TokenPerformance[] = [];
        const recommendations: TokenRecommendation[] = [];

        // Create test data
        for (let i = 0; i < batchSize; i++) {
            const recommenderId = uuidv4();
            const tokenAddress = `token-${uuidv4()}`;

            recommenders.push({
                id: recommenderId,
                address: `addr-${recommenderId}`,
                solanaPubkey: `sol-${recommenderId}`,
            });

            tokens.push({
                tokenAddress,
                symbol: `SYM${i}`,
                priceChange24h: Math.random() * 100,
                volumeChange24h: Math.random() * 1000000,
                trade_24h_change: Math.random() * 500,
                liquidity: Math.random() * 1000000,
                liquidityChange24h: Math.random() * 100,
                holderChange24h: Math.random() * 1000,
                rugPull: false,
                isScam: false,
                marketCapChange24h: Math.random() * 100,
                sustainedGrowth: true,
                rapidDump: false,
                suspiciousVolume: false,
                validationTrust: Math.random() * 100,
                balance: Math.random() * 10000,
                initialMarketCap: Math.random() * 1000000,
                lastUpdated: new Date(),
            });

            recommendations.push({
                id: uuidv4(),
                recommenderId,
                tokenAddress,
                timestamp: new Date(),
                initialMarketCap: Math.random() * 1000000,
            });
        }

        const startTime = Date.now();

        // Batch insert operations
        const recommenderPromises = recommenders.map((r) =>
            db.addRecommender(r)
        );
        await Promise.all(recommenderPromises);

        const tokenPromises = tokens.map((t) => db.upsertTokenPerformance(t));
        await Promise.all(tokenPromises);

        const recommendationPromises = recommendations.map((r) =>
            db.addTokenRecommendation(r)
        );
        await Promise.all(recommendationPromises);

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`Batch operation duration: ${duration}ms`);
        expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
    });

    it("should maintain performance with concurrent users", async () => {
        const concurrentUsers = 50;
        const operationsPerUser = 20;

        const startTime = Date.now();
        const userOperations = Array(concurrentUsers)
            .fill(null)
            .map(async (_, userIndex) => {
                const results = [];
                for (let i = 0; i < operationsPerUser; i++) {
                    const tokenAddress = `token-${uuidv4()}`;
                    const recommenderId = uuidv4();

                    // Simulate user operations
                    results.push(
                        db.upsertTokenPerformance({
                            tokenAddress,
                            symbol: `T${userIndex}-${i}`,
                            priceChange24h: Math.random() * 100,
                            volumeChange24h: Math.random() * 1000000,
                            trade_24h_change: Math.random() * 500,
                            liquidity: Math.random() * 1000000,
                            liquidityChange24h: Math.random() * 100,
                            holderChange24h: Math.random() * 1000,
                            rugPull: false,
                            isScam: false,
                            marketCapChange24h: Math.random() * 100,
                            sustainedGrowth: true,
                            rapidDump: false,
                            suspiciousVolume: false,
                            validationTrust: Math.random() * 100,
                            balance: Math.random() * 10000,
                            initialMarketCap: Math.random() * 1000000,
                            lastUpdated: new Date(),
                        })
                    );
                }
                return Promise.all(results);
            });

        await Promise.all(userOperations);
        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`Concurrent operations duration: ${duration}ms`);
        expect(duration).toBeLessThan(60000); // Should complete within 60 seconds
    });

    it("should optimize query execution", async () => {
        // Setup test data
        const tokenCount = 100;
        const recommendersPerToken = 5;
        const tokens = new Array(tokenCount)
            .fill(null)
            .map(() => `token-${uuidv4()}`);

        // Insert test data
        for (const tokenAddress of tokens) {
            await db.upsertTokenPerformance({
                tokenAddress,
                symbol: "TEST",
                priceChange24h: Math.random() * 100,
                volumeChange24h: Math.random() * 1000000,
                trade_24h_change: Math.random() * 500,
                liquidity: Math.random() * 1000000,
                liquidityChange24h: Math.random() * 100,
                holderChange24h: Math.random() * 1000,
                rugPull: false,
                isScam: false,
                marketCapChange24h: Math.random() * 100,
                sustainedGrowth: true,
                rapidDump: false,
                suspiciousVolume: false,
                validationTrust: Math.random() * 100,
                balance: Math.random() * 10000,
                initialMarketCap: Math.random() * 1000000,
                lastUpdated: new Date(),
            });

            for (let i = 0; i < recommendersPerToken; i++) {
                const recommenderId = uuidv4();
                await db.addRecommender({
                    id: recommenderId,
                    address: `addr-${recommenderId}`,
                });
                await db.addTokenRecommendation({
                    id: uuidv4(),
                    recommenderId,
                    tokenAddress,
                    timestamp: new Date(),
                });
            }
        }

        // Test complex query performance
        const startTime = Date.now();

        const queryPromises = tokens.map(async (tokenAddress) => {
            // Perform multiple operations per token
            const [performance, recommendations, validationTrust] =
                await Promise.all([
                    db.getTokenPerformance(tokenAddress),
                    db.getRecommendationsByToken(tokenAddress),
                    db.calculateValidationTrust(tokenAddress),
                ]);

            return { performance, recommendations, validationTrust };
        });

        await Promise.all(queryPromises);

        const endTime = Date.now();
        const duration = endTime - startTime;
        const averageQueryTime = duration / tokens.length;

        console.log(`Average query time per token: ${averageQueryTime}ms`);
        expect(averageQueryTime).toBeLessThan(100); // Each token's queries should complete within 100ms
    });
});
