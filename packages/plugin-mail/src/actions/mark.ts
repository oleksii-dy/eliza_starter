import { Action, HandlerCallback, IAgentRuntime, Memory } from "@elizaos/core";

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
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: any,
        options: any,
        callback?: HandlerCallback
    ) => {
        if (!global.mailService)
            throw new Error("Mail service not initialized");

        try {
            await global.mailService.connect();

            const content = message.content as unknown as MarkAsReadContent;
            await global.mailService.markAsRead(content.uid);

            if (callback) {
                await callback({ text: `Email marked as read.` });
            }

            return true;
        } finally {
            await global.mailService.dispose();
        }
    },
    validate: async () => true,
};
