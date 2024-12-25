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
} from "@elizaos/core";
import { GitHubService } from "../services/github";
import {
    AddCommentToPRContent,
    AddCommentToPRSchema,
    isAddCommentToPRContent,
} from "../types";
import { addCommentToPRTemplate } from "../templates";
import { incorporateRepositoryState } from "../utils";

export const addCommentToPRAction: Action = {
    name: "ADD_COMMENT_TO_PR",
    similes: [
        "ADD_COMMENT_TO_PR",
        "COMMENT_ON_PR",
        "POST_COMMENT_PR",
        "ADD_COMMENT_PR",
    ],
    description: "Adds a comment to an existing pull request in the GitHub repository",
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
        elizaLogger.log("[addCommentToPR] Composing state for message:", message);
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }
        const updatedState = await incorporateRepositoryState(state, runtime, message, []);
        elizaLogger.info("State:", updatedState);

        const context = composeContext({
            state: updatedState,
            template: addCommentToPRTemplate,
        });

        const details = await generateObject({
            runtime,
            context,
            modelClass: ModelClass.LARGE,
            schema: AddCommentToPRSchema,
        });

        if (!isAddCommentToPRContent(details.object)) {
            elizaLogger.error("Invalid content:", details.object);
            throw new Error("Invalid content");
        }

        const content = details.object as AddCommentToPRContent;

        elizaLogger.info("Adding comment to pull request in the repository...");

        const githubService = new GitHubService({
            owner: content.owner,
            repo: content.repo,
            auth: runtime.getSetting("GITHUB_API_TOKEN"),
        });

        try {
            const comment = await githubService.addPRComment(
                content.pullRequest,
                content.comment
            );

            elizaLogger.info(
                `Added comment to pull request #${content.pullRequest} successfully!`
            );
            if (callback) {
                callback({
                    text: `Added comment to pull request #${content.pullRequest} successfully! See comment at ${comment.html_url}`,
                    attachments: [],
                });
            }
        } catch (error) {
            elizaLogger.error(
                `Error adding comment to pull request #${content.pullRequest} in repository ${content.owner}/${content.repo}:`,
                error
            );
            if (callback) {
                callback(
                    {
                        text: `Error adding comment to pull request #${content.pullRequest}. Please try again.`,
                    },
                    []
                );
            }
        }
    },
    examples: [
        [
            {
                user: "{{user}}",
                content: {
                    text: "Add a comment to pull request #1 in repository user1/repo1: 'This is fixed in the latest release'",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Added comment to pull request #1 successfully!",
                    action: "ADD_COMMENT_PR",
                },
            },
        ],
        [
            {
                user: "{{user}}",
                content: {
                    text: "Add a comment to pull request #2 in repository user2/repo2: 'Please review the changes'",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Added comment to pull request #2 successfully!",
                    action: "ADD_COMMENT_PR",
                },
            },
        ],
        [
            {
                user: "{{user}}",
                content: {
                    text: "Add a comment to pull request #3 in repository user3/repo3: 'Great work on this feature!'",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Added comment to pull request #3 successfully!",
                    action: "ADD_COMMENT_PR",
                },
            },
        ],
        [
            {
                user: "{{user}}",
                content: {
                    text: "Add a comment to pull request #4 in repository user4/repo4: 'Can you add more tests?'",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Added comment to pull request #4 successfully!",
                    action: "ADD_COMMENT_PR",
                },
            },
        ],
        [
            {
                user: "{{user}}",
                content: {
                    text: "Add a comment to pull request #5 in repository user5/repo5: 'This needs some refactoring'",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Added comment to pull request #5 successfully!",
                    action: "ADD_COMMENT_PR",
                },
            },
        ],
    ],
};

export const githubAddCommentToPRPlugin: Plugin = {
    name: "githubAddCommentToPR",
    description: "Integration with GitHub for adding comments to pull requests",
    actions: [addCommentToPRAction],
    evaluators: [],
    providers: [],
};
