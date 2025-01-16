import { Action, elizaLogger, IAgentRuntime, UUID } from "@elizaos/core";

export const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

export function registerActions(runtime: IAgentRuntime, actions: Action[]) {
    for (const action of actions) {
        runtime.registerAction(action);
    }
}

export function unregisterActions(runtime: IAgentRuntime, actions: Action[]) {
    runtime.actions = runtime.actions.filter(
        (action) => !actions.map((a) => a.name).includes(action.name)
    );
}

export async function participateToRoom(runtime: IAgentRuntime, roomId: UUID) {
    await runtime.ensureRoomExists(roomId);
    await runtime.ensureParticipantInRoom(runtime.agentId, roomId);

    elizaLogger.log("Agent is a participant in roomId:", roomId);
}
