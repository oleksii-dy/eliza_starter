import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { TestDatabaseManager } from "../setup/TestDatabaseManager";
import { SupportedDatabases } from "../../index";
import { v4 as uuidv4 } from "uuid";

describe("Database Connection", () => {
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
            telegramId: null,
            discordId: null,
            twitterId: null,
            ip: null,
        };

        await db.addRecommender(recommender);
        const retrieved = await db.getRecommender(recommender.id);
        expect(retrieved).toEqual(recommender);
    });
});
