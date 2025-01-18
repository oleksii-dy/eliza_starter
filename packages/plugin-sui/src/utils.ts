import { IAgentRuntime } from "@elizaos/core";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Secp256k1Keypair } from "@mysten/sui/keypairs/secp256k1";
import { Secp256r1Keypair } from "@mysten/sui/keypairs/secp256r1";

const parseAccount = (
    runtime: IAgentRuntime
): Ed25519Keypair | Secp256k1Keypair | Secp256r1Keypair => {
    const privateKey = runtime.getSetting("SUI_PRIVATE_KEY");
    if (!privateKey) {
        throw new Error("SUI_PRIVATE_KEY is not set");
    } else if (privateKey.startsWith("suiprivkey")) {
        return loadSecretKey(privateKey);
    } else {
        return loadFromMnemonics(privateKey);
    }
};

const loadSecretKey = (privateKey: string) => {
    try {
        return Ed25519Keypair.fromSecretKey(privateKey);
    } catch {
        try {
            return Secp256k1Keypair.fromSecretKey(privateKey);
        } catch {
            return Secp256r1Keypair.fromSecretKey(privateKey);
        }
    }
};

const loadFromMnemonics = (mnemonics: string) => {
    try {
        return Ed25519Keypair.deriveKeypairFromSeed(mnemonics);
    } catch {
        try {
            return Secp256k1Keypair.deriveKeypair(mnemonics);
        } catch {
            return Secp256r1Keypair.deriveKeypair(mnemonics);
        }
    }
};

export { parseAccount };
