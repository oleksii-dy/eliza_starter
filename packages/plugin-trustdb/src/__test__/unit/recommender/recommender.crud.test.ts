import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TestDatabaseManager } from "../../setup/TestDatabaseManager";
import { SupportedDatabases } from "../../../index";
import { v4 as uuidv4 } from "uuid";

describe("Recommender Operations", () => {
    let testDbManager: TestDatabaseManager;
    let db: SupportedDatabases;

    beforeEach(async () => {
        testDbManager = TestDatabaseManager.getInstance();
        await testDbManager.initialize();
        db = testDbManager.getDatabase();
    });

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
            twitterId: null,
            ip: null,
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

        const sameResult = await db.getOrCreateRecommenderWithDiscordId(
            discordId
        );
        expect(sameResult).toEqual(result);
    });

    it("should get or create a recommender with Telegram ID", async () => {
        const telegramId = `telegram-${uuidv4()}`;

        const result = await db.getOrCreateRecommenderWithTelegramId(
            telegramId
        );
        expect(result).not.toBeNull();
        expect(result?.telegramId).toBe(telegramId);
        expect(result?.address).toBe(telegramId); // Address defaults to telegramId

        const sameResult = await db.getOrCreateRecommenderWithTelegramId(
            telegramId
        );
        expect(sameResult).toEqual(result);
    });

    it("should handle duplicate recommender creation gracefully", async () => {
        const recommender = {
            id: uuidv4(),
            address: `test-duplicate-${uuidv4()}`,
            solanaPubkey: null,
            telegramId: null,
            discordId: null,
            twitterId: null,
            ip: null,
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
            ip: null,
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
