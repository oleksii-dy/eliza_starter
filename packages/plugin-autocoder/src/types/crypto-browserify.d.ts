declare module 'crypto-browserify' {
  import { Transform } from 'stream';

  export interface Hash extends Transform {
    update(data: string | Buffer, inputEncoding?: BufferEncoding): Hash;
    digest(encoding?: BufferEncoding): Buffer | string;
  }

  export interface Hmac extends Transform {
    update(data: string | Buffer, inputEncoding?: BufferEncoding): Hmac;
    digest(encoding?: BufferEncoding): Buffer | string;
  }

  export interface Cipher extends Transform {
    update(data: string | Buffer, inputEncoding?: BufferEncoding, outputEncoding?: BufferEncoding): string | Buffer;
    final(outputEncoding?: BufferEncoding): string | Buffer;
  }

  export interface Decipher extends Transform {
    update(data: string | Buffer, inputEncoding?: BufferEncoding, outputEncoding?: BufferEncoding): string | Buffer;
    final(outputEncoding?: BufferEncoding): string | Buffer;
  }

  export function createHash(algorithm: string): Hash;
  export function createHmac(algorithm: string, key: string | Buffer): Hmac;
  export function createCipher(algorithm: string, password: string | Buffer): Cipher;
  export function createCipheriv(algorithm: string, key: string | Buffer, iv: string | Buffer): Cipher;
  export function createDecipher(algorithm: string, password: string | Buffer): Decipher;
  export function createDecipheriv(algorithm: string, key: string | Buffer, iv: string | Buffer): Decipher;
  export function randomBytes(size: number): Buffer;
  export function randomFill<T extends ArrayBufferView>(buffer: T, callback: (err: Error | null, buf: T) => void): void;
  export function randomFillSync<T extends ArrayBufferView>(buffer: T, offset?: number, size?: number): T;
  export function pbkdf2(password: string | Buffer, salt: string | Buffer, iterations: number, keylen: number, digest: string, callback: (err: Error | null, derivedKey: Buffer) => void): void;
  export function pbkdf2Sync(password: string | Buffer, salt: string | Buffer, iterations: number, keylen: number, digest: string): Buffer;
  export function getHashes(): string[];
  export function getCiphers(): string[];

  export const constants: {
    DH_CHECK_P_NOT_SAFE_PRIME: number;
    DH_CHECK_P_NOT_PRIME: number;
    DH_UNABLE_TO_CHECK_GENERATOR: number;
    DH_NOT_SUITABLE_GENERATOR: number;
    NPN_ENABLED: number;
    ALPN_ENABLED: number;
    RSA_PKCS1_PADDING: number;
    RSA_SSLV23_PADDING: number;
    RSA_NO_PADDING: number;
    RSA_PKCS1_OAEP_PADDING: number;
    RSA_X931_PADDING: number;
    RSA_PKCS1_PSS_PADDING: number;
    POINT_CONVERSION_COMPRESSED: number;
    POINT_CONVERSION_UNCOMPRESSED: number;
    POINT_CONVERSION_HYBRID: number;
  };

  const crypto: {
    createHash: typeof createHash;
    createHmac: typeof createHmac;
    createCipher: typeof createCipher;
    createCipheriv: typeof createCipheriv;
    createDecipher: typeof createDecipher;
    createDecipheriv: typeof createDecipheriv;
    randomBytes: typeof randomBytes;
    randomFill: typeof randomFill;
    randomFillSync: typeof randomFillSync;
    pbkdf2: typeof pbkdf2;
    pbkdf2Sync: typeof pbkdf2Sync;
    getHashes: typeof getHashes;
    getCiphers: typeof getCiphers;
    constants: typeof constants;
  };

  export default crypto;
}
