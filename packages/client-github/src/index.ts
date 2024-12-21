import { elizaLogger, Client, IAgentRuntime, Character, generateShouldRespond, ModelClass, composeContext, State, Memory, generateMessageResponse, getEmbeddingZeroVector, Content, HandlerCallback, UUID, generateObjectV2, stringToUuid, GoalStatus } from "@ai16z/eliza";
import { validateGithubConfig } from "./environment";
import { EventEmitter } from "events";
import {
    initializeRepositoryAction,
    createCommitAction,
    createMemoriesFromFilesAction,
    createPullRequestAction,
    createIssueAction,
    modifyIssueAction,
    addCommentToIssueAction,
    sourceCodeProvider,
    testFilesProvider,
    workflowFilesProvider,
    documentationFilesProvider,
    releasesProvider,
    getFilesFromMemories
} from "@ai16z/plugin-github";
import { isOODAContent, OODAContent, OODASchema } from "./types";
import { oodaTemplate } from "./templates";
import { getIssuesFromMemories, getPullRequestsFromMemories } from "./utils"; // Import the utility functions

export class GitHubClient extends EventEmitter {
    apiToken: string;
    runtime: IAgentRuntime;
    character: Character;

    constructor(runtime: IAgentRuntime) {
        super();

        this.apiToken = runtime.getSetting("GITHUB_API_TOKEN") as string;

        this.runtime = runtime;
        this.character = runtime.character;

        this.runtime.registerAction(initializeRepositoryAction);
        this.runtime.registerAction(createCommitAction);
        this.runtime.registerAction(createMemoriesFromFilesAction);
        this.runtime.registerAction(createPullRequestAction);
        this.runtime.registerAction(createIssueAction);
        this.runtime.registerAction(modifyIssueAction);
        this.runtime.registerAction(addCommentToIssueAction);

        // this.runtime.providers.push(sourceCodeProvider);
        // this.runtime.providers.push(testFilesProvider);
        // this.runtime.providers.push(workflowFilesProvider);
        // this.runtime.providers.push(documentationFilesProvider);
        // this.runtime.providers.push(releasesProvider);

        elizaLogger.log("GitHubClient actions and providers registered.");

        // Start the OODA loop after initialization
        this.startOodaLoop();
    }

    async stop() {
        try {
            elizaLogger.log("GitHubClient stopped successfully.");
        } catch (e) {
            elizaLogger.error("GitHubClient stop error:", e);
        }
    }

    private startOodaLoop() {
        this.processOodaCycle();
        // const interval = Number(this.runtime.getSetting("GITHUB_OODA_INTERVAL_MS")) || 60000; // Default to 5 minutes
        // elizaLogger.log("Starting OODA loop with interval:", interval);
        // setInterval(() => {
        //     this.processOodaCycle();
        // }, interval);
    }

    private async processOodaCycle() {
        elizaLogger.log("Starting OODA cycle...");
        const roomId = this.getRepositoryRoomId();
        elizaLogger.log("Repository room ID:", roomId);

        // Observe: Gather relevant memories related to the repository
        await this.runtime.ensureRoomExists(roomId);
        elizaLogger.log("Room exists for roomId:", roomId);
        await this.runtime.ensureParticipantInRoom(this.runtime.agentId, roomId);
        elizaLogger.log("Agent is a participant in roomId:", roomId);

        const memories = await this.runtime.messageManager.getMemories({
            roomId: roomId,
        });
        // elizaLogger.log("Retrieved memories:", memories);
        if (memories.length === 0) {
            elizaLogger.log("No memories found, skipping OODA cycle.");
            return;
        }
        const files = await getFilesFromMemories(this.runtime, memories[0]);
        elizaLogger.log("Files:", files);
        const owner = this.runtime.getSetting("GITHUB_OWNER") ?? '' as string;
        const repository = this.runtime.getSetting("GITHUB_REPO") ?? '' as string;
        if (owner === '' || repository === '') {
            elizaLogger.error("GITHUB_OWNER or GITHUB_REPO is not set, skipping OODA cycle.");
            throw new Error("GITHUB_OWNER or GITHUB_REPO is not set");
        }

        elizaLogger.log('Before composeState')
        const originalState = await this.runtime.composeState({
            userId: this.runtime.agentId, // TODO: this should be the user id
            roomId: roomId,
            agentId: this.runtime.agentId,
            content: { text: "sample text", action: "NOTHING", source: "github" },
        } as Memory, {});
        elizaLogger.log("Original state:", originalState);
        // add additional keys to state
        originalState.files = files;
        originalState.character = JSON.stringify(this.runtime.character || {}, null, 2);
        originalState.owner = owner;
        originalState.repository = repository;

        // Get previous issues from memory
        const previousIssues = await getIssuesFromMemories(this.runtime, owner, repository);
        originalState.previousIssues = JSON.stringify(previousIssues.map(issue => ({
            title: issue.content.text,
            body: (issue.content.metadata as any).body,
            url: (issue.content.metadata as any).url,
            number: (issue.content.metadata as any).number,
            state: (issue.content.metadata as any).state,
        })), null, 2);
        elizaLogger.log("Previous issues:", previousIssues);
        // Get previous pull requests from memory
        const previousPRs = await getPullRequestsFromMemories(this.runtime, owner, repository);
        originalState.previousPRs = JSON.stringify(previousPRs.map(pr => ({
            title: pr.content.text,
            url: (pr.content.metadata as any).url,
            number: (pr.content.metadata as any).number,
            state: (pr.content.metadata as any).state,
        })), null, 2);
        elizaLogger.log("Previous PRs:", originalState.previousPRs);
        elizaLogger.log("Original state:", originalState);
        // Orient: Analyze the memories to determine if logging improvements are needed
        const context = composeContext({
            state: originalState,
            template: oodaTemplate,
        });
        // elizaLogger.log("Composed context for OODA cycle:", context);

        const response = await generateObjectV2({
            runtime: this.runtime,
            context,
            modelClass: ModelClass.LARGE,
            schema: OODASchema,
        });
        if (!isOODAContent(response.object)) {
            elizaLogger.error("Invalid content in response:", response.object);
            throw new Error("Invalid content");
        }

        const content = response.object as OODAContent;
        elizaLogger.log("OODA content:", content);
        if (content.action === "NOTHING") {
            elizaLogger.log("Skipping OODA cycle as action is NOTHING");
            return;
        }
        // Generate IDs with timestamp to ensure uniqueness
        const timestamp = Date.now();
        const userIdUUID = stringToUuid(`${this.runtime.agentId}-${timestamp}`);
        const memoryUUID = stringToUuid(`${roomId}-${this.runtime.agentId}-${timestamp}`);
        elizaLogger.log("Generated memory UUID:", memoryUUID);

        // Create memory with retry logic
        const newMemory: Memory = {
            id: memoryUUID,
            userId: userIdUUID,
            agentId: this.runtime.agentId,
            content: {
                text: content.action,
                action: content.action,
                source: "github",
                inReplyTo: stringToUuid(`${roomId}-${this.runtime.agentId}`)
            },
            roomId,
            createdAt: timestamp,
        };
        elizaLogger.log("New memory to be created:", newMemory);

        const responseContent = await generateMessageResponse({
            runtime: this.runtime,
            context,
            modelClass: ModelClass.LARGE,
        });
        elizaLogger.log("Generated response content:", responseContent);

        try {
            await this.runtime.messageManager.createMemory(newMemory);
            elizaLogger.debug("Memory created successfully:", {
                memoryId: memoryUUID,
                action: content.action,
                userId: this.runtime.agentId,
            });
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

        // Update the state with the new memory
        const state = await this.runtime.composeState(newMemory);
        const newState = await this.runtime.updateRecentMessageState(state);

        elizaLogger.log("Processing actions for action:", content.action);
        await this.runtime.processActions(
            newMemory,
            [newMemory],
            newState,
            callback
        );
        elizaLogger.log("OODA cycle completed.");
    }

    private getRepositoryRoomId(): UUID {
        const owner = this.runtime.getSetting("GITHUB_OWNER") ?? '' as string;
        const repository = this.runtime.getSetting("GITHUB_REPO") ?? '' as string;
        if (owner === '' || repository === '') {
            elizaLogger.error("GITHUB_OWNER or GITHUB_REPO is not set, skipping OODA cycle.");
            throw new Error("GITHUB_OWNER or GITHUB_REPO is not set");
        }
        const roomId = stringToUuid(`github-${owner}-${repository}`);
        elizaLogger.log("Generated repository room ID:", roomId);
        return roomId;
    }
}

export const GitHubClientInterface: Client = {
    start: async (runtime: IAgentRuntime) => {
        await validateGithubConfig(runtime);
        elizaLogger.log("Starting GitHub client with agent ID:", runtime.agentId);

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
