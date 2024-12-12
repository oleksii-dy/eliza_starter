import {
    composeContext,
    generateObjectV2,
    elizaLogger,
    Content,
    ModelClass,
} from "@ai16z/eliza";
import { Action, generateText, stringToUuid } from "@ai16z/eliza";
import { SendEthTemplate } from "../templates";
import { isSendEthContent, SendEthContent, SendEthSchema } from "../types";
import { SimpleTwitterManager } from "@ai16z/client-twitter";

export const sendEthToTwitter: Action = {
    name: "SEND_ETH_TO_TWITTER_USERNAME",
    description: "Send ETH to a twitter username",
    validate: async () => true,
    handler: async (runtime, message, state, _options, callback) => {
        elizaLogger.log("Starting SEND_ETH_TO_TWITTER_USERNAME handler...");
        const context = composeContext({
            state,
            template: SendEthTemplate,
        });

        const sendDetails = await generateObjectV2({
            runtime,
            context,
            modelClass: ModelClass.SMALL,
            schema: SendEthSchema,
        });

        if (!isSendEthContent(sendDetails.object)) {
            callback(
                {
                    text: "Invalid send ETH to Twitter username details. Ensure the username and amount is specified.",
                },
                []
            );
            return;
        }

        const { username, amount, chain } =
            sendDetails.object as SendEthContent;
        let twitter: SimpleTwitterManager | null = null;

        if (
            !runtime.getSetting("TWITTER_USERNAME") ||
            !runtime.getSetting("TWITTER_PASSWORD") ||
            !runtime.getSetting("TWITTER_EMAIL")
        ) {
            elizaLogger.info(
                "Twitter credentials not found. Required if would like agent to tweet about the transaction."
            );
        } else {
            twitter = new SimpleTwitterManager(runtime);
            while (true) {
                await twitter.client.twitterClient.login(
                    runtime.getSetting("TWITTER_USERNAME"),
                    runtime.getSetting("TWITTER_PASSWORD"),
                    runtime.getSetting("TWITTER_EMAIL"),
                    runtime.getSetting("TWITTER_2FA_SECRET") || undefined
                );
                if (await twitter.client.twitterClient.isLoggedIn()) {
                    break;
                }

                elizaLogger.error("Failed to login to Twitter trying again...");
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
        }

        const sendEthAction = async (response: Content) => {
            await runtime.processActions(
                message,
                [
                    {
                        content: {
                            text: "",
                            action: "transfer",
                        },
                        roomId: message.roomId,
                        userId: message.userId,
                        agentId: message.agentId,
                    },
                ],
                state,
                twitter
                    ? twitter.client.twitterClient.sendTweet(
                          `just sent ${amount} ETH to @${username}`
                      )
                    : () => {}
            );
        };

        await runtime.processActions(
            message,
            [
                {
                    content: {
                        text: "",
                        action: "GET_WALLET_ADDRESS_FOR_TWITTER_USERNAME",
                    },
                    roomId: message.roomId,
                    userId: message.userId,
                    agentId: message.agentId,
                },
            ],
            state,
            sendEthAction
        );

        return true;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Send 1 ETH to @elonmusk",
                    action: "SEND_ETH_TO_TWITTER_USERNAME",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Successfully sent 1 ETH to @elonmusk",
                    action: "SEND_ETH_TO_TWITTER_USERNAME",
                },
            },
        ],
    ],
    similes: [""],
};
