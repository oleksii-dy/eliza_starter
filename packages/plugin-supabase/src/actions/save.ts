import {
    type Action,
    type IAgentRuntime,
    type Memory,
    type State
} from "@elizaos/core";
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';  

dotenv.config();

// Get and validate environment variables
const SUPABASE_URL = process.env.SUPABASE_PLUGIN_URL;
const SUPABASE_KEY = process.env.SUPABASE_PLUGIN_ANON_KEY;

interface TwasProtocolData {
    listingContent: string[];
    contractAddress?: string;
    deployerAddress?: string;
    totalSupply?: string;
}

function extractDeploymentDetails(messages: Memory[]): Partial<TwasProtocolData> {
    const details: Partial<TwasProtocolData> = {};
    
    const deploymentMessage = messages.find(msg => 
        msg.content?.text?.includes("Token contract") && 
        msg.content?.text?.includes("deployed at")
    );

    if (deploymentMessage?.content?.text) {
        const text = deploymentMessage.content.text;
        
        const contractMatch = text.match(/deployed at (0x[a-fA-F0-9]{40})/i);
        if (contractMatch) {
            details.contractAddress = contractMatch[1];
        }
        
        const deployerMatch = text.match(/Deployer: (0x[a-fA-F0-9]{40})/i);
        if (deployerMatch) {
            details.deployerAddress = deployerMatch[1];
        }
        
        const supplyMatch = text.match(/Total supply: ([\d,]+)/i);
        if (supplyMatch) {
            details.totalSupply = supplyMatch[1];
        }
    }
    
    return details;
}

async function saveToSupabase(data: TwasProtocolData): Promise<boolean> {
    try {
        if (!data.listingContent.length) {
            return false;
        }

        if (!SUPABASE_URL || !SUPABASE_KEY) {
            throw new Error("Missing Supabase credentials");
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        
        const { error: testError } = await supabase.from('listings').select('count');
        if (testError) {
            return false;
        }

        const data_to_insert = {
            listing_id: uuidv4(),
            content: data.listingContent,
            contract_address: data.contractAddress,
            deployer_address: data.deployerAddress,
            total_supply: data.totalSupply,
            saved_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('listings')
            .insert([data_to_insert]);

        if (error) {
            return false;
        }

        return true;
    } catch (error) {
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
            if (!runtime) {
                return false;
            }

            if (!message?.content?.text) {
                return false;
            }

            if (!SUPABASE_URL || !SUPABASE_KEY) {
                return false;
            }

            return true;
        } catch (error) {
            return false;
        }
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<boolean> => {
        try {
            if (!runtime) {
                return false;
            }

            const recentMessages = state?.recentMessagesData;
            
            if (!recentMessages || recentMessages.length === 0) {
                return false;
            }

            const protocolData: TwasProtocolData = {
                listingContent: recentMessages.map(msg => msg.content.text)
            };

            const deploymentDetails = extractDeploymentDetails(recentMessages);
            Object.assign(protocolData, deploymentDetails);

            if (process.env.SUPABASE_DRY_RUN?.toLowerCase() === "true") {
                return true;
            }

            return await saveToSupabase(protocolData);
        } catch (error) {
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