import { Action, IAgentRuntime, Memory } from "@elizaos/core";

export interface MarkAsReadContent {
    uid: number;
}

export const markAsReadAction: Action = {
    name: "markAsRead",
    description: "Mark an email as read",
    similes: ["mark", "flag", "set"],
    examples: [
        [{ user: "user", content: { text: "mark email as read" } }],
        [{ user: "user", content: { text: "flag message as seen" } }],
        [{ user: "user", content: { text: "mark as read" } }],
    ],
    handler: async (runtime: IAgentRuntime, message: Memory) => {
        if (!global.mailService)
            throw new Error("Mail service not initialized");

        const content = message.content as unknown as MarkAsReadContent;

        await global.mailService.markAsRead(content.uid);
    },
    validate: async () => true,
};
