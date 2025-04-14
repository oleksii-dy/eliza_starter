import { Plugin, Client } from "@elizaos/core";
import { clients } from '../globalClients';

// Define the Twitter client
const twitterClient: Client = {
    name: 'twitter',
    start: async (runtime) => {
        // Return a client instance that can be stopped
        return {
            stop: async (runtime) => {
                // Add cleanup logic here if needed
            }
        };
    }
};

// Create the Twitter plugin
export const twitterPlugin: Plugin = {
    name: 'twitter',
    description: 'Twitter integration plugin',
    clients: [twitterClient]
}; 