import { Client, elizaLogger, IAgentRuntime } from "@elizaos/core";


export const LinkedInClient: Client = {
    async start(runtime: IAgentRuntime) {
        const linkedinAccessToken = runtime.getSetting("LINKEDIN_ACCESS_TOKEN");
        if (!linkedinAccessToken) {
            throw new Error("LinkedIn access token is not set");
        }

        return this;
    },

    async stop(_runtime: IAgentRuntime) {
        elizaLogger.warn("LinkedIn client does not support stopping yet");
    },
};

export default LinkedInClient;
