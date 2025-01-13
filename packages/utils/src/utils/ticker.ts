import {
    generateObject,
    composeContext,
    ModelClass,
    IAgentRuntime,
    Memory,
    HandlerCallback,
    State,
} from "@elizaos/core";
import { TickerSchema, Ticker } from "../types";
import { extractTickerFromMessageTemplate } from "../templates";
import { tickers } from "../data/ticker";
import fs from "fs";
import Path from "path";

export const extractTickerFromMessage = async (
    runtime: IAgentRuntime,
    _message: Memory,
    state?: State
) => {
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
        console.error(error);
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
