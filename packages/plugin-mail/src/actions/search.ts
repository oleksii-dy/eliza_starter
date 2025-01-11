import {
    Action,
    elizaLogger,
    IAgentRuntime,
    Memory,
    HandlerCallback,
} from "@elizaos/core";

export interface SearchEmailsParams {
    criteria: string[];
    markSeen?: boolean;
}

export const searchEmailsAction: Action = {
    name: "searchEmails",
    similes: ["search", "find", "locate"],
    description: "Search emails using IMAP search criteria",
    examples: [
        [{ user: "user", content: { text: "search for emails from john" } }],
        [
            {
                user: "user",
                content: { text: "find emails about the new product" },
            },
        ],
        [{ user: "user", content: { text: "locate emails from last week" } }],
    ],
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: any,
        options: any,
        callback?: HandlerCallback
    ) => {
        if (!global.mailService) {
            throw new Error("Mail service not initialized");
        }

        const criteria = options?.criteria || [];
        const markSeen = options?.markSeen || false;

        try {
            const emails = await global.mailService.searchEmails(criteria);

            if (emails.length === 0) {
                if (callback) {
                    await callback({
                        text: "No emails found matching the search criteria.",
                    });
                }
                return true;
            }

            const formattedEmails = emails
                .map((email, index) => {
                    const from =
                        email.from?.text ||
                        email.from?.value?.[0]?.address ||
                        "Unknown Sender";
                    return `Email ${index + 1}:\nFrom: ${from}\nSubject: ${email.subject || "No Subject"}\nDate: ${email.date?.toLocaleString() || "Unknown Date"}\n---\n${email.text || "No Content"}`;
                })
                .join("\n\n");

            if (markSeen) {
                for (const email of emails) {
                    if (email.uid) {
                        await global.mailService.markAsRead(email.uid);
                    }
                }
            }

            if (callback) {
                await callback({
                    text: `Found ${emails.length} email(s):\n\n${formattedEmails}`,
                });
            }

            return true;
        } catch (error) {
            elizaLogger.error("Error searching emails:", error);
            throw error;
        }
    },
    validate: async () => true,
};
