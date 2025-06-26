/**
 * Credential storage abstraction with fallback mechanism
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { logger } from '@elizaos/core';
import crypto from 'node:crypto';

interface CredentialStorage {
  setPassword(service: string, account: string, password: string): Promise<void>;
  getPassword(service: string, account: string): Promise<string | null>;
  deletePassword(service: string, account: string): Promise<boolean>;
}

class KeytarStorage implements CredentialStorage {
  private keytar: any;

  constructor() {
    try {
      this.keytar = require('keytar');
    } catch (__error) {
      throw new Error('Keytar not available');
    }
  }

  async setPassword(service: string, account: string, password: string): Promise<void> {
    await this.keytar.setPassword(service, account, password);
  }

  async getPassword(service: string, account: string): Promise<string | null> {
    return await this.keytar.getPassword(service, account);
  }

  async deletePassword(service: string, account: string): Promise<boolean> {
    return await this.keytar.deletePassword(service, account);
  }
}

class FileBasedStorage implements CredentialStorage {
  private storageDir: string;
  private algorithm = 'aes-256-gcm';
  private keyLength = 32;

  constructor() {
    this.storageDir = path.join(os.homedir(), '.eliza', '.credentials');
  }

  private getKey(): Buffer {
    // Derive key from machine-specific information
    const machineId = os.hostname() + os.platform() + os.arch();
    return crypto.scryptSync(machineId, 'elizaos-cli-salt', this.keyLength);
  }

  private encrypt(text: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.getKey(), iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = (cipher as any).getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
    };
  }

  private decrypt(encrypted: string, iv: string, tag: string): string {
    const decipher = crypto.createDecipheriv(this.algorithm, this.getKey(), Buffer.from(iv, 'hex'));

    (decipher as any).setAuthTag(Buffer.from(tag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private getFilePath(service: string, account: string): string {
    const filename = crypto.createHash('sha256').update(`${service}:${account}`).digest('hex');
    return path.join(this.storageDir, `${filename}.cred`);
  }

  async setPassword(service: string, account: string, password: string): Promise<void> {
    await fs.mkdir(this.storageDir, { recursive: true, mode: 0o700 });

    const { encrypted, iv, tag } = this.encrypt(password);
    const data = {
      service,
      account,
      encrypted,
      iv,
      tag,
      created: new Date().toISOString(),
    };

    const filePath = this.getFilePath(service, account);
    await fs.writeFile(filePath, JSON.stringify(data), { mode: 0o600 });
  }

  async getPassword(service: string, account: string): Promise<string | null> {
    try {
      const filePath = this.getFilePath(service, account);
      const content = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(content);

      if (data.service !== service || data.account !== account) {
        return null;
      }

      return this.decrypt(data.encrypted, data.iv, data.tag);
    } catch (__error) {
      return null;
    }
  }

  async deletePassword(service: string, account: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(service, account);
      await fs.unlink(filePath);
      return true;
    } catch (__error) {
      return false;
    }
  }
}

let storageInstance: CredentialStorage | null = null;

export function getCredentialStorage(): CredentialStorage {
  if (storageInstance) {
    return storageInstance;
  }

  // Try keytar first
  try {
    storageInstance = new KeytarStorage();
    logger.debug('Using keytar for credential storage');
  } catch (__error) {
    // Fallback to file-based storage
    storageInstance = new FileBasedStorage();
    logger.debug('Using file-based credential storage (keytar not available)');
    logger.warn(
      'Credentials are stored in encrypted files. For better security, ensure keytar dependencies are installed.'
    );
  }

  return storageInstance;
}
