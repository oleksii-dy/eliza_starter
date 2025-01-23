import { IAgentRuntime } from "@elizaos/core";
import bs58check from 'bs58check';
import { ParsedKeypair } from "@roochnetwork/rooch-sdk/dist/esm";

const parseKeypair = (runtime: IAgentRuntime): ParsedKeypair => {
    const wifPrivateKey = runtime.getSetting("BITCOIN_PRIVATE_KEY");
    if (!wifPrivateKey) {
        throw new Error("BITCOIN_PRIVATE_KEY is not set");
    }

    try {
        // Decode the WIF private key
        const decoded = bs58check.decode(wifPrivateKey);
        // Extract the private key (skip the first byte for version and last 4 bytes for checksum)
        const secretKey = decoded.slice(1, 33);

        return {
            schema: "Secp256k1",
            secretKey: secretKey,
        } as ParsedKeypair;
    } catch (error) {
        // Handle invalid WIF format
        throw new Error("Invalid Bitcoin WIF private key");
    }
};

const parseAccessPath = (uri: string): string => {
    // Adjust the regex to ensure correct matching
    const match = uri.match(/^rooch:\/\/object\/(0x[a-fA-F0-9]+)$/);
    if (match) {
        return `/object/${match[1]}`;
    }
    throw new Error("Invalid URI format");
};

export { parseKeypair, parseAccessPath };