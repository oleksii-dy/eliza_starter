import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { TestDatabaseManager } from "../../setup/TestDatabaseManager";
import { SupportedDatabases } from "../../../index";
import { v4 as uuidv4 } from "uuid";
import { TokenRecommendation, Recommender } from "../../../types";

describe("Token Recommendation Operations", () => {
    let testDbManager: TestDatabaseManager;
    let db: SupportedDatabases;
    let recommenderId: string;
    let tokenAddress: string;

    beforeAll(async () => {
        testDbManager = TestDatabaseManager.getInstance();
        await testDbManager.initialize();
        db = testDbManager.getDatabase();
        tokenAddress = `token-${uuidv4()}`;

        // Setup test recommender
        const recommender: Recommender = {
            id: uuidv4(),
            address: `test-address-${uuidv4()}`,
            solanaPubkey: `test-solana-${uuidv4()}`,
            telegramId: `test-telegram-${uuidv4()}`,
            discordId: `test-discord-${uuidv4()}`,
            twitterId: `test-twitter-${uuidv4()}`,
            ip: "127.0.0.1",
        };
        await db.addRecommender(recommender);
        recommenderId = recommender.id;

        // Setup token performance
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
    });

    afterAll(async () => {
        await testDbManager.cleanup();
    });

    describe("Basic CRUD Operations", () => {
        it("should add a token recommendation with all fields", async () => {
            const recommendation: TokenRecommendation = {
                id: uuidv4(),
                recommenderId,
                tokenAddress,
                timestamp: new Date(),
                initialMarketCap: 100000,
                initialLiquidity: 50000,
                initialPrice: 1.0,
            };

            const success = await db.addTokenRecommendation(recommendation);
            expect(success).toBe(true);

            const recommendations = await db.getRecommendationsByToken(
                tokenAddress
            );
            expect(recommendations).toHaveLength(1);
            expect(recommendations[0]).toEqual(recommendation);
        });

        it("should add a token recommendation with minimal fields", async () => {
            const minimalRecommendation: TokenRecommendation = {
                id: uuidv4(),
                recommenderId,
                tokenAddress,
                timestamp: new Date(),
            };

            const success = await db.addTokenRecommendation(
                minimalRecommendation
            );
            expect(success).toBe(true);

            const recommendations = await db.getRecommendationsByToken(
                tokenAddress
            );
            expect(recommendations).toHaveLength(2);
            const saved = recommendations.find(
                (r) => r.id === minimalRecommendation.id
            );
            expect(saved).toBeDefined();
            expect(saved?.initialMarketCap).toBeUndefined();
            expect(saved?.initialLiquidity).toBeUndefined();
            expect(saved?.initialPrice).toBeUndefined();
        });
    });

    describe("Retrieval Operations", () => {
        let testRecommendations: TokenRecommendation[];

        beforeAll(async () => {
            // Add multiple recommendations with different timestamps
            testRecommendations = [];
            const timestamps = [
                new Date(2024, 0, 1),
                new Date(2024, 0, 15),
                new Date(2024, 1, 1),
            ];

            for (const timestamp of timestamps) {
                const recommendation: TokenRecommendation = {
                    id: uuidv4(),
                    recommenderId,
                    tokenAddress,
                    timestamp,
                    initialMarketCap: Math.random() * 1000000,
                    initialLiquidity: Math.random() * 500000,
                    initialPrice: Math.random() * 10,
                };
                await db.addTokenRecommendation(recommendation);
                testRecommendations.push(recommendation);
            }
        });

        it("should get recommendations by recommender", async () => {
            const recommendations = await db.getRecommendationsByRecommender(
                recommenderId
            );
            expect(recommendations.length).toBeGreaterThanOrEqual(
                testRecommendations.length
            );
            expect(recommendations).toEqual(
                expect.arrayContaining(
                    testRecommendations.map((r) =>
                        expect.objectContaining({
                            id: r.id,
                            recommenderId: r.recommenderId,
                            tokenAddress: r.tokenAddress,
                        })
                    )
                )
            );
        });

        it("should get recommendations by token", async () => {
            const recommendations = await db.getRecommendationsByToken(
                tokenAddress
            );
            expect(recommendations.length).toBeGreaterThanOrEqual(
                testRecommendations.length
            );
            expect(recommendations).toEqual(
                expect.arrayContaining(
                    testRecommendations.map((r) =>
                        expect.objectContaining({
                            id: r.id,
                            tokenAddress: r.tokenAddress,
                        })
                    )
                )
            );
        });

        it("should get recommendations by date range", async () => {
            const startDate = new Date(2024, 0, 10);
            const endDate = new Date(2024, 1, 15);

            const recommendations = await db.getRecommendationsByDateRange(
                startDate,
                endDate
            );

            const expectedRecommendations = testRecommendations.filter(
                (r) => r.timestamp >= startDate && r.timestamp <= endDate
            );

            expect(recommendations).toEqual(
                expect.arrayContaining(
                    expectedRecommendations.map((r) =>
                        expect.objectContaining({
                            id: r.id,
                            timestamp: r.timestamp,
                        })
                    )
                )
            );
        });

        it("should return empty array for non-existent token", async () => {
            const recommendations = await db.getRecommendationsByToken(
                `nonexistent-${uuidv4()}`
            );
            expect(recommendations).toEqual([]);
        });

        it("should return empty array for non-existent recommender", async () => {
            const recommendations = await db.getRecommendationsByRecommender(
                uuidv4()
            );
            expect(recommendations).toEqual([]);
        });
    });

    describe("Edge Cases and Validation", () => {
        it("should handle duplicate recommendation IDs gracefully", async () => {
            const id = uuidv4();
            const recommendation1: TokenRecommendation = {
                id,
                recommenderId,
                tokenAddress,
                timestamp: new Date(),
                initialMarketCap: 100000,
            };

            const recommendation2: TokenRecommendation = {
                id,
                recommenderId,
                tokenAddress,
                timestamp: new Date(),
                initialMarketCap: 200000,
            };

            const success1 = await db.addTokenRecommendation(recommendation1);
            expect(success1).toBe(true);

            const success2 = await db.addTokenRecommendation(recommendation2);
            expect(success2).toBe(false);
        });

        it("should handle invalid foreign keys", async () => {
            const recommendation: TokenRecommendation = {
                id: uuidv4(),
                recommenderId: uuidv4(), // Non-existent recommender
                tokenAddress: `invalid-token-${uuidv4()}`, // Non-existent token
                timestamp: new Date(),
            };

            const success = await db.addTokenRecommendation(recommendation);
            expect(success).toBe(false);
        });
    });
});
