import {
    type Action,
    type IAgentRuntime,
    type Memory,
    type State
} from "@elizaos/core";
import dotenv from 'dotenv';

dotenv.config();

// Get and validate environment variables
const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN || 'twas-launched.myshopify.com';
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

async function createShopifyProduct(content: string[]): Promise<boolean> {
    try {
        if (!SHOPIFY_ACCESS_TOKEN) {
            throw new Error("Missing Shopify access token");
        }

        // Join the content array into a description, preserving line breaks
        const description = content.join('\n');

        const productData = {
            title: "New Listing", // You might want to extract a title from the content
            body_html: `<p>${description}</p>`,
            vendor: "TWAS Protocol",
            product_type: "Listing",
            status: "active",
            tags: "blockchain, listing, twas",
            variants: [
                {
                    price: "0.00", // You might want to extract price from content
                    inventory_quantity: 1,
                    requires_shipping: false,
                    taxable: false,
                    inventory_management: null
                }
            ]
        };

        const url = `https://${SHOPIFY_DOMAIN}/admin/api/2025-01/products.json`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
            },
            body: JSON.stringify({ product: productData })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create product: ${response.status} ${errorText}`);
        }

        return true;
    } catch (error) {
        console.error('Error creating Shopify product:', error);
        return false;
    }
}

export const ShopifyAction: Action = {
    name: "ADD_TO_SHOPIFY",
    similes: ["ADD", "CREATE", "PUBLISH"],
    description: "Add a listing as a product to Shopify store",
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

            if (!SHOPIFY_ACCESS_TOKEN) {
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

            const listingContent = recentMessages.map(msg => msg.content.text);

            if (process.env.SHOPIFY_DRY_RUN?.toLowerCase() === "true") {
                return true;
            }

            return await createShopifyProduct(listingContent);
        } catch (error) {
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Add this listing to Shopify" }
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll add this listing to our Shopify store.",
                    action: "ADD_TO_SHOPIFY"
                }
            }
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Create a Shopify product for this" }
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll create a Shopify product from this listing.",
                    action: "ADD_TO_SHOPIFY"
                }
            }
        ]
    ]
};