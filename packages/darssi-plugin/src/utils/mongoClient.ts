import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_CONNECTION_STRING as string;
const defaultDbName = process.env.MONGODB_DATABASE || "elizaAgent";

let client: MongoClient;

export async function getMongoClient(): Promise<MongoClient> {
    try {
        if (!client) {
            console.log("[MongoDB] Attempting to connect...");
            client = new MongoClient(uri, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            } as any); // Explicit casting to avoid TS issues

            await client.connect();
            console.log("[MongoDB] Connected successfully to MongoDB Atlas");
        }
        return client;
    } catch (error) {
        console.error("[MongoDB Error] Failed to connect:", error);
        throw new Error(`MongoDB connection failed: ${error}`);
    }
}

/**
 * Returns the specified database instance. If no dbName is provided,
 * it returns the default database.
 * 
 * @param dbName - Optional, the name of the database to connect to.
 */
export async function getDatabase(dbName?: string): Promise<Db> {
    try {
        const mongoClient = await getMongoClient();
        const dbNameToUse = dbName || defaultDbName;
        console.log(`[MongoDB] Using database: ${dbNameToUse}`);
        return mongoClient.db(dbNameToUse);
    } catch (error) {
        console.error("[MongoDB Error] Failed to get database:", error);
        throw new Error(`Failed to get database: ${error}`);
    }
}
