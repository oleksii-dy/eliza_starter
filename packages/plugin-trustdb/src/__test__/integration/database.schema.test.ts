import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { TestDatabaseManager } from "../setup/TestDatabaseManager";
import { Pool } from "pg";
import { TEST_DB_CONFIG } from "../setup/config";

describe("Database Schema", () => {
    let testDbManager: TestDatabaseManager;
    let pool: Pool;

    beforeAll(async () => {
        testDbManager = TestDatabaseManager.getInstance();
        await testDbManager.initialize();
        // Create new pool after initialization
        pool = new Pool(TEST_DB_CONFIG);
    });

    afterAll(async () => {
        try {
            // Close pool before cleanup
            await pool.end();
            await testDbManager.cleanup();
        } catch (error) {
            // Ignore connection termination errors during cleanup
            if (error.code !== "57P01") {
                throw error;
            }
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
