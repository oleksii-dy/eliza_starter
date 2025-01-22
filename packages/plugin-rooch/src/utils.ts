import { IAgentRuntime } from "@elizaos/core";
import bs58check from 'bs58check';
import { ParsedKeypair } from "@roochnetwork/rooch-sdk/dist/esm";

const parseKeypair = (runtime: IAgentRuntime): ParsedKeypair => {
    const wifPrivateKey = runtime.getSetting("BITCOIN_WIF_PRIVATE_KEY");
    if (!wifPrivateKey) {
        throw new Error("BITCOIN_WIF_PRIVATE_KEY is not set");
    }

    const decoded = bs58check.decode(wifPrivateKey);
    const secretKey = decoded.slice(1, 33);

    return {
        schema: "Secp256k1",
        secretKey: secretKey
    } as ParsedKeypair;
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