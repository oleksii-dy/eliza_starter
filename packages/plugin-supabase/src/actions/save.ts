import {
    type Action,
    type IAgentRuntime,
    type Memory,
    type State,
    elizaLogger,
} from "@elizaos/core";
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';  


dotenv.config();

// Get and validate environment variables
const SUPABASE_URL = process.env.SUPABASE_PLUGIN_URL;
const SUPABASE_KEY = process.env.SUPABASE_PLUGIN_ANON_KEY;

// Validate environment variables on load
if (!SUPABASE_URL || !SUPABASE_KEY) {
    elizaLogger.error("Missing required Supabase environment variables", {
        hasUrl: !!SUPABASE_URL,
        hasKey: !!SUPABASE_KEY
    });
}

async function saveToSupabase(content: string): Promise<boolean> {
    try {
        if (!content) {
            elizaLogger.error("Empty content provided to saveToSupabase");
            return false;
        }

        elizaLogger.log("Initializing Supabase client", {
            hasUrl: !!SUPABASE_URL,
            hasKey: !!SUPABASE_KEY
        });

        if (!SUPABASE_URL || !SUPABASE_KEY) {
            throw new Error("Missing Supabase credentials");
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        
        // Test connection
        const { error: testError } = await supabase.from('listings').select('count');
        if (testError) {
            elizaLogger.error("Supabase connection test failed:", testError);
            return false;
        }

        const data = {
            listing_id: uuidv4(),  // Generate UUID for each new listing
            content,
        };

        const { error, data: result } = await supabase
            .from('listings')
            .insert([data]);

        if (error) {
            elizaLogger.error("Supabase insertion error:", {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint,
                data: data
            });
            return false;
        }

        elizaLogger.log("Save successful:", result);
        return true;
    } catch (error) {
        elizaLogger.error("Critical error in saveToSupabase:", {
            errorType: typeof error,
            errorMessage: error.message,
            errorStack: error.stack,
            errorName: error.name,
            supabaseUrl: SUPABASE_URL ? 'present' : 'missing',
            supabaseKey: SUPABASE_KEY ? 'present' : 'missing'
        });
        return false;
    }
}

export const saveAction: Action = {
    name: "SAVE_LISTING",
    similes: ["SAVE", "STORE", "RECORD"],
    description: "Save a listing to Supabase database",
    validate: async (
        runtime: IAgentRuntime,
        message: Memory,
        _state?: State
    ) => {
        try {
            // Validate runtime
            if (!runtime) {
                elizaLogger.error("Runtime is not defined");
                return false;
            }

            // Validate message structure
            if (!message?.content?.text) {
                elizaLogger.error("Invalid message format", {
                    hasMessage: !!message,
                    hasContent: !!message?.content,
                    hasText: !!message?.content?.text
                });
                return false;
            }

            // Validate Supabase credentials
            if (!SUPABASE_URL || !SUPABASE_KEY) {
                elizaLogger.error("Missing Supabase credentials");
                return false;
            }

            return true;
        } catch (error) {
            elizaLogger.error("Error in validate function:", {
                errorMessage: error.message,
                errorStack: error.stack
            });
            return false;
        }
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<boolean> => {
        try {
            // Add runtime validation
            if (!runtime) {
                elizaLogger.error("Runtime is not defined");
                return false;
            }

            // Add detailed message validation logging
            elizaLogger.log("Message received:", {
                hasMessage: !!message,
                messageType: typeof message,
                contentExists: !!message?.content,
                textExists: !!message?.content?.text,
                fullMessage: JSON.stringify(message, null, 2)
            });

            // Validate Supabase credentials
            if (!SUPABASE_URL || !SUPABASE_KEY) {
                elizaLogger.error("Supabase credentials missing", {
                    hasUrl: !!SUPABASE_URL,
                    hasKey: !!SUPABASE_KEY
                });
                return false;
            }

            const content = message?.content?.text;
            if (!content) {
                elizaLogger.error("No content to save");
                return false;
            }

            // Check for dry run mode
            if (process.env.SUPABASE_DRY_RUN?.toLowerCase() === "true") {
                elizaLogger.info("Dry run mode detected. Would have saved content:", content);
                return true;
            }

            return await saveToSupabase(content);
        } catch (error) {
            elizaLogger.error("Detailed handler error:", {
                errorMessage: error.message,
                errorName: error.name,
                errorStack: error.stack,
                errorDetails: error,
                runtime: !!runtime,
                message: message,
                state: state
            });
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Save this listing" }
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll save this listing to our database.",
                    action: "SAVE_LISTING"
                }
            }
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Store this information" }
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll store this information in the database.",
                    action: "SAVE_LISTING"
                }
            }
        ]
    ]
};
