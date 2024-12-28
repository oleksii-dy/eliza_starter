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
} from "../utils";
import { RestEndpointMethodTypes } from "@octokit/rest";

export async function saveIssueToMemory(
    runtime: IAgentRuntime,
    issue: RestEndpointMethodTypes["issues"]["create"]["response"]["data"],
    owner: string,
    repo: string,
    branch: string
): Promise<void> {
    const roomId = stringToUuid(`github-${owner}-${repo}-${branch}`);
    const issueId = stringToUuid(
        `${roomId}-${runtime.agentId}-issue-${issue.number}`
    );
    const issueMemory: Memory = {
        id: issueId,
        userId: runtime.agentId,
        agentId: runtime.agentId,
        roomId: roomId,
        content: {
            text: `Issue Created: ${issue.title}`,
            action: "CREATE_ISSUE",
            source: "github",
            metadata: {
                type: "issue",
                url: issue.html_url,
                number: issue.number,
                state: issue.state,
                created_at: issue.created_at,
                updated_at: issue.updated_at,
                comments: issue.comments,
                labels: issue.labels.map((label: any) =>
                    typeof label === "string" ? label : label?.name
                ),
                body: issue.body,
            },
        },
    };
    elizaLogger.log("[createIssue] Issue memory:", issueMemory);

    await runtime.messageManager.createMemory(issueMemory);
}

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
            false
        );
        elizaLogger.info("State:", updatedState);

        const context = composeContext({
            state: updatedState,
            template: createIssueTemplate,
        });
        elizaLogger.info("Context:", context);

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
            branch: content.branch,
            auth: runtime.getSetting("GITHUB_API_TOKEN"),
        });

        try {
            const issue = await githubService.createIssue(
                content.title,
                content.body,
                content.labels
            );

            elizaLogger.info(
                `Created issue successfully! Issue number: ${issue.number}`
            );

            await saveIssueToMemory(
                runtime,
                issue,
                content.owner,
                content.repo,
                content.branch
            );
            if (callback) {
                await callback({
                    text: `Created issue #${issue.number} successfully see: ${issue.html_url}`,
                    attachments: [],
                });
            }
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
