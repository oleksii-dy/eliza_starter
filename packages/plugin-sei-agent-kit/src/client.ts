import { SeiAgentKit } from "sei-agent-kit";
import type { IAgentRuntime } from "@elizaos/core";

export async function getSeiAgentKit(runtime: IAgentRuntime) {
    const privateKey = await runtime.getSetting("SEI_PRIVATE_KEY");

    // Assertions for the private key
    if (!/^0x[0-9a-fA-F]+$/.test(privateKey)) {
        throw new Error("Invalid private key format: must be a hex string prefixed with '0x'.");
    }
    
    // Ensure private key starts with '0x' and is a valid hex string
    const formattedPrivateKey = privateKey.startsWith('0x')
    ? privateKey
    : `0x${privateKey}`;


    return new SeiAgentKit(
        formattedPrivateKey,
        runtime.getSetting("OPENAI_API_KEY"),
    );
}