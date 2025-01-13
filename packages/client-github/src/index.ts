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
    incorporateRepositoryState,
    saveIssuesToMemory,
    savePullRequestsToMemory,
} from "@elizaos/plugin-github";
import { ClientStage, isOODAContent, OODAContent, OODASchema } from "./types";
import { oodaTemplate } from "./templates";
import fs from "fs/promises";
import { configGithubInfoAction } from "./actions/configGithubInfo";

export class GitHubClient extends EventEmitter {
    apiToken: string;
    runtime: IAgentRuntime;
    character: Character;
    state: State | null;
    githubInfoDiscoveryInterval: NodeJS.Timeout | null;
    oodaInterval: NodeJS.Timeout | null;
    stage: ClientStage;
    roomId: UUID;
    owner: string | null;
    repo: string | null;
    branch: string | null;

    constructor(runtime: IAgentRuntime) {
        super();

        this.apiToken = runtime.getSetting("GITHUB_API_TOKEN") as string;

        this.runtime = runtime;
        this.character = runtime.character;
        this.state = null;
        this.githubInfoDiscoveryInterval = null;
        this.oodaInterval = null;
        this.stage = ClientStage.GITHUB_INFO_DISCOVERY;
        this.roomId = stringToUuid(`default-room-${this.runtime.agentId}`);
        this.owner = null;
        this.repo = null;
        this.branch = null;

        // start the github info discovery loop
        this.startGithubInfoDiscoveryLoop();
    }

    private async startGithubInfoDiscoveryLoop() {
        await this.participantInRoom();

        // register action
        this.runtime.registerAction(configGithubInfoAction);

        const interval =
            Number(
                this.runtime.getSetting("GITHUB_INFO_DISCOVERY_INTERVAL_MS")
            ) || 1000; // Default to 1 second
        elizaLogger.log(
            "Starting Github info discovery loop with interval:",
            interval
        );
        this.githubInfoDiscoveryInterval = setInterval(async () => {
            await this.processGithubInfoDiscoveryCycle();
        }, interval);
    }

    async participantInRoom() {
        await this.runtime.ensureRoomExists(this.roomId);
        await this.runtime.ensureParticipantInRoom(
            this.runtime.agentId,
            this.roomId
        );
        elizaLogger.log("Agent is a participant in roomId:", this.roomId);
    }

    private async processGithubInfoDiscoveryCycle() {
        elizaLogger.log("Processing Github info discovery cycle...");

        const memories = await this.runtime.messageManager.getMemories({
            roomId: this.roomId,
        });
        await fs.writeFile(
            "/tmp/client-github-memories.txt",
            JSON.stringify(memories, null, 2)
        );

        // if memories is empty stop the cycle
        if (memories.length === 0) {
            elizaLogger.log(
                "No memories found, skip the github info discovery cycle."
            );
            return;
        }

        // get the last memory
        const message = memories[0];

        if (!this.state) {
            this.state = (await this.runtime.composeState(message)) as State;
        } else {
            this.state = await this.runtime.updateRecentMessageState(
                this.state
            );
        }

        await fs.writeFile(
            "/tmp/client-github-state.txt",
            JSON.stringify(this.state, null, 2)
        );

        const context = composeContext({
            state: this.state,
            template: oodaTemplate,
        });

        await fs.writeFile(
            "/tmp/client-github-context.txt",
            JSON.stringify(context, null, 2)
        );

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
        if (
            this.stage === ClientStage.GITHUB_INFO_DISCOVERY &&
            content.owner &&
            content.repo &&
            content.branch
        ) {
            elizaLogger.log(
                "Repository configuration complete, updating stage to OODA, unregistering action and stopping github info discovery loop and starting ooda loop."
            );

            this.owner = content.owner;
            this.repo = content.repo;
            this.branch = content.branch;

            this.stopGithubInfoDiscoveryLoop();
            this.startOodaLoop();
        }
    }

    private stopGithubInfoDiscoveryLoop() {
        if (this.githubInfoDiscoveryInterval) {
            clearInterval(this.githubInfoDiscoveryInterval);
            this.githubInfoDiscoveryInterval = null;

            // unregister action
            this.runtime.actions = this.runtime.actions.filter(
                (action) => action.name !== "CONFIG_GITHUB_INFO"
            );

            // set stage to OODA
            this.stage = ClientStage.OODA;
        }
    }

    async stopOodaLoop() {
        try {
            if (this.oodaInterval) {
                clearInterval(this.oodaInterval);
                this.oodaInterval = null;
            }
            elizaLogger.log("GitHubClient stopped successfully.");
        } catch (e) {
            elizaLogger.error("GitHubClient stop error:", e);
        }
    }

    private startOodaLoop() {
        const interval =
            Number(this.runtime.getSetting("GITHUB_OODA_INTERVAL_MS")) || 60000; // Default to 1 minute
        elizaLogger.log("Starting OODA loop with interval:", interval);
        this.oodaInterval = setInterval(() => {
            this.processOodaCycle();
        }, interval);
    }

    private async processOodaCycle() {
        elizaLogger.log("Starting OODA cycle...");

        // retrieve memories
        const memories = await this.runtime.messageManager.getMemories({
            roomId: this.roomId,
        });
        await fs.writeFile(
            "/tmp/client-github-memories.txt",
            JSON.stringify(memories, null, 2)
        );

        // if memories is empty stop the cycle
        if (memories.length === 0) {
            elizaLogger.log("No memories found, skipping OODA cycle.");
            return;
        }

        // get the last memory
        const message = memories[0];

        if (!this.state) {
            this.state = (await this.runtime.composeState(message)) as State;
        } else {
            this.state = await this.runtime.updateRecentMessageState(
                this.state
            );
        }

        await fs.writeFile(
            "/tmp/client-github-state.txt",
            JSON.stringify(this.state, null, 2)
        );

        let context = composeContext({
            state: this.state,
            template: oodaTemplate,
        });

        await fs.writeFile(
            "/tmp/client-github-context.txt",
            JSON.stringify(context, null, 2)
        );

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

        const fileMemories = memories.filter(
            (memory) => (memory.content.metadata as any)?.path
        );
        await fs.writeFile(
            "/tmp/client-github-fileMemories.txt",
            JSON.stringify(fileMemories, null, 2)
        );
        if (fileMemories.length === 0) {
            await this.initializeRepositoryAndCreateMemories();
        }

        // compose the state with original memory and incorporate repository state
        // elizaLogger.log("Before composeState");
        const originalMemory = {
            userId: this.runtime.agentId, // TODO: this should be the user id
            roomId: this.roomId,
            agentId: this.runtime.agentId,
            content: {
                text: "Initializing repository and creating memories",
                action: "NOTHING",
                source: "github",
            },
        } as Memory;
        let originalState = await this.runtime.composeState(originalMemory, {});
        originalState = await incorporateRepositoryState(
            this.owner,
            this.repo,
            this.branch,
            originalState,
            this.runtime,
            originalMemory,
            [],
            true,
            true
        );
        // elizaLogger.log("Original state:", originalState);
        await fs.writeFile(
            "/tmp/client-github-originalState.txt",
            JSON.stringify(originalState, null, 2)
        );

        // compose the context
        context = composeContext({
            state: originalState,
            template: oodaTemplate,
        });
        // elizaLogger.log("Composed context for OODA cycle:", context);
        // write the context to a file for testing
        await fs.writeFile("/tmp/client-github-context.txt", context);

        // retrieve the content
        const response = await generateObject({
            runtime: this.runtime,
            context,
            modelClass: ModelClass.SMALL,
            schema: OODASchema,
        });
        if (!isOODAContent(response.object)) {
            elizaLogger.error("Invalid content in response:", response.object);
            throw new Error("Invalid content");
        }

        content = response.object as OODAContent;
        elizaLogger.log("OODA content:", content);
        if (content.action === "NOTHING") {
            elizaLogger.log("Skipping OODA cycle as action is NOTHING");
            return;
        }

        // create new memory with retry logic

        // Generate IDs with timestamp to ensure uniqueness
        const timestamp = Date.now();
        const userIdUUID = stringToUuid(`${this.runtime.agentId}-${timestamp}`);
        const memoryUUID = stringToUuid(
            `${this.roomId}-${this.runtime.agentId}-${timestamp}`
        );
        // elizaLogger.log("Generated memory UUID:", memoryUUID);

        const newMemory: Memory = {
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
        // elizaLogger.log("New memory to be created:", newMemory);

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

        // update the state with the new memory
        const state = await this.runtime.composeState(newMemory);

        // write state to file
        await fs.writeFile(
            "/tmp/client-github-state.txt",
            JSON.stringify(state, null, 2)
        );

        const newState = await this.runtime.updateRecentMessageState(state);

        // write new state to file
        await fs.writeFile(
            "/tmp/client-github-newState.txt",
            JSON.stringify(newState, null, 2)
        );

        // process the actions with the new memory and state
        elizaLogger.log("Processing actions for action:", content.action);
        await this.runtime.processActions(
            newMemory,
            [newMemory],
            newState,
            callback
        );

        elizaLogger.log("OODA cycle completed.");
    }

    private async initializeRepositoryAndCreateMemories() {
        //
        // 0) function to initialize repository and create memories if no memories are found
        //
        elizaLogger.log("No memories found, skipping OODA cycle.");

        //
        // 1) initialize timestamp and userIdUUID
        //
        const timestamp = Date.now();
        const userIdUUID = stringToUuid(`${this.runtime.agentId}-${timestamp}`);

        //
        // 2) create the memory to acknowledge that no memories are found and trigger NOTHING action
        //
        const originalMemory: Memory = {
            id: stringToUuid(
                `${this.roomId}-${this.runtime.agentId}-${timestamp}-original`
            ),
            userId: userIdUUID,
            agentId: this.runtime.agentId,
            content: {
                text: `No memories found, starting to initialize repository and create memories.`,
                action: "NOTHING",
                source: "github",
                inReplyTo: stringToUuid(
                    `${this.roomId}-${this.runtime.agentId}`
                ),
            },
            roomId: this.roomId,
            createdAt: timestamp,
        };
        let originalState = await this.runtime.composeState(originalMemory);
        originalState = await incorporateRepositoryState(
            this.owner,
            this.repo,
            this.branch,
            originalState,
            this.runtime,
            originalMemory,
            [],
            true,
            true
        );

        //
        // 3) create the memory to trigger initialize repository action
        //
        const initializeRepositoryMemory: Memory = {
            id: stringToUuid(
                `${this.roomId}-${this.runtime.agentId}-${timestamp}-initialize-repository`
            ),
            userId: userIdUUID,
            agentId: this.runtime.agentId,
            content: {
                text: `Initialize the repository ${this.owner}/${this.repo} on ${this.branch} branch`,
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
        elizaLogger.debug("Memory created successfully:", {
            memoryId: initializeRepositoryMemory.id,
            action: initializeRepositoryMemory.content.action,
            userId: this.runtime.agentId,
        });

        //
        // 4) create the memory to trigger create memories from files action
        //
        const createMemoriesFromFilesMemory = {
            id: stringToUuid(
                `${this.roomId}-${this.runtime.agentId}-${timestamp}-create-memories-from-files`
            ),
            userId: userIdUUID,
            agentId: this.runtime.agentId,
            content: {
                text: `Create memories from files for the repository ${this.owner}/${this.repo} @ branch ${this.branch} and path '/packages/plugin-coinbase/src'`,
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
        elizaLogger.debug("Memory created successfully:", {
            memoryId: createMemoriesFromFilesMemory.id,
            action: createMemoriesFromFilesMemory.content.action,
            userId: this.runtime.agentId,
        });

        const issuesLimit =
            Number(this.runtime.getSetting("GITHUB_ISSUES_LIMIT")) || 10;
        const pullRequestsLimit =
            Number(this.runtime.getSetting("GITHUB_PULL_REQUESTS_LIMIT")) || 10;

        // This returns nothing no issue memories or pull request memories
        const issuesMemories = await saveIssuesToMemory(
            this.runtime,
            this.owner,
            this.repo,
            this.branch,
            this.apiToken,
            issuesLimit
        );
        // elizaLogger.log("Issues memories:", issuesMemories);
        await fs.writeFile(
            "/tmp/client-github-issuesMemories.txt",
            JSON.stringify(issuesMemories, null, 2)
        );
        const pullRequestsMemories = await savePullRequestsToMemory(
            this.runtime,
            this.owner,
            this.repo,
            this.branch,
            this.apiToken,
            pullRequestsLimit
        );
        // elizaLogger.log("Pull requests memories:", pullRequestsMemories);
        await fs.writeFile(
            "/tmp/client-github-pullRequestsMemories.txt",
            JSON.stringify(pullRequestsMemories, null, 2)
        );

        await this.runtime.processActions(
            originalMemory,
            [initializeRepositoryMemory, createMemoriesFromFilesMemory],
            originalState,
            undefined
        );
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
