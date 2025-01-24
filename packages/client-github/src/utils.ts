import { Action, IAgentRuntime, Memory, UUID } from "@elizaos/core";

export const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

export function registerActions(runtime: IAgentRuntime, actions: Action[]) {
    for (const action of actions) {
        runtime.registerAction(action);
    }
}

export function unregisterActions(runtime: IAgentRuntime, actions: Action[]) {
    runtime.actions = runtime.actions.filter(
        (action) => !actions.map((a) => a.name).includes(action.name),
    );
}

export async function getUserMemories(
    runtime: IAgentRuntime,
    roomId: UUID,
    userId: UUID,
): Promise<Memory[]> {
    const memories = await runtime.messageManager.getMemories({
        roomId,
        unique: false,
    });
    return memories.filter((memory) => memory.userId === userId);
}

export async function getUserLastMemory(
    runtime: IAgentRuntime,
    roomId: UUID,
    userId: UUID,
): Promise<Memory | null> {
    const memories = await getUserMemories(runtime, roomId, userId);
    if (memories.length === 0) {
        return null;
    }
    return memories[0];
}
