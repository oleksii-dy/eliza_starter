export const getDerivativeMarketsTemplate = `
Query derivative markets with the following parameters:

Request Format:
\`\`\`json
{
    "quoteDenom": string | null,     // Optional quote denomination filter
    "marketStatus": string | null,    // Optional market status filter
    "marketStatuses": string[] | null // Optional array of market statuses
}
\`\`\`

Example Request:
\`\`\`json
{
    "quoteDenom": "USDT",
    "marketStatus": "active",
    "marketStatuses": ["active", "paused"]
}
\`\`\`

Response Format:
\`\`\`json
{
    "markets": [
        {
            "marketId": string,           // Unique market identifier
            "marketStatus": string,       // Current market status
            "ticker": string,             // Market ticker symbol
            "quoteDenom": string,         // Quote denomination
            "makerFeeRate": string,       // Maker fee rate
            "takerFeeRate": string,       // Taker fee rate
            "serviceProvider": string,    // Service provider address
            "minQuantityTick": string,    // Minimum quantity tick size
            "minPriceTick": string        // Minimum price tick size
        }
    ],
    "pagination": {
        "next": string | null,        // Next page token
        "total": number              // Total number of markets
    }
}
\`\`\`
`;

export const getDerivativeMarketTemplate = `
Query specific derivative market with the following parameters:

Request Format:
\`\`\`json
{
    "marketId": string               // Market identifier to query
}
\`\`\`

Example Request:
\`\`\`json
{
    "marketId": "0x123abc..."
}
\`\`\`

Response Format:
\`\`\`json
{
    "market": {
        "marketId": string,           // Market identifier
        "marketStatus": string,       // Market status
        "ticker": string,             // Market ticker
        "oracleBase": string,         // Oracle base asset
        "oracleQuote": string,        // Oracle quote asset
        "oracleType": number,         // Oracle type
        "oracleScaleFactor": number,  // Oracle scale factor
        "initialMarginRatio": string, // Initial margin ratio
        "maintenanceMarginRatio": string, // Maintenance margin ratio
        "quoteDenom": string,         // Quote denomination
        "quoteToken": {               // Quote token info
            "name": string,
            "address": string,
            "symbol": string,
            "decimals": number
        },
        "makerFeeRate": string,       // Maker fee rate
        "takerFeeRate": string,       // Taker fee rate
        "serviceProvider": string,     // Service provider address
        "minQuantityTick": string,    // Min quantity tick size
        "minPriceTick": string        // Min price tick size
    }
}
\`\`\`
`;

export const getBinaryOptionsMarketsTemplate = `
Query binary options markets with the following parameters:

Request Format:
\`\`\`json
{
    "marketStatus": string | null,    // Optional market status filter
    "quoteDenom": string | null,      // Optional quote denomination filter
    "pagination": {                   // Optional pagination parameters
        "limit": number | null,
        "key": string | null,
        "reverse": boolean | null
    }
}
\`\`\`

Example Request:
\`\`\`json
{
    "marketStatus": "active",
    "quoteDenom": "USDT",
    "pagination": {
        "limit": 10,
        "reverse": false
    }
}
\`\`\`

Response Format:
\`\`\`json
{
    "markets": [
        {
            "marketId": string,           // Market identifier
            "marketStatus": string,       // Market status
            "ticker": string,             // Market ticker
            "admin": string,              // Admin address
            "quoteDenom": string,         // Quote denomination
            "makerFeeRate": string,       // Maker fee rate
            "takerFeeRate": string,       // Taker fee rate
            "expirationTimestamp": number, // Expiration timestamp
            "settlementTimestamp": number, // Settlement timestamp
            "minQuantityTick": string,    // Min quantity tick size
            "minPriceTick": string,       // Min price tick size
            "oracleSymbol": string,       // Oracle symbol
            "oracleProvider": string,     // Oracle provider
            "oracleType": number,         // Oracle type
            "oracleScaleFactor": number   // Oracle scale factor
        }
    ],
    "pagination": {
        "next": string | null,            // Next page token
        "total": number                   // Total number of markets
    }
}
\`\`\`
`;

export const getBinaryOptionsMarketTemplate = `
Query specific binary options market with the following parameters:

Request Format:
\`\`\`json
{
    "marketId": string               // Market identifier to query
}
\`\`\`

Example Request:
\`\`\`json
{
    "marketId": "0x123abc..."
}
\`\`\`

Response Format:
\`\`\`json
{
    "market": {
        "marketId": string,           // Market identifier
        "marketStatus": string,       // Market status
        "ticker": string,             // Market ticker
        "admin": string,              // Admin address
        "quoteDenom": string,         // Quote denomination
        "makerFeeRate": string,       // Maker fee rate
        "takerFeeRate": string,       // Taker fee rate
        "expirationTimestamp": number, // Expiration timestamp
        "settlementTimestamp": number, // Settlement timestamp
        "minQuantityTick": string,    // Min quantity tick size
        "minPriceTick": string,       // Min price tick size
        "oracleSymbol": string,       // Oracle symbol
        "oracleProvider": string,     // Oracle provider
        "oracleType": number,         // Oracle type
        "oracleScaleFactor": number,  // Oracle scale factor
        "settlement": {
            "status": string,         // Settlement status
            "price": string | null,   // Settlement price if settled
            "timestamp": number | null // Settlement timestamp if settled
        }
    }
}
\`\`\`
`;

export const getSpotMarketsTemplate = `
Query spot markets with the following parameters:

Request Format:
\`\`\`json
{
    "baseDenom": string | null,      // Optional base denomination filter
    "marketStatus": string | null,    // Optional market status filter
    "quoteDenom": string | null,      // Optional quote denomination filter
    "marketStatuses": string[] | null // Optional array of market statuses
}
\`\`\`

Example Request:
\`\`\`json
{
    "baseDenom": "INJ",
    "quoteDenom": "USDT",
    "marketStatus": "active"
}
\`\`\`

Response Format:
\`\`\`json
{
    "markets": [
        {
            "marketId": string,           // Market identifier
            "marketStatus": string,       // Market status
            "ticker": string,             // Market ticker
            "baseDenom": string,          // Base denomination
            "quoteDenom": string,         // Quote denomination
            "makerFeeRate": string,       // Maker fee rate
            "takerFeeRate": string,       // Taker fee rate
            "serviceProvider": string,    // Service provider address
            "minQuantityTick": string,    // Min quantity tick size
            "minPriceTick": string,       // Min price tick size
            "baseToken": {                // Base token info
                "name": string,
                "address": string,
                "symbol": string,
                "decimals": number
            },
            "quoteToken": {               // Quote token info
                "name": string,
                "address": string,
                "symbol": string,
                "decimals": number
            }
        }
    ],
    "pagination": {
        "next": string | null,            // Next page token
        "total": number                   // Total number of markets
    }
}
\`\`\`
`;

export const getSpotMarketTemplate = `
Query specific spot market with the following parameters:

Request Format:
\`\`\`json
{
    "marketId": string               // Market identifier to query
}
\`\`\`

Example Request:
\`\`\`json
{
    "marketId": "0x123abc..."
}
\`\`\`

Response Format:
\`\`\`json
{
    "market": {
        "marketId": string,           // Market identifier
        "marketStatus": string,       // Market status
        "ticker": string,             // Market ticker
        "baseDenom": string,          // Base denomination
        "quoteDenom": string,         // Quote denomination
        "makerFeeRate": string,       // Maker fee rate
        "takerFeeRate": string,       // Taker fee rate
        "serviceProvider": string,    // Service provider address
        "minQuantityTick": string,    // Min quantity tick size
        "minPriceTick": string,       // Min price tick size
        "baseToken": {                // Base token info
            "name": string,
            "address": string,
            "symbol": string,
            "decimals": number
        },
        "quoteToken": {               // Quote token info
            "name": string,
            "address": string,
            "symbol": string,
            "decimals": number
        }
    }
}
\`\`\`
`;

export const getDerivativeOrdersTemplate = `
Query derivative orders with the following parameters:

Request Format:
\`\`\`json
{
    "marketId": string | null,           // Optional single market ID filter
    "marketIds": string[] | null,        // Optional array of market IDs
    "orderSide": string | null,          // Optional order side (buy/sell)
    "isConditional": boolean | null,     // Optional conditional order flag
    "subaccountId": string | null,       // Optional subaccount ID filter
    "pagination": {
        "limit": number | null,          // Optional items per page
        "key": string | null,            // Optional pagination key
        "reverse": boolean | null        // Optional reverse order flag
    }
}
\`\`\`

Example Request:
\`\`\`json
{
    "marketId": "0x123abc...",
    "orderSide": "buy",
    "subaccountId": "0xdef456...",
    "pagination": {
        "limit": 10
    }
}
\`\`\`

Response Format:
\`\`\`json
{
    "orders": [
        {
            "orderHash": string,         // Unique order hash
            "orderSide": string,         // Order side (buy/sell)
            "marketId": string,          // Market identifier
            "subaccountId": string,      // Subaccount identifier
            "price": string,             // Order price
            "quantity": string,          // Total order quantity
            "filledQuantity": string,    // Filled quantity
            "triggerPrice": string | null, // Optional trigger price
            "feeRecipient": string,      // Fee recipient address
            "state": string,             // Order state
            "orderType": string,         // Order type
            "isConditional": boolean,    // Conditional order flag
            "placedAt": number,          // Placement timestamp
            "liquidityIndicator": string // Liquidity indicator (maker/taker)
        }
    ],
    "pagination": {
        "next": string | null,          // Next page token
        "total": number                 // Total number of orders
    }
}
\`\`\`
`;

export const getDerivativeOrderHistoryTemplate = `
Query derivative order history with the following parameters:

Request Format:
\`\`\`json
{
    "subaccountId": string | null,       // Optional subaccount ID filter
    "marketId": string | null,           // Optional single market ID filter
    "marketIds": string[] | null,        // Optional array of market IDs
    "orderTypes": string[] | null,       // Optional array of order types
    "executionTypes": string[] | null,   // Optional array of execution types
    "direction": string | null,          // Optional trade direction
    "isConditional": boolean | null,     // Optional conditional order flag
    "state": string | null,              // Optional order state filter
    "pagination": {
        "limit": number | null,          // Optional items per page
        "key": string | null,            // Optional pagination key
        "reverse": boolean | null        // Optional reverse order flag
    }
}
\`\`\`

Example Request:
\`\`\`json
{
    "subaccountId": "0xdef456...",
    "marketId": "0x123abc...",
    "orderTypes": ["limit", "market"],
    "state": "filled",
    "pagination": {
        "limit": 20
    }
}
\`\`\`

Response Format:
\`\`\`json
{
    "orders": [
        {
            "orderHash": string,         // Unique order hash
            "marketId": string,          // Market identifier
            "subaccountId": string,      // Subaccount identifier
            "executionType": string,     // Execution type
            "orderType": string,         // Order type
            "price": string,             // Order price
            "triggerPrice": string | null, // Optional trigger price
            "quantity": string,          // Order quantity
            "filledQuantity": string,    // Filled quantity
            "state": string,             // Order state
            "createdAt": number,         // Creation timestamp
            "updatedAt": number,         // Last update timestamp
            "direction": string,         // Order direction
            "isConditional": boolean,    // Conditional order flag
            "triggerAt": number | null,  // Trigger timestamp if conditional
            "orderMask": number          // Order mask flags
        }
    ],
    "pagination": {
        "next": string | null,          // Next page token
        "total": number                 // Total number of orders
    }
}
\`\`\`
`;

export const getSpotOrdersTemplate = `
Query spot orders with the following parameters:

Request Format:
\`\`\`json
{
    "marketId": string | null,           // Optional single market ID filter
    "marketIds": string[] | null,        // Optional array of market IDs
    "subaccountId": string | null,       // Optional subaccount ID filter
    "orderSide": string | null,          // Optional order side (buy/sell)
    "isConditional": boolean | null,     // Optional conditional order flag
    "pagination": {
        "limit": number | null,          // Optional items per page
        "key": string | null,            // Optional pagination key
        "reverse": boolean | null        // Optional reverse order flag
    }
}
\`\`\`

Example Request:
\`\`\`json
{
    "marketId": "0x123abc...",
    "subaccountId": "0xdef456...",
    "orderSide": "sell",
    "pagination": {
        "limit": 10
    }
}
\`\`\`

Response Format:
\`\`\`json
{
    "orders": [
        {
            "orderHash": string,         // Unique order hash
            "orderSide": string,         // Order side (buy/sell)
            "marketId": string,          // Market identifier
            "subaccountId": string,      // Subaccount identifier
            "price": string,             // Order price
            "quantity": string,          // Total order quantity
            "filledQuantity": string,    // Filled quantity
            "triggerPrice": string | null, // Optional trigger price
            "feeRecipient": string,      // Fee recipient address
            "state": string,             // Order state
            "orderType": string,         // Order type
            "isConditional": boolean,    // Conditional order flag
            "placedAt": number,          // Placement timestamp
            "liquidityIndicator": string // Liquidity indicator (maker/taker)
        }
    ],
    "pagination": {
        "next": string | null,          // Next page token
        "total": number                 // Total number of orders
    }
}
\`\`\`
`;

export const getSpotOrderHistoryTemplate = `
Query spot order history with the following parameters:

Request Format:
\`\`\`json
{
    "subaccountId": string | null,       // Optional subaccount ID filter
    "marketId": string | null,           // Optional single market ID filter
    "marketIds": string[] | null,        // Optional array of market IDs
    "orderTypes": string[] | null,       // Optional array of order types
    "executionTypes": string[] | null,   // Optional array of execution types
    "direction": string | null,          // Optional trade direction
    "isConditional": boolean | null,     // Optional conditional order flag
    "state": string | null,              // Optional order state filter
    "pagination": {
        "limit": number | null,          // Optional items per page
        "key": string | null,            // Optional pagination key
        "reverse": boolean | null        // Optional reverse order flag
    }
}
\`\`\`

Example Request:
\`\`\`json
{
    "subaccountId": "0xdef456...",
    "marketIds": ["0x123abc...", "0x456def..."],
    "orderTypes": ["limit"],
    "state": "canceled",
    "pagination": {
        "limit": 50
    }
}
\`\`\`

Response Format:
\`\`\`json
{
    "orders": [
        {
            "orderHash": string,         // Unique order hash
            "marketId": string,          // Market identifier
            "subaccountId": string,      // Subaccount identifier
            "executionType": string,     // Execution type
            "orderType": string,         // Order type
            "price": string,             // Order price
            "triggerPrice": string | null, // Optional trigger price
            "quantity": string,          // Order quantity
            "filledQuantity": string,    // Filled quantity
            "state": string,             // Order state
            "createdAt": number,         // Creation timestamp
            "updatedAt": number,         // Last update timestamp
            "direction": string,         // Order direction
            "isConditional": boolean,    // Conditional order flag
            "avgFilledPrice": string,    // Average filled price
            "fees": {                    // Fee information
                "amount": string,
                "denom": string
            }
        }
    ],
    "pagination": {
        "next": string | null,          // Next page token
        "total": number                 // Total number of orders
    }
}
\`\`\`
`;

export const getOrderStatesTemplate = `
Query order states with the following parameters:

Request Format:
\`\`\`json
{
    "spotOrderHashes": string[] | null,       // Optional array of spot order hashes
    "derivativeOrderHashes": string[] | null  // Optional array of derivative order hashes
}
\`\`\`

Example Request:
\`\`\`json
{
    "spotOrderHashes": ["0xabc123...", "0xdef456..."],
    "derivativeOrderHashes": ["0x789ghi...", "0xjkl012..."]
}
\`\`\`

Response Format:
\`\`\`json
{
    "spotOrderStates": [
        {
            "orderHash": string,         // Order hash
            "state": string,             // Order state
            "filledQuantity": string,    // Filled quantity
            "updatedAt": number          // Last update timestamp
        }
    ],
    "derivativeOrderStates": [
        {
            "orderHash": string,         // Order hash
            "state": string,             // Order state
            "filledQuantity": string,    // Filled quantity
            "updatedAt": number          // Last update timestamp
        }
    ]
}
\`\`\`
`;

export const getSubaccountOrdersListTemplate = `
Query subaccount orders with the following parameters:

Request Format:
\`\`\`json
{
    "subaccountId": string,              // Subaccount identifier
    "marketId": string | null,           // Optional market ID filter
    "pagination": {
        "limit": number | null,          // Optional items per page
        "key": string | null,            // Optional pagination key
        "reverse": boolean | null        // Optional reverse order flag
    }
}
\`\`\`

Example Request:
\`\`\`json
{
    "subaccountId": "0xdef456...",
    "marketId": "0x123abc...",
    "pagination": {
        "limit": 20
    }
}
\`\`\`

Response Format:
\`\`\`json
{
    "orders": [
        {
            "orderHash": string,         // Order hash
            "marketId": string,          // Market identifier
            "orderSide": string,         // Order side
            "price": string,             // Order price
            "quantity": string,          // Order quantity
            "filledQuantity": string,    // Filled quantity
            "triggerPrice": string | null, // Optional trigger price
            "feeRecipient": string,      // Fee recipient
            "state": string,             // Order state
            "createdAt": number,         // Creation timestamp
            "updatedAt": number,         // Last update timestamp
            "orderType": string,         // Order type
            "isConditional": boolean     // Conditional order flag
        }
    ],
    "pagination": {
        "next": string | null,          // Next page token
        "total": number                 // Total number of orders
    }
}
\`\`\`
`;

export const getSubaccountOrderSummaryTemplate = `
Query subaccount order summary with the following parameters:

Request Format:
\`\`\`json
{
    "subaccountId": string,              // Subaccount identifier
    "marketId": string | null,           // Optional market ID filter
    "orderDirection": string | null      // Optional order direction filter
}
\`\`\`

Example Request:
\`\`\`json
{
    "subaccountId": "0xdef456...",
    "marketId": "0x123abc...",
    "orderDirection": "buy"
}
\`\`\`

Response Format:
\`\`\`json
{
    "summary": {
        "totalOrders": number,           // Total number of orders
        "totalQuantity": string,         // Total order quantity
        "totalFilled": string,           // Total filled quantity
        "totalNotional": string,         // Total notional value
        "averagePrice": string,          // Average order price
        "unrealizedPnl": string,         // Unrealized PnL
        "totalFees": {                   // Total fees paid
            "amount": string,
            "denom": string
        }
    }
}
\`\`\`
`;
export const getPositionsTemplate = `
Query positions with the following parameters:

Request Format:
\`\`\`json
{
    "marketId": string | null,           // Optional single market ID filter
    "marketIds": string[] | null,        // Optional array of market IDs
    "subaccountId": string | null,       // Optional subaccount ID filter
    "direction": string | null,          // Optional position direction
    "pagination": {
        "limit": number | null,          // Optional items per page
        "key": string | null,            // Optional pagination key
        "reverse": boolean | null        // Optional reverse order flag
    }
}
\`\`\`

Example Request:
\`\`\`json
{
    "marketId": "0x123abc...",
    "subaccountId": "0xdef456...",
    "direction": "long",
    "pagination": {
        "limit": 10
    }
}
\`\`\`

Response Format:
\`\`\`json
{
    "positions": [
        {
            "ticker": string,            // Market ticker
            "marketId": string,          // Market identifier
            "subaccountId": string,      // Subaccount identifier
            "direction": string,         // Position direction (long/short)
            "quantity": string,          // Position size
            "entryPrice": string,        // Average entry price
            "margin": string,            // Position margin
            "liquidationPrice": string,  // Liquidation price
            "markPrice": string,         // Current mark price
            "aggregateReduceOnlyQuantity": string, // Reduce-only quantity
            "aggregateOpenQuantity": string,      // Open order quantity
            "timestamp": number,         // Position timestamp
            "unrealizedPnl": string,     // Unrealized PnL
            "realizedPnl": string,       // Realized PnL
            "metrics": {
                "roi": string,           // Return on investment
                "leverage": string       // Current leverage
            }
        }
    ],
    "pagination": {
        "next": string | null,          // Next page token
        "total": number                 // Total number of positions
    }
}
\`\`\`
`;

export const getPositionsV2Template = `
Query positions V2 with the following parameters:

Request Format:
\`\`\`json
{
    "address": string | null,            // Optional account address
    "marketId": string | null,           // Optional single market ID filter
    "marketIds": string[] | null,        // Optional array of market IDs
    "subaccountId": string | null,       // Optional subaccount ID filter
    "direction": string | null,          // Optional position direction
    "pagination": {
        "limit": number | null,          // Optional items per page
        "key": string | null,            // Optional pagination key
        "reverse": boolean | null        // Optional reverse order flag
    }
}
\`\`\`

Example Request:
\`\`\`json
{
    "address": "inj1...",
    "marketIds": ["0x123abc...", "0x456def..."],
    "direction": "short",
    "pagination": {
        "limit": 20
    }
}
\`\`\`

Response Format:
\`\`\`json
{
    "positions": [
        {
            "ticker": string,            // Market ticker
            "marketId": string,          // Market identifier
            "subaccountId": string,      // Subaccount identifier
            "address": string,           // Account address
            "direction": string,         // Position direction
            "quantity": string,          // Position size
            "entryPrice": string,        // Average entry price
            "margin": string,            // Position margin
            "liquidationPrice": string,  // Liquidation price
            "markPrice": string,         // Current mark price
            "timestamp": number,         // Position timestamp
            "aggregateReduceOnlyQuantity": string,
            "aggregateOpenQuantity": string,
            "unrealizedPnl": string,     // Unrealized PnL
            "realizedPnl": string,       // Realized PnL
            "metrics": {
                "roi": string,           // Return on investment
                "leverage": string,      // Current leverage
                "maxLeverage": string    // Maximum allowed leverage
            },
            "riskMetrics": {
                "marginRatio": string,   // Current margin ratio
                "maintenanceMargin": string, // Maintenance margin requirement
                "initialMargin": string, // Initial margin requirement
                "marginUsage": string    // Margin usage percentage
            }
        }
    ],
    "pagination": {
        "next": string | null,
        "total": number
    }
}
\`\`\`
`;

export const getDerivativeTradesTemplate = `
Query derivative trades with the following parameters:

Request Format:
\`\`\`json
{
    "endTime": number | null,            // Optional end timestamp
    "tradeId": string | null,            // Optional trade ID filter
    "marketId": string | null,           // Optional single market ID filter
    "startTime": number | null,          // Optional start timestamp
    "marketIds": string[] | null,        // Optional array of market IDs
    "subaccountId": string | null,       // Optional subaccount ID filter
    "accountAddress": string | null,     // Optional account address filter
    "direction": string | null,          // Optional trade direction
    "pagination": {
        "limit": number | null,          // Optional items per page
        "key": string | null,            // Optional pagination key
        "reverse": boolean | null        // Optional reverse order flag
    },
    "executionSide": string | null,      // Optional execution side
    "executionTypes": string[] | null    // Optional execution types
}
\`\`\`

Example Request:
\`\`\`json
{
    "marketId": "0x123abc...",
    "startTime": 1625097600000,
    "endTime": 1625184000000,
    "direction": "buy",
    "pagination": {
        "limit": 50
    }
}
\`\`\`

Response Format:
\`\`\`json
{
    "trades": [
        {
            "orderHash": string,         // Order hash
            "subaccountId": string,      // Subaccount identifier
            "marketId": string,          // Market identifier
            "tradeId": string,           // Unique trade identifier
            "executionType": string,     // Trade execution type
            "executionSide": string,     // Execution side (maker/taker)
            "direction": string,         // Trade direction (buy/sell)
            "price": string,             // Trade price
            "quantity": string,          // Trade quantity
            "fee": string,               // Trade fee
            "timestamp": number,         // Trade timestamp
            "cid": string | null,        // Optional client ID
            "pnl": string | null,        // Optional realized PnL
            "leverage": string,          // Trade leverage
            "margin": string,            // Used margin
            "markPrice": string          // Mark price at execution
        }
    ],
    "pagination": {
        "next": string | null,
        "total": number
    }
}
\`\`\`
`;

export const getFundingPaymentsTemplate = `
Query funding payments with the following parameters:

Request Format:
\`\`\`json
{
    "marketId": string | null,           // Optional market ID filter
    "marketIds": string[] | null,        // Optional array of market IDs
    "subaccountId": string | null,       // Optional subaccount ID filter
    "pagination": {
        "limit": number | null,          // Optional items per page
        "key": string | null,            // Optional pagination key
        "reverse": boolean | null        // Optional reverse order flag
    }
}
\`\`\`

Example Request:
\`\`\`json
{
    "marketId": "0x123abc...",
    "subaccountId": "0xdef456...",
    "pagination": {
        "limit": 100
    }
}
\`\`\`

Response Format:
\`\`\`json
{
    "payments": [
        {
            "marketId": string,          // Market identifier
            "subaccountId": string,      // Subaccount identifier
            "amount": string,            // Payment amount
            "timestamp": number,         // Payment timestamp
            "fundingRate": string,       // Funding rate
            "marketPrice": string,       // Market price at funding
            "positionQuantity": string,  // Position quantity
            "direction": string          // Position direction
        }
    ],
    "pagination": {
        "next": string | null,
        "total": number
    }
}
\`\`\`
`;

export const getFundingRatesTemplate = `
Query funding rates with the following parameters:

Request Format:
\`\`\`json
{
    "marketId": string | null,           // Optional market ID filter
    "pagination": {
        "limit": number | null,          // Optional items per page
        "key": string | null,            // Optional pagination key
        "reverse": boolean | null        // Optional reverse order flag
    }
}
\`\`\`

Example Request:
\`\`\`json
{
    "marketId": "0x123abc...",
    "pagination": {
        "limit": 30
    }
}
\`\`\`

Response Format:
\`\`\`json
{
    "fundingRates": [
        {
            "marketId": string,          // Market identifier
            "rate": string,              // Funding rate
            "timestamp": number,         // Rate timestamp
            "marketPrice": string,       // Market price at funding
            "markPrice": string,         // Mark price at funding
            "estimatedRate": string | null, // Estimated next funding rate
            "nextTimestamp": number      // Next funding timestamp
        }
    ],
    "pagination": {
        "next": string | null,
        "total": number
    }
}
\`\`\`
`;

export const getDerivativeSubaccountTradesListTemplate = `
Query derivative subaccount trades with the following parameters:

Request Format:
\`\`\`json
{
    "marketId": string | null,           // Optional market ID filter
    "subaccountId": string | null,       // Optional subaccount ID filter
    "direction": string | null,          // Optional trade direction
    "executionType": string | null,      // Optional execution type
    "pagination": {
        "limit": number | null,          // Optional items per page
        "key": string | null,            // Optional pagination key
        "reverse": boolean | null        // Optional reverse order flag
    }
}
\`\`\`

Example Request:
\`\`\`json
{
    "subaccountId": "0xdef456...",
    "marketId": "0x123abc...",
    "direction": "buy",
    "executionType": "market",
    "pagination": {
        "limit": 25
    }
}
\`\`\`

Response Format:
\`\`\`json
{
    "trades": [
        {
            "orderHash": string,         // Order hash
            "subaccountId": string,      // Subaccount identifier
            "marketId": string,          // Market identifier
            "tradeId": string,           // Trade identifier
            "executionType": string,     // Execution type
            "executionSide": string,     // Execution side
            "direction": string,         // Trade direction
            "price": string,             // Trade price
            "quantity": string,          // Trade quantity
            "fee": string,               // Trade fee
            "timestamp": number,         // Trade timestamp
            "pnl": string,               // Realized PnL
            "leverage": string,          // Trade leverage
            "margin": string,            // Used margin
            "markPrice": string,         // Mark price at execution
            "margin": {                  // Margin details
                "initial": string,       // Initial margin
                "maintenance": string    // Maintenance margin
            },
            "liquidation": {             // Liquidation details if applicable
                "price": string | null,  // Liquidation price
                "fee": string | null     // Liquidation fee
            }
        }
    ],
    "pagination": {
        "next": string | null,
        "total": number
    }
}
\`\`\`
`;