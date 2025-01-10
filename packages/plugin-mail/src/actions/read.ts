import { Action, IAgentRuntime, Memory } from "@elizaos/core";

export const readEmailsAction: Action = {
    name: "readEmails",
    description: "Read unread emails from inbox",
    similes: ["check", "fetch", "retrieve"],
    examples: [
        [{ user: "user", content: { text: "read my emails" } }],
        [{ user: "user", content: { text: "check unread messages" } }],
        [{ user: "user", content: { text: "get new mail" } }],
    ],
    handler: async (runtime: IAgentRuntime, message: Memory) => {
        if (!global.mailService)
            throw new Error("Mail service not initialized");

        return global.mailService.getUnreadEmails();
    },
    validate: async () => true,
};
