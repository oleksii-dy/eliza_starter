/**
 * Template for cancel order LLM extraction
 */
export const cancelOrderTemplate = `
Extract the trade ID to cancel from the user's request:
- **tradeId** (number): The ID of the trade or order to cancel.

Provide the ID in the following JSON format:

\`\`\`json
{
    "tradeId": <trade_id>
}
\`\`\`

Here is the user's message for context:
{{userMessage}}

Previous conversation context:
{{conversation}}
`;

/**
 * Template for close order LLM extraction
 */
export const closeOrderTemplate = `
Extract the trade ID to close from the user's request:
- **tradeId** (number): The ID of the trade or order to close.

Provide the ID in the following JSON format:

\`\`\`json
{
    "tradeId": <trade_id>
}
\`\`\`

Here is the user's message for context:
{{userMessage}}

Previous conversation context:
{{conversation}}
`;

/**
 * Template for place order LLM extraction
 */
export const placeOrderTemplate = `
Extract the details needed to place a margin trading order from the user's request:
- **tokenType** (string): The type of collateral token to use (e.g., "BTC", "ETH", "USDC").
- **tokenAmount** (number): The amount of collateral to use.
- **targetTokenType** (string): The target token type (e.g., "BTC", "ETH", "USDC").
- **tradeDirection** (string): The direction of the trade, either "LONG" or "SHORT".
- **leverage** (number): The leverage to use (e.g., 2, 5, 10).
- **stopLoss** (number, optional): Stop loss price level.
- **takeProfit** (number, optional): Take profit price level.
- **limitPrice** (number, optional): Limit price for the order.

Provide the details in the following JSON format:

\`\`\`json
{
    "tokenType": "<token_type>",
    "tokenAmount": <amount>,
    "targetTokenType": "<target_token_type>",
    "tradeDirection": "<LONG or SHORT>",
    "leverage": <leverage>,
    "stopLoss": <stop_loss_price>,
    "takeProfit": <take_profit_price>,
    "limitPrice": <limit_price>
}
\`\`\`

Here is the user's message for context:
{{userMessage}}

Previous conversation context:
{{conversation}}
`;

/**
 * Template for get interest rate LLM extraction
 */
export const interestRateTemplate = `
Extract the token type to get the interest rate for:
- **targetTokenType** (string): The token type to get interest rate for (e.g., "BTC", "ETH", "USDC").

Provide the token in the following JSON format:

\`\`\`json
{
    "targetTokenType": "<token_type>"
}
\`\`\`

Here is the user's message for context:
{{userMessage}}

Previous conversation context:
{{conversation}}
`;

/**
 * Template for get top match LLM extraction
 */
export const topMatchTemplate = `
Extract the details needed to find the top match:
- **collateralType** (string): The type of collateral to match (e.g., "BTC", "ETH", "USDC").
- **collateralAmount** (number): The amount of collateral to match.

Provide the details in the following JSON format:

\`\`\`json
{
    "collateralType": "<collateral_type>",
    "collateralAmount": <amount>
}
\`\`\`

Here is the user's message for context:
{{userMessage}}

Previous conversation context:
{{conversation}}
`;

/**
 * Template for get PnL LLM extraction
 */
export const pnlTemplate = `
Extract the type of PnL information requested:
- **pnlType** (string): The type of PnL to retrieve. Must be one of: "OVERALL", "REALIZED", or "UNREALIZED".

Provide the PnL type in the following JSON format:

\`\`\`json
{
    "pnlType": "<OVERALL, REALIZED, or UNREALIZED>"
}
\`\`\`

Here is the user's message for context:
{{userMessage}}

Previous conversation context:
{{conversation}}
`;

/**
 * Template for get trade LLM extraction
 */
export const getTradeTemplate = `
Extract the trade ID to retrieve trade details for:
- **tradeId** (number): The ID of the trade to get details for.

Provide the ID in the following JSON format:

\`\`\`json
{
    "tradeId": <trade_id>
}
\`\`\`

Here is the user's message for context:
{{userMessage}}

Previous conversation context:
{{conversation}}
`;

/**
 * Template for get trades LLM extraction
 */
export const getTradesTemplate = `
Extract the filtering criteria for retrieving trades:
- **tradeDirection** (string, optional): Filter by trade direction. Must be one of: "LONG" or "SHORT".
- **status** (string, optional): Filter by trade status. Must be one of: "ACTIVE", "CLOSED", "CANCELLED", or "LIQUIDATED".

Provide the filters in the following JSON format:

\`\`\`json
{
    "tradeDirection": "<LONG or SHORT>",
    "status": "<ACTIVE, CLOSED, CANCELLED, or LIQUIDATED>"
}
\`\`\`

Here is the user's message for context:
{{userMessage}}

Previous conversation context:
{{conversation}}
`; 