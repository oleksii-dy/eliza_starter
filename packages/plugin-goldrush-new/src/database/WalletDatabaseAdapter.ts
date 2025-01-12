import { DatabaseAdapter } from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import { Database } from "sqlite3";

export interface WalletData {
    address: string;
    balance: string;
    transactions: any[];
    lastUpdated: number;
    isMonitored?: boolean;
}

export class WalletDatabaseAdapter extends DatabaseAdapter {
    protected db: Database;
    protected circuitBreaker: any;

    constructor(dbPath: string) {
        super();
        this.db = new Database(dbPath);
    }

    async init(): Promise<void> {
        try {
            await new Promise<void>((resolve, reject) => {
                this.db.run(
                    `
          CREATE TABLE IF NOT EXISTS wallets (
            address TEXT PRIMARY KEY,
            balance TEXT,
            transactions TEXT,
            lastUpdated INTEGER,
            isMonitored INTEGER DEFAULT 0
          )
        `,
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
            elizaLogger.info("Initialized wallet database");
        } catch (error) {
            elizaLogger.error("Failed to initialize wallet database", {
                error,
            });
            throw error;
        }
    }

    async close(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async createWalletEntry(address: string, data: WalletData): Promise<void> {
        return this.withCircuitBreaker(async () => {
            return new Promise((resolve, reject) => {
                this.db.run(
                    "INSERT OR REPLACE INTO wallets (address, balance, transactions, lastUpdated, isMonitored) VALUES (?, ?, ?, ?, ?)",
                    [
                        address,
                        data.balance,
                        JSON.stringify(data.transactions),
                        data.lastUpdated,
                        data.isMonitored ? 1 : 0,
                    ],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
        });
    }

    async getWalletData(address: string): Promise<WalletData | null> {
        return this.withCircuitBreaker(async () => {
            return new Promise((resolve, reject) => {
                this.db.get(
                    "SELECT * FROM wallets WHERE address = ?",
                    [address],
                    (err, row) => {
                        if (err) reject(err);
                        else if (!row) resolve(null);
                        else {
                            resolve({
                                address: row.address,
                                balance: row.balance,
                                transactions: JSON.parse(row.transactions),
                                lastUpdated: row.lastUpdated,
                                isMonitored: row.isMonitored === 1,
                            });
                        }
                    }
                );
            });
        });
    }

    async getMonitoredWallets(): Promise<WalletData[]> {
        return this.withCircuitBreaker(async () => {
            return new Promise((resolve, reject) => {
                this.db.all(
                    "SELECT * FROM wallets WHERE isMonitored = 1",
                    [],
                    (err, rows) => {
                        if (err) reject(err);
                        else {
                            resolve(
                                rows.map((row) => ({
                                    address: row.address,
                                    balance: row.balance,
                                    transactions: JSON.parse(row.transactions),
                                    lastUpdated: row.lastUpdated,
                                    isMonitored: true,
                                }))
                            );
                        }
                    }
                );
            });
        });
    }

    async updateWalletData(
        address: string,
        data: Partial<WalletData>
    ): Promise<void> {
        return this.withCircuitBreaker(async () => {
            const updates: string[] = [];
            const values: any[] = [];

            if (data.balance !== undefined) {
                updates.push("balance = ?");
                values.push(data.balance);
            }
            if (data.transactions !== undefined) {
                updates.push("transactions = ?");
                values.push(JSON.stringify(data.transactions));
            }
            if (data.lastUpdated !== undefined) {
                updates.push("lastUpdated = ?");
                values.push(data.lastUpdated);
            }
            if (data.isMonitored !== undefined) {
                updates.push("isMonitored = ?");
                values.push(data.isMonitored ? 1 : 0);
            }

            if (updates.length === 0) return;

            values.push(address);
            return new Promise((resolve, reject) => {
                this.db.run(
                    `UPDATE wallets SET ${updates.join(", ")} WHERE address = ?`,
                    values,
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
        });
    }

    async deleteWalletData(address: string): Promise<void> {
        return this.withCircuitBreaker(async () => {
            return new Promise((resolve, reject) => {
                this.db.run(
                    "DELETE FROM wallets WHERE address = ?",
                    [address],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
        });
    }
}
