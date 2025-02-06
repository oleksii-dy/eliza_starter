import { type AgentRuntime } from "@elizaos/core";

import { AssetsResponse } from "./types";
import { formatPortfolio } from "./utils";

export const createCWDService = (runtime: AgentRuntime) => {
    const getAssets = async (apiKey: string): Promise<string> => {
        if (!apiKey) {
            throw new Error("Invalid parameters");
        }

        try {
            const cwdAPIUrl = runtime.getSetting("CWD_API_URL")
            const url = new URL(`${cwdAPIUrl}/assets/`);

            const response = await fetch(url, {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                },
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error?.message || response.statusText);
            }

            const rawData = await response.json();
            const data: AssetsResponse = { assets: rawData };

            return formatPortfolio(data);
        } catch (error) {
            console.error("CWD API Error:", error.message);
            throw error;
        }
    };

    return { getAssets };
};
