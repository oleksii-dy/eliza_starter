import fs from "fs";

import {
    composeContext,
    generateText,
} from "@elizaos/core";
import {
    Action,
    ActionExample,
    Content,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
} from "@elizaos/core";

import { extractMention, getUpdatesDataPathForUser, SlackEvent } from "../utils/slack-utils";

export const summarizationTemplate = `Extract key progress updates from the given summary.

## Input Message:
{{summary}}

### **Instructions:**
- Identify and list completed tasks under **DONE**.
- If no completed tasks are found, list blockers under **BLOCKERS FACED**.
- Format the response as simple bullet points, showing **only the work done** or blockers if no work was completed.
- Do **not** include headings like "DONE" or "BLOCKERS FACED"—just provide the bullet points.
- Keep it concise and direct.
- Return the responses as bullet points (•).

### **Examples**

**Input Summary:**
DONE: Redesigned the dashboard layout for better user experience.
IN PROGRESS: Dark mode implementation is partially complete, but theme switching has bugs.
NEXT: Fix theme switcher and add accessibility improvements.

**Expected Output:**

• Redesigned the dashboard layout for better user experience.
`;

const getStatusUpdateHandler = {
    name: "GET_STATUS_UPDATE",
    description: "Retrieves status update for the tagged user and mentions completed tasks or blockers.",
    suppressInitialMessage: true,
    validate: async (
        _runtime: IAgentRuntime,
        message: Memory,
        _state: State | undefined
    ): Promise<boolean> => {
        if (message.content.source !== "slack") {
            return false;
        }

        const keywords: string[] = [
            "work done",
            "tasks done",
            "list down",
            "tasks completed",
            "done by",
            "tasks",
            "what work was done",
        ];

        return keywords.some((keyword) =>
            message.content.text.toLowerCase().includes(keyword.toLowerCase())
        );
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback: HandlerCallback
    ): Promise<Content> => {
        const slackEvent = state["slackEvent"] as SlackEvent;
        const userId = extractMention(slackEvent.text);
        const filePath = getUpdatesDataPathForUser(userId);

        let statusText = "";
        if (fs.existsSync(filePath)) {
            statusText = fs.readFileSync(filePath, "utf-8").trim();
        }

        const callbackData: Content = {
            text: "",
            action: "UPDATE_SUMMARIZATION_RESPONSE",
            source: message.content.source,
            attachments: [],
        };

        const currentState = (await runtime.composeState(message)) as State;
        currentState.summary = statusText;;

        const statusContext = composeContext({
            state: currentState,
            template: summarizationTemplate,
        });

        const statusSummary = await generateText({
            runtime,
            context: statusContext,
            modelClass: ModelClass.SMALL,
        });

        callbackData.text = `\n\n${statusSummary}`;

        await callback(callbackData);
        return callbackData;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What work was done by @xyz today?"
                }
            },
            {
                user: "{{nova}}",
                content: {
                    text: "• Implemented user authentication with JWT.\n- Debugging token refresh mechanism."
                }
            }
        ],
        [
            {
                user: "{{user2}}",
                content: {
                    text: "List down the tasks done by @abc"
                }
            },
            {
                user: "{{nova}}",
                content: {
                    text: "• Working on database indexing for better performance.\n- Queries are still slow under heavy load."
                }
            }
        ],
        [
            {
                user: "{{user3}}",
                content: {
                    text: "What tasks are completed by @pqr?"
                }
            },
            {
                user: "{{nova}}",
                content: {
                    text: "• Migrated frontend to Next.js.\n- Encountered hydration issues on some pages. [Resolved]"
                }
            }
        ],
    ] as ActionExample[][],
} as Action;

export default getStatusUpdateHandler;
