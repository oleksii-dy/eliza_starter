import { Service, ServiceType } from '@elizaos/core';
import sqlite3 from 'sqlite3';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';

export class StorageService implements Service {
    private static instance: StorageService | null = null;
    private db: sqlite3.Database | null = null;

    get serviceType(): ServiceType {
        return ServiceType.TEXT_GENERATION;
    }

    constructor() {
        if (StorageService.instance) {
            return StorageService.instance;
        }
        StorageService.instance = this;
    }

    async initialize(): Promise<void> {
        const dbPath = 'data/plugin-twilio.db';
        await mkdir(dirname(dbPath), { recursive: true });

        this.db = new sqlite3.Database(dbPath);
        if (!this.db) throw new Error('Failed to initialize database');

        // Create tables one by one to ensure proper creation
        await this.run(`
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                phoneNumber TEXT NOT NULL,
                message TEXT NOT NULL,
                timestamp INTEGER NOT NULL
            )
        `);

        await this.run(`
            CREATE TABLE IF NOT EXISTS rooms (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )
        `);

        await this.run(`
            CREATE TABLE IF NOT EXISTS accounts (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )
        `);

        console.log('Storage service initialized with tables: messages, rooms, accounts');
    }

    // Helper methods for database operations
    private async run(sql: string, params: any[] = []): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');
        return new Promise((resolve, reject) => {
            this.db!.run(sql, params, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    private async get(sql: string, params: any[] = []): Promise<any> {
        if (!this.db) throw new Error('Database not initialized');
        return new Promise((resolve, reject) => {
            this.db!.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    // Public methods
    async saveMessage(data: { id: string; phoneNumber: string; message: string; timestamp: number }): Promise<void> {
        await this.run(
            'INSERT INTO messages (id, phoneNumber, message, timestamp) VALUES (?, ?, ?, ?)',
            [data.id, data.phoneNumber, data.message, data.timestamp]
        );
    }

    async getMessage(id: string): Promise<any> {
        return this.get('SELECT * FROM messages WHERE id = ?', [id]);
    }

    // Add required room methods
    async getRoom(roomId: string): Promise<any> {
        try {
            const room = await this.get('SELECT * FROM rooms WHERE id = ?', [roomId]);
            if (!room) {
                // Create default room if not found
                await this.createRoom(roomId, `Room ${roomId}`);
                return this.get('SELECT * FROM rooms WHERE id = ?', [roomId]);
            }
            return room;
        } catch (error) {
            console.error('Failed to get/create room:', error);
            throw error;
        }
    }

    async createRoom(roomId: string, name: string): Promise<void> {
        if (!roomId) {
            throw new Error('Room ID is required');
        }

        // Set default name if not provided
        const roomName = name || `Room ${roomId}`;

        try {
            await this.run(
                'INSERT OR IGNORE INTO rooms (id, name, created_at) VALUES (?, ?, ?)',
                [roomId, roomName, Date.now()]
            );
        } catch (error) {
            console.error('Failed to create room:', error);
            // Check if room already exists
            const existingRoom = await this.getRoom(roomId);
            if (!existingRoom) {
                throw error;
            }
        }
    }

    // Add account methods
    async getAccountById(accountId: string): Promise<any> {
        try {
            const account = await this.get('SELECT * FROM accounts WHERE id = ?', [accountId]);
            if (!account) {
                // Create default account if not found
                await this.createAccount(accountId, `User ${accountId}`);
                return this.get('SELECT * FROM accounts WHERE id = ?', [accountId]);
            }
            return account;
        } catch (error) {
            console.error('Failed to get/create account:', error);
            throw error;
        }
    }

    async createAccount(accountId: string, name: string): Promise<void> {
        if (!accountId) {
            throw new Error('Account ID is required');
        }

        // Set default name if not provided
        const accountName = name || `User ${accountId}`;

        try {
            await this.run(
                'INSERT OR IGNORE INTO accounts (id, name, created_at) VALUES (?, ?, ?)',
                [accountId, accountName, Date.now()]
            );
        } catch (error) {
            console.error('Failed to create account:', error);
            // Check if account already exists
            const existingAccount = await this.getAccountById(accountId);
            if (!existingAccount) {
                throw error;
            }
        }
    }

    // Add participant methods
    async getParticipantsForAccount(accountId: string): Promise<any[]> {
        if (!this.db) throw new Error('Database not initialized');

        await this.run(`
            CREATE TABLE IF NOT EXISTS participants (
                id TEXT PRIMARY KEY,
                account_id TEXT NOT NULL,
                room_id TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (account_id) REFERENCES accounts(id),
                FOREIGN KEY (room_id) REFERENCES rooms(id)
            )
        `);

        return new Promise((resolve, reject) => {
            this.db!.all(
                'SELECT * FROM participants WHERE account_id = ?',
                [accountId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });
    }

    async addParticipant(accountId: string, roomId: string): Promise<void> {
        if (!accountId?.trim()) {
            throw new Error('Account ID is required');
        }
        if (!roomId?.trim()) {
            throw new Error('Room ID is required');
        }

        const participantId = `${accountId}_${roomId}`;

        try {
            // Ensure account exists
            await this.getAccountById(accountId);
            // Ensure room exists
            await this.getRoom(roomId);

            await this.run(
                'INSERT OR IGNORE INTO participants (id, account_id, room_id, created_at) VALUES (?, ?, ?, ?)',
                [participantId, accountId, roomId, Date.now()]
            );
        } catch (error) {
            console.error('Failed to add participant:', error);
            throw error;
        }
    }

    // Update database adapter
    getDatabaseAdapter() {
        return {
            db: this.db,
            getRoom: this.getRoom.bind(this),
            createRoom: this.createRoom.bind(this),
            getAccountById: this.getAccountById.bind(this),
            createAccount: this.createAccount.bind(this),
            getParticipantsForAccount: this.getParticipantsForAccount.bind(this),
            addParticipant: this.addParticipant.bind(this),
            saveMessage: this.saveMessage.bind(this),
            getMessage: this.getMessage.bind(this)
        };
    }
}

export const storageService = new StorageService();