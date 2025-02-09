// packages/plugin-nutrifi/src/db/config.ts

import { MongoClient } from 'mongodb';
import { elizaLogger } from '@elizaos/core';

export const COLLECTIONS = {
    USER_PREFERENCES: 'user_preferences',
    MEAL_HISTORY: 'meal_history',
    RESTAURANT_DATA: 'restaurant_data'
} as const;

let client: MongoClient | null = null;

export async function initializeMongoDB(): Promise<MongoClient> {
    if (client) {
        return client;
    }

    const uri = process.env.MONGODB_CONNECTION_STRING;
    if (!uri) {
        throw new Error('MONGODB_CONNECTION_STRING environment variable is required');
    }

    try {
        client = new MongoClient(uri, {
            maxPoolSize: 100,
            minPoolSize: 5,
            maxIdleTimeMS: 60000,
            connectTimeoutMS: 10000,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        await client.connect();
        const dbName = process.env.MONGODB_DATABASE || 'nutrifi';
        const db = client.db(dbName);

        // Initialize collections
        for (const collectionName of Object.values(COLLECTIONS)) {
            try {
                await db.createCollection(collectionName);
                elizaLogger.debug(`[NutriFi] Created collection: ${collectionName}`);
            } catch (error: any) {
                // Ignore if collection already exists (error code 48)
                if (error.code !== 48) {
                    elizaLogger.error(`[NutriFi] Error creating collection ${collectionName}:`, error);
                }
            }
        }

        return client;
    } catch (error) {
        elizaLogger.error('[NutriFi] MongoDB connection error:', error);
        throw error;
    }
}

export function getMongoClient(): MongoClient {
    if (!client) {
        throw new Error('MongoDB client not initialized');
    }
    return client;
}