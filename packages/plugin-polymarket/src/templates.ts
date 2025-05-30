export const retrieveAllMarketsTemplate = `You are an AI assistant. Your task is to extract optional filter parameters for retrieving Polymarket prediction markets.

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Based on the conversation, identify any filters the user wants to apply:
- category: Market category filter (e.g., "politics", "sports", "crypto") - optional
- active: Whether to only show active markets (true/false) - optional  
- limit: Maximum number of results to return - optional

Respond with a JSON object containing only the extracted values.
The JSON should have this structure:
{
    "category"?: string,
    "active"?: boolean,
    "limit"?: number
}

If no specific filters are mentioned, you MUST respond with the following JSON structure:
{
    "error": "No specific filters requested. Fetching all available markets."
}
`;

export const getSimplifiedMarketsTemplate = `You are an AI assistant. Your task is to extract optional pagination parameters for retrieving simplified Polymarket markets.

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Based on the conversation, identify any pagination cursor:
- next_cursor: Pagination cursor for fetching next page (if mentioned)

Respond with a JSON object containing only the extracted values.
The JSON should have this structure:
{
    "next_cursor"?: string
}

If no pagination cursor is mentioned, you MUST respond with the following JSON structure:
{
    "error": "No pagination cursor requested. Fetching first page."
}
`;

export const getSamplingMarketsTemplate = `You are an AI assistant. Your task is to extract optional pagination parameters for retrieving Polymarket markets with rewards enabled (sampling markets).

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Based on the conversation, identify any pagination cursor:
- next_cursor: Pagination cursor for fetching next page (if mentioned)

Respond with a JSON object containing only the extracted values.
The JSON should have this structure:
{
    "next_cursor"?: string
}

If no pagination cursor is mentioned, you MUST respond with the following JSON structure:
{
    "error": "No pagination cursor requested. Fetching first page of sampling markets."
}
`;

export const getMarketTemplate = `You are an AI assistant. Your task is to extract market identification parameters from the user's message.

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Based on the conversation, identify:
- marketId: The specific market condition ID (if mentioned)
- query: Search terms or keywords to find markets
- tokenId: Specific token ID (if mentioned)

Respond with a JSON object containing only the extracted values.
The JSON should have this structure:
{
    "marketId"?: string,
    "query"?: string,
    "tokenId"?: string
}

If no valid market identifier is found, you MUST respond with the following JSON structure:
{
    "error": "Market identifier not found. Please specify a market ID, search terms, or token ID."
}
`;

export const orderTemplate = `You are an AI assistant. Your task is to extract order parameters from the user's message.

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Based on the conversation, identify:
- tokenId: The token ID for the market position (required)
- side: "buy" or "sell" (required)
- price: The price per share (0-1.0) (required)
- size: The quantity/size of the order (required)
- orderType: "limit" or "market" (optional, defaults to "limit")

Respond with a JSON object containing only the extracted values.
The JSON should have this structure:
{
    "tokenId": string,
    "side": "buy" | "sell",
    "price": number,
    "size": number,
    "orderType"?: "limit" | "market"
}

If any required parameters are missing, you MUST respond with the following JSON structure:
{
    "error": "Missing required order parameters. Please specify tokenId, side (buy/sell), price, and size."
}
`;

export const getOrderBookTemplate = `You are an AI assistant. Your task is to extract token identification parameters for retrieving order book data.

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Based on the conversation, identify:
- tokenId: The specific token ID for which to retrieve the order book (required)
- query: Search terms or keywords that might contain a token ID

Look for:
- Numbers following words like "token", "for token", "token ID", etc.
- Standalone numbers that could be token IDs
- Any numeric identifiers in the message

Examples:
- "Show order book for token 123456" → tokenId: "123456"
- "Get order book 789012" → tokenId: "789012"
- "ORDER_BOOK 345678" → tokenId: "345678"
- "token 999999" → tokenId: "999999"

Respond with a JSON object containing only the extracted values.
The JSON should have this structure:
{
    "tokenId"?: string,
    "query"?: string
}

If you find a token ID, always include it in the tokenId field.
If no valid token identifier is found, you MUST respond with the following JSON structure:
{
    "error": "Token identifier not found. Please specify a token ID for the order book."
}
`;

export const getOrderBookDepthTemplate = `You are an AI assistant. Your task is to extract token identification parameters for retrieving order book depth data.

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Based on the conversation, identify:
- tokenIds: Array of token IDs for which to retrieve order book depth (required)
- query: Search terms or keywords that might contain token IDs

Look for:
- Numbers following words like "token", "tokens", "for token", "token ID", etc.
- Standalone numbers that could be token IDs
- Multiple token IDs separated by commas, spaces, or other delimiters
- Any numeric identifiers in the message

Examples:
- "Show order book depth for token 123456" → tokenIds: ["123456"]
- "Get depth for tokens 123456, 789012" → tokenIds: ["123456", "789012"]
- "ORDER_BOOK_DEPTH 345678 999999" → tokenIds: ["345678", "999999"]
- "tokens 111111 222222 333333" → tokenIds: ["111111", "222222", "333333"]

Respond with a JSON object containing only the extracted values.
The JSON should have this structure:
{
    "tokenIds"?: string[],
    "query"?: string
}

If you find token IDs, always include them in the tokenIds array.
If no valid token identifiers are found, you MUST respond with the following JSON structure:
{
    "error": "Token identifiers not found. Please specify one or more token IDs for order book depth."
}
`;

export const getBestPriceTemplate = `You are an AI assistant. Your task is to extract token ID and side parameters for retrieving the best price for a market.

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Based on the conversation, identify:
- tokenId: The token identifier (required)
- side: Either "buy" or "sell" (required)

Look for:
- Numbers following words like "token", "for token", "token ID", etc.
- Standalone numbers that could be token IDs
- Side indicators like "buy", "sell", "bid", "ask"
- Note: "bid" maps to "sell" side, "ask" maps to "buy" side

Examples:
- "Get best price for token 123456 on buy side" → tokenId: "123456", side: "buy"
- "What's the sell price for token 789012" → tokenId: "789012", side: "sell"
- "Show best bid for token 456789" → tokenId: "456789", side: "sell"
- "Get ask price for 999999" → tokenId: "999999", side: "buy"

Respond with a JSON object containing only the extracted values.
The JSON should have this structure:
{
    "tokenId"?: string,
    "side"?: "buy" | "sell"
}

If you find both tokenId and side, include them in the response.
If no valid parameters are found, you MUST respond with the following JSON structure:
{
    "error": "Token ID or side not found. Please specify a token ID and side (buy/sell)."
}
`;

export const getMidpointPriceTemplate = `You are an AI assistant. Your task is to extract token identification parameters for retrieving midpoint price data.

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Based on the conversation, identify:
- tokenId: The specific token ID for which to retrieve the midpoint price (required)
- query: Search terms or keywords that might contain a token ID

Look for:
- Numbers following words like "token", "for token", "token ID", "market", etc.
- Standalone numbers that could be token IDs
- Any numeric identifiers in the message
- References to "midpoint", "mid price", "middle price"

Examples:
- "Get midpoint price for token 123456" → tokenId: "123456"
- "Show midpoint for market 789012" → tokenId: "789012"
- "MIDPOINT_PRICE 345678" → tokenId: "345678"
- "What's the mid price for token 999999" → tokenId: "999999"

Respond with a JSON object containing only the extracted values.
The JSON should have this structure:
{
    "tokenId"?: string,
    "query"?: string
}

If you find a token ID, always include it in the tokenId field.
If no valid token identifier is found, you MUST respond with the following JSON structure:
{
    "error": "Token identifier not found. Please specify a token ID for the midpoint price."
}
`;

export const getSpreadTemplate = `You are an AI assistant. Your task is to extract token identification parameters for retrieving spread data for a market.

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Based on the conversation, identify:
- tokenId: The specific token ID for which to retrieve the spread (required)
- query: Search terms or keywords that might contain a token ID

Look for:
- Numbers following words like "token", "for token", "token ID", "market", etc.
- Standalone numbers that could be token IDs
- Any numeric identifiers in the message
- References to "spread", "bid-ask spread", "market spread"

Examples:
- "Get spread for token 123456" → tokenId: "123456"
- "Show spread for market 789012" → tokenId: "789012"
- "SPREAD 345678" → tokenId: "345678"
- "What's the spread for token 999999" → tokenId: "999999"
- "Show me the bid-ask spread for 777777" → tokenId: "777777"

Respond with a JSON object containing only the extracted values.
The JSON should have this structure:
{
    "tokenId"?: string,
    "query"?: string
}

If you find a token ID, always include it in the tokenId field.
If no valid token identifier is found, you MUST respond with the following JSON structure:
{
    "error": "Token identifier not found. Please specify a token ID for the spread."
}
`;
