import {
    generateObject,
    composeContext,
    ModelClass,
    IAgentRuntime,
    Memory,
    HandlerCallback,
    State,
    elizaLogger,
} from "@elizaos/core";
import { TickerSchema, Ticker } from "../types";
import { extractTickerFromMessageTemplate, getCompetitorsTemplate } from "../templates";
import { tickers } from "../data/ticker";
import fs from "fs";
import Path from "path";
import { z } from "zod";

export const extractTickerFromMessage = async (
    runtime: IAgentRuntime,
    _message: Memory,
    state?: State
) => {
    state.currentQuery = _message.content.text ?? "";
    const context = composeContext({
        state,
        template: extractTickerFromMessageTemplate,
    });

    try {
        const response = await generateObject({
            context,
            modelClass: ModelClass.SMALL,
            runtime,
            schema: TickerSchema,
        });
        const { ticker } = response.object as Ticker;
        return ticker;
    } catch (error) {
        elizaLogger.error(error);
        return null;
    }
};

export const getCIKFromTicker = (ticker: string) => {
    const file = fs.readFileSync(
        Path.join(__dirname, "../data/ticker.txt"),
        "utf8"
    );
    const lines = file.split("\n");
    const cik = lines.find((line) => line.includes(ticker.toLowerCase()));
    return cik?.split("\t")[1];
};

export const generateRandomTicker = () => {
    const randomIndex = Math.floor(Math.random() * tickers.length);
    return tickers[randomIndex] as string;
};





interface CompetitorsResponse {
    tickers: string[];
}

const CompetitorsSchema = z.object({
    tickers: z.array(z.string())
});

export async function getCompetitors(
    runtime: IAgentRuntime,
    ticker: string
): Promise<string[]> {
    try {
        const context = composeContext({
            state: { ticker } as unknown as State,
            template: getCompetitorsTemplate
        });

        const response = await generateObject({
            context,
            modelClass: ModelClass.SMALL,
            runtime,
            schema: CompetitorsSchema
        });

        return (response.object as CompetitorsResponse).tickers;
    } catch (error) {
        console.error('Error getting competitors:', error);
        return [];
    }
}