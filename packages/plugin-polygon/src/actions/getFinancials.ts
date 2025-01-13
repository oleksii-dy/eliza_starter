import {
    Action,
    IAgentRuntime,
    Memory,
    HandlerCallback,
    composeContext,
    State,
    generateText,
    elizaLogger,
    models,
    ModelProviderName,
    trimTokens,
    ModelClass,
} from "@elizaos/core";
import { getFinancialSummarization } from "../utils/polygon";
import { FinancialMapReduceSummarizationTemplate } from "../templates";
import { extractTickerFromMessage } from "@jawk/utils";

/**
 * Fetches and formats financial statements for a given ticker symbol
 * @param ticker - The stock ticker symbol (e.g., "AAPL")
 * @param type - The type of financial statement ("Y" for yearly, "Q" for quarterly)
 * @returns Formatted financial statement data
 */
export const getFinancials: Action = {
    name: "GET_FINANCIALS",
    similes: [
        "FETCH_FINANCIALS",
        "GET_FINANCIAL_DATA",
        "SHOW_FINANCIALS",
        "CHECK_FINANCIALS",
        "FINANCIAL_STATEMENTS",
        "COMPANY_FINANCIALS",
    ],
    description:
        "Fetches financial data and metrics for a company or stock ticker. Use this action when user asks about financial statements, earnings, revenue, or other financial metrics.",
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        return Boolean(process.env.POLYGON_API_KEY);
    },
    handler: async (
        runtime: IAgentRuntime,
        _message: Memory,
        state?: State,
        _options?: any,
        callback?: HandlerCallback
    ) => {
        try {
            const ticker = await extractTickerFromMessage(runtime, _message);
            console.log(ticker);
            if (!ticker) {
                callback?.(
                    { text: "Failed to extract ticker from message." },
                    []
                );
                return false;
            }

            const chunkSize =
                models[runtime.modelProvider].settings.maxInputTokens - 1000;

            const finalSummary = await getFinancialSummarization(
                ticker,
                runtime,
                state,
                _message,
                chunkSize
            );
            if (!finalSummary) {
                callback?.({ text: "Failed to get financial data." }, []);
                return false;
            }

            callback?.({ text: finalSummary });

            return true;
        } catch (error) {
            elizaLogger.error("Error getting financials:", error);
            callback?.({ text: "Failed to get financial data." }, []);
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What are Tesla's financials?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "",
                    action: "GET_FINANCIALS",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Show me Apple's earnings",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "",
                    action: "GET_FINANCIALS",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What's Microsoft's revenue?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "",
                    action: "GET_FINANCIALS",
                },
            },
        ],
    ],
};
