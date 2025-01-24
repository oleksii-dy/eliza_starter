import { Pool } from "pg";
import { initTrustDatabase, ITrustDatabase } from "../../index";
import { TrustPostgresDatabase } from "../../adapters/postgres";
import { TEST_DB_CONFIG } from "./config";

export class TestDatabaseManager {
    private static instance: TestDatabaseManager;
    private database: ITrustDatabase | null = null;

    private constructor() {}

    public static getInstance(): TestDatabaseManager {
        if (!TestDatabaseManager.instance) {
            TestDatabaseManager.instance = new TestDatabaseManager();
        }
        return TestDatabaseManager.instance;
    }

    public async initialize(): Promise<void> {
        const tempPool = new Pool({
            ...TEST_DB_CONFIG,
            database: "postgres",
        });

        try {
            await tempPool.query(
                `
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = $1 AND pid <> pg_backend_pid()
                `,
                [TEST_DB_CONFIG.database]
            );

            await tempPool.query(
                `DROP DATABASE IF EXISTS ${TEST_DB_CONFIG.database}`
            );
            await tempPool.query(`CREATE DATABASE ${TEST_DB_CONFIG.database}`);
        } finally {
            await tempPool.end();
        }

        this.database = await initTrustDatabase({
            dbConfig: TEST_DB_CONFIG,
        });
    }

    public async cleanup(): Promise<void> {
        if (this.database) {
            await this.database.closeConnection();
            this.database = null;
        }

        const tempPool = new Pool({
            ...TEST_DB_CONFIG,
            database: "postgres",
        });

        try {
            await tempPool.query(
                `
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = $1 AND pid <> pg_backend_pid()
                `,
                [TEST_DB_CONFIG.database]
            );

            await tempPool.query(
                `DROP DATABASE IF EXISTS ${TEST_DB_CONFIG.database}`
            );
        } finally {
            await tempPool.end();
        }
    }

    public getDatabase(): ITrustDatabase {
        if (!this.database) {
            throw new Error("Database not initialized");
        }
        return this.database;
    }
}
