import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { TestDatabaseManager } from "../../setup/TestDatabaseManager";
import { SupportedDatabases } from "../../../index";
import { v4 as uuidv4 } from "uuid";
import { Transaction } from "../../../types";

describe("Transaction Operations", () => {
    let testDbManager: TestDatabaseManager;
    let db: SupportedDatabases;
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
    });

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
