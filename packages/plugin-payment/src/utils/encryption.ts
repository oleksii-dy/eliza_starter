import { randomBytes, pbkdf2Sync, createCipheriv, createDecipheriv } from 'node:crypto';
import { Buffer } from 'node:buffer';

const ALGORITHM = 'aes-256-gcm';

export function encrypt(data: string, password: string): string {
  const salt = randomBytes(32);
  const iv = randomBytes(16);
  const key = pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([salt, iv, tag, encrypted]);
  return combined.toString('base64');
}

export function decrypt(encryptedData: string, password: string): string {
  const combined = Buffer.from(encryptedData, 'base64');
  const salt = combined.subarray(0, 32);
  const iv = combined.subarray(32, 48);
  const tag = combined.subarray(48, 64);
  const encrypted = combined.subarray(64);
  const key = pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}
