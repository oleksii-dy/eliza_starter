import {
    Action,
    IAgentRuntime,
    Memory,
    generateText,
    ModelClass,
    HandlerCallback,
} from "@elizaos/core";

async function summarizeEmail(
    runtime: IAgentRuntime,
    email: any
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

export const readEmailsAction: Action = {
    name: "readEmails",
    description: "Read unread emails from inbox",
    similes: ["check", "fetch", "retrieve"],
    examples: [
        [{ user: "user", content: { text: "read my emails" } }],
        [{ user: "user", content: { text: "check unread messages" } }],
        [{ user: "user", content: { text: "get new mail" } }],
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

        const emails = await global.mailService.getRecentEmails();

        if (emails.length === 0) {
            if (callback) {
                await callback({ text: "No unread emails found." });
            }
            return true;
        }

        const summaries = await Promise.all(
            emails.map((email) => summarizeEmail(runtime, email))
        );

        const formattedSummaries = summaries
            .map((summary, index) => `Email ${index + 1}: ${summary}`)
            .join("\n");

        if (callback) {
            await callback({
                text: `Found ${emails.length} unread email(s):\n\n${formattedSummaries}`,
            });
        }
        return true;
    },
    validate: async () => true,
};
