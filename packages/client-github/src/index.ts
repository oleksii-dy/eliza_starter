import {
    elizaLogger,
    Client,
    IAgentRuntime,
    Character,
    ModelClass,
    composeContext,
    Memory,
    Content,
    HandlerCallback,
    UUID,
    generateObject,
    stringToUuid,
    State,
} from "@elizaos/core";
import { validateGithubConfig } from "./environment";
import { EventEmitter } from "events";
import {
    addCommentToIssueAction,
    closeIssueAction,
    closePRAction,
    createCommitAction,
    createIssueAction,
    createMemoriesFromFilesAction,
    createPullRequestAction,
    getFilesFromMemories,
    getIssuesFromMemories,
    getPullRequestsFromMemories,
    ideationAction,
    incorporateRepositoryState,
    initializeRepositoryAction,
    modifyIssueAction,
    reactToIssueAction,
    reactToPRAction,
    saveIssuesToMemory,
    savePullRequestsToMemory,
} from "@elizaos/plugin-github";
import { isOODAContent, OODAContent, OODASchema } from "./types";
import { oodaTemplate } from "./templates";
import fs from "fs/promises";
import { configGithubInfoAction } from "./actions/configGithubInfo";
import {
    participateToRoom,
    registerActions,
    sleep,
    unregisterActions,
} from "./utils";

export class GitHubClient extends EventEmitter {
    apiToken: string;
    runtime: IAgentRuntime;
    character: Character;
    state: State | null;
    roomId: UUID;
    stopped: boolean;

    constructor(runtime: IAgentRuntime) {
        super();

        this.apiToken = runtime.getSetting("GITHUB_API_TOKEN") as string;

        this.runtime = runtime;
        this.character = runtime.character;
        this.state = null;
        this.roomId = stringToUuid(`default-room-${this.runtime.agentId}`);
        this.stopped = false;

        this.start();
    }

    private async start() {
        elizaLogger.log("Starting GitHub client...");

        // wait for 1 second
        await sleep(1000);

        await participateToRoom(this.runtime, this.roomId);

        const githubInfoDiscoveryActions = [configGithubInfoAction];

        // register action
        registerActions(this.runtime, githubInfoDiscoveryActions);

        const githubInfoDiscoveryInterval =
            Number(
                this.runtime.getSetting("GITHUB_INFO_DISCOVERY_INTERVAL_MS")
            ) || 1000; // Default to 1 second

        // github info discovery loop
        while (true) {
            if (this.stopped) {
                unregisterActions(this.runtime, githubInfoDiscoveryActions);
                elizaLogger.log("GitHubClient stopped successfully.");
                return;
            }

            elizaLogger.log("Processing Github info discovery cycle...");

            const memories = await this.runtime.messageManager.getMemories({
                roomId: this.roomId,
            });

            // if memories is empty skip the cycle
            if (memories.length === 0) {
                elizaLogger.log(
                    "No memories found, skip to the next github info discovery cycle."
                );
                await sleep(githubInfoDiscoveryInterval);
                continue;
            }

            // get the last memory
            const message = memories[0];

            if (!this.state) {
                this.state = (await this.runtime.composeState(
                    message
                )) as State;
            } else {
                this.state = await this.runtime.updateRecentMessageState(
                    this.state
                );
            }

            const context = composeContext({
                state: this.state,
                template: oodaTemplate,
            });

            const details = await generateObject({
                runtime: this.runtime,
                context,
                modelClass: ModelClass.SMALL,
                schema: OODASchema,
            });

            if (!isOODAContent(details.object)) {
                elizaLogger.error("Invalid content:", details.object);
                throw new Error("Invalid content");
            }

            const content = details.object as OODAContent;

            await fs.writeFile(
                "/tmp/client-github-content.txt",
                JSON.stringify(content, null, 2)
            );

            // if content has the owner, repo and branch fields set, then we can stop the github info discovery cycle
            if (content.owner && content.repo && content.branch) {
                elizaLogger.log(
                    `Repository configuration complete for ${content.owner}/${content.repo} on ${content.branch} branch`
                );

                this.state.owner = content.owner;
                this.state.repo = content.repo;
                this.state.branch = content.branch;

                // stop the github info discovery loop
                break;
            }

            await sleep(githubInfoDiscoveryInterval);
        }

        // sleep for 5 seconds
        await sleep(5000);

        // unregister action
        unregisterActions(this.runtime, githubInfoDiscoveryActions);

        const repoInitActions = [
            initializeRepositoryAction,
            createMemoriesFromFilesAction,
        ];

        // register the initial actions
        registerActions(this.runtime, repoInitActions);

        // set the timestamp and userIdUUID
        const timestamp = Date.now();
        const userIdUUID = stringToUuid(`${this.runtime.agentId}-${timestamp}`);

        // create memories for initial actions
        const initializeRepositoryMemory: Memory = {
            id: stringToUuid(
                `${this.roomId}-${this.runtime.agentId}-${timestamp}-initialize-repository`
            ),
            userId: userIdUUID,
            agentId: this.runtime.agentId,
            content: {
                text: `Initialize the repository ${this.state.owner}/${this.state.repo} on ${this.state.branch} branch`,
                action: "INITIALIZE_REPOSITORY",
                source: "github",
                inReplyTo: stringToUuid(
                    `${this.roomId}-${this.runtime.agentId}`
                ),
            },
            roomId: this.roomId,
            createdAt: timestamp,
        };
        await this.runtime.messageManager.createMemory(
            initializeRepositoryMemory
        );

        const createMemoriesFromFilesMemory = {
            id: stringToUuid(
                `${this.roomId}-${this.runtime.agentId}-${timestamp}-create-memories-from-files`
            ),
            userId: userIdUUID,
            agentId: this.runtime.agentId,
            content: {
                text: `Create memories from files for the repository ${this.state.owner}/${this.state.repo} @ branch ${this.state.branch} and path '/packages/plugin-coinbase/src'`,
                action: "CREATE_MEMORIES_FROM_FILES",
                source: "github",
                inReplyTo: stringToUuid(
                    `${this.roomId}-${this.runtime.agentId}`
                ),
            },
            roomId: this.roomId,
            createdAt: timestamp,
        };
        await this.runtime.messageManager.createMemory(
            createMemoriesFromFilesMemory
        );

        // retrieve memories
        const memories = await this.runtime.messageManager.getMemories({
            roomId: this.roomId,
        });

        // if memories is empty throw an error
        if (memories.length === 0) {
            elizaLogger.error(
                "No memories found, repo init loop cannot continue."
            );
            throw new Error(
                "No memories found, repo init loop cannot continue."
            );
        }

        // retrieve last message
        const message = memories[0];

        const issuesLimit =
            Number(this.runtime.getSetting("GITHUB_ISSUES_LIMIT")) || 10;
        const pullRequestsLimit =
            Number(this.runtime.getSetting("GITHUB_PULL_REQUESTS_LIMIT")) || 10;

        // save issues and pull requests to memory
        await saveIssuesToMemory(
            this.runtime,
            message,
            this.state.owner as string,
            this.state.repo as string,
            this.state.branch as string,
            this.apiToken,
            issuesLimit
        );
        await savePullRequestsToMemory(
            this.runtime,
            message,
            this.state.owner as string,
            this.state.repo as string,
            this.state.branch as string,
            this.apiToken,
            pullRequestsLimit
        );

        await this.runtime.processActions(
            message,
            [initializeRepositoryMemory, createMemoriesFromFilesMemory],
            this.state,
            undefined
        );

        const githubRepoInitInterval =
            Number(this.runtime.getSetting("GITHUB_REPO_INIT_INTERVAL_MS")) ||
            5000; // Default to 5 second

        await sleep(githubRepoInitInterval);

        // repo init loop
        while (true) {
            if (this.stopped) {
                unregisterActions(this.runtime, repoInitActions);
                elizaLogger.log("GitHubClient stopped successfully.");
                return;
            }

            elizaLogger.log("Processing repo init cycle...");

            // retrieve memories
            const memories = await this.runtime.messageManager.getMemories({
                roomId: this.roomId,
            });

            await fs.writeFile(
                "/tmp/client-github-memories.txt",
                JSON.stringify(memories, null, 2)
            );

            // if memories is empty skip to the next repo init cycle
            if (memories.length === 0) {
                elizaLogger.log(
                    "No memories found, skipping to the next repo init cycle."
                );
                await sleep(githubRepoInitInterval);
                continue;
            }

            // retrieve last message
            const message = memories[0];

            // retrieve files from memories
            const files = await getFilesFromMemories(this.runtime, message);

            if (files.length === 0) {
                elizaLogger.log(
                    "No files found, skipping to the next repo init cycle."
                );
                await sleep(githubRepoInitInterval);
                continue;
            }

            // if files are found, set files, issues and PRs to state and stop the repo init loop
            this.state.files = files;

            const previousIssues = await getIssuesFromMemories(
                this.runtime,
                message,
                this.state.owner as string,
                this.state.repo as string,
                this.state.branch as string
            );
            this.state.previousIssues = JSON.stringify(
                previousIssues.map((issue) => ({
                    title: issue.content.text,
                    body: (issue.content.metadata as any).body,
                    url: (issue.content.metadata as any).url,
                    number: (issue.content.metadata as any).number,
                    state: (issue.content.metadata as any).state,
                })),
                null,
                2
            );

            const previousPRs = await getPullRequestsFromMemories(
                this.runtime,
                message,
                this.state.owner as string,
                this.state.repo as string,
                this.state.branch as string
            );
            this.state.previousPRs = JSON.stringify(
                previousPRs.map((pr) => ({
                    title: pr.content.text,
                    body: (pr.content.metadata as any).body,
                    url: (pr.content.metadata as any).url,
                    number: (pr.content.metadata as any).number,
                    state: (pr.content.metadata as any).state,
                    diff: (pr.content.metadata as any).diff,
                    comments: (pr.content.metadata as any).comments,
                })),
                null,
                2
            );

            break;
        }

        await sleep(githubRepoInitInterval);

        // unregister actions
        unregisterActions(this.runtime, repoInitActions);

        const oodaActions = [
            addCommentToIssueAction,
            closeIssueAction,
            closePRAction,
            createCommitAction,
            createIssueAction,
            createPullRequestAction,
            ideationAction,
            modifyIssueAction,
            reactToIssueAction,
            reactToPRAction,
        ];

        // register actions
        registerActions(this.runtime, oodaActions);

        const githubOodaInterval =
            Number(this.runtime.getSetting("GITHUB_OODA_INTERVAL_MS")) || 60000; // Default to 1 minute

        // ooda loop
        while (true) {
            if (this.stopped) {
                unregisterActions(this.runtime, oodaActions);
                elizaLogger.log("GitHubClient stopped successfully.");
                return;
            }

            elizaLogger.log("Processing OODA cycle...");

            // retrieve memories
            const memories = await this.runtime.messageManager.getMemories({
                roomId: this.roomId,
            });

            // if memories is empty skip to the next ooda cycle
            if (memories.length === 0) {
                elizaLogger.log(
                    "No memories found, skipping to the next OODA cycle."
                );
                await sleep(githubOodaInterval);
                continue;
            }

            // get the last memory
            const message = memories[0];

            if (!this.state) {
                this.state = (await this.runtime.composeState(
                    message
                )) as State;
            } else {
                this.state = await this.runtime.updateRecentMessageState(
                    this.state
                );
            }

            let context = composeContext({
                state: this.state,
                template: oodaTemplate,
            });

            await fs.writeFile("/tmp/client-github-context.txt", context);

            const details = await generateObject({
                runtime: this.runtime,
                context,
                modelClass: ModelClass.SMALL,
                schema: OODASchema,
            });

            if (!isOODAContent(details.object)) {
                elizaLogger.error("Invalid content:", details.object);
                throw new Error("Invalid content");
            }

            let content = details.object as OODAContent;

            await fs.writeFile(
                "/tmp/client-github-content.txt",
                JSON.stringify(content, null, 2)
            );

            if (content.action === "NOTHING") {
                elizaLogger.log(
                    "Skipping to the next OODA cycle as action is NOTHING"
                );
                await sleep(githubOodaInterval);
                continue;
            }

            // create new memory with retry logic

            // Generate IDs with timestamp to ensure uniqueness
            const timestamp = Date.now();
            const userIdUUID = stringToUuid(
                `${this.runtime.agentId}-${timestamp}`
            );
            const memoryUUID = stringToUuid(
                `${this.roomId}-${this.runtime.agentId}-${timestamp}`
            );

            const actionMemory: Memory = {
                id: memoryUUID,
                userId: userIdUUID,
                agentId: this.runtime.agentId,
                content: {
                    text: content.action,
                    action: content.action,
                    source: "github",
                    inReplyTo: stringToUuid(
                        `${this.roomId}-${this.runtime.agentId}`
                    ),
                },
                roomId: this.roomId,
                createdAt: timestamp,
            };

            try {
                await this.runtime.messageManager.createMemory(actionMemory);
            } catch (error) {
                if (error.code === "23505") {
                    // Duplicate key error
                    elizaLogger.warn("Duplicate memory, skipping:", {
                        memoryId: memoryUUID,
                    });
                    return;
                }
                elizaLogger.error("Error creating memory:", error);
                throw error; // Re-throw other errors
            }

            const callback: HandlerCallback = async (
                content: Content,
                files: any[]
            ) => {
                elizaLogger.log("Callback called with content:", content);
                return [];
            };

            // process the actions with the new memory and state
            elizaLogger.log("Processing actions for action:", content.action);
            await this.runtime.processActions(
                message,
                [actionMemory],
                this.state,
                callback
            );

            elizaLogger.log("OODA cycle completed.");

            await sleep(githubOodaInterval);
        }
    }

    stop() {
        try {
            // set stopped to true
            this.stopped = true;
        } catch (e) {
            elizaLogger.error("GitHubClient stop error:", e);
        }
    }
}

export const GitHubClientInterface: Client = {
    start: async (runtime: IAgentRuntime) => {
        await validateGithubConfig(runtime);
        elizaLogger.log(
            "Starting GitHub client with agent ID:",
            runtime.agentId
        );

        const client = new GitHubClient(runtime);
        return client;
    },
    stop: async (runtime: IAgentRuntime) => {
        try {
            elizaLogger.log("Stopping GitHub client");
            await runtime.clients.github.stop();
        } catch (e) {
            elizaLogger.error("GitHub client stop error:", e);
        }
    },
};

export default GitHubClientInterface;
