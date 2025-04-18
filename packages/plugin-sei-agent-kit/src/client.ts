import { SeiAgentKit } from "sei-agent-kit";
import type { IAgentRuntime } from "@elizaos/core";

export async function getSeiAgentKit(runtime: IAgentRuntime) {
    const privateKey = await runtime.getSetting("SEI_PRIVATE_KEY");
    
    // Ensure private key starts with '0x' and is a valid hex string
    const formattedPrivateKey = privateKey.startsWith('0x') 
        ? privateKey 
        : `0x${privateKey}`;

    return new SeiAgentKit(
        formattedPrivateKey,
        runtime.getSetting("OPENAI_API_KEY"),
    );
}