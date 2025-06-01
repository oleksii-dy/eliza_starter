import {
    type Action,
    type Content,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
    logger,
} from '@elizaos/core';
import { callLLMWithTimeout } from '../utils/llmHelpers';
import { initializeClobClientWithCreds } from '../utils/clobClient';
import type { ClobClient } from '@polymarket/clob-client';
import { getOrderDetailsTemplate } from '../templates';
import type { OrderSide, OrderStatus } from '../types';

// Aligned with OpenOrder from @polymarket/clob-client/src/types.ts
// and assuming client.getOrder(orderId) returns this structure or a compatible one.
interface PolymarketOrderDetail {
    id: string;
    status: OrderStatus; // Use local OrderStatus enum/type if it maps to API status strings
    owner: string;
    maker_address: string;
    market: string; // condition_id
    asset_id: string; // token_id
    side: OrderSide; // Use local OrderSide enum/type
    original_size: string;
    size_matched: string;
    price: string;
    associate_trades?: string[];
    outcome?: string;
    created_at: number; // Unix timestamp (seconds or ms - client should clarify)
    expiration?: string; // ISO date string or timestamp
    order_type?: string; // e.g., "GTC"
    // Optional fields that might be specific to getOrder response or can be derived
    fees_paid?: string;
}

/**
 * Get order details by ID action for Polymarket.
 * Fetches detailed information for a specific order.
 */
export const getOrderDetailsAction: Action = {
    name: 'GET_ORDER_DETAILS',
    similes: [
        'ORDER_DETAILS',
        'GET_ORDER',
        'FETCH_ORDER',
        'SHOW_ORDER_INFO',
        'ORDER_STATUS',
    ],
    description: 'Get detailed information for a specific order by its ID.',

    validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
        logger.info(`[getOrderDetailsAction] Validate called for message: "${message.content?.text}"`);
        const clobApiUrl = runtime.getSetting('CLOB_API_URL');
        const clobApiKey = runtime.getSetting('CLOB_API_KEY');
        const clobApiSecret = runtime.getSetting('CLOB_API_SECRET') || runtime.getSetting('CLOB_SECRET');
        const clobApiPassphrase = runtime.getSetting('CLOB_API_PASSPHRASE') || runtime.getSetting('CLOB_PASS_PHRASE');
        const privateKey = runtime.getSetting('WALLET_PRIVATE_KEY') || runtime.getSetting('PRIVATE_KEY') || runtime.getSetting('POLYMARKET_PRIVATE_KEY');

        if (!clobApiUrl) {
            logger.warn('[getOrderDetailsAction] CLOB_API_URL is required');
            return false;
        }
        if (!privateKey) {
            logger.warn('[getOrderDetailsAction] A private key (WALLET_PRIVATE_KEY, PRIVATE_KEY, or POLYMARKET_PRIVATE_KEY) is required.');
            return false;
        }
        if (!clobApiKey || !clobApiSecret || !clobApiPassphrase) {
            const missing = [];
            if (!clobApiKey) missing.push('CLOB_API_KEY');
            if (!clobApiSecret) missing.push('CLOB_API_SECRET or CLOB_SECRET');
            if (!clobApiPassphrase) missing.push('CLOB_API_PASSPHRASE or CLOB_PASS_PHRASE');
            logger.warn(`[getOrderDetailsAction] Missing required API credentials for L2 authentication: ${missing.join(', ')}.`);
            return false;
        }
        logger.info('[getOrderDetailsAction] Validation passed');
        return true;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<Content> => {
        logger.info('[getOrderDetailsAction] Handler called!');

        let orderId: string | undefined;
        try {
            const llmResult = await callLLMWithTimeout<{ orderId?: string; error?: string }>(
                runtime,
                state,
                getOrderDetailsTemplate,
                'getOrderDetailsAction'
            );
            logger.info(`[getOrderDetailsAction] LLM result: ${JSON.stringify(llmResult)}`);
            if (llmResult?.error || !llmResult?.orderId) {
                throw new Error(llmResult?.error || 'Order ID not found in LLM result.');
            }
            orderId = llmResult.orderId;
        } catch (error) {
            logger.warn('[getOrderDetailsAction] LLM extraction failed, trying regex fallback');
            const text = message.content?.text || '';
            const orderIdRegex = /(?:order|ID)[:\s#]?([0-9a-zA-Z_\-]+(?:0x[0-9a-fA-F]+)?)/i;
            const match = text.match(orderIdRegex);
            if (match && match[1]) {
                orderId = match[1];
            } else {
                const errorMessage = 'Please specify an Order ID to get details.';
                logger.error(`[getOrderDetailsAction] Order ID extraction failed. Text: "${text}"`);
                const errorContent: Content = { text: `❌ **Error**: ${errorMessage}`, actions: ['GET_ORDER_DETAILS'], data: { error: errorMessage } };
                if (callback) await callback(errorContent);
                throw new Error(errorMessage);
            }
        }

        if (!orderId) {
            const errorMessage = 'Order ID is missing after extraction attempts.';
            logger.error(`[getOrderDetailsAction] ${errorMessage}`);
            const errorContent: Content = { text: `❌ **Error**: ${errorMessage}`, actions: ['GET_ORDER_DETAILS'], data: { error: errorMessage } };
            if (callback) await callback(errorContent);
            throw new Error(errorMessage);
        }

        logger.info(`[getOrderDetailsAction] Attempting to fetch details for Order ID: ${orderId}`);

        try {
            const client = await initializeClobClientWithCreds(runtime);
            const order = await client.getOrder(orderId);

            if (!order) {
                logger.warn(`[getOrderDetailsAction] Order not found for ID: ${orderId}`);
                const notFoundContent: Content = {
                    text: `🤷 **Order Not Found**: No order exists with the ID \`${orderId}\`.`,
                    actions: ['GET_ORDER_DETAILS'],
                    data: { error: 'Order not found', orderId, timestamp: new Date().toISOString() },
                };
                if (callback) await callback(notFoundContent);
                return notFoundContent;
            }

            const displayOrder = order as PolymarketOrderDetail; // Cast to our aligned interface

            let responseText = `📦 **Order Details: ${displayOrder.id}**\n\n`;
            responseText += `  **Market ID**: ${displayOrder.market}\n`;
            responseText += `  **Token ID**: ${displayOrder.asset_id}\n`;
            if (displayOrder.outcome) responseText += `  **Outcome**: ${displayOrder.outcome}\n`;
            responseText += `  **Side**: ${displayOrder.side}, **Type**: ${displayOrder.order_type || 'N/A'}\n`;
            responseText += `  **Status**: ${displayOrder.status}\n`;
            responseText += `  **Price**: ${displayOrder.price}\n`;
            responseText += `  **Size (Original)**: ${displayOrder.original_size}\n`;
            responseText += `  **Size (Matched)**: ${displayOrder.size_matched}\n`;
            if (displayOrder.fees_paid) responseText += `  **Fees Paid**: ${displayOrder.fees_paid}\n`;
            responseText += `  **Created**: ${new Date(displayOrder.created_at * 1000).toLocaleString()}\n`; // Assuming Unix seconds for created_at
            if (displayOrder.expiration) responseText += `  **Expiration**: ${new Date(displayOrder.expiration).toLocaleString()}\n`; // Assuming ISO string or ms timestamp
            if (displayOrder.associate_trades && displayOrder.associate_trades.length > 0) {
                responseText += `  **Associated Trades**: ${displayOrder.associate_trades.join(', ')}\n`;
            }

            const responseContent: Content = {
                text: responseText,
                actions: ['GET_ORDER_DETAILS'],
                data: { order: displayOrder, timestamp: new Date().toISOString() },
            };

            if (callback) await callback(responseContent);
            return responseContent;

        } catch (error) {
            logger.error(`[getOrderDetailsAction] Error fetching order ${orderId}:`, error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred.';
            const errorContent: Content = {
                text: `❌ **Error fetching order details for ${orderId}**: ${errorMessage}`,
                actions: ['GET_ORDER_DETAILS'],
                data: { error: errorMessage, orderId, timestamp: new Date().toISOString() },
            };
            if (callback) await callback(errorContent);
            throw error;
        }
    },

    examples: [
        [
            { name: '{{user1}}', content: { text: 'Get details for order 0x123abcxyz' } },
            { name: '{{user2}}', content: { text: "Fetching details for order 0x123abcxyz.", actions: ['GET_ORDER_DETAILS'] } }
        ],
        [
            { name: '{{user1}}', content: { text: 'order status myOrderID_123' } },
            { name: '{{user2}}', content: { text: "Let me get the status for order myOrderID_123.", actions: ['GET_ORDER_DETAILS'] } }
        ]
    ],
}; 