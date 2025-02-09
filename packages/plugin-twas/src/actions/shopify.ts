import {
    type Action,
    type IAgentRuntime,
    type Memory,
    type State
} from "@elizaos/core";
import dotenv from 'dotenv';

dotenv.config();

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN || 'twas-launched.myshopify.com';
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

interface ListingMetadata {
    name: string;
    pricePerToken: number;
}

function parseMetadata(content: string[]): ListingMetadata {
    const fullText = content.join('\n');
    
    // Helper function to extract value after a label
    const extractValue = (text: string, label: string): string => {
        const regex = new RegExp(`${label}:\\s*([^\\n]+)`, 'i');
        const match = text.match(regex);
        return match ? match[1].trim() : '';
    };

    // Extract name and price
    const name = extractValue(fullText, 'Name');
    
    // Extract price (USDC)
    const priceMatch = fullText.match(/Price per token:\s*([\d.]+)\s*USDC/);
    const pricePerToken = priceMatch ? parseFloat(priceMatch[1]) : 0;

    return { name, pricePerToken };
}

async function createShopifyProduct(content: string[]): Promise<boolean> {
    try {
        if (!SHOPIFY_ACCESS_TOKEN) {
            throw new Error("Missing Shopify access token");
        }

        const metadata = parseMetadata(content);

        const productData = {
            title: `${metadata.name}`,
            body_html: `<p>Price per Token: ${metadata.pricePerToken} USDC</p>`,
            vendor: "TWAS Protocol",
            product_type: "Listing",
            status: "active",
            variants: [
                {
                    title: `${metadata.name} Token`,
                    price: metadata.pricePerToken,
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
            if (!runtime) return false;
            if (!message?.content?.text) return false;
            if (!SHOPIFY_ACCESS_TOKEN) return false;
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
            if (!runtime) return false;
            const recentMessages = state?.recentMessagesData;
            if (!recentMessages?.length) return false;

            const listingContent = recentMessages.map(msg => msg.content.text);
            if (process.env.SHOPIFY_DRY_RUN?.toLowerCase() === "true") return true;

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