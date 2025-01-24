import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { TestDatabaseManager } from "../../setup/TestDatabaseManager";
import { SupportedDatabases } from "../../../index";
import { v4 as uuidv4 } from "uuid";

describe("Token Performance Operations", () => {
    let testDbManager: TestDatabaseManager;
    let db: SupportedDatabases;
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
