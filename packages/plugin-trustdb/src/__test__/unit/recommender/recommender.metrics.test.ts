import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { TestDatabaseManager } from "../../setup/TestDatabaseManager";
import { SupportedDatabases } from "../../../index";
import { v4 as uuidv4 } from "uuid";

describe("Recommender Metrics Operations", () => {
    let testDbManager: TestDatabaseManager;
    let db: SupportedDatabases;
    let recommenderId: string;

    beforeAll(async () => {
        testDbManager = TestDatabaseManager.getInstance();
        await testDbManager.initialize();
        db = testDbManager.getDatabase();

        const recommender = {
            id: uuidv4(),
            address: `test-metrics-${uuidv4()}`,
            solanaPubkey: null,
            telegramId: null,
            discordId: null,
            twitterId: null,
            ip: null,
        };
        await db.addRecommender(recommender);
        recommenderId = recommender.id;
    });

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
