import { Client, elizaLogger, IAgentRuntime } from "@elizaos/core";
import { validateEnvs } from "./helpers/validate-envs";
import axios from "axios";
import { LinkedInUserInfoFetcher } from "./services/LinkedinUserInfoFetcher";
import { PostsManager } from "./services/PostsManager";

const LINKEDIN_API_URL = "https://api.linkedin.com";

export const LinkedInClient: Client = {
    async start(runtime: IAgentRuntime) {
        const envs = validateEnvs(runtime);

        const axiosInstance = axios.create({
            baseURL: LINKEDIN_API_URL,
            headers: {
                "Authorization": `Bearer ${envs.LINKEDIN_ACCESS_TOKEN}`,
            },
        });

        const postManager = await PostsManager.create({
            axiosInstance,
            userInfoFetcher: new LinkedInUserInfoFetcher(axiosInstance),
            runtime: this.runtime,
            config: {
                LINKEDIN_POST_INTERVAL_MIN: envs.LINKEDIN_POST_INTERVAL_MIN,
                LINKEDIN_POST_INTERVAL_MAX: envs.LINKEDIN_POST_INTERVAL_MAX,
            }
        });
        postManager.createPostPublicationLoop();


        return this;
    },

    async stop(_runtime: IAgentRuntime) {
        elizaLogger.warn("LinkedIn client does not support stopping yet");
    },
};

export default LinkedInClient;
