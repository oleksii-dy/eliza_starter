import crypto from 'crypto';
import bs58check from 'bs58check';
import secp256k1 from 'secp256k1';

class BitcoinKeyGenerator {
    // Generate a random 32-byte private key
    static generatePrivateKey() {
        let privateKey;
        do {
            privateKey = crypto.randomBytes(32);
        } while (!secp256k1.privateKeyVerify(privateKey));
        return privateKey;
    }

    // Encode the private key into WIF (Wallet Import Format)
    static privateKeyToWIF(privateKey, compressed = true) {
        // Add the version byte (0x80 for mainnet)
        const version = Buffer.from([0x80]);
        // If using compressed format, append 0x01 to the private key
        const suffix = compressed ? Buffer.from([0x01]) : Buffer.alloc(0);
        // Concatenate the version, private key, and compression flag
        const payload = Buffer.concat([version, privateKey, suffix]);
        // Perform Base58Check encoding on the payload
        return bs58check.encode(payload);
    }

    // Generate a public key from the private key
    static privateKeyToPublicKey(privateKey, compressed = true) {
        return secp256k1.publicKeyCreate(privateKey, compressed);
    }

    // Generate a Bitcoin WIF private key and corresponding public key
    static generateKeys(compressed = true) {
        const privateKey = this.generatePrivateKey();
        const wif = this.privateKeyToWIF(privateKey, compressed);
        const publicKey = this.privateKeyToPublicKey(privateKey, compressed);
        return { wif, publicKey };
    }
}

function uint8ArrayToHex(uint8Array) {
    return Array.from(uint8Array)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}

// Example usage
const { wif, publicKey } = BitcoinKeyGenerator.generateKeys();
console.log('WIF:', wif);
console.log('Public Key (Hex):' +  uint8ArrayToHex(publicKey)); // Convert Buffer to hex string