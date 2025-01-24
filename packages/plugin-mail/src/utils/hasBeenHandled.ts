import { IAgentRuntime, stringToUuid } from "@elizaos/core";
import { EmailMessage } from "../types";

export async function hasBeenHandled(
    email: EmailMessage,
    runtime: IAgentRuntime
): Promise<boolean> {
    if (!email.messageId) return false;

    const memoryId = stringToUuid(email.messageId + "-" + runtime.agentId);

    const responseMemoryId = stringToUuid(
        `${email.messageId}-response-${runtime.agentId}`
    );

    return !!(
        (await runtime.messageManager.getMemoryById(memoryId)) ||
        (await runtime.messageManager.getMemoryById(responseMemoryId))
    );
}
