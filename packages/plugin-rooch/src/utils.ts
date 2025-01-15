import { IAgentRuntime, settings } from "@elizaos/core";
import { Keypair, decodeRoochSercetKey, ROOCH_SECRET_KEY_PREFIX } from "@roochnetwork/rooch-sdk";

const parseKeypair = (runtime: IAgentRuntime): Keypair => {
    const privateKey = runtime.getSetting("ROOCH_PRIVATE_KEY");
    if (!privateKey) {
        throw new Error("ROOCH_PRIVATE_KEY is not set");
    }

    if (!privateKey.startsWith(ROOCH_SECRET_KEY_PREFIX)) {
        throw new Error("ROOCH_PRIVATE_KEY is invalid");
    }

    return decodeRoochSercetKey(privateKey);
};

const parseKeypairFromSettings = (): Keypair => {
    const privateKey = settings["ROOCH_PRIVATE_KEY"];
    if (!privateKey) {
        throw new Error("ROOCH_PRIVATE_KEY is not set");
    }

    if (!privateKey.startsWith(ROOCH_SECRET_KEY_PREFIX)) {
        throw new Error("ROOCH_PRIVATE_KEY is invalid");
    }

    return decodeRoochSercetKey(privateKey);
};

const parseAccessPath = (uri: string): string => {
    // Adjust the regex to ensure correct matching
    const match = uri.match(/^rooch:\/\/object\/(0x[a-fA-F0-9]+)$/);
    if (match) {
        return `/object/${match[1]}`;
    }
    throw new Error("Invalid URI format");
};

const convertCharacter = (obj: any): Character => {
    //TODO
    return defaultCharacter
}

export { parseKeypair, parseKeypairFromSettings, parseAccessPath, convertCharacter };