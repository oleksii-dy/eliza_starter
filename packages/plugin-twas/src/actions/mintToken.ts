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
import { abi, bytecode } from '../TwasNFT.json';

export const MintTokenAction: Action = {
    name: "MINT_TWAS_NFT",
    similes: ["CREATE_TWAS_NFT"],
    description: "Creates a new NFT token with fixed supply of 10M tokens",
    handler: async (runtime: IAgentRuntime, message: Memory, state: State, options: object, callback: HandlerCallback) => {
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

            const name = message.content.name || "TwasNFT";
            const symbol = message.content.symbol || "TWAS";

            // Estimate deployment gas
            const deploymentGas = await factory.signer.estimateGas(
                factory.getDeployTransaction(name, symbol)
            );
            const gasLimit = Math.floor(deploymentGas.toNumber() * 1.2); // 20% buffer

            elizaLogger.debug("Deploying contract...");
            const deployTx = await factory.deploy(name, symbol, { gasLimit });
            await deployTx.deployed();

            elizaLogger.info("Contract deployed to:", deployTx.address);

            callback(
                {
                    text: `Successfully deployed NFT contract at ${deployTx.address} with 10,000,000 tokens minted to ${wallet.address}`,
                    contractAddress: deployTx.address,
                    totalSupply: 10000000
                },
                []
            );
        } catch (error) {
            elizaLogger.error("Error deploying NFT contract:", error);
            elizaLogger.error("Error details:", {
                message: error.message,
                stack: error.stack,
                reason: error.reason,
                code: error.code,
                data: error.data
            });
            callback(
                {
                    text: `Failed to deploy NFT contract: ${error.message}`,
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
                    text: "Create a new NFT token",
                    name: "MyTwasNFT",
                    symbol: "TWAS"
                },
            },
            {
                user: "{{user2}}",
                content: { text: "Successfully deployed NFT contract at 0x... with 10,000,000 tokens minted to 0x..." },
            },
        ],
    ],
    validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
        return !!(process.env.TWAS_PRIVATE_KEY && process.env.TWAS_RPC_URL);
    }
};
