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
import { handleError, rareSatEmojis } from "../../utils";

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
            const rareSats = await ordiscan.getRareSats(taprootAddress);

            let countRareSats = {};
            for (const sat of rareSats.rareSats) {
                for (const range of sat.sat_ranges) {
                    for (const r of range.satributes) {
                        if (!countRareSats[r]) {
                            countRareSats[r] = 0;
                        }
                        countRareSats[r] += sat.value;
                    }
                }
            }

            let rareSatText = "";

            for (const satribute of Object.keys(countRareSats)) {
                rareSatText += `${rareSatEmojis[satribute.toLowerCase()] ? rareSatEmojis[satribute.toLowerCase()] : ""} ${satribute} - ${countRareSats[satribute]} sats\n`;
            }

            callback({
                text: `Rare sats in the following address: ${taprootAddress}:\n\n${rareSatText}\n\nTotal rare sats: ${Object.keys(countRareSats)?.length || 0}`,
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
                    text: "What rare sats do I own?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Rare sats in the following address:",
                    action: "GET_RARE_SATS_ADDRESS",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
