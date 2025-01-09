import {
    elizaLogger,
    IAgentRuntime,
    Memory,
    State,
    Action,
    HandlerCallback,
} from "@ai16z/eliza";
import axios from "axios";

export const fetchVaultData: Action = {
    name: "FETCH_VAULT_DATA",
    similes: ["VAULT_INFO", "ETH_VAULT", "STAKEWISE_VAULT", "TVL_INFO"],
    description: "Fetch data from the StakeWise vault API, including APY and TVL.",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return true; // Always trigger for simplicity
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State | undefined,
        options: { [key: string]: unknown } = {},
        callback: HandlerCallback = async () => []
    ): Promise<boolean> => {
        elizaLogger.log("Handling FETCH_VAULT_DATA action.");

        // Compose state if not defined
        state = state || {
            bio: "",
            lore: "",
            messageDirections: "",
            postDirections: "",
            preDirections: "",
            tags: [],
            variables: {},
            roomId: "12345-67890-12345-67890-12345",
            actors: "",
            recentMessages: "",
            recentMessagesData: [],
        };

        // Define API endpoint and queries
        const apiUrl =
            "https://graphs.stakewise.io/mainnet/subgraphs/name/stakewise/prod";
        const vaultAddress = "0xac0f906e433d58fa868f936e8a43230473652885";

        const apyQuery = `query {
            vaults(where: { addressString: "${vaultAddress}" }) {
                apy
            }
        }`;

        const tvlQuery = `query {
            vault(id: "${vaultAddress}") {
                totalAssets
            }
        }`;

        // Detect user intent (APY, TVL, or both, etc.)
        const userQuestion = message.content?.text.toLowerCase() || ""; // Use `content.text` safely
        const askForApy = userQuestion.includes("apy");
        const askForTvl = userQuestion.includes("tvl");

        try {
            let responseText = "";

            // Fetch APY if requested
            if (askForApy || (!askForTvl && !askForApy)) {
                elizaLogger.log("Fetching APY from StakeWise API...");
                const apyResponse = await axios.post(apiUrl, { query: apyQuery }, {
                    headers: { "Content-Type": "application/json" },
                });

                const apyData = apyResponse.data.data.vaults[0];
                if (!apyData) {
                    throw new Error("APY data not found in the response.");
                }
                const formattedApy = parseFloat(apyData.apy).toFixed(2);
                responseText += `The APY for the StakeWise vault is ${formattedApy}%. `;
            }

            // Fetch TVL if requested
            if (askForTvl || (!askForTvl && !askForApy)) {
                elizaLogger.log("Fetching TVL from StakeWise API...");
                const tvlResponse = await axios.post(apiUrl, { query: tvlQuery }, {
                    headers: { "Content-Type": "application/json" },
                });

                const tvlData = tvlResponse.data.data.vault;
                if (!tvlData) {
                    throw new Error("TVL data not found in the response.");
                }
                const formattedTvl = (parseFloat(tvlData.totalAssets) / 1e18).toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                });
                responseText += `The TVL is ${formattedTvl} ETH.`;
            }

            // Send the response
            await callback({
                text: responseText.trim(),
                content: {
                    success: true,
                    data: {},
                },
            });
        } catch (error: any) {
            // Log detailed error information
            elizaLogger.error("Error fetching vault data:", {
                message: error.message,
                response: error.response ? error.response.data : "No response data",
                config: error.config,
            });

            // Inform the user about the failure
            await callback({
                text: "Failed to fetch the data. Please try again later.",
                content: {
                    success: false,
                    error: error.message,
                },
            });
        }

        return true; // Indicate success
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "What's the apy for the vault?" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "vault apy is 2.37%.",
                    action: "FETCH_VAULT_DATA",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "What's the tvl for the vault?" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "vault tvl is 66,500 eth.",
                    action: "FETCH_VAULT_DATA",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Can you tell me both APY and TVL for the vault?" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "vault apy is 2.37%, and TVL is 66,500 eth.",
                    action: "FETCH_VAULT_DATA",
                },
            },
        ],
    ],
};
