import { elizaLogger, Evaluator, generateObject, IAgentRuntime, Memory, ModelClass } from "@elizaos/core";
import { SqliteDatabaseAdapter } from "@elizaos/adapter-sqlite";
import Database from "better-sqlite3";
import { z } from "zod";

// TODO:
// 1. evalutator should take the users name, address and blockchain name and store it in the database
// 2. goal complete when the user has provided their name, address and blockchain name

// Add an option to connect to a remote database when env variable is set
// Test database should be in a local file OR how do you clear memory

export const db = new SqliteDatabaseAdapter(new Database(":memory:"));

export interface AddressRecord {
    id: number;
    userId: string;
    name?: string;
    address?: string;
    chain?: string;
    created_at: string;
    updated_at: string;
}

const createTableSql = `
    CREATE TABLE IF NOT EXISTS addresses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        name TEXT,
        address TEXT,
        chain TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(userId, address)
    )
`;

// TODO:
// is there a prepare function in the sqlite adapter?
db.db.prepare(createTableSql).run();

export const isValidAddress = (address: string, chain?: string): boolean => {
    const patterns = {
        ethereum: /^0x[a-fA-F0-9]{40}$/,
        solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
        default: /^[a-zA-Z0-9]{32,}$/
    };

    const pattern = chain ? patterns[chain.toLowerCase()] : patterns.default;
    return pattern.test(address);
};

// Add this function to check if we have all required data
const isDataComplete = (userId: string): boolean => {
    const stmt = db.db.prepare(`
        SELECT name, address, chain 
        FROM addresses 
        WHERE userId = ?
    `);
    const result = stmt.get(userId) as AddressRecord;
    
    return !!(result?.name && result?.address && result?.chain);
};

export const addressDataEvaluator: Evaluator = {
    name: "GET_ADDRESS_DATA",
    similes: ["GET_WALLET_ADDRESS", "GET_WALLET_INFO"],
    description: "Extract user's name and wallet addresses",
    alwaysRun: false, // Changed to false since we want it to stop when complete

    validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
        try {
            // Check if we already have complete data for this user
            const complete = isDataComplete(message.userId);
            return !complete; // Only continue if data is incomplete
        } catch (error) {
            elizaLogger.error({ error }, "Error in addressDataEvaluator validate");
            return false;
        }
    },

    handler: async (runtime: IAgentRuntime, message: Memory): Promise<void> => {
        try {
            elizaLogger.log({ phase: "start" }, "Starting addressDataEvaluator handler");

            const extractionTemplate = `
            Analyze the following conversation and extract name, wallet address and blockchain name.
            Directly ask the user for their name, wallet address and blockchain name.
            Only extract information when it is clearly and explicitly stated by the user about their wallet addresses.
            
            Conversation:
            ${message.content.text}
            
            Return a JSON object with the extracted information:
            {
                "action": "add_primary",
                "addressInfo": {
                    "name": "name of the person",
                    "address": "wallet address",
                    "chain": "blockchain name",
                }
            }
            
            Only include fields where information is explicitly stated.
            Omit fields if information is unclear or incomplete.
            `;

            const addressDataSchema = z.object({
                action: z.enum(["add_primary"]),
                addressInfo: z.object({
                    name: z.string().optional().nullable(),
                    address: z.string().optional().nullable(),
                    chain: z.string().optional().nullable(),
                })
            });

            // TODO:
            // what does this do?
            // Infer the type from the schema
            type AddressExtraction = z.infer<typeof addressDataSchema>;

            const extractedInfo = await generateObject({
                runtime,
                context: extractionTemplate,
                modelClass: ModelClass.SMALL,
                mode: "json",
                schema: addressDataSchema,
                schemaName: "AddressData",
                schemaDescription: "Information about the users wallet address"
            });

            elizaLogger.log({ extractedInfo }, "Extraction result");

            const info = extractedInfo.object as AddressExtraction;

            // TODO:
            // prompt the user to check the address if false
            // Validate the address
            if (info.addressInfo.address && !isValidAddress(info.addressInfo.address, info.addressInfo.chain)) {
                elizaLogger.error({ address: info.addressInfo }, "Invalid address format");
                return;
            }

            const stmt = db.db.prepare(`
                INSERT OR REPLACE INTO addresses (userId, name, address, chain)
                VALUES (?, ?, ?, ?)
            `);
            
            stmt.run(
                message.userId,
                info.addressInfo.name || null,
                info.addressInfo.address || null,
                info.addressInfo.chain || null
            );

            // Check if we now have complete data
            const complete = isDataComplete(message.userId);
            
            if (complete) {
                elizaLogger.success({ userId: message.userId }, "User data collection completed");
            }

        } catch (error) {
            elizaLogger.error({ error }, "Error in addressDataEvaluator handler");
        }
    },

    examples: [
        {
            context: "Adding user address",
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        text: "Hi, I'm John and my Ethereum wallet is 0x1234567890123456789012345678901234567890"
                    }
                }
            ],
            outcome: `{
                "name": "John",
                "address": "0x1234567890123456789012345678901234567890",
                "chain": "ethereum"
            }`
        },
        {
            context: "Adding partial information",
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        text: "Hi, I'm Ben"
                    }
                }
            ],
            outcome: `{
                "name": "Ben",
            }`
        },
        {
            context: "Adding a users address",
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        text: "Hi, my Ethereum wallet is 0x1234567890123456789012345678901234567890"
                    }
                }
            ],
            outcome: `{
                "address": "0x1234567890123456789012345678901234567890",
                "chain": "ethereum"
            }`
        }
    ]
}; 