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
import { dollarFormatter, handleError } from "../../utils";
import { formatUnits } from "viem";
import BigNumber from "bignumber.js";

export const addressSchema = z.object({
    address: z.string(),
});

export default {
    name: "RUNES_GET_PORTFOLIO",
    similes: ["GET_RUNES_PORTFOLIO", "RETRIEVE_RUNES_BALANCE"],
    validate: async () => {
        return true;
    },
    description: "Retrieves the agents Ordinals wallet's runes portfolio.",
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

            const api = new API();

            const balances = await api.getRunesPortfolio(taprootAddress);
            let balanceText = "";
            for (const balance of balances) {
                const formattedBalance = formatUnits(
                    BigInt(balance.amount),
                    balance.divisibility
                );

                const totalValue = new BigNumber(balance.currentPrice)
                    .multipliedBy(new BigNumber(formattedBalance))
                    .toNumber();

                const pastDayChange =
                    balance.priceChangePercentage24h.toFixed(2);
                const pastDayPositive = Number(pastDayChange) > 0;

                balanceText += `${balance.symbol} ${balance?.runeName}: ${formattedBalance} [Value: ${dollarFormatter.format(totalValue)}] (${pastDayPositive ? "+" : ""}${pastDayChange}%)\n`;
            }

            callback({
                text: `Runes portfolio for address ${taprootAddress}:\n\n${balanceText}`,
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
