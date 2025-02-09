import {
    ActionExample,
    Content,
    generateText,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    type Action,
    elizaLogger,
} from "@elizaos/core";
import { ethers } from "ethers";
// Import the compiled contract artifacts
import { abi, bytecode } from '../TwasToken.json';
import { ICreateListingRequest } from "../lib/api";
import { createEscrow } from "../lib/createEscrow";
import { createListing } from "../lib/supabase";

export const MintTokenAction: Action = {
    name: "MINT_TWAS_TOKEN",
    similes: ["CREATE_TWAS_TOKEN"],
    description: "Creates a new token with fixed supply of 10M tokens",
    handler: async (runtime: IAgentRuntime, message: Memory, state: State, options: object, callback: HandlerCallback) => {

        const recentMessages = state?.recentMessagesData;

        if (!recentMessages || recentMessages.length === 0) {
            return false;
        }

        const tokenMessage = recentMessages.find(msg =>
            msg.content?.text?.includes("2. Token")
        );

        let name = "TwasToken";
        let symbol = "TWAS";
        if (!!tokenMessage && tokenMessage.content?.text) {
            const text = tokenMessage.content.text;

            const nameMatch = text.match(/Token Name: (.*)/i);
            name = nameMatch ? nameMatch[1] : "TwasToken";

            const symbolMatch = text.match(/Symbol: (.*)/i);
            symbol = symbolMatch ? symbolMatch[1] : "TWAS";

        } else {
            console.log("TWAS: No token message found, using default name and symbol");
        }

        const fundingMessage = recentMessages.find(msg =>
            msg.content?.text?.includes("3. Funding Round")
        );

        let amount = "1000000000000000000"
        if (!!fundingMessage && fundingMessage.content?.text) {
            const text = fundingMessage.content.text;
            const amountMatch = text.match(/Amount for Sale: (.*)/i);
            amount = amountMatch ? amountMatch[1] : "1000000";
        } else {
            console.log("TWAS: No funding round message found, using default amount of 1000000");
        }


        try {
            // Get private key and RPC URL from environment
            const privateKey = process.env.TWAS_PRIVATE_KEY;
            const rpcUrl = process.env.TWAS_RPC_URL;

            if (!privateKey || !rpcUrl) {
                throw new Error("TWAS_PRIVATE_KEY or TWAS_RPC_URL not found in environment variables");
            }

            // Setup provider and wallet
            const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
            const wallet = new ethers.Wallet(privateKey, provider);

            // Create contract factory using local artifacts
            const factory = new ethers.ContractFactory(
                abi,
                bytecode,
                wallet
            );

            // Set a high manual gas limit since estimation fails
            const gasLimit = 5_000_000; // 5 million gas
            const gasPrice = await provider.getGasPrice();

            elizaLogger.debug("Deploying contract...");
            const deployTx = await factory.deploy(name, symbol, {
                gasLimit,
                gasPrice
            });
            await deployTx.deployed();

            elizaLogger.info("Contract deployed to:", deployTx.address);

            const createEscrowRequest: ICreateListingRequest = {
                content: recentMessages.map(msg => msg.content?.text).join(" | "),
                sellTokenAddress: deployTx.address as `0x${string}`,
                sellTokenAmount: amount,
                sellTokenPrice: "1",
                offerExpiresAt: 0,
            }

            console.log('createEscrowRequest', createEscrowRequest)

            const draftListing = await createEscrow(createEscrowRequest);

            console.log('draftListing', draftListing)
            const listing = await createListing(draftListing);

            callback(
                {
                    text: `Successfully deployed token contract at ${listing.sellTokenAddress} with 10,000,000 tokens minted. Be the first to invest ${process.env.TWAS_URL}/${listing.id}`,
                    contractAddress: deployTx.address,
                    totalSupply: 10000000
                },
                []
            );
        } catch (error) {
            elizaLogger.error("Error deploying token contract:", error);
            elizaLogger.error("Error details:", {
                message: error.message,
                stack: error.stack,
                reason: error.reason,
                code: error.code,
                data: error.data
            });
            callback(
                {
                    text: `Failed to deploy token contract: ${error.message}`,
                },
                []
            );
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Create a new token",
                    name: "MyTwasToken",
                    symbol: "TWAS"
                },
            },
            {
                user: "{{user2}}",
                content: { text: "Successfully deployed token contract at 0x... with 10,000,000 tokens minted to 0x..." },
            },
        ],
    ],
    validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
        return !!(process.env.TWAS_PRIVATE_KEY && process.env.TWAS_RPC_URL);
    }
};
