import { IAgentRuntime, Service, logger } from '@elizaos/core';
import { Keypair } from '@solana/web3.js';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import bs58 from 'bs58';

interface EncryptedKey {
    encrypted: string;
    salt: string;
    iv: string;
    tag: string;
}

export class SecureKeyManager extends Service {
    static serviceName = 'secure-key-manager';
    static serviceType = 'secure-key-manager';
    capabilityDescription = 'Secure key management service with master key encryption and key derivation';

    private masterKey: Buffer | null = null;
    private encryptedKeys: Map<string, EncryptedKey> = new Map();
    
    constructor(runtime: IAgentRuntime) {
        super(runtime);
        this.initializeMasterKey();
    }

    async stop(): Promise<void> {
        // Clear sensitive data from memory
        if (this.masterKey) {
            this.masterKey.fill(0);
            this.masterKey = null;
        }
        this.encryptedKeys.clear();
    }

    /**
     * Initialize master key from runtime settings
     */
    private initializeMasterKey(): void {
        const masterPassword = this.runtime.getSetting('MASTER_KEY_PASSWORD');
        if (!masterPassword) {
            logger.warn('No master key password provided. Using default (NOT SECURE FOR PRODUCTION)');
            // In production, this should throw an error
        }
        
        // Derive key from password using scrypt
        const salt = this.runtime.getSetting('MASTER_KEY_SALT') || 'default-salt';
        this.masterKey = scryptSync(
            masterPassword || 'default-password',
            salt,
            32 // 256-bit key
        );
    }

    /**
     * Encrypt a private key
     */
    encryptPrivateKey(privateKey: string, keyId: string): EncryptedKey {
        if (!this.masterKey) {
            throw new Error('Master key not initialized');
        }

        // Generate random IV for each encryption
        const iv = randomBytes(16);
        const cipher = createCipheriv('aes-256-gcm', this.masterKey, iv);
        
        // Encrypt the private key
        const encrypted = Buffer.concat([
            cipher.update(privateKey, 'utf8'),
            cipher.final()
        ]);
        
        // Get the auth tag
        const tag = cipher.getAuthTag();
        
        // Generate salt for this key
        const salt = randomBytes(32);
        
        const encryptedKey: EncryptedKey = {
            encrypted: encrypted.toString('base64'),
            salt: salt.toString('base64'),
            iv: iv.toString('base64'),
            tag: tag.toString('base64')
        };
        
        // Store encrypted key
        this.encryptedKeys.set(keyId, encryptedKey);
        
        return encryptedKey;
    }

    /**
     * Decrypt a private key
     */
    decryptPrivateKey(keyId: string): string {
        if (!this.masterKey) {
            throw new Error('Master key not initialized');
        }

        const encryptedKey = this.encryptedKeys.get(keyId);
        if (!encryptedKey) {
            throw new Error(`Key not found: ${keyId}`);
        }

        const decipher = createDecipheriv(
            'aes-256-gcm',
            this.masterKey,
            Buffer.from(encryptedKey.iv, 'base64')
        );
        
        // Set the auth tag
        decipher.setAuthTag(Buffer.from(encryptedKey.tag, 'base64'));
        
        // Decrypt
        const decrypted = Buffer.concat([
            decipher.update(Buffer.from(encryptedKey.encrypted, 'base64')),
            decipher.final()
        ]);
        
        return decrypted.toString('utf8');
    }

    /**
     * Store an encrypted key in the database
     */
    async storeEncryptedKey(keyId: string, encryptedKey: EncryptedKey): Promise<void> {
        try {
            await this.runtime.db.execute(
                `INSERT OR REPLACE INTO encrypted_keys (
                    key_id, encrypted, salt, iv, tag, created_at
                ) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    keyId,
                    encryptedKey.encrypted,
                    encryptedKey.salt,
                    encryptedKey.iv,
                    encryptedKey.tag,
                    Date.now()
                ]
            );
            
            // Also keep in memory cache
            this.encryptedKeys.set(keyId, encryptedKey);
        } catch (error) {
            logger.error('Failed to store encrypted key:', error);
            throw error;
        }
    }

    /**
     * Load an encrypted key from the database
     */
    async loadEncryptedKey(keyId: string): Promise<EncryptedKey | null> {
        try {
            const result = await this.runtime.db.query(
                `SELECT encrypted, salt, iv, tag FROM encrypted_keys WHERE key_id = ?`,
                [keyId]
            );
            
            if (!result || result.length === 0) {
                return null;
            }
            
            const row = result[0];
            const encryptedKey: EncryptedKey = {
                encrypted: row.encrypted,
                salt: row.salt,
                iv: row.iv,
                tag: row.tag
            };
            
            // Cache in memory
            this.encryptedKeys.set(keyId, encryptedKey);
            
            return encryptedKey;
        } catch (error) {
            logger.error('Failed to load encrypted key:', error);
            return null;
        }
    }

    /**
     * Get or create agent's wallet keypair
     */
    async getAgentKeypair(): Promise<Keypair> {
        const keyId = `agent-${this.runtime.agentId}`;
        
        // Try to load existing key
        const existingKey = await this.loadEncryptedKey(keyId);
        if (existingKey) {
            let privateKey = this.decryptPrivateKey(keyId);
            const secretKey = bs58.decode(privateKey);
            
            // Clear the decrypted key from memory
            const keypair = Keypair.fromSecretKey(secretKey);
            privateKey = ''; // Clear reference
            
            return keypair;
        }
        
        // Generate new keypair if not exists
        const newKeypair = Keypair.generate();
        let privateKey = bs58.encode(newKeypair.secretKey);
        
        // Encrypt and store
        const encryptedKey = this.encryptPrivateKey(privateKey, keyId);
        await this.storeEncryptedKey(keyId, encryptedKey);
        
        // Clear sensitive data
        privateKey = ''; // Clear reference
        
        return newKeypair;
    }

    /**
     * Import an existing private key
     */
    async importPrivateKey(privateKey: string, keyId?: string): Promise<string> {
        // Validate the private key
        try {
            const secretKey = bs58.decode(privateKey);
            const keypair = Keypair.fromSecretKey(secretKey);
            
            // Use public key as keyId if not provided
            const id = keyId || keypair.publicKey.toBase58();
            
            // Encrypt and store
            const encryptedKey = this.encryptPrivateKey(privateKey, id);
            await this.storeEncryptedKey(id, encryptedKey);
            
            logger.info(`Private key imported successfully for ${id}`);
            return id;
        } catch (error) {
            logger.error('Failed to import private key:', error);
            throw new Error('Invalid private key format');
        }
    }

    /**
     * Delete a stored key
     */
    async deleteKey(keyId: string): Promise<void> {
        try {
            await this.runtime.db.execute(
                `DELETE FROM encrypted_keys WHERE key_id = ?`,
                [keyId]
            );
            
            this.encryptedKeys.delete(keyId);
            logger.info(`Key deleted: ${keyId}`);
        } catch (error) {
            logger.error('Failed to delete key:', error);
            throw error;
        }
    }

    /**
     * Rotate the master key
     */
    async rotateMasterKey(newPassword: string): Promise<void> {
        if (!this.masterKey) {
            throw new Error('Master key not initialized');
        }

        // Decrypt all keys with old master key
        const decryptedKeys = new Map<string, string>();
        for (const [keyId] of this.encryptedKeys) {
            decryptedKeys.set(keyId, this.decryptPrivateKey(keyId));
        }

        // Generate new master key
        const newSalt = randomBytes(32).toString('base64');
        const newMasterKey = scryptSync(newPassword, newSalt, 32);

        // Re-encrypt all keys with new master key
        const oldMasterKey = this.masterKey;
        this.masterKey = newMasterKey;

        for (const [keyId, privateKey] of decryptedKeys) {
            const encryptedKey = this.encryptPrivateKey(privateKey, keyId);
            await this.storeEncryptedKey(keyId, encryptedKey);
        }

        // Clear old master key
        oldMasterKey.fill(0);
        
        // Clear decrypted keys map
        decryptedKeys.clear();

        logger.info('Master key rotated successfully');
    }

    /**
     * Initialize database tables
     */
    static async start(runtime: IAgentRuntime): Promise<SecureKeyManager> {
        // Create table if not exists
        await runtime.db.execute(`
            CREATE TABLE IF NOT EXISTS encrypted_keys (
                key_id TEXT PRIMARY KEY,
                encrypted TEXT NOT NULL,
                salt TEXT NOT NULL,
                iv TEXT NOT NULL,
                tag TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER DEFAULT NULL
            )
        `);

        const service = new SecureKeyManager(runtime);
        return service;
    }
} 