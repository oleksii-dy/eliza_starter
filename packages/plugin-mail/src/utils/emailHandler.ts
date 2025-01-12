import {
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    elizaLogger,
    generateText,
    getEmbeddingZeroVector,
    stringToUuid,
} from "@elizaos/core";
import { EmailMessage } from "../types";

export async function summarizeEmail(
    email: EmailMessage,
    runtime: IAgentRuntime
): Promise<string> {
    const emailContent = `
    From: ${email.from?.text || email.from?.value?.[0]?.address || "Unknown Sender"}
    Subject: ${email.subject || "No Subject"}
    Content: ${email.text || "No Content"}`;

    return generateText({
        runtime,
        context: `Summarize this email in one concise sentence:\n${emailContent}`,
        modelClass: ModelClass.SMALL,
    });
}

export async function handleEmail(
    email: EmailMessage,
    runtime: IAgentRuntime,
    initialState: State
): Promise<void> {
    if (!email.messageId) {
        elizaLogger.warn("Email missing messageId, skipping");
        return;
    }

    const memoryId = stringToUuid(email.messageId + "-" + runtime.agentId);
    const memory: Memory = {
        id: memoryId,
        agentId: runtime.agentId,
        roomId: runtime.agentId,
        userId: runtime.agentId,
        content: {
            text: email.text || "",
            source: "email",
            messageId: email.messageId,
            from: email.from?.text || email.from?.value?.[0]?.address,
            subject: email.subject,
            summary: await summarizeEmail(email, runtime),
        },
        createdAt: email.date?.getTime() || Date.now(),
        embedding: getEmbeddingZeroVector(),
    };

    await runtime.messageManager?.createMemory(memory);
}
