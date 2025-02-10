import {
    Action,
    ActionExample,
    composeContext,
    generateObjectDeprecated,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
} from "@elizaos/core";
import { evmWalletProvider, initWalletProvider } from "@elizaos/plugin-evm";
import { GithubRegistry } from "@hyperlane-xyz/registry";
import { WriteCommandContext } from "../core/context";


export const sendCrossChainMessage: Action = {
    name: "SEND_CROSS_CHAIN_MESSAGE",
    similes: ["SEND_MESSAGE", "TRANSFER_MESSAGE", "CROSS_CHAIN_SEND"],
    description: "Send a message between any supported chains using Hyperlane",
    validate: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<boolean> => {
        const res = await evmWalletProvider.get(runtime, message, state);

        if (res) {
            return Promise.resolve(true);
        } else {
            return Promise.reject(false);
        }
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: {
            [key: string]: unknown;
        },
        callback?: HandlerCallback
    ) => {
        try {
            if (!state) {
                state = (await runtime.composeState(message)) as State;
            } else {
                state = await runtime.updateRecentMessageState(state);
            }

            // Compose swap context
            const sendContext = composeContext({
                state,
                template: "", // TODO: Add template
            });
            const content = await generateObjectDeprecated({
                runtime,
                context: sendContext,
                modelClass: ModelClass.LARGE,
            });

            const walletProvider = await initWalletProvider(runtime);
            const sourceClient = walletProvider.getPublicClient(
                content.sourceChain
            ) as Client<Transport, Chain, Account>;
            const targetClient = walletProvider.getPublicClient(
                content.sourceChain
            ) as Client<Transport, Chain, Account>;

            const sourceSigner = clientToSigner(sourceClient);
            const targetSigner = clientToSigner(targetClient);

            const registry = new GithubRegistry();
            const chainMetadata = await registry.getMetadata();
            const multiProvider = new MultiProvider(chainMetadata, {
                [content.sourceChain]: sourceSigner,
                [content.targetChain]: targetSigner,
            });

            const privateKey = runtime.getSetting(
                "EVM_PRIVATE_KEY"
            ) as `0x${string}`;
            if (!privateKey) {
                throw new Error("EVM_PRIVATE_KEY is missing");
            }

            const context: WriteCommandContext = {
                registry: registry, // Initialize with Hyperlane registry instance
                chainMetadata: chainMetadata, // Initialize with chain metadata
                multiProvider: multiProvider, // Initialize with multi-provider instance
                skipConfirmation: true, // Set based on requirements
                key: privateKey,
                signerAddress: await sourceSigner.getAddress(),
                signer: sourceSigner,
            };




            return Promise.resolve(true);
        } catch (error) {
            console.error(
                "Error in sendCrossChainMessage handler:",
                error.message
            );
            if (callback) {
                callback({ text: `Error: ${error.message}` });
            }

            return Promise.resolve(false);
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Send a message from Ethereum to Polygon",
                    options: {
                        sourceChain: "ethereum",
                        targetChain: "polygon",
                        recipientAddress: "0x1234...",
                        message: "Hello Cross Chain!",
                    },
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll send your message across chains.",
                    action: "SEND_CROSS_CHAIN_MESSAGE",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Successfully sent message across chains. Transaction hash: 0xabcd...",
                },
            },
        ],
    ] as ActionExample[][],
};
