import {
    Action,
    IAgentRuntime,
    Memory,
    State,
    elizaLogger,
} from "@elizaos/core";
import { StandingsData } from "../types";

export const fetchStandingsAction: Action = {
    name: "FETCH_STANDINGS",
    similes: ["GET_TABLE", "LEAGUE_STANDINGS"],
    description: "Fetch current league standings",
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
            const league = runtime.getSetting("LEAGUE_ID") || "PL";
            const apiKey = runtime.getSetting("FOOTBALL_API_KEY");
            const apiUrl = `https://api.football-data.org/v4/competitions/${league}/standings`;

            const response = await fetch(apiUrl, {
                headers: { "X-Auth-Token": apiKey },
            });

            if (!response.ok) {
                elizaLogger.error(
                    "Error fetching standings data:",
                    response.statusText
                );
                return false;
            }

            const standingsData = await response.json();
            elizaLogger.log("Fetched standings data:", standingsData);

            return standingsData as StandingsData;
        } catch (error) {
            elizaLogger.error("Error in fetchStandingsAction:", error);
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What are the current standings in the Premier League?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "The top 2 teams are: 1. Manchester City - 45 points, 2. Arsenal - 42 points.",
                    action: "FETCH_STANDINGS",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Give me the table for La Liga" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "The top 3 teams in La Liga are: 1. Barcelona, 2. Real Madrid, 3. Atletico Madrid.",
                    action: "FETCH_STANDINGS",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Check the Serie A table for me." },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Serie A current standings: Juventus 1st, AC Milan 2nd, Inter Milan 3rd.",
                    action: "FETCH_STANDINGS",
                },
            },
        ],
    ],
};
