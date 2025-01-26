import {
    describe,
    it,
    expect,
    beforeAll,
    afterAll,
    beforeEach,
    afterEach,
} from "vitest";
import { Pool } from "pg";
import { TestDatabaseManager } from "./setup/testDatabaseManager";
import { v4 as uuidv4 } from "uuid";
import {
    Recommender,
    TokenPerformance,
    TokenRecommendation,
    TradePerformance,
    Transaction,
    ITrustDatabase,
} from "../types";
import { TEST_DB_CONFIG } from "./setup/config";
import { elizaLogger } from "@elizaos/core";

describe("Database Connection", () => {
    let testDbManager: TestDatabaseManager;
    let db: ITrustDatabase;

    beforeAll(async () => {
        testDbManager = TestDatabaseManager.getInstance();
        await testDbManager.initialize();
        db = testDbManager.getDatabase();
    }, 3000);

    afterAll(async () => {
        await testDbManager.cleanup();
    });

    it("should initialize database successfully", async () => {
        expect(db).toBeDefined();

        const recommender = {
            id: uuidv4(),
            address: "test-address",
        };

        const result = await db.addRecommender(recommender);
        expect(result).toBe(recommender.id);
    });

    it("should handle database operations after initialization", async () => {
        const recommender = {
            id: uuidv4(),
            address: "test-address-2",
            solanaPubkey: "test-solana",
            ip: uuidv4(),
            telegramId: uuidv4(),
            discordId: uuidv4(),
            twitterId: uuidv4(),
        };

        await db.addRecommender(recommender);
        const retrieved = await db.getRecommender(recommender.id);
        expect(retrieved).toEqual(recommender);
    });
});

describe("Database Schema", () => {
    let testDbManager: TestDatabaseManager;
    let pool: Pool;

    beforeAll(async () => {
        testDbManager = TestDatabaseManager.getInstance();
        await testDbManager.initialize();
        pool = new Pool(TEST_DB_CONFIG);
    }, 3000);

    afterAll(async () => {
        try {
            await pool.end();
            await testDbManager.cleanup();
        } catch (error: unknown) {
            if (
                error &&
                typeof error === "object" &&
                "code" in error &&
                error.code === "57P01"
            ) {
                elizaLogger.info("Database already closed");
                return;
            }
            throw error;
        }
    });

    it("should create all required tables", async () => {
        const expectedTables = [
            "recommenders",
            "recommender_metrics",
            "token_performance",
            "token_recommendations",
            "recommender_metrics_history",
            "trade",
            "simulation_trade",
            "transactions",
        ];

        const { rows } = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
        `);

        const actualTables = rows.map((row) => row.table_name);
        expectedTables.forEach((table) => {
            expect(actualTables).toContain(table);
        });
    });

    it("should enforce foreign key constraints", async () => {
        const { rows } = await pool.query(`
            SELECT
                tc.constraint_name,
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
        `);

        const expectedForeignKeys = [
            {
                table: "recommender_metrics",
                column: "recommender_id",
                foreignTable: "recommenders",
                foreignColumn: "id",
            },
            {
                table: "token_recommendations",
                column: "recommender_id",
                foreignTable: "recommenders",
                foreignColumn: "id",
            },
            {
                table: "token_recommendations",
                column: "token_address",
                foreignTable: "token_performance",
                foreignColumn: "token_address",
            },
            {
                table: "recommender_metrics_history",
                column: "recommender_id",
                foreignTable: "recommenders",
                foreignColumn: "id",
            },
            {
                table: "trade",
                column: "token_address",
                foreignTable: "token_performance",
                foreignColumn: "token_address",
            },
            {
                table: "trade",
                column: "recommender_id",
                foreignTable: "recommenders",
                foreignColumn: "id",
            },
            {
                table: "simulation_trade",
                column: "token_address",
                foreignTable: "token_performance",
                foreignColumn: "token_address",
            },
            {
                table: "simulation_trade",
                column: "recommender_id",
                foreignTable: "recommenders",
                foreignColumn: "id",
            },
            {
                table: "transactions",
                column: "token_address",
                foreignTable: "token_performance",
                foreignColumn: "token_address",
            },
        ];

        expectedForeignKeys.forEach((fk) => {
            const foundConstraint = rows.some(
                (row) =>
                    row.table_name === fk.table &&
                    row.column_name === fk.column &&
                    row.foreign_table_name === fk.foreignTable &&
                    row.foreign_column_name === fk.foreignColumn
            );
            expect(foundConstraint).toBe(true);
        });
    });

    it("should create necessary indexes", async () => {
        const { rows } = await pool.query(`
            SELECT
                t.relname as table_name,
                i.relname as index_name,
                a.attname as column_name
            FROM pg_class t
            JOIN pg_index ix ON t.oid = ix.indrelid
            JOIN pg_class i ON i.oid = ix.indexrelid
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
            WHERE t.relkind = 'r'
            AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        `);

        const expectedIndexes = [
            { table: "recommenders", column: "address" },
            { table: "recommenders", column: "solana_pubkey" },
            { table: "recommenders", column: "telegram_id" },
            { table: "recommenders", column: "discord_id" },
            { table: "recommenders", column: "twitter_id" },
            { table: "token_performance", column: "token_address" },
            { table: "transactions", column: "transaction_hash" },
        ];

        expectedIndexes.forEach((idx) => {
            const foundIndex = rows.some(
                (row) =>
                    row.table_name === idx.table &&
                    row.column_name === idx.column
            );
            expect(foundIndex).toBe(true);
        });
    });
});

describe("Error Handling", () => {
    let testDbManager: TestDatabaseManager;
    let db: ITrustDatabase;

    beforeAll(async () => {
        testDbManager = TestDatabaseManager.getInstance();
        await testDbManager.initialize();
        db = testDbManager.getDatabase();
    }, 3000);

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

describe("Performance Testing", () => {
    let testDbManager: TestDatabaseManager;
    let db: ITrustDatabase;

    beforeAll(async () => {
        testDbManager = TestDatabaseManager.getInstance();
        await testDbManager.initialize();
        db = testDbManager.getDatabase();
    }, 3000);

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
                const results: Promise<boolean>[] = [];
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
                        } as TokenPerformance)
                    );
                }
                return Promise.all(results);
            });

        await Promise.all(userOperations);
        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`Concurrent operations duration: ${duration}ms`);
        expect(duration).toBeLessThan(60000);
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

describe("Recommender Metrics Operations", () => {
    let testDbManager: TestDatabaseManager;
    let db: ITrustDatabase;
    let recommenderId: string;

    beforeAll(async () => {
        testDbManager = TestDatabaseManager.getInstance();
        await testDbManager.initialize();
        db = testDbManager.getDatabase();

        const recommender = {
            id: uuidv4(),
            address: `test-metrics-${uuidv4()}`,
        };
        await db.addRecommender(recommender);
        recommenderId = recommender.id;
    }, 3000);

    afterAll(async () => {
        await testDbManager.cleanup();
    });

    it("should initialize recommender metrics", async () => {
        const success = await db.initializeRecommenderMetrics(recommenderId);
        expect(success).toBe(true);

        const metrics = await db.getRecommenderMetrics(recommenderId);
        expect(metrics).not.toBeNull();
        expect(metrics?.recommenderId).toBe(recommenderId);
    });

    it("should retrieve recommender metrics with default values", async () => {
        const metrics = await db.getRecommenderMetrics(recommenderId);
        expect(metrics).not.toBeNull();
        expect(metrics?.trustScore).toBe(0);
        expect(metrics?.totalRecommendations).toBe(0);
        expect(metrics?.successfulRecs).toBe(0);
        expect(metrics?.avgTokenPerformance).toBe(0);
        expect(metrics?.riskScore).toBe(0);
        expect(metrics?.consistencyScore).toBe(0);
    });

    it("should log and retrieve metrics history", async () => {
        await db.logRecommenderMetricsHistory(recommenderId);
        const history = await db.getRecommenderMetricsHistory(recommenderId);

        expect(history).toHaveLength(1);
        expect(history[0]).toMatchObject({
            recommenderId,
            trustScore: 0,
            totalRecommendations: 0,
            successfulRecs: 0,
            avgTokenPerformance: 0,
            riskScore: 0,
            consistencyScore: 0,
        });
    });

    it("should update recommender metrics", async () => {
        const updatedMetrics = {
            recommenderId,
            trustScore: 75.5,
            totalRecommendations: 10,
            successfulRecs: 8,
            avgTokenPerformance: 7.5,
            riskScore: 3.2,
            consistencyScore: 6.8,
            virtualConfidence: 4.5,
            lastActiveDate: new Date(),
            trustDecay: 0.1,
            lastUpdated: new Date(),
        };

        await db.updateRecommenderMetrics(updatedMetrics);
        const metrics = await db.getRecommenderMetrics(recommenderId);

        expect(metrics).toMatchObject({
            trustScore: updatedMetrics.trustScore,
            totalRecommendations: updatedMetrics.totalRecommendations,
            successfulRecs: updatedMetrics.successfulRecs,
            avgTokenPerformance: updatedMetrics.avgTokenPerformance,
            riskScore: updatedMetrics.riskScore,
            consistencyScore: updatedMetrics.consistencyScore,
            virtualConfidence: updatedMetrics.virtualConfidence,
            trustDecay: updatedMetrics.trustDecay,
        });
    });
});

describe("Recommender Operations", () => {
    let testDbManager: TestDatabaseManager;
    let db: ITrustDatabase;

    beforeEach(async () => {
        testDbManager = TestDatabaseManager.getInstance();
        await testDbManager.initialize();
        db = testDbManager.getDatabase();
    }, 8000);

    afterEach(async () => {
        await testDbManager.cleanup();
    });

    it("should add a new recommender", async () => {
        const recommender = {
            id: uuidv4(),
            address: `test-address-${uuidv4()}`,
            solanaPubkey: `solana-${uuidv4()}`,
            telegramId: `telegram-${uuidv4()}`,
            discordId: `discord-${uuidv4()}`,
            twitterId: `twitter-${uuidv4()}`,
            ip: uuidv4(),
        };

        const id = await db.addRecommender(recommender);
        expect(id).toBe(recommender.id);

        const retrieved = await db.getRecommender(recommender.id);
        expect(retrieved).toEqual(recommender);
    });

    it("should retrieve a recommender by address", async () => {
        const recommender = {
            id: uuidv4(),
            address: `test-address-${uuidv4()}`,
            solanaPubkey: null,
            telegramId: null,
            discordId: null,
            twitterId: null,
            ip: null,
        };

        await db.addRecommender(recommender);

        const retrieved = await db.getRecommender(recommender.address);
        expect(retrieved).toEqual(recommender);
    });

    it("should get or create a recommender", async () => {
        const recommender = {
            id: uuidv4(),
            address: `test-get-or-create-${uuidv4()}`,
            solanaPubkey: null,
            telegramId: null,
            discordId: null,
            twitterId: null,
            ip: null,
        };

        const result = await db.getOrCreateRecommender(recommender);
        expect(result).toEqual(recommender);

        // Should return same recommender on subsequent calls
        const sameRecommender = await db.getOrCreateRecommender(recommender);
        expect(sameRecommender).toEqual(result);
    });

    it("should get or create a recommender with Discord ID", async () => {
        const discordId = `discord-${uuidv4()}`;

        const result = await db.getOrCreateRecommenderWithDiscordId(discordId);
        expect(result).not.toBeNull();
        expect(result?.discordId).toBe(discordId);
        expect(result?.address).toBe(discordId); // Address defaults to discordId

        const sameResult =
            await db.getOrCreateRecommenderWithDiscordId(discordId);
        expect(sameResult).toEqual(result);
    });

    it("should get or create a recommender with Telegram ID", async () => {
        const telegramId = `telegram-${uuidv4()}`;

        const result =
            await db.getOrCreateRecommenderWithTelegramId(telegramId);
        expect(result).not.toBeNull();
        expect(result?.telegramId).toBe(telegramId);
        expect(result?.address).toBe(telegramId); // Address defaults to telegramId

        const sameResult =
            await db.getOrCreateRecommenderWithTelegramId(telegramId);
        expect(sameResult).toEqual(result);
    });

    it("should handle duplicate recommender creation gracefully", async () => {
        const recommender = {
            id: uuidv4(),
            address: `test-duplicate-${uuidv4()}`,
        };

        const id1 = await db.addRecommender(recommender);
        expect(id1).toBe(recommender.id);

        const id2 = await db.addRecommender(recommender);
        expect(id2).toBeNull(); // Should return null for duplicate
    });

    it("should return null when retrieving a non-existing recommender", async () => {
        const nonExistentId = uuidv4();
        const result = await db.getRecommender(nonExistentId);
        expect(result).toBeNull();
    });

    it("should initialize recommender metrics when creating a recommender", async () => {
        const recommender = {
            id: uuidv4(),
            address: `test-metrics-${uuidv4()}`,
            solanaPubkey: null,
            telegramId: null,
            discordId: null,
            twitterId: null,
            ip: null,
        };

        const createdRecommender = await db.getOrCreateRecommender(recommender);
        expect(createdRecommender).toEqual(recommender);

        const metrics = await db.getRecommenderMetrics(createdRecommender!.id);
        expect(metrics).not.toBeNull();
        expect(metrics?.recommenderId).toBe(createdRecommender!.id);
        expect(metrics?.trustScore).toBe(0);
        expect(metrics?.totalRecommendations).toBe(0);
    });

    it("should find recommender by any identifier", async () => {
        const recommender = {
            id: uuidv4(),
            address: `test-identifiers-${uuidv4()}`,
            solanaPubkey: `solana-${uuidv4()}`,
            telegramId: `telegram-${uuidv4()}`,
            discordId: `discord-${uuidv4()}`,
            twitterId: `twitter-${uuidv4()}`,
            ip: `ip-${uuidv4()}`,
        };

        await db.addRecommender(recommender);

        const byId = await db.getRecommender(recommender.id);
        const byAddress = await db.getRecommender(recommender.address);
        const bySolana = await db.getRecommender(recommender.solanaPubkey!);
        const byTelegram = await db.getRecommender(recommender.telegramId!);
        const byDiscord = await db.getRecommender(recommender.discordId!);
        const byTwitter = await db.getRecommender(recommender.twitterId!);

        expect(byId).toEqual(recommender);
        expect(byAddress).toEqual(recommender);
        expect(bySolana).toEqual(recommender);
        expect(byTelegram).toEqual(recommender);
        expect(byDiscord).toEqual(recommender);
        expect(byTwitter).toEqual(recommender);
    });
});

describe("Validation Trust", () => {
    let testDbManager: TestDatabaseManager;
    let db: ITrustDatabase;

    beforeAll(async () => {
        testDbManager = TestDatabaseManager.getInstance();
        await testDbManager.initialize();
        db = testDbManager.getDatabase();
    }, 3000);

    afterAll(async () => {
        await testDbManager.cleanup();
    });

    it("should handle empty recommendation sets", async () => {
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

        const validationTrust = await db.calculateValidationTrust(tokenAddress);
        expect(validationTrust).toBe(0);
    });

    it("should calculate trust scores correctly with multiple recommenders", async () => {
        const tokenAddress = `token-${uuidv4()}`;
        const recommenders = [
            { id: uuidv4(), trustScore: 80 },
            { id: uuidv4(), trustScore: 60 },
            { id: uuidv4(), trustScore: 40 },
        ];

        // Setup token
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

        // Setup recommenders and their recommendations
        for (const rec of recommenders) {
            await db.addRecommender({ id: rec.id, address: `addr-${rec.id}` });
            await db.initializeRecommenderMetrics(rec.id);
            await db.updateRecommenderMetrics({
                recommenderId: rec.id,
                trustScore: rec.trustScore,
                totalRecommendations: 1,
                successfulRecs: 1,
                avgTokenPerformance: 0,
                riskScore: 0,
                consistencyScore: 0,
                virtualConfidence: 0,
                lastActiveDate: new Date(),
                trustDecay: 0,
                lastUpdated: new Date(),
            });
            await db.addTokenRecommendation({
                id: uuidv4(),
                recommenderId: rec.id,
                tokenAddress,
                timestamp: new Date(),
            });
        }

        const validationTrust = await db.calculateValidationTrust(tokenAddress);
        const expectedAverage =
            recommenders.reduce((sum, rec) => sum + rec.trustScore, 0) /
            recommenders.length;
        expect(validationTrust).toBe(expectedAverage);
    });

    it("should handle invalid trust score data", async () => {
        const tokenAddress = `token-${uuidv4()}`;
        const recommenderId = uuidv4();

        // Setup token and recommender
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

        await db.addRecommender({
            id: recommenderId,
            address: `addr-${recommenderId}`,
        });
        await db.initializeRecommenderMetrics(recommenderId);

        // Add recommendation without initializing metrics (should handle null/undefined trust scores)
        await db.addTokenRecommendation({
            id: uuidv4(),
            recommenderId,
            tokenAddress,
            timestamp: new Date(),
        });

        const validationTrust = await db.calculateValidationTrust(tokenAddress);
        expect(validationTrust).toBe(0);
    });
});

describe("Token Performance Operations", () => {
    let testDbManager: TestDatabaseManager;
    let db: ITrustDatabase;
    let tokenAddress: string;
    let initialTokenPerformance;

    beforeAll(async () => {
        testDbManager = TestDatabaseManager.getInstance();
        await testDbManager.initialize();
        db = testDbManager.getDatabase();
        tokenAddress = `token-${uuidv4()}`;

        initialTokenPerformance = {
            tokenAddress,
            symbol: "TEST",
            priceChange24h: 10.5,
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
        };
    }, 3000);

    afterAll(async () => {
        await testDbManager.cleanup();
    });

    it("should upsert and retrieve token performance", async () => {
        const success = await db.upsertTokenPerformance(
            initialTokenPerformance
        );
        expect(success).toBe(true);

        const retrieved = await db.getTokenPerformance(tokenAddress);
        expect(retrieved).not.toBeNull();
        expect(retrieved?.tokenAddress).toBe(tokenAddress);
        expect(retrieved?.symbol).toBe("TEST");
        expect(retrieved?.priceChange24h).toBe(10.5);
        expect(retrieved?.volumeChange24h).toBe(5000);
        expect(retrieved?.trade_24h_change).toBe(200);
        expect(retrieved?.liquidity).toBe(10000);
        expect(retrieved?.liquidityChange24h).toBe(5);
        expect(retrieved?.holderChange24h).toBe(50);
        expect(retrieved?.rugPull).toBe(false);
        expect(retrieved?.isScam).toBe(false);
        expect(retrieved?.marketCapChange24h).toBe(12.3);
        expect(retrieved?.sustainedGrowth).toBe(true);
        expect(retrieved?.rapidDump).toBe(false);
        expect(retrieved?.suspiciousVolume).toBe(false);
        expect(retrieved?.validationTrust).toBe(0.9);
        expect(retrieved?.balance).toBe(1000);
        expect(retrieved?.initialMarketCap).toBe(100000);
    });

    it("should update token performance", async () => {
        const updatedPerformance = {
            ...initialTokenPerformance,
            priceChange24h: 15.5,
            balance: 2000,
        };

        const success = await db.upsertTokenPerformance(updatedPerformance);
        expect(success).toBe(true);

        const retrieved = await db.getTokenPerformance(tokenAddress);
        expect(retrieved?.priceChange24h).toBe(15.5);
        expect(retrieved?.balance).toBe(2000);
    });

    it("should update token balance", async () => {
        const newBalance = 5000;
        const success = await db.updateTokenBalance(tokenAddress, newBalance);
        expect(success).toBe(true);

        const retrieved = await db.getTokenPerformance(tokenAddress);
        expect(retrieved?.balance).toBe(newBalance);

        const balance = await db.getTokenBalance(tokenAddress);
        expect(balance).toBe(newBalance);
    });

    it("should get all token performances with balance", async () => {
        const performances = await db.getAllTokenPerformancesWithBalance();
        expect(Array.isArray(performances)).toBe(true);
        expect(performances.length).toBe(1);

        const found = performances[0];
        expect(found.tokenAddress).toBe(tokenAddress);
        expect(found.balance).toBe(5000);
        expect(found.symbol).toBe("TEST");
    });
});

describe("Token Recommendation Operations", () => {
    let testDbManager: TestDatabaseManager;
    let db: ITrustDatabase;
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
    }, 10000);

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

            const recommendations =
                await db.getRecommendationsByToken(tokenAddress);
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

            const recommendations =
                await db.getRecommendationsByToken(tokenAddress);
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
        }, 3000);

        it("should get recommendations by recommender", async () => {
            const recommendations =
                await db.getRecommendationsByRecommender(recommenderId);
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
            const recommendations =
                await db.getRecommendationsByToken(tokenAddress);
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
            const recommendations =
                await db.getRecommendationsByRecommender(uuidv4());
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

describe("Trade Performance Operations", () => {
    let testDbManager: TestDatabaseManager;
    let db: ITrustDatabase;
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
    }, 3000);

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
            uuidv4(),
            uuidv4(),
            new Date().toISOString(),
            false
        );
        expect(nonExistentTrade).toBeNull();
    });

    it("should handle latest trade lookup for non-existent trade", async () => {
        const nonExistentTrade = await db.getLatestTradePerformance(
            uuidv4(),
            uuidv4(),
            false
        );
        expect(nonExistentTrade).toBeNull();
    });
});

describe("Transaction Operations", () => {
    let testDbManager: TestDatabaseManager;
    let db: ITrustDatabase;
    let tokenAddress: string;
    let transactionHash: string;

    beforeAll(async () => {
        testDbManager = TestDatabaseManager.getInstance();
        await testDbManager.initialize();
        db = testDbManager.getDatabase();
        tokenAddress = `token-${uuidv4()}`;
        transactionHash = `txn-${uuidv4()}`;

        await db.upsertTokenPerformance({
            tokenAddress,
            symbol: "TEST",
            priceChange24h: 10.5,
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
    }, 3000);

    afterAll(async () => {
        await testDbManager.cleanup();
    });

    it("should add a buy transaction", async () => {
        const transaction: Transaction = {
            tokenAddress,
            transactionHash,
            type: "buy",
            amount: 500,
            price: 50,
            isSimulation: false,
            timestamp: new Date().toISOString(),
        };

        const success = await db.addTransaction(transaction);
        expect(success).toBe(true);

        const transactions = await db.getTransactionsByToken(tokenAddress);
        const saved = transactions.find(
            (t) => t.transactionHash === transactionHash
        );
        expect(saved).toBeDefined();
        expect(saved?.type).toBe("buy");
        expect(saved?.amount).toBe(500);
    });

    it("should add a sell transaction", async () => {
        const sellHash = `sell-${uuidv4()}`;
        const transaction: Transaction = {
            tokenAddress,
            transactionHash: sellHash,
            type: "sell",
            amount: 250,
            price: 75,
            isSimulation: false,
            timestamp: new Date().toISOString(),
        };

        const success = await db.addTransaction(transaction);
        expect(success).toBe(true);

        const transactions = await db.getTransactionsByToken(tokenAddress);
        const saved = transactions.find((t) => t.transactionHash === sellHash);
        expect(saved).toBeDefined();
        expect(saved?.type).toBe("sell");
        expect(saved?.amount).toBe(250);
    });

    it("should handle simulation transactions", async () => {
        const simHash = `sim-${uuidv4()}`;
        const transaction: Transaction = {
            tokenAddress,
            transactionHash: simHash,
            type: "buy",
            amount: 1000,
            price: 25,
            isSimulation: true,
            timestamp: new Date().toISOString(),
        };

        const success = await db.addTransaction(transaction);
        expect(success).toBe(true);

        const transactions = await db.getTransactionsByToken(tokenAddress);
        const saved = transactions.find((t) => t.transactionHash === simHash);
        expect(saved?.isSimulation).toBe(true);
    });

    it("should retrieve all transactions for a token", async () => {
        const transactions = await db.getTransactionsByToken(tokenAddress);
        expect(Array.isArray(transactions)).toBe(true);
        expect(transactions.length).toBe(3); // Buy, sell, and simulation transactions

        transactions.forEach((tx) => {
            expect(tx.tokenAddress).toBe(tokenAddress);
            expect(tx.amount).toBeGreaterThan(0);
            expect(tx.price).toBeGreaterThan(0);
            expect(typeof tx.isSimulation).toBe("boolean");
            expect(tx.type).toMatch(/^(buy|sell)$/);
            expect(new Date(tx.timestamp).getTime()).not.toBeNaN();
        });
    });

    it("should return empty array for non-existent token", async () => {
        const transactions = await db.getTransactionsByToken(
            `nonexistent-${uuidv4()}`
        );
        expect(transactions).toEqual([]);
    });

    it("should handle transaction with missing optional fields", async () => {
        const minimalHash = `minimal-${uuidv4()}`;
        const transaction: Transaction = {
            tokenAddress,
            transactionHash: minimalHash,
            type: "buy",
            amount: 100,
            price: 10,
            isSimulation: false,
            timestamp: new Date().toISOString(),
        };

        const success = await db.addTransaction(transaction);
        expect(success).toBe(true);

        const transactions = await db.getTransactionsByToken(tokenAddress);
        const saved = transactions.find(
            (t) => t.transactionHash === minimalHash
        );
        expect(saved).toBeDefined();
        expect(saved?.isSimulation).toBe(false); // Should default to false
    });
});
