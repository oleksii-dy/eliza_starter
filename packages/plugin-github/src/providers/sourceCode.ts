import {
    elizaLogger,
    IAgentRuntime,
    Memory,
    Provider,
} from "@ai16z/eliza";
import { GitHubService } from "../github-service";

export const sourceCodeProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory) => {
        try {
            // Extract repository details from state
            const state = await runtime.composeState(message);
            const owner = state?.owner as string;
            const repo = state?.repo as string;

            if (!owner || !repo) {
                elizaLogger.warn("Missing repository details in state");
                return { files: [], content: {} };
            }

            // Initialize GitHub service
            const githubService = new GitHubService({
                auth: runtime.getSetting("GITHUB_API_TOKEN"),
                owner,
                repo
            });

            // Get file contents using the correct method
            const fileContents = await githubService.getFileContents(`${owner}/${repo}`);

            elizaLogger.info(`Retrieved ${fileContents.length} files from ${owner}/${repo}`);

            return {
                files: fileContents,
                repository: {
                    owner,
                    repo
                }
            };
        } catch (error) {
            elizaLogger.error("Error in sourceCodeProvider:", error);
            return { files: [], repository: null };
        }
    },
};