import { elizaLogger, Client, IAgentRuntime, Character, generateShouldRespond, ModelClass, composeContext, State, Memory, generateMessageResponse, getEmbeddingZeroVector, Content, HandlerCallback, UUID, generateObjectV2, stringToUuid } from "@ai16z/eliza";
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
} from "@ai16z/plugin-github";
import { z } from "zod";
import { isOODAContent, OODAContent, OODASchema } from "./types";
import { oodaTemplate } from "./templates";

export class GitHubClient extends EventEmitter {
    apiToken: string;
    runtime: IAgentRuntime;
    character: Character;

    constructor(runtime: IAgentRuntime) {
        super();

        this.apiToken = runtime.getSetting("GITHUB_API_TOKEN") as string;
        elizaLogger.log("GitHubClient initialized with API token:", this.apiToken);

        this.runtime = runtime;
        this.character = runtime.character;

        this.runtime.registerAction(initializeRepositoryAction);
        this.runtime.registerAction(createCommitAction);
        this.runtime.registerAction(createMemoriesFromFilesAction);
        this.runtime.registerAction(createPullRequestAction);
        this.runtime.registerAction(createIssueAction);
        this.runtime.registerAction(modifyIssueAction);
        this.runtime.registerAction(addCommentToIssueAction);

        this.runtime.providers.push(sourceCodeProvider);
        this.runtime.providers.push(testFilesProvider);
        this.runtime.providers.push(workflowFilesProvider);
        this.runtime.providers.push(documentationFilesProvider);
        this.runtime.providers.push(releasesProvider);

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

    private async onReady() {
        elizaLogger.log("GitHubClient is ready.");
    }

    private startOodaLoop() {
        const interval = Number(this.runtime.getSetting("GITHUB_OODA_INTERVAL_MS")) || 300000; // Default to 5 minutes
        elizaLogger.log("Starting OODA loop with interval:", interval);
        setInterval(() => {
            this.processOodaCycle();
        }, interval);
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
        elizaLogger.log("Retrieved memories:", memories);
        // const files = await getFilesFromMemories(this.runtime, memories);
        const files = []
        elizaLogger.log("Files:", files);
        const originalState = await this.runtime.composeState({
            userId: this.runtime.agentId, // TODO: this should be the user id
            roomId: roomId,
            agentId: this.runtime.agentId,
            content: { text: "", action: "NOTHING", source: "github" },
        } as Memory, {});
        // add additional keys to state
        originalState.files = files;
        originalState.character = JSON.stringify(this.runtime.character || {}, null, 2);
        // Orient: Analyze the memories to determine if logging improvements are needed
        const context = composeContext({
            state: originalState,
            template: oodaTemplate,
        });
        elizaLogger.log("Composed context for OODA cycle:", context);

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

        // Generate IDs with timestamp to ensure uniqueness
        const timestamp = Date.now();
        const userIdUUID = stringToUuid(`${this.runtime.agentId}-${timestamp}`);
        const memoryUUID = stringToUuid(`${roomId}-${this.runtime.agentId}-${timestamp}`);
        elizaLogger.log("Generated memory UUID:", memoryUUID);

        // Create memory with retry logic
        const newMemory = {
            id: memoryUUID,
            userId: userIdUUID,
            agentId: this.runtime.agentId,
            content: {
                text: "TBD",
                action: content.action,
                source: "github",
                inReplyTo: stringToUuid(`${roomId}-${this.runtime.agentId}`)
            },
            roomId,
            createdAt: timestamp,
            embedding: getEmbeddingZeroVector(),
        };
        elizaLogger.log("New memory to be created:", newMemory);

        const responseContent = await generateMessageResponse({
            runtime: this.runtime,
            context,
            modelClass: ModelClass.LARGE,
        });
        newMemory.content.text = responseContent.text;
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

        const responseMessages = await callback(responseContent);
        elizaLogger.log("Response messages from callback:", responseMessages);

        // Update the state with the new memory
        const state = await this.runtime.composeState(newMemory);
        const newState = await this.runtime.updateRecentMessageState(state);
        elizaLogger.log("Updated state with new memory:", newState);

        await this.runtime.processActions(
            newMemory,
            responseMessages,
            newState,
            callback
        );
        elizaLogger.log("OODA cycle completed.");
    }

    private getRepositoryRoomId(): UUID {
        const owner = this.runtime.getSetting("GITHUB_OWNER") ?? 'ai16z' as string;
        const repo = this.runtime.getSetting("GITHUB_REPO") ?? 'eliza' as string;
        const roomId = stringToUuid(`github-${owner}-${repo}`);
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
