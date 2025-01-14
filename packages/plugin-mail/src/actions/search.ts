import {
    Action,
    elizaLogger,
    generateText,
    ModelClass,
    Memory,
    HandlerCallback,
    IAgentRuntime,
} from "@elizaos/core";
import { SearchCriteria } from "../types";

export const searchEmailsAction: Action = {
    name: "searchEmails",
    description: "Search emails using various criteria",
    similes: ["search", "find", "look for", "check for"],
    examples: [
        [
            {
                user: "user",
                content: { text: "search for emails from sarah@example.com" },
            },
        ],
        [
            {
                user: "user",
                content: { text: "find unread emails about meetings" },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "look for emails with attachments from last week",
                },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "search for emails with subject containing 'urgent'",
                },
            },
        ],
    ],
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        _state: any,
        _options: any,
        callback?: HandlerCallback
    ) => {
        if (!global.mailService) {
            await callback?.({ text: "Email service is not initialized" });
            return false;
        }

        const searchContext = `Given this request: "${message.content.text}", extract search criteria for emails. Return only a JSON object with these optional fields:
        {
            "from": "email address",
            "to": "email address",
            "subject": "text to find in subject",
            "body": "text to find in body",
            "since": "YYYY-MM-DD",
            "before": "YYYY-MM-DD",
            "seen": boolean,
            "flagged": boolean,
            "minSize": number,
            "maxSize": number
        }

        Example outputs:
        {"from": "john@example.com", "subject": "meeting"}
        {"seen": false, "since": "2024-01-01"}
        {"flagged": true, "minSize": 5000000}`;

        const searchTerms = await generateText({
            runtime,
            context: searchContext,
            modelClass: ModelClass.SMALL,
        });

        let criteria: SearchCriteria;
        try {
            const cleanedTerms = searchTerms
                .replace(/```json\n?/g, "")
                .replace(/```\n?/g, "")
                .trim();
            const parsed = JSON.parse(cleanedTerms);
            criteria = {
                ...parsed,
                since: parsed.since ? new Date(parsed.since) : undefined,
                before: parsed.before ? new Date(parsed.before) : undefined,
            };
        } catch (err) {
            elizaLogger.error("Failed to parse search criteria", {
                searchTerms,
                error: err,
            });
            await callback?.({
                text: "I couldn't understand the search criteria. Please try rephrasing your request.",
            });
            return false;
        }

        elizaLogger.debug("Searching with criteria", { criteria });
        try {
            const emails = await global.mailService.searchEmails(criteria);
            if (emails.length === 0) {
                await callback?.({
                    text: "No emails found matching your search criteria.",
                });
                return true;
            }

            const summary = emails
                .map(
                    (email, i) =>
                        `${i + 1}. From: ${email.from?.text || "Unknown"}\n   Subject: ${email.subject || "No subject"}\n   Date: ${email.date?.toLocaleString() || "Unknown"}`
                )
                .join("\n\n");

            await callback?.({
                text: `Found ${emails.length} matching email(s):\n\n${summary}`,
            });
            return true;
        } catch (err) {
            elizaLogger.error("Error searching emails", {
                criteria,
                error: err,
            });
            await callback?.({
                text: "Sorry, I encountered an error while searching emails. Please try again.",
            });
            return false;
        }
    },
    validate: async (runtime: IAgentRuntime) => {
        return !!global.mailService;
    },
};
