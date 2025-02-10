import { elizaLogger, Evaluator, generateObject, IAgentRuntime, Memory, ModelClass } from "@elizaos/core";
import { SqliteDatabaseAdapter } from "@elizaos/adapter-sqlite";
import Database from "better-sqlite3";
import { z } from "zod";

// Make db accessible to other files
export const db = new SqliteDatabaseAdapter(new Database(":memory:"));

// Add type definition
export type AddressType = 'primary' | 'watchlist';

// Add interface for database records
export interface AddressRecord {
    id: number;
    userId: string;
    name: string;
    address: string;
    chain?: string;
    label?: string;
    type: AddressType;
    created_at: string;
    updated_at: string;
}

// Add constants for address types
export const ADDRESS_TYPES = {
    PRIMARY: 'primary' as AddressType,
    WATCHLIST: 'watchlist' as AddressType,
} as const;

// Create the addresses table
const createTableSql = `
    CREATE TABLE IF NOT EXISTS addresses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        chain TEXT,
        label TEXT,
        type TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(userId, address)
    )
`;

db.db.prepare(createTableSql).run();

// Helper function to validate addresses based on chain type
const isValidAddress = (address: string, chain?: string): boolean => {
    const patterns = {
        ethereum: /^0x[a-fA-F0-9]{40}$/,
        solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
        // Add more chain patterns as needed
        default: /^[a-zA-Z0-9]{32,}$/ // Generic pattern for unknown chains
    };

    const pattern = chain ? patterns[chain.toLowerCase()] || patterns.default : patterns.default;
    return pattern.test(address);
};

// Define the schema using zod
const addressDataSchema = z.object({
    action: z.enum(["add_primary", "remove_primary", "add_watchlist", "remove_watchlist"]),
    addressInfo: z.object({
        name: z.string(),
        address: z.string(),
        chain: z.string().optional(),
        label: z.string().optional()
    })
});

// Infer the type from the schema
type AddressExtraction = z.infer<typeof addressDataSchema>;

export const addressDataEvaluator: Evaluator = {
    name: "GET_ADDRESS_DATA",
    similes: ["GET_WALLET_ADDRESS", "GET_WALLET_INFO"],
    description: "Extract user's wallet addresses and manage watchlist addresses",
    alwaysRun: true,

    validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
        try {
            elizaLogger.log({ message: "Validate called" }, "Validate function called");
            return true;
        } catch (error) {
            elizaLogger.error({ error }, "Error in addressDataEvaluator validate");
            return false;
        }
    },

    handler: async (runtime: IAgentRuntime, message: Memory): Promise<void> => {
        try {
            elizaLogger.log({ phase: "start" }, "Starting addressDataEvaluator handler");

            const extractionTemplate = `
            Analyze the following conversation to extract wallet address information.
            Extract information about adding, updating, or removing wallet addresses.
            
            Conversation:
            ${message.content.text}
            
            Return a JSON object with the extracted information:
            {
                "action": "add_primary" | "remove_primary" | "add_watchlist" | "remove_watchlist",
                "addressInfo": {
                    "name": "name of the person",
                    "address": "wallet address",
                    "chain": "blockchain name if specified",
                    "label": "wallet label if provided"
                }
            }
            
            Only include fields where information is explicitly stated.
            Omit fields if information is unclear or incomplete.
            `;

            const extractedInfo = await generateObject({
                runtime,
                context: extractionTemplate,
                modelClass: ModelClass.SMALL,
                mode: "json",
                schema: addressDataSchema,
                schemaName: "AddressData",
                schemaDescription: "Information about wallet addresses and their owners"
            });

            elizaLogger.log({ extractedInfo }, "Extraction result");

            const info = extractedInfo.object as AddressExtraction;

            // Validate the address
            if (!isValidAddress(info.addressInfo.address, info.addressInfo.chain)) {
                elizaLogger.error({ address: info.addressInfo }, "Invalid address format");
                return;
            }

            switch (info.action) {
                case "add_primary": {
                    const stmt = db.db.prepare(`
                        INSERT OR REPLACE INTO addresses (userId, name, address, chain, label, type)
                        VALUES (?, ?, ?, ?, ?, ?)`
                    );
                    stmt.run(
                        message.userId,
                        info.addressInfo.name,
                        info.addressInfo.address,
                        info.addressInfo.chain || null,
                        info.addressInfo.label || null,
                        ADDRESS_TYPES.PRIMARY
                    );
                    break;
                }

                case "remove_primary": {
                    const stmt = db.db.prepare(
                        `DELETE FROM addresses WHERE userId = ? AND address = ? AND type = ?`
                    );
                    stmt.run(message.userId, info.addressInfo.address, ADDRESS_TYPES.PRIMARY);
                    break;
                }

                case "add_watchlist": {
                    const stmt = db.db.prepare(`
                        INSERT OR REPLACE INTO addresses (userId, name, address, chain, label, type)
                        VALUES (?, ?, ?, ?, ?, ?)`
                    );
                    stmt.run(
                        message.userId,
                        info.addressInfo.name,
                        info.addressInfo.address,
                        info.addressInfo.chain || null,
                        info.addressInfo.label || null,
                        ADDRESS_TYPES.WATCHLIST
                    );
                    break;
                }

                case "remove_watchlist": {
                    const stmt = db.db.prepare(
                        `DELETE FROM addresses WHERE userId = ? AND address = ? AND type = ?`
                    );
                    stmt.run(message.userId, info.addressInfo.address, ADDRESS_TYPES.WATCHLIST);
                    break;
                }
            }

            // Get updated addresses
            const getPrimaryStmt = db.db.prepare(
                `SELECT * FROM addresses WHERE userId = ? AND type = ?`
            );
            const primaryAddresses = getPrimaryStmt.all([message.userId, ADDRESS_TYPES.PRIMARY]) as AddressRecord[];

            const getWatchlistStmt = db.db.prepare(
                `SELECT * FROM addresses WHERE userId = ? AND type = ?`
            );
            const watchlistAddresses = getWatchlistStmt.all([message.userId, ADDRESS_TYPES.WATCHLIST]) as AddressRecord[];

            // Create response message
            const responseText = `Updated address information:\n\n` +
                `Primary Addresses:\n${primaryAddresses.map((addr: AddressRecord) => 
                    `- ${addr.name}: ${addr.address}${addr.label ? ` (${addr.label})` : ''}${addr.chain ? ` [${addr.chain}]` : ''}`
                ).join('\n')}\n\n` +
                `Watchlist:\n${watchlistAddresses.map((addr: AddressRecord) => 
                    `- ${addr.name}: ${addr.address}${addr.label ? ` (${addr.label})` : ''}${addr.chain ? ` [${addr.chain}]` : ''}`
                ).join('\n')}`;

            const newMemory: Memory = {
                userId: message.userId,
                roomId: message.roomId,
                agentId: message.agentId,
                content: {
                    text: responseText,
                    action: "ADDRESS_UPDATE",
                    source: message.content?.source,
                }
            };

            await runtime.messageManager.createMemory(newMemory);

        } catch (error) {
            elizaLogger.error("Error in addressDataEvaluator:", error);
        }
    },

    examples: [
        {
            context: "Adding primary address",
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        text: "Hi, I'm John and my Ethereum wallet is 0x1234567890123456789012345678901234567890"
                    }
                }
            ],
            outcome: `{
                "action": "add_primary",
                "addressInfo": {
                    "name": "John",
                    "address": "0x1234567890123456789012345678901234567890",
                    "chain": "ethereum"
                }
            }`
        },
        {
            context: "Adding labeled wallet",
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        text: "Add my gaming wallet: 0x9876543210987654321098765432109876543210 on Ethereum"
                    }
                }
            ],
            outcome: `{
                "action": "add_primary",
                "addressInfo": {
                    "name": "John",
                    "address": "0x9876543210987654321098765432109876543210",
                    "chain": "ethereum",
                    "label": "gaming wallet"
                }
            }`
        },
        {
            context: "Adding to watchlist",
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        text: "Add Vitalik's address 0xd8da6bf26964af9d7eed9e03e53415d37aa96045 to my watchlist"
                    }
                }
            ],
            outcome: `{
                "action": "add_watchlist",
                "addressInfo": {
                    "name": "Vitalik",
                    "address": "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
                    "chain": "ethereum"
                }
            }`
        }
    ]
}; 