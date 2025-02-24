import { composeContext, elizaLogger } from "@elizaos/core";
import { generateMessageResponse, generateTrueOrFalse } from "@elizaos/core";
import { booleanFooter, messageCompletionFooter } from "@elizaos/core";
import {
    type Action,
    type ActionExample,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";


export const messageHandlerTemplate =
    `# Action Examples
{{actionExamples}}
(Action examples are for reference only. Do not use the information from them in your response.)

# Task: Handle Storacha storage operations
You are helping the user interact with Storacha decentralized storage. You can:
- Upload files to storage
- Fetch content using CIDs
- Manage uploaded content

{{recentMessages}}

# Instructions: Write a response explaining what storage operation you'll perform.
` + messageCompletionFooter;

export const uploadFileAction: Action = {
    name: "UPLOAD_FILE",
    similes: ["UPLOAD", "STORE", "SAVE", "PUT", "PIN"],
    description: "Use this action when the user wants to upload a file to Storacha storage.",

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        // Extract command from message
        const text = message.content.text.toLowerCase();

        if (text.includes("upload")) {
            // Handle upload request
            elizaLogger.info("Starting file upload to Storacha...");
            const attachments = message.content.attachments;
            if (attachments.length === 0) {
                await callback({
                    text: "No file to upload. Please attach a file to upload to Storacha.",
                    action: null
                });
                return;
            }
            elizaLogger.info("Uploading file(s) to Storacha...");
            //TODO: Implement upload logic
            elizaLogger.info("File(s) uploaded to Storacha.");
            //TODO: print CIDs of the uploaded files
            return;
        }

        // Default response if no specific command matched
        await callback({
            text: "I can help you with Storacha storage. You can ask me to:\n" +
                "- Upload files to a distributed storage",
            action: 'UPLOAD_FILE'
        });
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "can you upload this file to Storacha?",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll help you upload this file to Storacha storage.",
                    action: "UPLOAD_FILE"
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "store this document in Storacha please",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll help you store that document in Storacha storage.",
                    action: "UPLOAD_FILE"
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "save this image to storacha",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll help you save that image to Storacha storage.",
                    action: "UPLOAD_FILE"
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "pin this image into IPFS",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll help you pin that image into IPFS via Storacha.",
                    action: "UPLOAD_FILE"
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "pin this file into IPFS",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll help you pin that file into IPFS via Storacha.",
                    action: "UPLOAD_FILE"
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
