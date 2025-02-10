import { elizaLogger, IAgentRuntime, Memory, Provider, State } from "@elizaos/core";
import { db, AddressRecord, ADDRESS_TYPES } from "../evaluators/addressDataEvaluator";

const FIELD_GUIDANCE = {
    name: {
        description: "The name of the wallet owner",
        valid: "Your name for primary wallets, or a person's name for watchlist entries",
        examples: "John, Alice, Vitalik",
        invalid: "nicknames, usernames, other people's names, or partial names",
        required: true,
        instructions: "Extract only when user directly states their own name, or the name of the watchlist entry. Must be provided for both primary wallets and watchlist entries"
    },
    address: {
        description: "The wallet address to track",
        valid: "Valid blockchain addresses",
        examples: {
            ethereum: "0x1234567890123456789012345678901234567890",
            solana: "HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH"
        },
        invalid: "Incomplete addresses, exchange account numbers, or invalid formats",
        required: true,
        instructions: "Must be a valid blockchain address format"
    },
    chain: {
        description: "The blockchain network for the wallet address",
        valid: "Known blockchain networks",
        examples: "ethereum, solana, bitcoin",
        invalid: "Unofficial chain names or abbreviations",
        required: false,
        instructions: "Optional but helpful for address validation and tracking"
    },
    label: {
        description: "A descriptive name for the wallet",
        valid: "Purpose or context of the wallet",
        examples: "DeFi wallet, gaming wallet, savings wallet, hot wallet, cold storage",
        invalid: "Very long descriptions or temporary labels",
        required: false,
        instructions: "Optional but useful for organizing multiple wallets"
    }
};

export const addressDataProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<string> => {
        try {
            const getPrimaryStmt = db.db.prepare(
                `SELECT * FROM addresses WHERE userId = ? AND type = ?`
            );
            const primaryAddresses = getPrimaryStmt
                .bind(message.userId, ADDRESS_TYPES.PRIMARY)
                .all() as AddressRecord[];

            const getWatchlistStmt = db.db.prepare(
                `SELECT * FROM addresses WHERE userId = ? AND type = ?`
            );
            const watchlistAddresses = getWatchlistStmt
                .bind(message.userId, ADDRESS_TYPES.WATCHLIST)
                .all() as AddressRecord[];

            let response = `${runtime.character.name} has the goal of finding out your name and wallet address.\n\n`;

            // Show current addresses if any exist
            if (primaryAddresses.length > 0) {
                response += "Your current wallets:\n";
                primaryAddresses.forEach((addr: AddressRecord) => {
                    response += `- ${addr.name}: ${addr.address}`;
                    if (addr.label) response += ` (${addr.label})`;
                    if (addr.chain) response += ` [${addr.chain}]`;
                    response += "\n";
                });
                response += "\n";
            }

            if (watchlistAddresses.length > 0) {
                response += "Your watchlist:\n";
                watchlistAddresses.forEach((addr: AddressRecord) => {
                    response += `- ${addr.name}: ${addr.address}`;
                    if (addr.label) response += ` (${addr.label})`;
                    if (addr.chain) response += ` [${addr.chain}]`;
                    response += "\n";
                });
                response += "\n";
            }

            // If no addresses are stored, provide initial guidance
            if (primaryAddresses.length === 0) {
                response += "To get started, please provide your first wallet address with the following information:\n\n";
            }

            // Field guidance
            response += "Required and Optional Information:\n\n";
            
            Object.entries(FIELD_GUIDANCE).forEach(([field, guidance]) => {
                response += `${field.charAt(0).toUpperCase() + field.slice(1)}:\n`;
                response += `- Description: ${guidance.description}\n`;
                response += `- Valid Examples: ${typeof guidance.examples === 'object' 
                    ? Object.entries(guidance.examples).map(([k, v]) => `${k}: ${v}`).join(', ') 
                    : guidance.examples}\n`;
                if (guidance.invalid) {
                    response += `- Do Not Use: ${guidance.invalid}\n`;
                }
                response += `- Required: ${guidance.required ? "Yes" : "No"}\n`;
                response += `- Instructions: ${guidance.instructions}\n\n`;
            });

            response += "Overall Guidance:\n";
            response += "- Extract all missing information through direct questioning. Make sure to retrieve all required information as early into the conversation as possible.\n";
            response += "- Do not make assumptions or guesses about missing information.\n";
            response += "- If you cannot extract any information, respond with 'No information available'.\n\n";

            return response;

        } catch (error) {
            elizaLogger.error("Error in addressDataProvider:", error);
            return "An error occurred while fetching address information.";
        }
    }
}; 