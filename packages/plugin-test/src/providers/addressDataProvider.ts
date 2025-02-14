import { elizaLogger, IAgentRuntime, Memory, Provider, State } from "@elizaos/core";
import { db, AddressRecord } from "../evaluators/addressDataEvaluator";

// TODO:
// the AI agent should be insistent on getting the name, address and blockchain name of the users wallet until it is provided.

const FIELD_GUIDANCE = {
    name: {
        description: "The users first name or full name",
        valid: "John, Alice, Vitalik",
        invalid: "nicknames, usernames, other people's names, or partial names",
        instructions: "Extract only when user directly states their own name"
    },
    address: {
        description: "The wallet address to track",
        valid: "V0x1234567890123456789012345678901234567890, HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH",
        invalid: "Incomplete addresses, exchange account numbers, or invalid formats",
        instructions: "Must be a valid blockchain address format"
    },
    chain: {
        description: "The blockchain network for the wallet address",
        valid: "ethereum, solana, bitcoin",
        invalid: "Unofficial chain names or abbreviations",
        instructions: "Extract only when user directly states the blockchain name"
    }
};

export const addressDataProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<string> => {
        try {
            const getPrimaryStmt = db.db.prepare(
                `SELECT * FROM addresses WHERE userId = ?`
            );
            const addressData = getPrimaryStmt
                .bind(message.userId)
                .get() as AddressRecord;

            elizaLogger.log("addressData", addressData);

            let response = `${runtime.character.name} has the goal of finding out your name, wallet address and blockchain name. Lex will ask directly for this information, before engaging further.\n\n`;

            // Handle known information
            const knownFields = [];
            if (addressData?.name) knownFields.push(`Name: ${addressData.name}`);
            if (addressData?.address) knownFields.push(`Address: ${addressData.address}`);
            if (addressData?.chain) knownFields.push(`Blockchain: ${addressData.chain}`);
            
            if (knownFields.length > 0) {
                response += "Known Information:\n";
                response += knownFields.map(field => `- ${field}`).join("\n");
                response += "\n\n";
            }

            // Check for missing fields
            const missingFields = ['name', 'address', 'chain'].filter(
                field => !addressData?.[field]
            );

            if (missingFields.length > 0) {
                response += "Missing Information and Extraction Guidelines:\n\n";
                missingFields.forEach(field => {
                    const guidance = FIELD_GUIDANCE[field];
                    response += `${field.charAt(0).toUpperCase() + field.slice(1)}:\n`;
                    response += `- Description: ${guidance.description}\n`;
                    response += `- Valid Examples: ${guidance.valid}\n`;
                    response += `- Do Not Extract: ${guidance.invalid}\n`;
                    response += `- Instructions: ${guidance.instructions}\n\n`;
                });

                response += "Overall Guidance:\n";
                response += "- Extract all missing information through direct questioning. Make sure to retrieve all required information as early into the conversation as possible.\n";
                response += "- Do not make assumptions or guesses about missing information.\n";
                response += "- If you cannot extract any information, respond with 'No information available'.\n\n";
            } else {
                response += "Status: All information has been collected.\n";
                response += "You can stop asking for more information.";
            }

            return response;

        } catch (error) {
            elizaLogger.error("Error in addressDataProvider:", error);
            return "An error occurred while fetching address information.";
        }
    }
}; 