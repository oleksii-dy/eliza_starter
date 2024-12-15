import { elizaLogger, Client, IAgentRuntime, Character } from "@ai16z/eliza";
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

export class GitHubClient extends EventEmitter {
    apiToken: string;
    runtime: IAgentRuntime;
    character: Character;

    constructor(runtime: IAgentRuntime) {
        super();

        this.apiToken = runtime.getSetting("GITHUB_API_TOKEN") as string;

        this.runtime = runtime;
        this.character = runtime.character;

        this.setupEventListeners();

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
    }

    private setupEventListeners() {
        // TBD
    }

    async stop() {
        // TBD
    }

    private async onReady() {
        // TBD
    }
}

export const GitHubClientInterface: Client = {
    start: async (runtime: IAgentRuntime) => {
        await validateGithubConfig(runtime);

        elizaLogger.log("starting github client", runtime.agentId);

        const client = new GitHubClient(runtime);

        return client;
    },
    stop: async (runtime: IAgentRuntime) => {
        try {
            elizaLogger.log("stopping github client");
            await runtime.clients.github.stop();
        } catch (e) {
            elizaLogger.error("github client stop error", e);
        }
    },
};

export default GitHubClientInterface;
