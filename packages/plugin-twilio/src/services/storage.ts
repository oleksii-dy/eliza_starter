import { Service, ServiceType } from '@elizaos/core';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir } from 'fs/promises';
import { promisify } from 'util';

export class StorageService implements Service {
    private db: sqlite3.Database;
    private initialized = false;

    get serviceType(): ServiceType {
        return ServiceType.STORAGE;
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            // Setup database path
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = dirname(__filename);
            const rootDir = join(__dirname, '../../../../');
            const dataDir = join(rootDir, 'data');
            const dbPath = join(dataDir, 'plugin-twilio.db');

            // Create data directory
            await mkdir(dataDir, { recursive: true });

            // Initialize SQLite database
            this.db = new sqlite3.Database(dbPath);

            // Promisify database methods
            const run = promisify(this.db.run.bind(this.db));
            const get = promisify(this.db.get.bind(this.db));
            const all = promisify(this.db.all.bind(this.db));
            const exec = promisify(this.db.exec.bind(this.db));

            // Create tables
            await exec(`
                CREATE TABLE IF NOT EXISTS verified_users (
                    phone_number TEXT PRIMARY KEY,
                    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS accounts (
                    id TEXT PRIMARY KEY,
                    name TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS rooms (
                    id TEXT PRIMARY KEY,
                    name TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS participants (
                    id TEXT PRIMARY KEY,
                    room_id TEXT,
                    account_id TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(room_id) REFERENCES rooms(id),
                    FOREIGN KEY(account_id) REFERENCES accounts(id)
                );

                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    room_id TEXT,
                    user_id TEXT,
                    content TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(room_id) REFERENCES rooms(id),
                    FOREIGN KEY(user_id) REFERENCES accounts(id)
                );
            `);

            // Create database adapter methods
            this.databaseAdapter = {
                exec: async (sql: string) => exec(sql),
                run: async (sql: string, params: any[]) => run(sql, params),
                get: async (sql: string, params: any[]) => get(sql, params),
                all: async (sql: string, params?: any[]) => all(sql, params || []),

                // Account methods
                getAccountById: async (userId: string) => {
                    return get('SELECT * FROM accounts WHERE id = ?', [userId]);
                },
                createAccount: async (userId: string, name: string) => {
                    try {
                        await run(`
                            INSERT INTO accounts (id, name)
                            VALUES (?, ?)
                            ON CONFLICT(id) DO UPDATE SET
                            name = excluded.name
                        `, [userId, name]);
                        return { id: userId, name };
                    } catch (error) {
                        // If insert fails, try to get existing account
                        const account = await get('SELECT * FROM accounts WHERE id = ?', [userId]);
                        if (account) return account;
                        throw error;
                    }
                },

                // Room methods
                getRoom: async (roomId: string) => {
                    return get('SELECT * FROM rooms WHERE id = ?', [roomId]);
                },
                createRoom: async (roomId: string, name: string) => {
                    await run('INSERT INTO rooms (id, name) VALUES (?, ?)', [roomId, name]);
                    return { id: roomId, name };
                },

                // Message methods
                saveMessage: async (message: any) => {
                    await run(
                        'INSERT INTO messages (id, room_id, user_id, content) VALUES (?, ?, ?, ?)',
                        [message.id, message.roomId, message.userId, JSON.stringify(message.content)]
                    );
                    return message;
                },
                getRoomMessages: async (roomId: string) => {
                    return all('SELECT * FROM messages WHERE room_id = ? ORDER BY created_at ASC', [roomId]);
                },

                // Participant methods
                getParticipantsForAccount: async (userId: string) => {
                    return all(`
                        SELECT p.*, r.name as room_name
                        FROM participants p
                        JOIN rooms r ON p.room_id = r.id
                        WHERE p.account_id = ?
                        ORDER BY p.created_at DESC
                    `, [userId]);
                },
                addParticipant: async (userId: string, roomId: string) => {
                    const id = `participant_${Date.now()}`;
                    try {
                        await run(
                            'INSERT INTO participants (id, room_id, account_id) VALUES (?, ?, ?)',
                            [id, roomId, userId]
                        );
                        return { id, roomId, accountId: userId };
                    } catch (error) {
                        // Check if participant already exists
                        const existing = await get(
                            'SELECT * FROM participants WHERE room_id = ? AND account_id = ?',
                            [roomId, userId]
                        );
                        if (existing) return existing;
                        throw error;
                    }
                },
                getParticipant: async (roomId: string, accountId: string) => {
                    return get(
                        'SELECT * FROM participants WHERE room_id = ? AND account_id = ?',
                        [roomId, accountId]
                    );
                }
            };

            this.initialized = true;
            console.log('Storage service initialized with database at:', dbPath);
        } catch (error) {
            console.error('Failed to initialize storage:', error);
            throw error;
        }
    }

    private databaseAdapter: any;

    getDatabaseAdapter() {
        if (!this.initialized) {
            throw new Error('Storage service not initialized');
        }
        return this.databaseAdapter;
    }
}

export const storageService = new StorageService();