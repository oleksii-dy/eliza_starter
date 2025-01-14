import {
    Action,
    composeContext,
    elizaLogger,
    generateText,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
} from "@elizaos/core";
import { SendEmailParams } from "../types";

const emailTemplate = `Based on the user's message: "{{message}}"

Extract and format the email details in this exact format:
To: [recipient email]
Subject: [email subject]
Message: [email content]

For example, if the message is "send an email to john@example.com about Meeting saying Let's meet tomorrow", the output should be:
To: john@example.com
Subject: Meeting
Message: Let's meet tomorrow`;

export class SendEmailAction {
    constructor() {
        if (!global.mailService) {
            throw new Error("Mail service not initialized");
        }
    }

    async send(
        params: SendEmailParams
    ): Promise<{ success: boolean; message: string }> {
        elizaLogger.info("Sending email with params", { params });

        if (!params.to) {
            throw new Error("Recipient (to) is required");
        }

        if (!params.subject) {
            throw new Error("Subject is required");
        }

        if (!params.text) {
            throw new Error("Email text content is required");
        }

        await global.mailService.sendEmail(
            params.to,
            params.subject,
            params.text,
            params.html
        );

        return { success: true, message: `Email sent to ${params.to}` };
    }
}

export const sendEmailAction: Action = {
    name: "sendEmail",
    description: "Send an email to a specified recipient",
    similes: ["send", "email", "write", "compose", "mail"],
    examples: [
        [
            {
                user: "user",
                content: {
                    text: "send an email to john@example.com about the meeting tomorrow",
                },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "email sarah@company.com to reschedule our call",
                },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "write to team@org.com about project updates",
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

        const emailContext = `Given this request: "${message.content.text}", extract email parameters. Return only a JSON object with these fields:
        {
            "to": "recipient's email address (required)",
            "subject": "email subject line (required)",
            "text": "email body content (required)"
        }

        Example outputs:
        {"to": "john@example.com", "subject": "Meeting Tomorrow", "text": "Hi John, I need to reschedule our meeting tomorrow. What time works best for you?"}
        {"to": "team@company.com", "subject": "Project Update", "text": "Here's the latest status on our project: everything is on track for delivery."}`;

        const emailParams = await generateText({
            runtime,
            context: emailContext,
            modelClass: ModelClass.SMALL,
        });

        let params: SendEmailParams;
        try {
            const cleanedParams = emailParams
                .replace(/```json\n?/g, "")
                .replace(/```\n?/g, "")
                .trim();
            params = JSON.parse(cleanedParams);

            if (!params.to || !params.subject || !params.text) {
                throw new Error("Missing required email parameters");
            }
        } catch (err) {
            elizaLogger.error("Failed to parse email parameters", {
                emailParams,
                error: err,
            });
            await callback?.({
                text: "I couldn't understand the email details. Please make sure to specify who to send the email to, the subject, and the message content.",
            });
            return false;
        }

        elizaLogger.info("Sending email with params", { params });
        try {
            await global.mailService.sendEmail(params);
            await callback?.({
                text: `Email sent successfully to ${params.to}`,
            });
            return true;
        } catch (err) {
            elizaLogger.error("Error in send email handler:", {
                error: err,
            });
            await callback?.({
                text: "Sorry, I encountered an error while sending the email. Please try again.",
            });
            return false;
        }
    },
    validate: async (runtime: IAgentRuntime) => {
        return !!global.mailService;
    },
};
