import type {
    Action,
    Content,
    IAgentRuntime,
    Memory,
    HandlerCallback,
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

// TODO: This needs to be dynamic
const GUILD_NAME = "guild-master";

export const joinGroupChat: Action = {
    name: "JOIN_GROUP_CHAT",
    description:
        "Say the right thing and to join a secret group chat via Hats Protocol.",
    similes: ["JOIN_CHAT", "JOIN_GROUP"],
    validate: async (
        _runtime: IAgentRuntime,
        message: Memory,
        _state: State
    ) => {
        if (message.content.source !== "discord") {
            return false;
        }
        // only show if one of the keywords are in the message
        const keywords: string[] = ["join", "group", "chat", "mint", "hat"];
        return keywords.some((keyword) =>
            message.content.text.toLowerCase().includes(keyword.toLowerCase())
        );
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback: HandlerCallback
    ) => {
        try {
            const hatsSubgraphClient = new HatsSubgraphClient({
                config: DEFAULT_ENDPOINTS_CONFIG,
            });

            const hat = await hatsSubgraphClient.getHat({
                chainId: sepolia.id,
                hatId: BigInt(runtime.getSetting("HAT_ID") as `0x${string}`),
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
                throw new Error("Failed to mint hat for chat access!");
            }

            const callbackData: Content = {
                text: `You have successfully minted the hat that allows you to access the private chat!`,
                action: "JOIN_GROUP_CHAT_RESPONSE",
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
                    text: "I'd like access to the secret chat.",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Let more work on that for you.",
                    action: "JOIN_GROUP_CHAT",
                },
            },
        ],
    ],
};
