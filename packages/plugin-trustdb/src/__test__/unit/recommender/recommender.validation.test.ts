import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { TestDatabaseManager } from "../../setup/TestDatabaseManager";
import { SupportedDatabases } from "../../../index";
import { v4 as uuidv4 } from "uuid";

describe("Validation Trust", () => {
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
