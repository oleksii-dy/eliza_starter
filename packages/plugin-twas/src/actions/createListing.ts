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

const TARGET_ADDRESS = "0x532994474B85a2da0063a2d473B53a623459e443"; // Contract address
const FUNCTION_SIGNATURE = "increment()";
const LISTING_DATA = ethers.utils.id(FUNCTION_SIGNATURE).slice(0, 10); // Get first 4 bytes of the hash
const GAS_LIMIT_BUFFER = 1.2; // 20% buffer for gas limit

export const CreateListingAction: Action = {
    name: "CREATE_TWAS_LISTING",
    similes: ["POST_TWAS", "NEW_TWAS"],
    description: "Creates a new on-chain listing for twas",
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

            // Estimate gas with the actual transaction parameters
            const gasEstimate = await provider.estimateGas({
                to: TARGET_ADDRESS,
                data: LISTING_DATA,
                from: wallet.address,
            });

            // Add buffer to gas estimate
            const gasLimit = Math.floor(gasEstimate.toNumber() * GAS_LIMIT_BUFFER);

            // Create transaction
            const tx = {
                to: TARGET_ADDRESS,
                data: LISTING_DATA,
                gasPrice: await provider.getGasPrice(),
                gasLimit: gasLimit,
            };
            console.log("Sending transaction", tx);

            // Send transaction
            const txResponse = await wallet.sendTransaction(tx);
            elizaLogger.info("Transaction sent:", txResponse.hash);

            // Wait for confirmation
            const receipt = await txResponse.wait();
            elizaLogger.info("Transaction confirmed in block:", receipt.blockNumber);

            callback(
                {
                    text: `Successfully called ${FUNCTION_SIGNATURE}. Transaction hash: ${txResponse.hash}`,
                    transactionHash: txResponse.hash,
                },
                []
            );
        } catch (error) {
            elizaLogger.error(`Error calling ${FUNCTION_SIGNATURE}:`, error);
            callback(
                {
                    text: `Failed to call ${FUNCTION_SIGNATURE}. Please check the logs for more details.`,
                },
                []
            );
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Increment the counter" },
            },
            {
                user: "{{user2}}",
                content: { text: "Successfully called increment(). Transaction hash: 0x..." },
            },
        ],
    ],
    validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
        return !!(process.env.TWAS_PRIVATE_KEY && process.env.TWAS_RPC_URL);
    }
};
