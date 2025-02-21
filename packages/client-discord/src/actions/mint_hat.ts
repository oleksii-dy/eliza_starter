import {
    ModelClass,
    composeContext,
    generateText,
    parseJSONObjectFromText,
} from "@elizaos/core";
import type {
    Action,
    ActionExample,
    Content,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
} from "@elizaos/core";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import {
    createPublicClient,
    createWalletClient,
    http,
    PublicClient,
} from "viem";
import {
    DEFAULT_ENDPOINTS_CONFIG,
    HatsSubgraphClient,
} from "@hatsprotocol/sdk-v1-subgraph";
import { HatsClient, hatIdHexToDecimal } from "@hatsprotocol/sdk-v1-core";
import { createSigner, createGuildClient } from "@guildxyz/sdk";
import { hatIdTemplate } from "./search_hat";

// TODO: This needs to be dynamic
const GUILD_NAME = "guild-master";

const mintHatAction = {
    name: "MINT_HAT",
    similes: ["GIVE_HAT", "GIVE_ROLE", "MINT_ROLE"],
    description: "Mints a hat that corresponds with a Discord role.",
    validate: async (
        runtime: IAgentRuntime,
        message: Memory,
        _state: State
    ) => {
        if (message.content.source !== "discord") {
            return false;
        }
        // only show if one of the keywords are in the message
        const keywords: string[] = ["hat", "role", "mint"];
        return keywords.some((keyword) =>
            message.content.text.toLowerCase().includes(keyword.toLowerCase())
        );
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        try {
            const context = composeContext({
                state,
                template: hatIdTemplate,
            });

            const response = await generateText({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
            });

            const parsedResponse = parseJSONObjectFromText(response) as {
                hatId: string;
            } | null;

            if (!parsedResponse) {
                console.log("Failed to parse hat ID");
                return;
            }

            const hatsSubgraphClient = new HatsSubgraphClient({
                config: DEFAULT_ENDPOINTS_CONFIG,
            });

            const { hatId } = parsedResponse;

            const hat = await hatsSubgraphClient.getHat({
                chainId: sepolia.id,
                hatId: BigInt(hatId),
                props: {
                    wearers: {
                        props: {},
                    },
                },
            });

            if (!hat) {
                throw new Error("Hat does not exist!");
            }

            const guildClient = createGuildClient(
                "Hats Protocol Discord Gating"
            );

            const EVM_PRIVATE_KEY = runtime.getSetting(
                "EVM_PRIVATE_KEY"
            ) as `0x${string}`;
            const account = privateKeyToAccount(EVM_PRIVATE_KEY);

            const signerFunction = createSigner.custom(
                (message) => account.signMessage({ message }),
                account.address
            );

            const guild = await guildClient.guild.get(GUILD_NAME);

            const membersByRole = await guildClient.guild.getMembers(
                guild.id,
                signerFunction // Optional, if a valid signer is provided, the result will contain private data
            );

            const allMembers = membersByRole.reduce(
                (acc, { members }) => [...acc, ...members],
                []
            );

            const memberAddresses = allMembers.filter(
                (member, index) => allMembers.indexOf(member) === index
            );

            const {
                user: { platform: userPlatformClient },
            } = guildClient;

            const { senderName } = state;

            const memberAddress = memberAddresses.find((address) =>
                userPlatformClient
                    .get(address, 1, signerFunction)
                    .then((userPlatform) => {
                        return (
                            userPlatform.platformUserData.username ===
                            senderName
                        );
                    })
            );

            if (!memberAddress) {
                throw new Error(
                    `I'm sorry, it looks like you are not a member of the guild.`
                );
            }

            const isWearer = hat.wearers?.some(
                (wearer) =>
                    wearer.id.toLowerCase() === memberAddress.toLowerCase()
            );

            if (isWearer) {
                throw new Error("You already have this hat!");
            }

            const EVM_PROVIDER_URL = runtime.getSetting("EVM_PROVIDER_URL");

            const publicClient = createPublicClient({
                chain: sepolia,
                transport: http(EVM_PROVIDER_URL),
            });

            const walletClient = createWalletClient({
                account,
                chain: sepolia,
                transport: http(EVM_PROVIDER_URL),
            });

            const hatsClient = new HatsClient({
                chainId: sepolia.id,
                publicClient: publicClient as PublicClient,
                walletClient,
            });

            const mintHatResult = await hatsClient.mintHat({
                account,
                hatId: hatIdHexToDecimal(hat.id),
                wearer: memberAddress,
            });

            if (mintHatResult.status !== "success") {
                throw new Error("Failed to mint hat!");
            }

            const callbackData: Content = {
                text: `You have successfully minted the hat!`,
                action: "HAT_MINT_RESPONSE",
                source: message.content.source,
                attachments: [],
            };

            await callback(callbackData);

            return callbackData;
        } catch (error) {
            console.error("Error minting hat", error);
            const callbackData: Content = {
                text: error.message,
                source: message.content.source,
                attachments: [],
            };

            await callback(callbackData);
            return;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "```js\nconst x = 10\n```",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    text: "Can you mint me this hat 0x0000000100020001000000000000000000000000000000000000000000000000?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "sure, minting now...",
                    action: "MINT_HAT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "can you mint this (0x0000000100020001000000000000000000000000000000000000000000000000) hat for me?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "sure, give me a sec",
                    action: "MINT_HAT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "```js\nconst x = 10\n```",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    text: "can you mint this hat for me 26960769425706402133074773335446698772097302206575744715499319066624?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "sure, minting now...",
                    action: "MINT_HAT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "can you mint this (26960769425706402133074773335446698772097302206575744715499319066624) hat for me?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "sure, give me a sec",
                    action: "MINT_HAT",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;

export default mintHatAction;
