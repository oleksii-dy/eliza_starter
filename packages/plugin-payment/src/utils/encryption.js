'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const node_crypto_1 = require('node:crypto');
const node_buffer_1 = require('node:buffer');
const ALGORITHM = 'aes-256-gcm';
function encrypt(data, password) {
  const salt = (0, node_crypto_1.randomBytes)(32);
  const iv = (0, node_crypto_1.randomBytes)(16);
  const key = (0, node_crypto_1.pbkdf2Sync)(password, salt, 100000, 32, 'sha256');
  const cipher = (0, node_crypto_1.createCipheriv)(ALGORITHM, key, iv);
  const encrypted = node_buffer_1.Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = node_buffer_1.Buffer.concat([salt, iv, tag, encrypted]);
  return combined.toString('base64');
}
function decrypt(encryptedData, password) {
  const combined = node_buffer_1.Buffer.from(encryptedData, 'base64');
  const salt = combined.subarray(0, 32);
  const iv = combined.subarray(32, 48);
  const tag = combined.subarray(48, 64);
  const encrypted = combined.subarray(64);
  const key = (0, node_crypto_1.pbkdf2Sync)(password, salt, 100000, 32, 'sha256');
  const decipher = (0, node_crypto_1.createDecipheriv)(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = node_buffer_1.Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}
