import fs from "fs";
import path from "path";

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

import { getUpdatesDataPathForUser, SlackEvent } from "../utils/slack-utils";

export const summarizationTemplate = `Summarize progress updates from developers and professionals into a structured format, integrating both the new update and the existing summary to maintain continuity.

## Input Message:
{{user_message}}

## Existing Summary:
{{existing_summary}}

## Instructions:
Merge and Categorize Updates:
- Use the **existing summary** as the base and **integrate the new update** meaningfully.
- Retain continuity if the new update builds on an ongoing task.
- If a new task appears, introduce it as a separate section.

### Standardized Output Format:
- For each task, use the actual task name as the section heading.
  - DONE: Summarize completed work.
  - BLOCKERS FACED: Identify ongoing issues or blockers.
    - Mark as [RESOLVED] if fixed in "DONE".
    - Mark as [UNRESOLVED] if still pending.
  - IN PROGRESS: Ongoing work that isn't yet complete.
  - REMAINING: Summarize next steps from "NEXT" or other relevant entries.
    - If "NEXT" introduces a **new, unrelated** task, start a separate section.

### **Merging Logic:**
- **Update Existing Tasks:** If the new update continues an existing task, merge it seamlessly.
- **Track Progress:** Move items from "REMAINING" to "DONE" if completed.
- **Resolve Blockers:** If a blocker from the existing summary is resolved, move it to "DONE."
- **Add Missing Details:** If the new update introduces additional context to an existing task, incorporate it.

### **Formatting Guidelines:**
- Structure responses using '-' for points and indentation for sub-points. Avoid Markdown headers, bold, or special formatting.
- Mark a task as **[DONE]** only if **nothing meaningful remains** in "REMAINING."
- If a section has no content, exclude it.
- Keep summaries concise while preserving key technical details.
- **Do not infer missing details**—only summarize explicitly provided updates.

Ensure the final output reflects a **logically updated** and **comprehensive** summary that maintains task progression.
`;

const summarizeAction = {
    name: "SUMMARIZE_UPDATE",
    description: "Extracts key points from a status update.",
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
            "Update",
            "status update"
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
        const userId = slackEvent.user;

        const callbackData: Content = {
            text: "",
            action: "SUMMARIZATION_RESPONSE",
            source: message.content.source,
            attachments: [],
        };

        const filePath = getUpdatesDataPathForUser(userId);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });

        let existingSummary = "";
        if (fs.existsSync(filePath)) {
            existingSummary = fs.readFileSync(filePath, "utf8").trim();
        }

        const currentState = (await runtime.composeState(message)) as State;
        currentState.user_message = message.content.text;
        currentState.existing_summary = existingSummary;

        const statusContext = composeContext({
            state: currentState,
            template: summarizationTemplate,
        });

        const statusSummary = await generateText({
            runtime,
            context: statusContext,
            modelClass: ModelClass.SMALL,
        });

        if (statusSummary) {
            const updatedSummary = `\n\n${statusSummary}`.trim();
            fs.writeFileSync(filePath, updatedSummary, "utf8");
            console.log(`Summary updated for user ${userId} in ${filePath}`);

            return callbackData;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "DONE:\nRefactored the database query logic to improve performance. Optimized indexing and reduced redundant queries, leading to a 40% reduction in query execution time.\nIN PROGRESS:\nFacing an issue where some queries still take longer than expected under high load. Investigating whether the bottleneck is due to inefficient joins or missing indexes.\nNEXT:\nPlan to analyze slow query logs and experiment with alternative indexing strategies to further optimize performance.\nDONE: Identified and resolved the bottleneck causing slow queries under high load. Optimized query joins and added missing indexes, resulting in significantly improved performance. Query execution times are now consistently within the expected range, even under peak traffic.\nNEXT:\nImplement rate limiting for API\nDONE:\nImplemented API rate limiting to prevent abuse and ensure fair usage.\nAdded middleware to track request counts per user and return a 429 error when limits are exceeded.\nNEXT:\nNeed to monitor real-world traffic to fine-tune the rate limits.\nPlanning to analyze logs and adjust thresholds based on actual user behavior.\nIN PROGRESS:\nWhile monitoring traffic, noticed that some legitimate users are hitting the rate limit due to batch processing requests.\nInvestigating ways to differentiate between normal and abusive usage patterns.\nNEXT:\nExploring an adaptive rate limiting approach where users with verified accounts get slightly higher limits.\nAlso considering adding an exemption for batch processing endpoints with stricter authentication.\nDONE:\nUpdated rate limiting logic to apply different thresholds based on user verification status.\nVerified users now have a higher request quota, and batch endpoints require OAuth tokens to access elevated limits.\nTesting confirms fewer false rate-limit triggers.\nNEXT:\nMoving on to improving API logging.\nNeed to enhance log visibility for failed authentication attempts to detect potential security threats."
                }
            },
            {
                user: "{{nova}}",
                content: {
                    text: "Refactor database query logic [DONE]:\n  - DONE:\n    - Refactored the database query logic to improve performance. Optimized indexing and reduced redundant queries, leading to a 40% reduction in query execution time.\n    - Identified and resolved the bottleneck causing slow queries under high load. Optimized query joins and added missing indexes, resulting in significantly improved performance.\n  - BLOCKERS FACED:\n    - Some queries still took longer than expected under high load. Investigation revealed bottlenecks due to inefficient joins and missing indexes. [RESOLVED]\n\nImplemented API rate limiting:\n  - DONE:\n    - Implemented API rate limiting to prevent abuse and ensure fair usage.\n    - Added middleware to track request counts per user and return a 429 error when limits are exceeded.\n    - Updated rate limiting logic to apply different thresholds based on user verification status.\n    - Verified users now have a higher request quota, and batch endpoints require OAuth tokens to access elevated limits.\n    - Testing confirms fewer false rate-limit triggers.\n  - BLOCKERS FACED:\n    - Some legitimate users hit the rate limit due to batch processing requests. Investigating ways to differentiate between normal and abusive usage patterns. [RESOLVED]\n  - REMAINING:\n    - Need to enhance log visibility for failed authentication attempts to detect potential security threats."
                }
            }
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "DONE:\nAdded multi-factor authentication (MFA) for user logins to enhance security.\nIN PROGRESS:\nSome users are experiencing issues receiving OTP codes via email. Investigating whether this is due to email provider throttling.\nNEXT:\nPlan to implement backup authentication methods such as security questions or authenticator apps.\nDONE:\nResolved OTP delivery issues by switching to a more reliable email provider and adding an SMS fallback.\nNEXT:\nConducting security audits to ensure MFA implementation meets compliance standards.\nDONE:\nCompleted security audit and fixed minor vulnerabilities found in authentication flow.\nNEXT:\nMoving on to optimizing session management."
                }
            },
            {
                user: "{{nova}}",
                content: {
                    text: "Enhance Authentication Security [DONE]:\n  - DONE:\n    - Added multi-factor authentication (MFA) for user logins to enhance security.\n    - Resolved OTP delivery issues by switching to a more reliable email provider and adding an SMS fallback.\n    - Completed security audit and fixed minor vulnerabilities found in authentication flow.\n  - BLOCKERS FACED:\n    - Some users experienced issues receiving OTP codes via email. Investigation revealed email provider throttling. [RESOLVED]\n  - REMAINING:\n    - Moving on to optimizing session management."
                }
            }
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "DONE:\nImplemented caching to reduce API response times by 50%.\nIN PROGRESS:\nSome endpoints are not benefiting from caching as expected. Investigating whether the issue is due to cache invalidation logic.\nNEXT:\nPlan to refine cache invalidation rules to ensure stale data is refreshed efficiently.\nDONE:\nOptimized cache invalidation logic, resolving previous inconsistencies.\nNEXT:\nPlanning to load-test the API to verify improvements in real-world scenarios.\nIN PROGRESS:\nLoad testing revealed some memory leaks under heavy traffic. Investigating the root cause.\nNEXT:\nLooking into memory profiling tools to diagnose and fix leaks.\nDONE:\nIdentified and fixed memory leaks by optimizing garbage collection settings.\nNEXT:\nTransitioning focus to API documentation improvements."
                }
            },
            {
                user: "{{nova}}",
                content: {
                    text: "Improve API Performance [DONE]:\n  - DONE:\n    - Implemented caching to reduce API response times by 50%.\n    - Optimized cache invalidation logic, resolving previous inconsistencies.\n    - Identified and fixed memory leaks by optimizing garbage collection settings.\n  - BLOCKERS FACED:\n    - Some endpoints did not benefit from caching as expected. Investigation revealed issues in cache invalidation logic. [RESOLVED]\n    - Load testing revealed memory leaks under heavy traffic. Diagnosis and fixes applied. [RESOLVED]\n  - REMAINING:\n    - Transitioning focus to API documentation improvements."
                }
            }
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "DONE:\nSet up the new PostgreSQL database and migrated initial schema from MySQL.\nIN PROGRESS:\nData migration is taking longer than expected due to differences in indexing strategies.\nInvestigating ways to optimize migration scripts for better performance.\nNEXT:\nTest data integrity after migration and ensure all foreign key constraints are correctly maintained.\nDONE:\nOptimized migration scripts and completed full data migration successfully.\nNEXT:\nPlan to monitor database performance in production and fine-tune configurations if necessary.\nIN PROGRESS:\nNoticed higher-than-expected query latencies in production.\nAnalyzing slow query logs to determine if indexing needs further adjustments.\nNEXT:\nExperimenting with additional indexes to optimize read-heavy queries.\nDONE:\nApplied indexing improvements and confirmed a 30% reduction in query execution time.\nNEXT:\nMoving on to database backup automation."
                }
            },
            {
                user: "{{nova}}",
                content: {
                    text: "Migrate to PostgreSQL Database [DONE]:\n  - DONE:\n    - Set up the new PostgreSQL database and migrated initial schema from MySQL.\n    - Optimized migration scripts and completed full data migration successfully.\n    - Applied indexing improvements and confirmed a 30% reduction in query execution time.\n  - BLOCKERS FACED:\n    - Data migration was slower than expected due to differences in indexing strategies. Optimization resolved the issue. [RESOLVED]\n    - Query latencies in production were higher than expected. Analysis and indexing improvements fixed this. [RESOLVED]\n  - REMAINING:\n    - Moving on to database backup automation."
                }
            }
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "DONE:\nRedesigned the dashboard UI with a more modern and responsive layout.\nIN PROGRESS:\nSome components are not rendering correctly in older browsers. Debugging layout inconsistencies.\nNEXT:\nEnsure compatibility with all supported browsers and conduct UI testing.\nDONE:\nFixed cross-browser compatibility issues and improved CSS rendering consistency.\nNEXT:\nCollect user feedback on the new UI and make iterative improvements based on usability tests.\nIN PROGRESS:\nUsers reported that the dark mode theme has some contrast issues.\nExperimenting with different color palettes to improve readability.\nNEXT:\nFinalize dark mode improvements and apply changes to all relevant screens.\nDONE:\nRefined dark mode color scheme for better readability and accessibility.\nNEXT:\nMoving on to improving mobile responsiveness."
                }
            },
            {
                user: "{{nova}}",
                content: {
                    text: "Revamp UI Design [DONE]:\n  - DONE:\n    - Redesigned the dashboard UI with a more modern and responsive layout.\n    - Fixed cross-browser compatibility issues and improved CSS rendering consistency.\n    - Refined dark mode color scheme for better readability and accessibility.\n  - BLOCKERS FACED:\n    - Some components did not render correctly in older browsers. Debugging and fixes resolved the issue. [RESOLVED]\n    - Users reported contrast issues in dark mode. Adjustments improved readability. [RESOLVED]\n  - REMAINING:\n    - Moving on to improving mobile responsiveness."
                }
            }
        ],
    ] as ActionExample[][],
} as Action;

export default summarizeAction;
