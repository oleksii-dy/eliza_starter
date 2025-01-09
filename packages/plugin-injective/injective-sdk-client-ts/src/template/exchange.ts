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

export const getAccountPortfolioTemplate = `
Query account portfolio with the following parameters:

Request Format:
\`\`\`json
{
    "address": string                    // Account address to query
}
\`\`\`

Example Request:
\`\`\`json
{
    "address": "inj1..."
}
\`\`\`

Response Format:
\`\`\`json
{
    "portfolio": {
        "accountAddress": string,        // Account address
        "bankBalances": [{              // Bank balances
            "denom": string,            // Token denomination
            "amount": string,           // Balance amount
            "usdValue": string         // USD value of balance
        }],
        "subaccounts": [{               // List of subaccounts
            "subaccountId": string,     // Subaccount identifier
            "description": string | null // Optional description
        }],
        "positions": [{                 // Active positions
            "marketId": string,         // Market identifier
            "subaccountId": string,     // Subaccount identifier
            "direction": string,        // Position direction
            "quantity": string,         // Position size
            "entryPrice": string,       // Entry price
            "margin": string,           // Position margin
            "liquidationPrice": string, // Liquidation price
            "markPrice": string,        // Current mark price
            "unrealizedPnl": string,    // Unrealized PnL
            "realizedPnl": string,      // Realized PnL
            "leverage": string         // Position leverage
        }],
        "metrics": {
            "totalEquity": string,      // Total portfolio equity
            "totalPositionNotional": string, // Total position value
            "totalMarginUsed": string,  // Total margin used
            "totalAvailableBalance": string, // Total available balance
            "totalUnrealizedPnl": string,   // Total unrealized PnL
            "dailyPnl": string,         // Daily PnL change
            "dailyPnlPercentage": string // Daily PnL percentage
        }
    }
}
\`\`\`
`;

export const getAccountPortfolioBalancesTemplate = `
Query account portfolio balances with the following parameters:

Request Format:
\`\`\`json
{
    "address": string                    // Account address to query
}
\`\`\`

Example Request:
\`\`\`json
{
    "address": "inj1..."
}
\`\`\`

Response Format:
\`\`\`json
{
    "balances": {
        "bankBalances": [{              // Bank balances
            "denom": string,            // Token denomination
            "amount": string,           // Balance amount
            "usdValue": string         // USD value of balance
        }],
        "subaccountBalances": [{        // Subaccount balances
            "subaccountId": string,     // Subaccount identifier
            "denom": string,            // Token denomination
            "depositBalance": string,   // Deposit balance
            "availableBalance": string, // Available balance
            "usdValue": string         // USD value of balance
        }],
        "totals": {                     // Total balances
            "totalBalance": string,     // Total portfolio balance
            "totalUsdValue": string,    // Total USD value
            "availableBalance": string, // Total available balance
            "lockedBalance": string    // Total locked balance
        }
    }
}
\`\`\`
`;

export const getSubaccountsListTemplate = `
Query subaccounts list with the following parameters:

Request Format:
\`\`\`json
{
    "address": string                    // Account address to query
}
\`\`\`

Example Request:
\`\`\`json
{
    "address": "inj1..."
}
\`\`\`

Response Format:
\`\`\`json
{
    "subaccounts": [{
        "subaccountId": string,         // Subaccount identifier
        "address": string,              // Parent account address
        "label": string | null,         // Optional subaccount label
        "createdAt": number,            // Creation timestamp
        "metrics": {
            "totalEquity": string,      // Total equity
            "freeBalance": string,      // Free balance
            "lockedBalance": string,    // Locked balance
            "marginUsage": string       // Margin usage percentage
        }
    }]
}
\`\`\`
`;

export const getSubaccountBalancesListTemplate = `
Query subaccount balances with the following parameters:

Request Format:
\`\`\`json
{
    "subaccountId": string              // Subaccount identifier to query
}
\`\`\`

Example Request:
\`\`\`json
{
    "subaccountId": "0xdef456..."
}
\`\`\`

Response Format:
\`\`\`json
{
    "balances": [{
        "denom": string,                // Token denomination
        "depositBalance": string,       // Total deposit balance
        "availableBalance": string,     // Available balance
        "totalBalance": string,         // Total balance
        "usdValue": string,            // USD value of balance
        "lockedBalance": {              // Locked balance details
            "orderMargin": string,      // Margin locked in orders
            "positionMargin": string,   // Margin locked in positions
            "total": string            // Total locked balance
        }
    }]
}
\`\`\`
`;

export const getSubaccountHistoryTemplate = `
Query subaccount history with the following parameters:

Request Format:
\`\`\`json
{
    "subaccountId": string,              // Subaccount identifier
    "denom": string | null,              // Optional denomination filter
    "transferTypes": string[] | null,    // Optional transfer types filter
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
    "denom": "USDT",
    "transferTypes": ["deposit", "withdraw"],
    "pagination": {
        "limit": 50
    }
}
\`\`\`

Response Format:
\`\`\`json
{
    "transfers": [{
        "transferType": string,          // Transfer type
        "srcSubaccountId": string | null, // Source subaccount ID
        "dstSubaccountId": string | null, // Destination subaccount ID
        "amount": {
            "denom": string,             // Token denomination
            "amount": string             // Transfer amount
        },
        "timestamp": number,             // Transfer timestamp
        "transactionHash": string | null, // Optional transaction hash
        "reference": string | null,      // Optional reference
        "balanceChange": {               // Balance changes
            "oldBalance": string,        // Previous balance
            "newBalance": string,        // New balance
            "difference": string         // Balance difference
        }
    }],
    "pagination": {
        "next": string | null,           // Next page token
        "total": number                  // Total number of transfers
    }
}
\`\`\`
`;

export const msgDepositTemplate = `
Create a deposit message with the following parameters:

Request Format:
\`\`\`json
{
    "subaccountId": string,              // Target subaccount identifier
    "amount": {
        "amount": string,                // Deposit amount
        "denom": string                  // Token denomination
    }
}
\`\`\`

Example Request:
\`\`\`json
{
    "subaccountId": "0xdef456...",
    "amount": {
        "amount": "1000000000",
        "denom": "USDT"
    }
}
\`\`\`

Response Format:
\`\`\`json
{
    "depositId": string,                 // Unique deposit identifier
    "status": string,                    // Transaction status
    "hash": string,                      // Transaction hash
    "result": {
        "code": number,                  // Response code
        "log": string,                   // Response log
        "gasUsed": string,              // Gas used
        "gasWanted": string             // Gas wanted
    },
    "deposit": {
        "subaccountId": string,         // Subaccount identifier
        "amount": {
            "denom": string,            // Token denomination
            "amount": string            // Deposit amount
        },
        "timestamp": number             // Deposit timestamp
    }
}
\`\`\`
`;

export const msgWithdrawTemplate = `
Create a withdrawal message with the following parameters:

Request Format:
\`\`\`json
{
    "subaccountId": string,              // Source subaccount identifier
    "amount": {
        "amount": string,                // Withdrawal amount
        "denom": string                  // Token denomination
    }
}
\`\`\`

Example Request:
\`\`\`json
{
    "subaccountId": "0xdef456...",
    "amount": {
        "amount": "500000000",
        "denom": "USDT"
    }
}
\`\`\`

Response Format:
\`\`\`json
{
    "withdrawalId": string,              // Unique withdrawal identifier
    "status": string,                    // Transaction status
    "hash": string,                      // Transaction hash
    "result": {
        "code": number,                  // Response code
        "log": string,                   // Response log
        "gasUsed": string,              // Gas used
        "gasWanted": string             // Gas wanted
    },
    "withdrawal": {
        "subaccountId": string,         // Subaccount identifier
        "amount": {
            "denom": string,            // Token denomination
            "amount": string            // Withdrawal amount
        },
        "timestamp": number             // Withdrawal timestamp
    }
}
\`\`\`
`;

export const msgExternalTransferTemplate = `
Create an external transfer message with the following parameters:

Request Format:
\`\`\`json
{
    "srcSubaccountId": string,           // Source subaccount identifier
    "dstSubaccountId": string,           // Destination subaccount identifier
    "totalAmount": {
        "amount": string,                // Transfer amount
        "denom": string                  // Token denomination
    }
}
\`\`\`

Example Request:
\`\`\`json
{
    "srcSubaccountId": "0xabc123...",
    "dstSubaccountId": "0xdef456...",
    "totalAmount": {
        "amount": "250000000",
        "denom": "USDT"
    }
}
\`\`\`

Response Format:
\`\`\`json
{
    "transferId": string,                // Unique transfer identifier
    "status": string,                    // Transaction status
    "hash": string,                      // Transaction hash
    "result": {
        "code": number,                  // Response code
        "log": string,                   // Response log
        "gasUsed": string,              // Gas used
        "gasWanted": string             // Gas wanted
    },
    "transfer": {
        "srcSubaccountId": string,      // Source subaccount
        "dstSubaccountId": string,      // Destination subaccount
        "amount": {
            "denom": string,            // Token denomination
            "amount": string            // Transfer amount
        },
        "timestamp": number             // Transfer timestamp
    }
}
\`\`\`
`;

export const getGridStrategiesTemplate = `
Query grid strategies with the following parameters:

Request Format:
\`\`\`json
{
    "accountAddress": string | null,      // Optional account address filter
    "subaccountId": string | null,       // Optional subaccount ID filter
    "state": string | null,              // Optional state filter
    "marketId": string | null,           // Optional market ID filter
    "limit": number | null,              // Optional result limit
    "skip": number | null,               // Optional number of items to skip
    "marketType": string | null,         // Optional market type filter
    "strategyType": string[] | null      // Optional array of strategy types
}
\`\`\`

Example Request:
\`\`\`json
{
    "accountAddress": "inj1...",
    "marketId": "0x123abc...",
    "state": "active",
    "strategyType": ["uniform", "geometric"],
    "limit": 20
}
\`\`\`

Response Format:
\`\`\`json
{
    "strategies": [{
        "id": string,                    // Strategy identifier
        "accountAddress": string,        // Account address
        "subaccountId": string,         // Subaccount identifier
        "marketId": string,             // Market identifier
        "strategyType": string,         // Strategy type
        "state": string,                // Current state
        "createdAt": number,            // Creation timestamp
        "updatedAt": number,            // Last update timestamp
        "params": {
            "gridSize": number,         // Number of grid levels
            "lowerPrice": string,       // Lower price bound
            "upperPrice": string,       // Upper price bound
            "baseAssetAmount": string,  // Base asset allocation
            "quoteAssetAmount": string, // Quote asset allocation
            "gridSpacing": string,      // Grid level spacing
            "leverage": string | null   // Optional leverage for margin
        },
        "metrics": {
            "totalVolume": string,      // Total trading volume
            "totalFees": string,        // Total fees paid
            "totalPnl": string,         // Total PnL
            "activeOrders": number,     // Number of active orders
            "filledOrders": number     // Number of filled orders
        }
    }],
    "pagination": {
        "total": number                // Total number of strategies
    }
}
\`\`\`
`;

export const getHistoricalBalanceTemplate = `
Query historical balance with the following parameters:

Request Format:
\`\`\`json
{
    "account": string,                   // Account address
    "resolution": string                 // Time resolution (e.g., "1h", "1d", "1w")
}
\`\`\`

Example Request:
\`\`\`json
{
    "account": "inj1...",
    "resolution": "1d"
}
\`\`\`

Response Format:
\`\`\`json
{
    "balances": [{
        "timestamp": number,             // Data point timestamp
        "totalBalance": string,          // Total balance
        "availableBalance": string,      // Available balance
        "marginHeld": string,            // Margin held in positions
        "unrealizedPnl": string,         // Unrealized PnL
        "portfolioValue": string,        // Total portfolio value
        "denomBalances": [{              // Balance by denomination
            "denom": string,             // Token denomination
            "amount": string,            // Balance amount
            "usdValue": string          // USD value at timestamp
        }]
    }],
    "metrics": {
        "balanceChange": string,         // Balance change over period
        "balanceChangePercentage": string // Percentage change
    }
}
\`\`\`
`;

export const getHistoricalRpnlTemplate = `
Query historical realized PnL with the following parameters:

Request Format:
\`\`\`json
{
    "account": string,                   // Account address
    "resolution": string                 // Time resolution (e.g., "1h", "1d", "1w")
}
\`\`\`

Example Request:
\`\`\`json
{
    "account": "inj1...",
    "resolution": "1d"
}
\`\`\`

Response Format:
\`\`\`json
{
    "rpnl": [{
        "timestamp": number,             // Data point timestamp
        "realizedPnl": string,          // Realized PnL
        "cumulativeRpnl": string,       // Cumulative realized PnL
        "markets": [{                    // PnL by market
            "marketId": string,          // Market identifier
            "realizedPnl": string,       // Market-specific PnL
            "volume": string            // Trading volume
        }]
    }],
    "summary": {
        "totalRpnl": string,            // Total realized PnL
        "bestDay": {
            "timestamp": number,         // Best day timestamp
            "amount": string            // Best day PnL
        },
        "worstDay": {
            "timestamp": number,         // Worst day timestamp
            "amount": string            // Worst day PnL
        }
    }
}
\`\`\`
`;

export const getHistoricalVolumesTemplate = `
Query historical trading volumes with the following parameters:

Request Format:
\`\`\`json
{
    "account": string,                   // Account address
    "resolution": string                 // Time resolution (e.g., "1h", "1d", "1w")
}
\`\`\`

Example Request:
\`\`\`json
{
    "account": "inj1...",
    "resolution": "1d"
}
\`\`\`

Response Format:
\`\`\`json
{
    "volumes": [{
        "timestamp": number,             // Data point timestamp
        "volume": string,               // Trading volume
        "volumeUsd": string,            // Volume in USD
        "trades": number,               // Number of trades
        "markets": [{                    // Volume by market
            "marketId": string,          // Market identifier
            "volume": string,            // Market-specific volume
            "volumeUsd": string,         // Volume in USD
            "trades": number            // Number of trades
        }]
    }],
    "summary": {
        "totalVolume": string,          // Total trading volume
        "totalVolumeUsd": string,       // Total volume in USD
        "totalTrades": number,          // Total number of trades
        "averageTrade": string,         // Average trade size
        "volumeByMarket": [{            // Volume summary by market
            "marketId": string,          // Market identifier
            "volume": string,            // Total volume
            "percentage": string         // Percentage of total volume
        }]
    }
}
\`\`\`
`;

export const getPnlLeaderboardTemplate = `
Query PnL leaderboard with the following parameters:

Request Format:
\`\`\`json
{
    "startDate": string,                 // Start date for leaderboard
    "endDate": string,                   // End date for leaderboard
    "limit": number | null,              // Optional result limit
    "account": string | null             // Optional account filter
}
\`\`\`

Example Request:
\`\`\`json
{
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "limit": 100
}
\`\`\`

Response Format:
\`\`\`json
{
    "rankings": [{
        "rank": number,                  // Rank position
        "address": string,               // Account address
        "totalPnl": string,             // Total PnL
        "totalPnlPercentage": string,   // PnL percentage
        "realizedPnl": string,          // Realized PnL
        "unrealizedPnl": string,        // Unrealized PnL
        "volume": string,               // Trading volume
        "trades": number,               // Number of trades
        "winRate": string,              // Win rate percentage
        "bestTrade": {
            "marketId": string,          // Market identifier
            "pnl": string,              // Trade PnL
            "timestamp": number         // Trade timestamp
        }
    }],
    "pagination": {
        "total": number                 // Total number of rankings
    },
    "metrics": {
        "totalParticipants": number,    // Total participants
        "totalVolume": string,          // Total volume
        "averagePnl": string,           // Average PnL
        "medianPnl": string            // Median PnL
    }
}
\`\`\`
`;

export const getVolLeaderboardTemplate = `
Query volume leaderboard with the following parameters:

Request Format:
\`\`\`json
{
    "startDate": string,                 // Start date for leaderboard
    "endDate": string,                   // End date for leaderboard
    "limit": number | null,              // Optional result limit
    "account": string | null             // Optional account filter
}
\`\`\`

Example Request:
\`\`\`json
{
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "limit": 100
}
\`\`\`

Response Format:
\`\`\`json
{
    "rankings": [{
        "rank": number,                  // Rank position
        "address": string,               // Account address
        "volume": string,               // Total trading volume
        "volumeUsd": string,            // Volume in USD
        "trades": number,               // Number of trades
        "averageTradeSize": string,     // Average trade size
        "markets": [{                    // Volume by market
            "marketId": string,          // Market identifier
            "volume": string,            // Market volume
            "percentage": string         // Percentage of total volume
        }],
        "metrics": {
            "makerVolume": string,       // Maker volume
            "takerVolume": string,       // Taker volume
            "feesPaid": string          // Total fees paid
        }
    }],
    "pagination": {
        "total": number                 // Total number of rankings
    },
    "summary": {
        "totalVolume": string,          // Total volume
        "totalParticipants": number,    // Total participants
        "topMarketsByVolume": [{        // Top markets by volume
            "marketId": string,          // Market identifier
            "volume": string,            // Market volume
            "percentage": string         // Percentage of total volume
        }]
    }
}
\`\`\`
`;

export const getPnlLeaderboardFixedResolutionTemplate = `
Query PnL leaderboard with fixed resolution:

Request Format:
\`\`\`json
{
    "resolution": string,                // Time resolution (e.g., "1d", "1w", "1m")
    "limit": number | null,              // Optional result limit
    "account": string | null             // Optional account filter
}
\`\`\`

Example Request:
\`\`\`json
{
    "resolution": "1w",
    "limit": 50
}
\`\`\`

Response Format:
\`\`\`json
{
    "rankings": [{
        "rank": number,                  // Rank position
        "address": string,               // Account address
        "period": {
            "start": number,             // Period start timestamp
            "end": number               // Period end timestamp
        },
        "pnl": {
            "total": string,            // Total PnL
            "percentage": string,        // PnL percentage
            "realized": string,          // Realized PnL
            "unrealized": string        // Unrealized PnL
        },
        "trades": {
            "count": number,            // Number of trades
            "winRate": string,          // Win rate percentage
            "volume": string           // Trading volume
        }
    }],
    "pagination": {
        "total": number                 // Total number of rankings
    }
}
\`\`\`
`;

export const getDenomHoldersTemplate = `
Query denomination holders with the following parameters:

Request Format:
\`\`\`json
{
    "denom": string,                     // Denomination to query
    "token": string | null,              // Optional token address
    "limit": number | null               // Optional result limit
}
\`\`\`

Example Request:
\`\`\`json
{
    "denom": "INJ",
    "limit": 100
}
\`\`\`

Response Format:
\`\`\`json
{
    "holders": [{
        "address": string,               // Holder address
        "balance": string,              // Token balance
        "usdValue": string,             // USD value of balance
        "percentage": string,           // Percentage of total supply
        "rank": number,                 // Rank by balance
        "lastActivity": number          // Last activity timestamp
    }],
    "summary": {
        "totalHolders": number,         // Total number of holders
        "totalSupply": string,          // Total token supply
        "circulatingSupply": string,    // Circulating supply
        "metrics": {
            "averageBalance": string,    // Average balance per holder
            "medianBalance": string,     // Median balance
            "concentrationIndex": string // Holder concentration index
        }
    }
}
\`\`\`
`;

export const msgInstantSpotMarketLaunchTemplate = `
Launch spot market instantly with the following parameters:

Request Format:
\`\`\`json
{
    "proposer": string,                  // Proposer address
    "market": {
        "sender": string,                // Sender address
        "ticker": string,                // Market ticker symbol
        "baseDenom": string,             // Base token denomination
        "quoteDenom": string,            // Quote token denomination
        "minNotional": string,           // Minimum notional value
        "minPriceTickSize": string,      // Minimum price tick size
        "minQuantityTickSize": string    // Minimum quantity tick size
    }
}
\`\`\`

Example Request:
\`\`\`json
{
    "proposer": "inj1...",
    "market": {
        "sender": "inj1...",
        "ticker": "INJ/USDT",
        "baseDenom": "inj",
        "quoteDenom": "usdt",
        "minNotional": "10",
        "minPriceTickSize": "0.000001",
        "minQuantityTickSize": "0.001"
    }
}
\`\`\`

Response Format:
\`\`\`json
{
    "marketId": string,                  // New market identifier
    "height": string,                    // Block height
    "txHash": string,                    // Transaction hash
    "market": {
        "status": string,                // Market status
        "ticker": string,                // Market ticker
        "baseDenom": string,             // Base denomination
        "quoteDenom": string,            // Quote denomination
        "makerFeeRate": string,          // Maker fee rate
        "takerFeeRate": string,          // Taker fee rate
        "serviceProvider": string,       // Service provider address
        "createdAt": number             // Creation timestamp
    }
}
\`\`\`
`;

export const msgInstantBinaryOptionsMarketLaunchTemplate = `
Launch binary options market instantly with the following parameters:

Request Format:
\`\`\`json
{
    "proposer": string,                  // Proposer address
    "market": {
        "ticker": string,                // Market ticker symbol
        "admin": string,                 // Admin address
        "oracleSymbol": string,          // Oracle symbol
        "oracleProvider": string,        // Oracle provider
        "oracleScaleFactor": number,     // Oracle scale factor
        "oracleType": number,            // Oracle type
        "quoteDenom": string,            // Quote denomination
        "makerFeeRate": string,          // Maker fee rate
        "takerFeeRate": string,          // Taker fee rate
        "expirationTimestamp": number,   // Expiration timestamp
        "settlementTimestamp": number,   // Settlement timestamp
        "minPriceTickSize": string,      // Min price tick size
        "minQuantityTickSize": string,   // Min quantity tick size
        "minNotional": string           // Minimum notional value
    }
}
\`\`\`

Example Request:
\`\`\`json
{
    "proposer": "inj1...",
    "market": {
        "ticker": "BTC-ABOVE-50K",
        "admin": "inj1...",
        "oracleSymbol": "BTC/USD",
        "oracleProvider": "injective",
        "oracleScaleFactor": 6,
        "oracleType": 1,
        "quoteDenom": "usdt",
        "makerFeeRate": "0.001",
        "takerFeeRate": "0.002",
        "expirationTimestamp": 1704067200,
        "settlementTimestamp": 1704153600,
        "minPriceTickSize": "0.01",
        "minQuantityTickSize": "0.1",
        "minNotional": "10"
    }
}
\`\`\`

Response Format:
\`\`\`json
{
    "marketId": string,                  // New market identifier
    "height": string,                    // Block height
    "txHash": string,                    // Transaction hash
    "market": {
        "status": string,                // Market status
        "ticker": string,                // Market ticker
        "oracleConfig": {
            "symbol": string,            // Oracle symbol
            "provider": string,          // Oracle provider
            "scaleFactor": number,       // Scale factor
            "type": number              // Oracle type
        },
        "expirationTime": number,        // Expiration timestamp
        "settlementTime": number,        // Settlement timestamp
        "quoteDenom": string,            // Quote denomination
        "makerFeeRate": string,          // Maker fee rate
        "takerFeeRate": string,          // Taker fee rate
        "admin": string,                 // Admin address
        "createdAt": number             // Creation timestamp
    }
}
\`\`\`
`;

export const msgCreateSpotLimitOrderTemplate = `
Create spot limit order with the following parameters:

Request Format:
\`\`\`json
{
    "marketId": string,                  // Market identifier
    "subaccountId": string,             // Subaccount identifier
    "orderType": number,                 // Order type (1 for limit)
    "triggerPrice": string | null,       // Optional trigger price
    "feeRecipient": string,             // Fee recipient address
    "price": string,                     // Order price
    "quantity": string,                  // Order quantity
    "cid": string | null                 // Optional client order ID
}
\`\`\`

Example Request:
\`\`\`json
{
    "marketId": "0x123abc...",
    "subaccountId": "0xdef456...",
    "orderType": 1,
    "feeRecipient": "inj1...",
    "price": "50000.5",
    "quantity": "0.15"
}
\`\`\`

Response Format:
\`\`\`json
{
    "orderHash": string,                 // Order hash
    "height": string,                    // Block height
    "txHash": string,                    // Transaction hash
    "order": {
        "marketId": string,              // Market identifier
        "orderType": string,             // Order type
        "price": string,                 // Order price
        "quantity": string,              // Order quantity
        "fillable": string,              // Fillable quantity
        "triggerPrice": string | null,   // Trigger price if any
        "state": string,                 // Order state
        "createdAt": number             // Creation timestamp
    }
}
\`\`\`
`;

export const msgCreateDerivativeLimitOrderTemplate = `
Create derivative limit order with the following parameters:

Request Format:
\`\`\`json
{
    "marketId": string,                  // Market identifier
    "subaccountId": string,             // Subaccount identifier
    "orderType": number,                 // Order type (1 for limit)
    "triggerPrice": string | null,       // Optional trigger price
    "feeRecipient": string,             // Fee recipient address
    "price": string,                     // Order price
    "margin": string,                    // Order margin
    "quantity": string,                  // Order quantity
    "cid": string | null                 // Optional client order ID
}
\`\`\`

Example Request:
\`\`\`json
{
    "marketId": "0x123abc...",
    "subaccountId": "0xdef456...",
    "orderType": 1,
    "feeRecipient": "inj1...",
    "price": "50000.5",
    "margin": "1000",
    "quantity": "0.15"
}
\`\`\`

Response Format:
\`\`\`json
{
    "orderHash": string,                 // Order hash
    "height": string,                    // Block height
    "txHash": string,                    // Transaction hash
    "order": {
        "marketId": string,              // Market identifier
        "orderType": string,             // Order type
        "price": string,                 // Order price
        "quantity": string,              // Order quantity
        "margin": string,                // Order margin
        "fillable": string,              // Fillable quantity
        "triggerPrice": string | null,   // Trigger price if any
        "state": string,                 // Order state
        "leverage": string,              // Position leverage
        "createdAt": number             // Creation timestamp
    }
}
\`\`\`
`;

export const msgBatchUpdateOrdersTemplate = `
Batch update orders with the following parameters:

Request Format:
\`\`\`json
{
    "subaccountId": string,              // Subaccount identifier
    "spotMarketIdsToCancelAll": string[] | null,      // Optional spot markets to cancel all orders
    "derivativeMarketIdsToCancelAll": string[] | null, // Optional derivative markets to cancel all orders
    "binaryOptionsMarketIdsToCancelAll": string[] | null, // Optional binary options markets to cancel all orders
    "spotOrdersToCancel": [{             // Optional spot orders to cancel
        "marketId": string,              // Market identifier
        "subaccountId": string,          // Subaccount identifier
        "orderHash": string | null,      // Optional order hash
        "cid": string | null             // Optional client order ID
    }]
}
\`\`\`

Example Request:
\`\`\`json
{
    "subaccountId": "0xdef456...",
    "spotMarketIdsToCancelAll": ["0x123...", "0x456..."],
    "spotOrdersToCancel": [
        {
            "marketId": "0x789...",
            "subaccountId": "0xdef456...",
            "orderHash": "0xabc..."
        }
    ]
}
\`\`\`

Response Format:
\`\`\`json
{
    "height": string,                    // Block height
    "txHash": string,                    // Transaction hash
    "results": {
        "spotCancellations": [{
            "marketId": string,          // Market identifier
            "orderHash": string,         // Order hash
            "success": boolean          // Cancellation success
        }],
        "derivativeCancellations": [{
            "marketId": string,          // Market identifier
            "orderHash": string,         // Order hash
            "success": boolean          // Cancellation success
        }],
        "binaryOptionsCancellations": [{
            "marketId": string,          // Market identifier
            "orderHash": string,         // Order hash
            "success": boolean          // Cancellation success
        }]
    }
}
\`\`\`
`;

export const msgIncreasePositionMarginTemplate = `
Increase position margin with the following parameters:

Request Format:
\`\`\`json
{
    "marketId": string,                  // Market identifier
    "srcSubaccountId": string,          // Source subaccount identifier
    "dstSubaccountId": string,          // Destination subaccount identifier
    "amount": string                     // Margin amount to increase
}
\`\`\`

Example Request:
\`\`\`json
{
    "marketId": "0x123abc...",
    "srcSubaccountId": "0xdef456...",
    "dstSubaccountId": "0xdef456...",
    "amount": "1000"
}
\`\`\`

Response Format:
\`\`\`json
{
    "height": string,                    // Block height
    "txHash": string,                    // Transaction hash
    "position": {
        "marketId": string,              // Market identifier
        "subaccountId": string,          // Subaccount identifier
        "margin": string,                // Updated margin
        "timestamp": number             // Update timestamp
    }
}
\`\`\`
`;

export const msgLiquidatePositionTemplate = `
Liquidate position with the following parameters:

Request Format:
\`\`\`json
{
    "subaccountId": string,              // Subaccount to liquidate
    "injectiveAddress": string,          // Injective address
    "marketId": string,                  // Market identifier
    "order": {                           // Optional liquidation order
        "marketId": string,              // Market identifier
        "subaccountId": string,          // Subaccount identifier
        "orderType": number,             // Order type
        "triggerPrice": string | null,   // Optional trigger price
        "feeRecipient": string,          // Fee recipient address
        "price": string,                 // Order price
        "margin": string,                // Order margin
        "quantity": string,              // Order quantity
        "cid": string | null             // Optional client order ID
    }
}
\`\`\`

Example Request:
\`\`\`json
{
    "subaccountId": "0xabc123...",
    "injectiveAddress": "inj1...",
    "marketId": "0x123abc...",
    "order": {
        "marketId": "0x123abc...",
        "subaccountId": "0xabc123...",
        "orderType": 1,
        "feeRecipient": "inj1...",
        "price": "49000.0",
        "margin": "100.0",
        "quantity": "0.5"
    }
}
\`\`\`

Response Format:
\`\`\`json
{
    "height": string,                    // Block height
    "txHash": string,                    // Transaction hash
    "liquidation": {
        "marketId": string,              // Market identifier
        "subaccountId": string,          // Subaccount identifier
        "liquidatedQuantity": string,    // Liquidated quantity
        "liquidationPrice": string,      // Liquidation price
        "liquidationFee": string,        // Liquidation fee
        "timestamp": number             // Liquidation timestamp
    }
}
\`\`\`
`;

export const msgRewardsOptOutTemplate = `
Opt out of rewards with the following parameters:

Request Format:
\`\`\`json
{
    "sender": string                     // Address opting out
}
\`\`\`

Example Request:
\`\`\`json
{
    "sender": "inj1..."
}
\`\`\`

Response Format:
\`\`\`json
{
    "height": string,                    // Block height
    "txHash": string,                    // Transaction hash
    "timestamp": number                 // Opt-out timestamp
}
\`\`\`
`;

export const msgAdminUpdateBinaryOptionsMarketTemplate = `
Admin update binary options market with the following parameters:

Request Format:
\`\`\`json
{
    "sender": string,                    // Admin address
    "marketId": string,                  // Market identifier
    "settlementPrice": string,           // Settlement price
    "expirationTimestamp": string,       // Expiration timestamp
    "settlementTimestamp": string,       // Settlement timestamp
    "status": string                     // Market status
}
\`\`\`

Example Request:
\`\`\`json
{
    "sender": "inj1...",
    "marketId": "0x123abc...",
    "settlementPrice": "50000",
    "expirationTimestamp": "1704067200",
    "settlementTimestamp": "1704153600",
    "status": "active"
}
\`\`\`

Response Format:
\`\`\`json
{
    "height": string,                    // Block height
    "txHash": string,                    // Transaction hash
    "market": {
        "marketId": string,              // Market identifier
        "status": string,                // Updated status
        "settlementPrice": string | null, // Settlement price if set
        "expirationTimestamp": string,   // Updated expiration
        "settlementTimestamp": string,   // Updated settlement
        "updatedAt": number             // Update timestamp
    }
}
\`\`\`
`;

export const msgAuthorizeStakeGrantsTemplate = `
Authorize stake grants with the following parameters:

Request Format:
\`\`\`json
{
    "grantee": string,                   // Grantee address
    "amount": string                     // Grant amount
}
\`\`\`

Example Request:
\`\`\`json
{
    "grantee": "inj1...",
    "amount": "1000000000"
}
\`\`\`

Response Format:
\`\`\`json
{
    "height": string,                    // Block height
    "txHash": string,                    // Transaction hash
    "grant": {
        "grantee": string,               // Grantee address
        "amount": string,                // Granted amount
        "timestamp": number             // Grant timestamp
    }
}
\`\`\`
`;

export const msgSignDataTemplate = `
Sign data with the following parameters:

Request Format:
\`\`\`json
{
    "sender": string,                    // Signer address
    "data": string                       // Data to sign
}
\`\`\`

Example Request:
\`\`\`json
{
    "sender": "inj1...",
    "data": "0x123abc..."
}
\`\`\`

Response Format:
\`\`\`json
{
    "height": string,                    // Block height
    "txHash": string,                    // Transaction hash
    "signature": {
        "data": string,                  // Signed data
        "signature": string,             // Signature
        "timestamp": number             // Signature timestamp
    }
}
\`\`\`
`;

export const msgReclaimLockedFundsTemplate = `
Reclaim locked funds with the following parameters:

Request Format:
\`\`\`json
{
    "sender": string,                    // Sender address
    "lockedAccountPubKey": string,       // Locked account public key
    "signature": Uint8Array              // Signature for verification
}
\`\`\`

Example Request:
\`\`\`json
{
    "sender": "inj1...",
    "lockedAccountPubKey": "0x789def...",
    "signature": [1, 2, 3, ...]
}
\`\`\`

Response Format:
\`\`\`json
{
    "height": string,                    // Block height
    "txHash": string,                    // Transaction hash
    "reclaim": {
        "sender": string,                // Sender address
        "amount": string,                // Reclaimed amount
        "timestamp": number             // Reclaim timestamp
    }
}
\`\`\`
`;

export const msgBatchCancelDerivativeOrdersTemplate = `
Batch cancel derivative orders with the following parameters:

Request Format:
\`\`\`json
{
    "orders": [{
        "marketId": string,              // Market identifier
        "subaccountId": string,          // Subaccount identifier
        "orderHash": string | null,      // Optional order hash
        "orderMask": number | null,      // Optional order mask
        "cid": string | null             // Optional client ID
    }]
}
\`\`\`

Example Request:
\`\`\`json
{
    "orders": [
        {
            "marketId": "0x123abc...",
            "subaccountId": "0xdef456...",
            "orderHash": "0x789ghi..."
        }
    ]
}
\`\`\`

Response Format:
\`\`\`json
{
    "height": string,                    // Block height
    "txHash": string,                    // Transaction hash
    "cancellations": [{
        "orderHash": string,             // Order hash
        "success": boolean,              // Cancellation success
        "timestamp": number             // Cancellation timestamp
    }]
}
\`\`\`
`;
