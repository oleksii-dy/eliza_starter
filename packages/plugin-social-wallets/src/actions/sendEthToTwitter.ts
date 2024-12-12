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
                state
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
