import path from "path";
import fs from "fs/promises";
import type {
    CacheOptions,
    ICacheManager,
    IDatabaseCacheAdapter,
    UUID,
} from "./types";
import elizaLogger from "./logger";

export interface ICacheAdapter {
    get(key: string): Promise<string | undefined>;
    set(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;

    // Optional methods for specific optimizations
    listKeys?(): Promise<string[]>; // renamed from getAllKeys
    getAgentCacheKeys?(params: { agentId: UUID }): Promise<string[]>;
    deleteCacheEntriesByPattern?(params: {
        keyPattern: string;
    }): Promise<boolean>;
}

export class MemoryCacheAdapter implements ICacheAdapter {
    data: Map<string, string>;

    constructor(initalData?: Map<string, string>) {
        this.data = initalData ?? new Map<string, string>();
    }

    async get(key: string): Promise<string | undefined> {
        return this.data.get(key);
    }

    async set(key: string, value: string): Promise<void> {
        this.data.set(key, value);
    }

    async delete(key: string): Promise<void> {
        this.data.delete(key);
    }

    async listKeys(): Promise<string[]> {
        return Array.from(this.data.keys());
    }
}

export class FsCacheAdapter implements ICacheAdapter {
    constructor(private dataDir: string) {}

    async get(key: string): Promise<string | undefined> {
        try {
            return await fs.readFile(path.join(this.dataDir, key), "utf8");
        } catch {
            return undefined;
        }
    }

    async set(key: string, value: string): Promise<void> {
        try {
            const filePath = path.join(this.dataDir, key);
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, value, "utf8");
        } catch (error) {
            console.error(error);
        }
    }

    async delete(key: string): Promise<void> {
        try {
            const filePath = path.join(this.dataDir, key);
            await fs.unlink(filePath);
        } catch {
            // Ignore error if file doesn't exist
        }
    }

    async listKeys(): Promise<string[]> {
        try {
            const walk = async (dir: string): Promise<string[]> => {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                const files = await Promise.all(
                    entries.map(async (entry) => {
                        const fullPath = path.join(dir, entry.name);
                        if (entry.isDirectory()) {
                            return walk(fullPath);
                        } else {
                            // Return path relative to dataDir
                            return [path.relative(this.dataDir, fullPath)];
                        }
                    })
                );
                return files.flat();
            };

            return walk(this.dataDir);
        } catch (error) {
            console.error("Error reading directory:", error);
            return [];
        }
    }
}

export class DbCacheAdapter implements ICacheAdapter {
    constructor(
        private db: IDatabaseCacheAdapter,
        private agentId: UUID
    ) {}

    async get(key: string): Promise<string | undefined> {
        return this.db.getCache({ agentId: this.agentId, key });
    }

    async set(key: string, value: string): Promise<void> {
        await this.db.setCache({ agentId: this.agentId, key, value });
    }

    async delete(key: string): Promise<void> {
        await this.db.deleteCache({ agentId: this.agentId, key });
    }

    async deleteCacheEntriesByPattern(params: {
        keyPattern: string;
    }): Promise<boolean> {
        try {
            return await this.db.deleteByPattern({
                keyPattern: params.keyPattern,
            });
        } catch (error) {
            elizaLogger.error(
                "Error deleting cache entries by pattern:",
                error
            );
            return false;
        }
    }
}

export class CacheManager<CacheAdapter extends ICacheAdapter = ICacheAdapter>
    implements ICacheManager
{
    adapter: CacheAdapter;

    constructor(adapter: CacheAdapter) {
        this.adapter = adapter;
    }

    async get<T = unknown>(key: string): Promise<T | undefined> {
        const data = await this.adapter.get(key);

        if (data) {
            const { value, expires } = JSON.parse(data) as {
                value: T;
                expires: number;
            };

            if (!expires || expires > Date.now()) {
                return value;
            }

            this.adapter.delete(key).catch(() => {});
        }

        return undefined;
    }

    async set<T>(key: string, value: T, opts?: CacheOptions): Promise<void> {
        return this.adapter.set(
            key,
            JSON.stringify({ value, expires: opts?.expires ?? 0 })
        );
    }

    async delete(key: string): Promise<void> {
        return this.adapter.delete(key);
    }

    async getAgentKeys(params: { agentId: UUID }): Promise<string[]> {
        try {
            elizaLogger.debug(
                `[Cache] Getting keys for agent: ${params.agentId}`
            );

            if (!this.adapter.listKeys) {
                throw new Error(
                    "Cache adapter does not support key listing operations"
                );
            }

            const allKeys = await this.adapter.listKeys();
            elizaLogger.debug(`[Cache] Retrieved ${allKeys.length} total keys`);

            const agentKeys = allKeys.filter((key) =>
                key.includes(params.agentId)
            );
            elizaLogger.debug(
                `[Cache] Found ${agentKeys.length} keys for agent: ${params.agentId}`
            );

            return agentKeys;
        } catch (error) {
            elizaLogger.error("[Cache] Error retrieving cache keys:", error);
            throw error;
        }
    }

    async deleteByPattern(params: { keyPattern: string }): Promise<void> {
        try {
            // First try native pattern deletion if it exists
            elizaLogger.debug("[Cache] Checking for native pattern deletion");
            if (this.adapter.deleteCacheEntriesByPattern) {
                elizaLogger.debug("[Cache] Using native pattern deletion");
                await (this.adapter as any).deleteCacheEntriesByPattern({
                    keyPattern: params.keyPattern,
                });
                return;
            }

            // Then try using getAllKeys
            elizaLogger.debug("[Cache] Falling back to getAllKeys method");
            if (this.adapter.listKeys) {
                const allKeys = await this.adapter.listKeys();
                elizaLogger.debug(`[Cache] Retrieved ${allKeys.length} keys`);

                // getAllKeys should now always return an array due to adapter changes
                const matchingKeys = allKeys.filter((key) =>
                    key.includes(params.keyPattern)
                );

                elizaLogger.debug(
                    `[Cache] Found ${matchingKeys.length} matching keys for pattern: ${params.keyPattern}`
                );

                // Delete matching keys in smaller batches to prevent overwhelming the system
                const BATCH_SIZE = 10;
                for (let i = 0; i < matchingKeys.length; i += BATCH_SIZE) {
                    const batch = matchingKeys.slice(i, i + BATCH_SIZE);
                    await Promise.all(batch.map((key) => this.delete(key)));
                    elizaLogger.debug(
                        `[Cache] Deleted batch ${i / BATCH_SIZE + 1} of ${Math.ceil(matchingKeys.length / BATCH_SIZE)}`
                    );
                }
                return;
            }

            // If we get here, neither method is supported
            throw new Error(
                "Cache adapter does not support pattern deletion or getAllKeys"
            );
        } catch (error) {
            // Log the error but don't throw - pattern deletion is a cleanup operation
            // and shouldn't block the main flow
            elizaLogger.error("[Cache] Error during pattern deletion:", error);
            elizaLogger.warn("[Cache] Continuing without pattern deletion");
        }
    }
}
