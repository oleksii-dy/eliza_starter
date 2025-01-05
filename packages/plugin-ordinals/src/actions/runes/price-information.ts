import {
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    type Action,
    generateObject,
    composeContext,
    ModelClass,
} from "@elizaos/core";
import API from "../../utils/api";
import { z } from "zod";
import { runePriceInformationTemplate } from "../../templates";
import { dollarFormatter, handleError } from "../../utils";
import BigNumber from "bignumber.js";

export const runeSchema = z.object({
    rune: z.string(),
});

export default {
    name: "GET_RUNE_PRICE",
    similes: ["GET_PRICE_RUNE", "RETRIEVE_RUNE_PRICE"],
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
            const context = composeContext({
                state,
                template: runePriceInformationTemplate,
            });

            const content: { object: { rune?: string } } = await generateObject(
                {
                    runtime,
                    context,
                    schema: runeSchema,
                    modelClass: ModelClass.LARGE,
                }
            );

            const rune = content?.object?.rune;

            if (!rune) {
                throw new Error("Unable to find rune name in messages.");
            }

            const api = new API();

            const priceInfo = await api.getRunePrice(rune);

            const currentPrice = priceInfo.pricePerToken;
            const totalSupply = priceInfo?.supply?.current;
            const marketcap = new BigNumber(currentPrice)
                .multipliedBy(new BigNumber(totalSupply))
                .toNumber();

            callback({
                text: `The price of ${rune} is ${dollarFormatter.format(currentPrice)} per token with a market cap of: ${dollarFormatter.format(marketcap)}`,
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
                    text: "What is the price of GIZMO•IMAGINARY•KITTEN ?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "The price of GIZMO•IMAGINARY•KITTEN is:",
                    action: "GET_RUNE_PRICE",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
