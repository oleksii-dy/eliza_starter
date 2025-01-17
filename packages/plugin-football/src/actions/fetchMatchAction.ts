import {
    Action,
    IAgentRuntime,
    Memory,
    State,
    elizaLogger,
} from "@elizaos/core";
import { isValidMatchData } from "../types";

export const fetchMatchAction: Action = {
    name: "FETCH_MATCH",
    similes: ["LIVE_MATCH", "GET_SCORE", "FETCH_MATCH"],
    description: "Fetch live match scores and events",
    validate: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ) => {
        const apiKey = runtime.getSetting("FOOTBALL_API_KEY");
        return !!apiKey;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<any> => {
        try {
            const apiKey = runtime.getSetting("FOOTBALL_API_KEY");
            const apiUrl = "https://api.football-data.org/v4/matches";

            const response = await fetch(apiUrl, {
                headers: { "X-Auth-Token": apiKey },
                signal: AbortSignal.timeout(5000),
            });

            if (!response.ok) {
                elizaLogger.error(
                    "Error fetching live match data:",
                    response.statusText
                );
                return false;
            }

            const matchData = await response.json();
            elizaLogger.log("Fetched match data:", matchData);

            if (!isValidMatchData(matchData)) {
                elizaLogger.error("Invalid match data format");
                return false;
            }
            return matchData;
        } catch (error) {
            elizaLogger.error("Error in fetchMatchAction:", error);
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What’s the score of the Chelsea vs Arsenal match?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "The latest score is Chelsea 1-2 Arsenal, full-time.",
                    action: "FETCH_MATCH",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Give me the latest score for today’s match!",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Sure! Let me check the live match details.",
                    action: "FETCH_MATCH",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What’s the score in the Premier League game?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "The score for the Premier League match is 2-1 in favor of Manchester United, full-time.",
                    action: "FETCH_MATCH",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "What’s the score for today’s matches?" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here are today’s live scores for the matches:",
                    action: "FETCH_MATCH",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Tell me the score for Arsenal vs Chelsea." },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Fetching the live score for Arsenal vs Chelsea...",
                    action: "FETCH_MATCH",
                },
            },
        ],
    ],
};
