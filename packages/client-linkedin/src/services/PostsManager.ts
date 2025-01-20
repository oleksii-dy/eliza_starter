import { AxiosInstance } from "axios";
import { LinkedInUserInfoFetcher } from "./LinkedinUserInfoFetcher";
import { PostContentCreator } from "./PostContentCreator";
import { publisherConfig } from "../interfaces";
import { LinkedInPostPublisher } from "./LinkedinPostPublisher";
import { elizaLogger, IAgentRuntime } from "@elizaos/core";
import { getRandomNumber } from "../helpers/get-random-number";

export class PostsManager {
    constructor(
        private runtime: IAgentRuntime,
        private postPublisher: LinkedInPostPublisher,
        private postContentCreator: PostContentCreator,
        readonly userId: string,
        readonly config: publisherConfig
    ) {}

    static async create({
        axiosInstance,
        userInfoFetcher,
        runtime,
        config
    }: {
        axiosInstance: AxiosInstance,
        userInfoFetcher: LinkedInUserInfoFetcher,
        runtime: IAgentRuntime,
        config: publisherConfig
    }) {
        const userInfo = await userInfoFetcher.getUserInfo();

        const postPublisher = new LinkedInPostPublisher(axiosInstance, userInfo.sub);
        const postContentCreator = new PostContentCreator(runtime);
        return new PostsManager(runtime, postPublisher, postContentCreator, userInfo.sub, config);
    }

    async createPostPublicationLoop() {
        const lastPost = await this.runtime.cacheManager.get<{
            timestamp: number;
        }>("linkedin/" + this.userId + "/lastPost");

        const lastPostTimestamp = lastPost?.timestamp ?? 0;
        const minMinutes = this.config.LINKEDIN_POST_INTERVAL_MIN;
        const maxMinutes = this.config.LINKEDIN_POST_INTERVAL_MAX;

        const randomMinutes = getRandomNumber(minMinutes, maxMinutes);
        const delay = randomMinutes * 60 * 1000;

        if (Date.now() > lastPostTimestamp + delay) {
            const postText = await this.postContentCreator.createPostContent(this.userId);
            elizaLogger.log(`Generated post text:\n${postText}`);
            if (!this.config.LINKEDIN_DRY_RUN) {
                await this.postPublisher.publishPost({ postText });
                elizaLogger.info("Published post");
            } else {
                elizaLogger.warn("Dry run is enabled. To publish posts set LINKEDIN_DRY_RUN to false");
            }
            await this.runtime.cacheManager.set("linkedin/" + this.userId + "/lastPost", { timestamp: Date.now() });
        }

        setTimeout(() => {
            this.createPostPublicationLoop();
        }, delay);
    }
}
