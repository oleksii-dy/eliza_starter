import {
    composeContext,
    elizaLogger,
    generateObject,
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    Plugin,
    State,
    stringToUuid,
} from "@elizaos/core";
import { GitHubService } from "../services/github";
import { createIssueTemplate } from "../templates";
import {
    CreateIssueContent,
    CreateIssueSchema,
    isCreateIssueContent,
} from "../types";
import {
    getIssuesFromMemories,
    getFilesFromMemories,
    incorporateRepositoryState,
    saveIssueToMemory,
    saveIssuesToMemory,
} from "../utils";
import fs from "fs/promises";

export const createIssueAction: Action = {
    name: "CREATE_ISSUE",
    similes: ["CREATE_ISSUE", "GITHUB_CREATE_ISSUE", "OPEN_ISSUE"],
    description: "Creates a new issue in the GitHub repository",
    validate: async (runtime: IAgentRuntime) => {
        const token = !!runtime.getSetting("GITHUB_API_TOKEN");
        return token;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("[createIssue] Composing state for message:", message);

        if (!state) {
            state = (await runtime.composeState(message, {})) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const updatedState = await incorporateRepositoryState(
            state,
            runtime,
            message,
            [],
            true,
            true
        );
        // elizaLogger.info("State:", updatedState);

        const context = composeContext({
            state: updatedState,
            template: createIssueTemplate,
        });
        // elizaLogger.info("Context:", context);
        // write the context to a file for testing
        // await fs.writeFile("/tmp/plugin-github-create-issue-context.txt", context);

        const details = await generateObject({
            runtime,
            context,
            modelClass: ModelClass.SMALL,
            schema: CreateIssueSchema,
        });

        if (!isCreateIssueContent(details.object)) {
            elizaLogger.error("Invalid content:", details.object);
            throw new Error("Invalid content");
        }

        const content = details.object as CreateIssueContent;

        elizaLogger.info("Creating issue in the repository...");

        const githubService = new GitHubService({
            owner: content.owner,
            repo: content.repo,
            branch: runtime.getSetting("GITHUB_BRANCH"),
            auth: runtime.getSetting("GITHUB_API_TOKEN"),
        });

        try {
            const issuesMemories = await saveIssuesToMemory(
                runtime,
                content.owner,
                content.repo,
                runtime.getSetting("GITHUB_BRANCH"),
                runtime.getSetting("GITHUB_API_TOKEN")
            );
            // elizaLogger.log("Issues memories:", issuesMemories);
            await fs.writeFile(
                "/tmp/createIssue-issuesMemories.txt",
                JSON.stringify(issuesMemories, null, 2)
            );

            const issue = await githubService.createIssue(
                content.title,
                content.body,
                content.labels
            );

            elizaLogger.info(
                `Created issue successfully! Issue number: ${issue.number}`
            );

            const memory = await saveIssueToMemory(
                runtime,
                issue,
                content.owner,
                content.repo,
                runtime.getSetting("GITHUB_BRANCH")
            );
            if (callback) {
                await callback(memory.content);
            }
            return issue;
        } catch (error) {
            elizaLogger.error(
                `Error creating issue in repository ${content.owner}/${content.repo}:`,
                error
            );
            if (callback) {
                await callback(
                    {
                        text: `Error creating issue in repository ${content.owner}/${content.repo}. Please try again.`,
                    },
                    []
                );
            }
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Create an issue in repository user1/repo1 titled 'Bug: Application crashes on startup'",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Created issue #1 successfully!",
                    action: "CREATE_ISSUE",
                },
            },
        ],
    ],
};

export const githubCreateIssuePlugin: Plugin = {
    name: "githubCreateIssue",
    description: "Integration with GitHub for creating issues in repositories",
    actions: [createIssueAction],
    evaluators: [],
    providers: [],
};
