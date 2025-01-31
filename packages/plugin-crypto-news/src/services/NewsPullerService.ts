import {
    cleanJsonResponse,
    composeContext,
    elizaLogger,
    embed,
    extractAttributes,
    generateText,
    ModelClass,
    parseJSONObjectFromText,
    Service,
    ServiceType,
    stringToUuid,
    truncateToCompleteSentence,
    type IAgentRuntime,
} from "@elizaos/core";
import { Profile, Scraper } from "agent-twitter-client";
import { twitterPostTemplate } from "../templates/tweets";
import { ChainCatcherResponse, fetchChainCatcher } from "../utils/chainCatcher";
export const DEFAULT_MAX_TWEET_LENGTH = 280;

// import { sampleProvider } from "../providers/sampleProvider"; // TODO: Uncomment this line to use the sampleProvider

// declare module "@elizaos/core" {
//     export enum ServiceType {
//         NEOCORTEX_NEWS_FEED = "neocortex_news_feed",
//     }
// }
// The SampleService is a simple service that logs "Hello world" every 15 minutes.
export class NewsPullerService extends Service {
    private runtime: IAgentRuntime | null = null;
    private intervalId: NodeJS.Timeout | null = null;
    private DEFAULT_INTERVAL = 60 * 60 * 1000; // 1hr / 60 minutes
    private twitterClient;
    private me: Profile;
    private processingNews = false;

    static get serviceType(): ServiceType {
        return ServiceType.NEOCORTEX_NEWS_FEED;
    }

    private static isInitialized = false;

    async initialize(runtime: IAgentRuntime): Promise<void> {
        // Verify if the service is already initialized
        if (NewsPullerService.isInitialized) {
            return;
        }
        const intv = Number(runtime.getSetting("NEWS_PULLER_INTERVAL"));
        this.DEFAULT_INTERVAL = (intv ? intv : 60) * 60 * 1000;
        this.runtime = runtime;
        // init twitter
        await this.twitterLogin();
        // Start the periodic task
        this.startPeriodicTask();
        NewsPullerService.isInitialized = true;
        console.log(
            `NewsPullerService : initialized and started periodic task (interval: ${this.DEFAULT_INTERVAL} ms || ${intv})`
        );
    }

    private static activeTaskCount = 0;

    private startPeriodicTask(): void {
        // Verify if a task is already active
        if (NewsPullerService.activeTaskCount > 0) {
            console.log(
                "NewsPullerService: Periodic task already running, skipping"
            );
            return;
        }

        // Clear any existing interval
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }

        NewsPullerService.activeTaskCount++;
        console.log(
            `SampleService: Starting periodic task (active tasks: ${NewsPullerService.activeTaskCount})`
        );

        // Initial call immediately
        this.fetchSample();

        // Set up periodic calls
        this.intervalId = setInterval(() => {
            this.fetchSample();
        }, this.DEFAULT_INTERVAL);
    }

    private async twitterLogin() {
        // initiate the twitter login
        const twitterClient =
            this.runtime.clients?.twitter?.client?.twitterClient;
        this.twitterClient = twitterClient || new Scraper();
        let retries = 3;
        if (!twitterClient) {
            const username = this.runtime.getSetting("TWITTER_USERNAME");
            const password = this.runtime.getSetting("TWITTER_PASSWORD");
            const email = this.runtime.getSetting("TWITTER_EMAIL");
            const twitter2faSecret =
                this.runtime.getSetting("TWITTER_2FA_SECRET");

            if (!username || !password) {
                elizaLogger.error(
                    "Twitter credentials not configured in environment"
                );
                return false;
            }

            const cachedCookies = await this.getCachedCookies(username);
            if (cachedCookies) {
                elizaLogger.info("Using cached cookies");
                await this.setCookiesFromArray(cachedCookies);
            }
            // Login with credentials
            // await this.twitterClient.login(
            //     username,
            //     password,
            //     email,
            //     twitter2faSecret
            // );
            // if (!(await this.twitterClient.isLoggedIn())) {
            //     elizaLogger.error("Failed to login to Twitter");
            //     return false;
            // }

            while (retries > 0) {
                try {
                    if (await this.twitterClient.isLoggedIn()) {
                        // cookies are valid, no login required
                        elizaLogger.info("Successfully logged in.");
                        break;
                    } else {
                        await this.twitterClient.login(
                            username,
                            password,
                            email,
                            twitter2faSecret
                        );
                        if (await this.twitterClient.isLoggedIn()) {
                            // fresh login, store new cookies
                            elizaLogger.info("Successfully logged in.");
                            elizaLogger.info("Caching cookies");
                            await this.cacheCookies(
                                username,
                                await this.twitterClient.getCookies()
                            );
                            break;
                        }
                    }
                } catch (error) {
                    elizaLogger.error(`Login attempt failed: ${error.message}`);
                }

                retries--;
                elizaLogger.error(
                    `Failed to login to Twitter. Retrying... (${retries} attempts left)`
                );

                if (retries === 0) {
                    elizaLogger.error(
                        "Max retries reached. Exiting login process."
                    );
                    throw new Error(
                        "Twitter login failed after maximum retries."
                    );
                }

                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
            this.me = await this.twitterClient.me();
        }
    }
    private async fetchSample(): Promise<void> {
        if (!this.runtime) {
            console.log("NewsPullerService: Runtime not initialized");
            return;
        }
        if (this.processingNews) {
            console.log("NewsPullerService: Already processing news");
        }
        this.processingNews = true;

        try {
            // fetch several times
            const chainCatcher: ChainCatcherResponse =
                await fetchChainCatcher();
            const cacheManager = this.runtime.cacheManager;
            //const articles: ChainCatcherItem[] = [];
            let tweetId;
            let tempNews = "";
            let count = 0;

            for (const article of chainCatcher.data.list) {
                const cached = await cacheManager.get(
                    `cryptoNews_${article.id}`
                );
                if (!cached) {
                    // new acrticle
                    // console.log(
                    //     `NEW ARTICLE : ${article.title} # ${article.id}`
                    // );
                    // means it's not cached, then we push it to the articles
                    //articles.push(article);
                    // cache it
                    await cacheManager.set(`cryptoNews_${article.id}`, article);
                    const embedding = await embed(
                        this.runtime,
                        article.description
                    );
                    //console.log("embedding", embedding);
                    // put the news to knowledge as well

                    await this.runtime.ragKnowledgeManager.createKnowledge({
                        id: stringToUuid(`cryptoNews_${article.id}`),
                        agentId: this.runtime.agentId,
                        content: {
                            text: article.description,
                            metadata: {
                                isMain: true,
                                isShared: true,
                                source: "articles",
                            },
                        },
                        embedding: new Float32Array(embedding),
                    });

                    // combine news
                    tempNews += `- ${article.title}\n${article.description}\nTime: ${article.releaseTime}\n\n`;
                    count++;
                    // post the tweet
                    if (
                        count === 2 ||
                        article.id ===
                            chainCatcher.data.list[
                                chainCatcher.data.list.length - 1
                            ].id
                    ) {
                        const tweetR = await this.generateTweet(
                            article.description,
                            tweetId
                        );
                        if (tweetR.success) {
                            tweetId = tweetR.id;
                        }
                        tempNews = "";
                        count = 0;
                    }
                } else {
                    console.log(
                        `ARTICLE ${article.id} is already cached, skipping`
                    );
                }
            }
            this.processingNews = false;

            // const cryptoNews: SerperNewsResponse =
            //     await fetchSerperNews("crypto");
            // const suiNews: SerperNewsResponse = await fetchSerperNews("$SUI");
            // if (articles.length > 0) {
            //     output = `# NEWS for ${this.runtime.character.name}\n\n`;
            //     // output += `The News have this format:\n\n`;
            //     // output += `
            //     // - Title <--- Title of the news\n
            //     // Description <--- Content of the news\n
            //     // Timestamp <--- the time of the news\n\n
            //     // `;

            //     articles.forEach((article) => {
            //         output += `- ${article.title}\n${article.description}\nTime: ${article.releaseTime}\n\n`;
            //     });

            //     // cryptoNews.news.forEach((article) => {
            //     //     output += `- ${article.title}\n${article.snippet}\n\n`;
            //     // });
            //     // suiNews.news.forEach((article) => {
            //     //     output += `- ${article.title}\n${article.snippet}\n\n`;
            //     // });
            //     output += `# ADDITIONAL_NOTES: if there's any decimal numbers you should convert the decimal separator into comma instead of dot\n\n# END NEWS\n\n`;
            // }

            // elizaLogger.log(output);

            // return output;
        } catch (error) {
            console.error("Error in fetching news provider:", error);
            this.processingNews = false;
            return;
        }

        // try {
        //     // Example of using the sampleProvider
        //     // Create dummy memory and state objects for the provider
        //     // const dummyMemory: Memory = {
        //     //     id: stringToUuid("sample-service-trigger"),
        //     //     userId: this.runtime.agentId,
        //     //     agentId: this.runtime.agentId,
        //     //     roomId: this.runtime.agentId,
        //     //     content: { text: "Periodic sample fetch" },
        //     //     createdAt: Date.now(),
        //     // };

        //     // const dummyState: State = {
        //     //     userId: this.runtime.agentId,
        //     //     bio: "",
        //     //     lore: "",
        //     //     messageDirections: "",
        //     //     postDirections: "",
        //     //     roomId: this.runtime.agentId,
        //     //     actors: "",
        //     //     recentMessages: "",
        //     //     recentMessagesData: [],
        //     // };
        //     // await sampleProvider.get(this.runtime, dummyMemory, dummyState);

        //     // hello world log example
        //     console.log("SampleService: Hello world");

        //     console.log(
        //         "SampleService: Successfully fetched and processed sample"
        //     );
        // } catch (error) {
        //     console.log("SampleService: Error fetching sample:", error);
        // }
    }

    private async generateTweet(text: any, tweetId?: string) {
        elizaLogger.log("NewsPuller : Generating tweet");
        if (!this.runtime) {
            console.log("NewsPullerService: Twitter Runtime not initialized");
            return;
        }

        //console.log("NewsPullerService: Twitter client", twitterClient);
        try {
            const roomId = stringToUuid(
                "twitter_generate_room-" + this.me.username
            );
            await this.runtime.ensureUserExists(
                this.runtime.agentId,
                this.me.username,
                this.runtime.character.name,
                "twitter"
            );

            const maxTweetLength = Number(DEFAULT_MAX_TWEET_LENGTH);
            const state = await this.runtime.composeState(
                {
                    userId: this.runtime.agentId,
                    roomId: roomId,
                    agentId: this.runtime.agentId,
                    content: {
                        text: "",
                    },
                },
                {
                    twitterUserName: this.me.username,
                    maxTweetLength,
                    news: text,
                }
            );

            const context = composeContext({
                state,
                template: twitterPostTemplate,
            });
            // console.log("PROMPT", context);
            //elizaLogger.debug("generate post prompt:\n" + context);

            const response = await generateText({
                runtime: this.runtime,
                context,
                modelClass: ModelClass.MEDIUM,
            });

            const rawTweetContent = cleanJsonResponse(response);

            // First attempt to clean content
            let tweetTextForPosting = null;
            let mediaData = null;

            // Try parsing as JSON first
            const parsedResponse = parseJSONObjectFromText(rawTweetContent);
            if (parsedResponse?.text) {
                tweetTextForPosting = parsedResponse.text;
            }

            // if (
            //     parsedResponse?.attachments &&
            //     parsedResponse?.attachments.length > 0
            // ) {
            //     mediaData = await fetchMediaData(parsedResponse.attachments);
            // }

            // Try extracting text attribute
            if (!tweetTextForPosting) {
                const parsingText = extractAttributes(rawTweetContent, [
                    "text",
                ]).text;
                if (parsingText) {
                    tweetTextForPosting = truncateToCompleteSentence(
                        extractAttributes(rawTweetContent, ["text"]).text,
                        maxTweetLength
                    );
                }
            }

            // Use the raw text
            if (!tweetTextForPosting) {
                tweetTextForPosting = rawTweetContent;
            }

            // Truncate the content to the maximum tweet length specified in the environment settings, ensuring the truncation respects sentence boundaries.
            if (maxTweetLength) {
                tweetTextForPosting = truncateToCompleteSentence(
                    tweetTextForPosting,
                    maxTweetLength
                );
            }

            const removeQuotes = (str: string) =>
                str.replace(/^['"](.*)['"]$/, "$1");

            const fixNewLines = (str: string) => str.replaceAll(/\\n/g, "\n\n"); //ensures double spaces

            // Final cleaning
            tweetTextForPosting = removeQuotes(
                fixNewLines(tweetTextForPosting)
            );

            try {
                console.log(
                    `NEWS PULLER: would have posted tweet: ${tweetTextForPosting} | Length: ${tweetTextForPosting.length}`
                );
                return await this.postTweet(tweetTextForPosting, tweetId); // return the tweet ID
            } catch (err) {
                console.error("NEWS_PULLER: ERROR posting tweet:", err);
            }
            return;
            // if (this.isDryRun) {
            //     elizaLogger.info(
            //         `Dry run: would have posted tweet: ${tweetTextForPosting}`
            //     );
            //     return;
            // }

            // try {
            //     if (this.approvalRequired) {
            //         // Send for approval instead of posting directly
            //         elizaLogger.log(
            //             `Sending Tweet For Approval:\n ${tweetTextForPosting}`
            //         );
            //         await this.sendForApproval(
            //             tweetTextForPosting,
            //             roomId,
            //             rawTweetContent
            //         );
            //         elizaLogger.log("Tweet sent for approval");
            //     } else {
            //         elizaLogger.log(
            //             `Posting new tweet:\n ${tweetTextForPosting}`
            //         );
            //         this.postTweet(
            //             this.runtime,
            //             this.client,
            //             tweetTextForPosting,
            //             roomId,
            //             rawTweetContent,
            //             this.twitterUsername,
            //             mediaData
            //         );
            //     }
            // } catch (error) {
            //     elizaLogger.error("Error sending tweet:", error);
            // }
        } catch (error) {
            console.error("NEWS_PULLER: ERROR generating new tweet:", error);
        }
    }

    private async postTweet(
        content: string,
        tweetId: string
    ): Promise<{ success: boolean; id: string }> {
        try {
            // Send the tweet
            elizaLogger.log("Attempting to send tweet:", content);

            try {
                if (content.length > DEFAULT_MAX_TWEET_LENGTH) {
                    const noteTweetResult =
                        await this.twitterClient.sendNoteTweet(
                            content,
                            tweetId
                        );
                    if (
                        noteTweetResult.errors &&
                        noteTweetResult.errors.length > 0
                    ) {
                        // Note Tweet failed due to authorization. Falling back to standard Tweet.
                        return await this.sendTweet(content, tweetId);
                    }
                    return {
                        success: true,
                        id: noteTweetResult?.data?.notetweet_create
                            ?.tweet_results?.result?.rest_id,
                    }; // return the ID of the tweet
                }
                return await this.sendTweet(content, tweetId);
            } catch (error) {
                throw new Error(`Note Tweet failed: ${error}`);
            }
        } catch (error) {
            // Log the full error details
            elizaLogger.error("Error posting tweet:", {
                message: error.message,
                stack: error.stack,
                name: error.name,
                cause: error.cause,
            });
            return {
                success: false,
                id: null,
            };
        }
    }

    private async sendTweet(content: string, tweetId: string | null) {
        const result = await this.twitterClient.sendTweet(content, tweetId);

        const body = await result.json();
        //console.dir(body, { depth: null, colors: true });

        // Check for Twitter API errors
        if (body.errors) {
            const error = body.errors[0];
            elizaLogger.error(
                `Twitter API error (${error.code}): ${error.message}`
            );
            return {
                success: false,
                id: null,
            };
        }

        // Check for successful tweet creation
        if (!body?.data?.create_tweet?.tweet_results?.result) {
            elizaLogger.error(
                "Failed to post tweet: No tweet result in response"
            );
            return {
                success: false,
                id: null,
            };
        }
        return {
            success: true,
            id: body?.data?.create_tweet?.tweet_results?.result?.rest_id,
        }; // return the ID of the tweet
        //return body?.data?.create_tweet?.tweet_results?.result?.rest_id; // returns the ID of the tweet
        //return true;
    }

    async getCachedCookies(username: string) {
        return await this.runtime.cacheManager.get<any[]>(
            `twitter/${username}/cookies`
        );
    }

    async cacheCookies(username: string, cookies: any[]) {
        await this.runtime.cacheManager.set(
            `twitter/${username}/cookies`,
            cookies
        );
    }

    async setCookiesFromArray(cookiesArray: any[]) {
        const cookieStrings = cookiesArray.map(
            (cookie) =>
                `${cookie.key}=${cookie.value}; Domain=${cookie.domain}; Path=${
                    cookie.path
                }; ${cookie.secure ? "Secure" : ""}; ${
                    cookie.httpOnly ? "HttpOnly" : ""
                }; SameSite=${cookie.sameSite || "Lax"}`
        );
        await this.twitterClient.setCookies(cookieStrings);
    }

    // Method to stop the service
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            NewsPullerService.activeTaskCount--;
            console.log(
                `NewsPullerService stopped (active tasks: ${NewsPullerService.activeTaskCount})`
            );
        }
        NewsPullerService.isInitialized = false;
    }

    // Method to manually trigger a sample fetch (for testing)
    async forceFetch(): Promise<void> {
        await this.fetchSample();
    }
}

export default NewsPullerService;
