import { SendEmailParams } from "../types";

export const sendEmailTemplate = {
    name: "sendEmail",
    description: "Template for sending an email",
    schema: {
        type: "object",
        properties: {
            to: {
                type: "string",
                description: "Email address of the recipient",
                required: true,
            },
            subject: {
                type: "string",
                description: "Subject of the email",
                required: true,
            },
            text: {
                type: "string",
                description: "Text content of the email",
                required: false,
            },
            html: {
                type: "string",
                description: "Optional HTML content of the email",
                required: false,
            },
        },
        required: ["to", "subject", "text"],
    },
    examples: [
        {
            to: "john@example.com",
            subject: "Meeting Tomorrow",
            text: "Hi John, just confirming our meeting tomorrow at 2 PM.",
            html: "<p>Hi John, just confirming our meeting tomorrow at 2 PM.</p>",
        },
        {
            to: "jane@example.com",
            subject: "Project Update",
            text: "Hi Jane, here's the latest update on the project...",
            html: "<p>Hi Jane, here's the latest update on the project...</p>",
        },
    ],
} as const;
