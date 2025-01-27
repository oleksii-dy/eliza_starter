import { Database } from "better-sqlite3";
import { TrustPostgresDatabase } from "./adapters/postgres";
import { TrustSQLiteDatabase } from "./adapters/sqlite";
import { ITrustDatabase } from "./types";

export const initTrustDatabase = async ({
    dbConfig,
    db,
}: {
    dbConfig?: any;
    db?: Database;
}): Promise<ITrustDatabase> => {
    if (dbConfig) {
        const database = new TrustPostgresDatabase(dbConfig);
        await database.initialize();
        return database;
    }
    return new TrustSQLiteDatabase(db);
};

export const closeTrustDatabase = async (
    database: ITrustDatabase
): Promise<void> => {
    await database.closeConnection();
};

export * from "./types";
