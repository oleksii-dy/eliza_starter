import { IAgentRuntime, State, type Memory } from "./types.ts";
import fs from "fs/promises";
/**
 * Formats provider outputs into a string which can be injected into the context.
 * @param runtime The AgentRuntime object.
 * @param message The incoming message object.
 * @param state The current state object.
 * @returns A string that concatenates the outputs of each provider.
 */
export async function getProviders(
    runtime: IAgentRuntime,
    message: Memory,
    state?: State
) {
    await fs.writeFile(
        "/tmp/core-providers.txt",
        JSON.stringify(runtime.providers, null, 2)
    );
    const providerResults = (
        await Promise.all(
            runtime.providers.map(async (provider) => {
                return await provider.get(runtime, message, state);
            })
        )
    ).filter((result) => result != null && result !== "");

    return providerResults.join("\n");
}
