import {
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    type Action,
    elizaLogger,
    composeContext,
    generateObject,
    ModelClass,
} from "@elizaos/core";
import { WalletProvider, walletProvider } from "../../providers/wallet";
import { formatBitcoinBalance, handleError } from "../../utils";
import { z } from "zod";
import { balanceTemplate } from "../../templates";

export const addressSchema = z.object({
    address: z.string(),
});

export default {
    name: "ORDINALS_GET_BALANCE",
    similes: ["GET_ORDINALS_BALANCE", "RETRIEVE_ORDINALS_BALANCE"],
    validate: async () => {
        return true;
    },
    description:
        "Retrieves the agents Ordinals wallet's payment wallet's BTC balance.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            const context = composeContext({
                state,
                template: balanceTemplate,
            });

            const content: { object: { address?: string } } =
                await generateObject({
                    runtime,
                    context,
                    schema: addressSchema,
                    modelClass: ModelClass.LARGE,
                });

            const address = content?.object?.address;
            const wallet: WalletProvider = await walletProvider.get(
                runtime,
                message,
                state
            );

            if (address && address !== "ME") {
                const balance = await wallet.getBalance(address);
                const formattedBalance = formatBitcoinBalance(balance);

                callback({
                    text: `The wallet ${address} has a balance of ${String(formattedBalance)} BTC.`,
                });

                return true;
            }

            const addresses = wallet.getAddresses();
            const balance = await wallet.getBalance();
            const paymentWallet = addresses.nestedSegwitAddress;

            /** Format Bitcoin balance so it doesn't appear as sats */
            const formattedBalance = formatBitcoinBalance(balance);

            callback({
                text: `You have a balance of ${String(formattedBalance)} BTC on your payment wallet: ${paymentWallet}`,
            });

            return true;
        } catch (error) {
            handleError(error, callback);
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What is my ordinals balance?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Your ordinals balance is: 0.01 BTC.",
                    action: "ORDINALS_GET_BALANCE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Hey, what is my ordinals balance?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "The balance on your payment wallet is: 0.02 BTC.",
                    action: "ORDINALS_GET_BALANCE",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
