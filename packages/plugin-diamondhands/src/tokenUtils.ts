import { elizaLogger } from "@ai16z/eliza";

export function loadTokenAddresses(runtime): string[] {
    try {
        const addresses = runtime.character.diamondHands;

        elizaLogger.log("Loaded token addresses:", addresses);
        return addresses;
    } catch (error) {
        elizaLogger.error("Failed to load token addresses:", error);
        throw new Error("Token addresses file not found or invalid");
    }
}