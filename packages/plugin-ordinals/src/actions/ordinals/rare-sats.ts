import {
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    type Action,
    elizaLogger,
    generateObject,
    composeContext,
    ModelClass,
} from "@elizaos/core";
import { WalletProvider, walletProvider } from "../../providers/wallet";
import API from "../../utils/api";
import { z } from "zod";
import { balanceTemplate } from "../../templates";
import { handleError } from "../../utils";

export const addressSchema = z.object({
    address: z.string(),
});

export default {
    name: "GET_RARE_SATS_ADDRESS",
    similes: ["GET_RARE_SATS", "RETRIEVE_RETRIEVE_RARE_SATS"],
    validate: async () => {
        return true;
    },
    description: "Retrieves the rare sats of given address or Agents wallet.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            const wallet: WalletProvider = await walletProvider.get(
                runtime,
                message,
                state
            );

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

            const derivedAddress = content?.object?.address;

            const addresses = wallet.getAddresses();
            const taprootAddress =
                derivedAddress === "ME"
                    ? addresses.taprootAddress
                    : derivedAddress;

            const ordiscan = new API();
            const portfolio = await ordiscan.getRunesPortfolio(taprootAddress);

            const balances = portfolio?.results;

            callback({
                text: `Runes portfolio for address ${taprootAddress}:\n${balances?.map((item, idx) => `${idx + 1}: ${item?.rune?.spaced_name} - ${item.balance}\n`)}`,
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
                    text: "What does my Runes portfolio look like?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Your runes portfolio:",
                    action: "RUNES_GET_PORTFOLIO",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What is my runes balance?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Your runes portfolio:",
                    action: "RUNES_GET_PORTFOLIO",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
