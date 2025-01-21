import { AxiosInstance } from "axios";
import { LinkedInUserInfoFetcher } from "../repositories/LinkedinUserInfoFetcher";
import { PostContentCreator } from "./PostContentCreator";
import { IntervalsConfig } from "../interfaces";
import { LinkedInPostPublisher } from "../repositories/LinkedinPostPublisher";
import { elizaLogger, IAgentRuntime } from "@elizaos/core";
import { getRandomInteger } from "../helpers/get-random-integer";

export class LinkedInPostScheduler {
    constructor(
        private runtime: IAgentRuntime,
        private postPublisher: LinkedInPostPublisher,
        private postContentCreator: PostContentCreator,
        readonly userId: string,
        readonly intervalsConfig: IntervalsConfig
    ) {}

    static async createPostScheduler({
        axiosInstance,
        userInfoFetcher,
        runtime,
        config,
    }: {
        axiosInstance: AxiosInstance;
        userInfoFetcher: LinkedInUserInfoFetcher;
        runtime: IAgentRuntime;
        config: IntervalsConfig;
    }) {
        const userInfo = await userInfoFetcher.getUserInfo();

        const postPublisher = new LinkedInPostPublisher(
            axiosInstance,
            userInfo.sub
        );
        const postContentCreator = new PostContentCreator(runtime);

        return new LinkedInPostScheduler(
            runtime,
            postPublisher,
            postContentCreator,
            userInfo.sub,
            config
        );
    }

    async createPostPublicationLoop() {
        const lastPost = await this.runtime.cacheManager.get<{
            timestamp: number;
        }>("linkedin/" + this.userId + "/lastPost");

        const lastPostTimestamp = lastPost?.timestamp ?? 0;
        const minMinutes = this.intervalsConfig.LINKEDIN_POST_INTERVAL_MIN;
        const maxMinutes = this.intervalsConfig.LINKEDIN_POST_INTERVAL_MAX;

        const randomMinutes = getRandomInteger(minMinutes, maxMinutes);
        const delay = randomMinutes * 60 * 1000;

        if (Date.now() > lastPostTimestamp + delay) {
            const postText = await this.postContentCreator.createPostContent(
                this.userId
            );
            await this.postPublisher.publishPost({ postText });
            await this.runtime.cacheManager.set(
                "linkedin/" + this.userId + "/lastPost",
                { timestamp: Date.now() }
            );
            elizaLogger.info("Published post");
        }

        setTimeout(() => {
            this.createPostPublicationLoop();
        }, delay);
    }
}
