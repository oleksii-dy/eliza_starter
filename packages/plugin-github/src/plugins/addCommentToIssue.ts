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
    AddCommentToIssueContent,
    AddCommentToIssueSchema,
    GenerateCommentForASpecificPRSchema,
    isAddCommentToIssueContent,
    isGenerateCommentForASpecificPRSchema,
} from "../types";
import { addCommentToIssueTemplate, generateCommentForASpecificIssueTemplate } from "../templates";
import { getIssueFromMemories, incorporateRepositoryState } from "../utils";

export const addCommentToIssueAction: Action = {
    name: "ADD_COMMENT_TO_ISSUE",
    similes: [
        "ADD_COMMENT_TO_ISSUE",
        "COMMENT_ON_ISSUE",
        "POST_COMMENT",
        "ADD_COMMENT",
    ],
    description: "Adds a comment to an existing issue in the GitHub repository",
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
        elizaLogger.log("[addCommentToIssue] Composing state for message:", message);
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }
        const updatedState = await incorporateRepositoryState(state, runtime, message, []);
        elizaLogger.info("State:", updatedState);

        const context = composeContext({
            state: updatedState,
            template: addCommentToIssueTemplate,
        });

        const details = await generateObject({
            runtime,
            context,
            modelClass: ModelClass.LARGE,
            schema: AddCommentToIssueSchema,
        });

        if (!isAddCommentToIssueContent(details.object)) {
            elizaLogger.error("Invalid content:", details.object);
            throw new Error("Invalid content");
        }

        const content = details.object as AddCommentToIssueContent;

        const githubService = new GitHubService({
            owner: content.owner,
            repo: content.repo,
            auth: runtime.getSetting("GITHUB_API_TOKEN"),
        });
        let issue = await getIssueFromMemories(runtime, message, content.issue);
        if (!issue) {
            elizaLogger.error("Issue not found in memories");

            let issueData = await githubService.getIssue(content.issue);
            const issueDetails = {
                type: "issue",
                url: issueData.html_url,
                number: issueData.number,
                state: issueData.state,
                created_at: issueData.created_at,
                updated_at: issueData.updated_at,
                comments: await githubService.getIssueCommentsText(issueData.comments_url),
                labels: issueData.labels.map((label: any) => (typeof label === 'string' ? label : label?.name)),
                body: issueData.body,
            }
            updatedState.specificIssue = JSON.stringify(issueDetails);
        } else {
            updatedState.specificIssue = JSON.stringify(issue.content);
        }
        const commentContext = composeContext({
            state: updatedState,
            template: generateCommentForASpecificIssueTemplate,
        });

        const commentDetails = await generateObject({
            runtime,
            context: commentContext,
            modelClass: ModelClass.LARGE,
            schema: GenerateCommentForASpecificPRSchema,
        });

        if (!isGenerateCommentForASpecificPRSchema(commentDetails.object)) {
            elizaLogger.error("Invalid comment content:", commentDetails.object);
            throw new Error("Invalid comment content");
        }

        const commentBody = commentDetails.object.comment;

        elizaLogger.info("Adding comment to issue in the repository...", {
            issue,
            commentBody,
        });

        try {
            const comment = await githubService.addIssueComment(
                content.issue,
                commentBody
            );

            elizaLogger.info(
                `Added comment to issue #${content.issue} successfully! See comment at ${comment.html_url}`
            );
            if (callback) {
                callback({
                    text: `Added comment to issue #${content.issue} successfully! See comment at ${comment.html_url}`,
                    attachments: [],
                });
            }
        } catch (error) {
            elizaLogger.error(
                `Error adding comment to issue #${content.issue} in repository ${content.owner}/${content.repo}:`,
                error
            );
            if (callback) {
                callback(
                    {
                        text: `Error adding comment to issue #${content.issue}. Please try again.`,
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
                    text: "Add a comment to issue #1 in repository user1/repo1: 'This is fixed in the latest release'",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Added comment to issue #1 successfully! See comment at https://github.com/user1/repo1/issues/1#issuecomment-1234567890",
                    action: "ADD_COMMENT",
                },
            },
        ],
    ],
};

export const githubAddCommentToIssuePlugin: Plugin = {
    name: "githubAddCommentToIssue",
    description: "Integration with GitHub for adding comments to issues",
    actions: [addCommentToIssueAction],
    evaluators: [],
    providers: [],
};
