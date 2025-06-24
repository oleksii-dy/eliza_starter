declare module 'crypto-browserify' {
  interface Hash {
    update(data: string | Buffer): Hash;
    digest(): Buffer;
  }

  interface Cipher {
    update(data: string, inputEncoding?: string, outputEncoding?: string): string;
    final(outputEncoding?: string): string;
  }

  interface Decipher {
    update(data: string, inputEncoding?: string, outputEncoding?: string): string;
    final(outputEncoding?: string): string;
  }

  function _createHash(algorithm: string): Hash;
  function _randomBytes(size: number): Buffer;
  function _createCipheriv(algorithm: string, key: Buffer, iv: Buffer): Cipher;
  function _createDecipheriv(algorithm: string, key: Buffer, iv: Buffer): Decipher;

  const crypto: {
    createHash: typeof _createHash;
    randomBytes: typeof _randomBytes;
    createCipheriv: typeof _createCipheriv;
    createDecipheriv: typeof _createDecipheriv;
  };

  export default crypto;
}
