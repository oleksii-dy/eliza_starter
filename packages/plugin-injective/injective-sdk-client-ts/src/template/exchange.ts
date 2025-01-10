// Exchange Module Templates

export const getModuleParamsTemplate = `
### Get Exchange Module Parameters

**Description**:
This query retrieves the current parameters of the Exchange module. The Exchange module manages various aspects of trading, including market configurations, fee structures, and discount schedules. Understanding these parameters is essential for monitoring trading rules, fee policies, and ensuring the smooth operation of the exchange functionalities within the blockchain ecosystem.

**Request Format**:
\`\`\`json
{
    "filter": {
        "paramName": string   // (Optional) Specific parameter name to retrieve
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "paramName": "trading_fee"
    }
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Empty string for queries
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing exchange module parameters
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125000,
    "txHash": "",
    "codespace": "",
    "code": 0,
    "data": "Cg1leGNoYW5nZV9tb2R1bGVfcGFyYW1zAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_module_params\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 80000,
    "gasUsed": 60000,
    "timestamp": "2025-10-01T10:00:00Z",
    "events": []
}
\`\`\`
`;

export const getModuleStateTemplate = `
### Get Exchange Module State

**Description**:
This query retrieves the current state of the Exchange module. The Exchange module state includes information about active markets, trading statistics, and ongoing campaigns. Monitoring the module state is crucial for understanding the current trading environment, assessing market health, and making informed decisions based on real-time exchange data.

**Request Format**:
\`\`\`json
{
    "filter": {
        "stateType": string   // (Optional) Specific state type to retrieve (e.g., "active_markets")
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "stateType": "active_markets"
    }
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Empty string for queries
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing exchange module state
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125001,
    "txHash": "",
    "codespace": "",
    "code": 0,
    "data": "Cg9leGNoYW5nZV9tb2R1bGVfc3RhdGUAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_module_state\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 85000,
    "gasUsed": 65000,
    "timestamp": "2025-10-02T11:15:30Z",
    "events": []
}
\`\`\`
`;

export const getFeeDiscountScheduleTemplate = `
### Get Fee Discount Schedule

**Description**:
This query retrieves the fee discount schedule within the Exchange module. The fee discount schedule outlines the various discount tiers based on trading volumes or other criteria. Monitoring the fee discount schedule is essential for users to understand potential savings, strategize trading activities, and optimize their trading costs.

**Request Format**:
\`\`\`json
{
    "filter": {
        "tier": number   // (Optional) Specific discount tier to retrieve
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "tier": 2
    }
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Empty string for queries
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing fee discount schedule
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125002,
    "txHash": "",
    "codespace": "",
    "code": 0,
    "data": "Cg1mZWVfZGlzY291bnRfc2NoZWR1bGUAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_fee_discount_schedule\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 90000,
    "gasUsed": 70000,
    "timestamp": "2025-10-03T12:20:40Z",
    "events": []
}
\`\`\`
`;

export const getFeeDiscountAccountInfoTemplate = `
### Get Fee Discount Account Info

**Description**:
This query retrieves the fee discount account information for a specific Injective address within the Exchange module. The fee discount account info includes details about the user's current discount tier, eligibility, and accumulated rewards. Monitoring this information is essential for users to track their fee discounts, understand their standing in the discount hierarchy, and make informed trading decisions to maximize savings.

**Request Format**:
\`\`\`json
{
    "injAddress": string   // Injective address of the user (e.g., "inj1account123...")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "injAddress": "inj1account123..."
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Empty string for queries
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing fee discount account info
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125003,
    "txHash": "",
    "codespace": "",
    "code": 0,
    "data": "Cg5mZWVfZGlzY291bnRfYWNjb3VudF9pbmZvAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_fee_discount_account_info\", \"attributes\": [{\"key\": \"inj_address\", \"value\": \"inj1account123...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 95000,
    "gasUsed": 75000,
    "timestamp": "2025-10-04T13:25:50Z",
    "events": []
}
\`\`\`
`;

export const getTradingRewardsCampaignTemplate = `
### Get Trading Rewards Campaign

**Description**:
This query retrieves the details of the current trading rewards campaign within the Exchange module. The trading rewards campaign outlines incentives for traders based on their trading activities, such as volume-based rewards, bonuses, and promotional offers. Monitoring the trading rewards campaign is essential for users to leverage available incentives, maximize their rewards, and optimize their trading strategies accordingly.

**Request Format**:
\`\`\`json
{
    "filter": {
        "campaignId": string   // (Optional) Specific campaign ID to retrieve
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "campaignId": "TRC2025"
    }
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Empty string for queries
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing trading rewards campaign details
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125004,
    "txHash": "",
    "codespace": "",
    "code": 0,
    "data": "Cg10dHJhZGluZ19yZXdhcmRzX2NhbXBhaWduAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_trading_rewards_campaign\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 100000,
    "gasUsed": 80000,
    "timestamp": "2025-10-05T14:30:00Z",
    "events": []
}
\`\`\`
`;

export const getTradeRewardPointsTemplate = `
### Get Trade Reward Points

**Description**:
This query retrieves the trade reward points for specified Injective addresses within the Exchange module. Trade reward points are accumulated based on users' trading activities, such as trade volumes, frequency, and participation in campaigns. Monitoring trade reward points is essential for users to track their progress, redeem rewards, and strategize their trading efforts to maximize benefits.

**Request Format**:
\`\`\`json
{
    "injectiveAddresses": [
        string   // List of Injective addresses (e.g., ["inj1account123...", "inj1account456..."])
    ]
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "injectiveAddresses": ["inj1account123...", "inj1account456..."]
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Empty string for queries
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing trade reward points
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125005,
    "txHash": "",
    "codespace": "",
    "code": 0,
    "data": "CgpkcmV3YXJkX3BvaW50cw==",
    "rawLog": "[{\"events\": [{\"type\": \"get_trade_reward_points\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 105000,
    "gasUsed": 85000,
    "timestamp": "2025-10-06T15:35:10Z",
    "events": []
}
\`\`\`
`;

export const getPendingTradeRewardPointsTemplate = `
### Get Pending Trade Reward Points

**Description**:
This query retrieves the pending trade reward points for specified Injective addresses within the Exchange module. Pending trade reward points are those that have been earned through trading activities but are yet to be claimed or redeemed. Monitoring pending trade reward points is essential for users to understand their available rewards, plan their redemption strategies, and ensure they maximize their earned incentives.

**Request Format**:
\`\`\`json
{
    "injectiveAddresses": [
        string   // List of Injective addresses (e.g., ["inj1account123...", "inj1account456..."])
    ]
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "injectiveAddresses": ["inj1account123...", "inj1account456..."]
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Empty string for queries
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing pending trade reward points
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125006,
    "txHash": "",
    "codespace": "",
    "code": 0,
    "data": "CgpkcGVuZGluZ19kcmV3YXJkX3BvaW50cw==",
    "rawLog": "[{\"events\": [{\"type\": \"get_pending_trade_reward_points\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 110000,
    "gasUsed": 90000,
    "timestamp": "2025-10-07T16:40:20Z",
    "events": []
}
\`\`\`
`;

export const getExchangePositionsTemplate = `
### Get Exchange Positions

**Description**:
This query retrieves the exchange positions based on provided parameters within the Exchange module. Exchange positions represent users' holdings in various trading instruments, including spot, derivative, and binary options markets. Monitoring exchange positions is essential for users to manage their investments, assess their exposure, and make informed trading decisions based on their portfolio's performance.

**Request Format**:
\`\`\`json
{
    "filter": {
        "positionType": string,   // (Optional) Type of position to retrieve (e.g., "spot", "derivative")
        "marketId": string        // (Optional) Specific market ID to filter positions
    },
    "pagination": {
        "limit": number,          // (Optional) Number of positions to retrieve
        "offset": number          // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "positionType": "derivative",
        "marketId": "BTC-USD"
    },
    "pagination": {
        "limit": 10,
        "offset": 0
    }
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Empty string for queries
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing exchange positions
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125007,
    "txHash": "",
    "codespace": "",
    "code": 0,
    "data": "CgdkZXJpdmF0aXZlX3Bvc2l0aW9ucw==",
    "rawLog": "[{\"events\": [{\"type\": \"get_exchange_positions\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 115000,
    "gasUsed": 95000,
    "timestamp": "2025-10-08T17:45:30Z",
    "events": []
}
\`\`\`
`;

export const getSubaccountTradeNonceTemplate = `
### Get Subaccount Trade Nonce

**Description**:
This query retrieves the trade nonce for a specific subaccount within the Exchange module. The trade nonce is a unique identifier used to prevent replay attacks and ensure the integrity of trading operations. Monitoring the trade nonce is essential for users to maintain secure trading activities and verify the uniqueness of their transactions.

**Request Format**:
\`\`\`json
{
    "subaccountId": string   // Subaccount ID (e.g., "sub1account123...")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "subaccountId": "sub1account123..."
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Empty string for queries
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing trade nonce
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125008,
    "txHash": "",
    "codespace": "",
    "code": 0,
    "data": "CgpncmV3YW5kX25vbmNlAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_subaccount_trade_nonce\", \"attributes\": [{\"key\": \"subaccount_id\", \"value\": \"sub1account123...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 120000,
    "gasUsed": 100000,
    "timestamp": "2025-10-09T18:50:40Z",
    "events": []
}
\`\`\`
`;

export const getIsOptedOutOfRewardsTemplate = `
### Get Opt-Out Status of Rewards

**Description**:
This query checks whether an account has opted out of receiving trading rewards within the Exchange module. Opting out of rewards means the user will not accumulate or receive any trading incentives. Monitoring opt-out status is essential for users to manage their participation in rewards programs and ensure their preferences are accurately reflected.

**Request Format**:
\`\`\`json
{
    "account": string   // Account address (e.g., "inj1account123...")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "account": "inj1account123..."
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Empty string for queries
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data indicating opt-out status
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125009,
    "txHash": "",
    "codespace": "",
    "code": 0,
    "data": "CgZpc19vcHRlZAA=",
    "rawLog": "[{\"events\": [{\"type\": \"get_is_opted_out_of_rewards\", \"attributes\": [{\"key\": \"account\", \"value\": \"inj1account123...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 125000,
    "gasUsed": 105000,
    "timestamp": "2025-10-10T19:55:50Z",
    "events": []
}
\`\`\`
`;

export const getDerivativeMarketsTemplate = `
### Get Derivative Markets

**Description**:
This query retrieves all derivative markets based on provided parameters within the Exchange module. Derivative markets involve trading instruments like futures and options, where participants speculate on the future price movements of underlying assets. Monitoring derivative markets is essential for users to identify available trading opportunities, assess market liquidity, and manage their investment strategies effectively.

**Request Format**:
\`\`\`json
{
    "filter": {
        "baseAsset": string,   // (Optional) Base asset of the derivative (e.g., "BTC")
        "quoteAsset": string   // (Optional) Quote asset of the derivative (e.g., "USD")
    },
    "pagination": {
        "limit": number,        // (Optional) Number of markets to retrieve
        "offset": number        // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "baseAsset": "BTC",
        "quoteAsset": "USD"
    },
    "pagination": {
        "limit": 5,
        "offset": 0
    }
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Empty string for queries
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing derivative markets
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125010,
    "txHash": "",
    "codespace": "",
    "code": 0,
    "data": "CgpkZXJpdmF0aXZlX21hcmtldHMAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_derivative_markets\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 130000,
    "gasUsed": 110000,
    "timestamp": "2025-10-11T20:00:00Z",
    "events": []
}
\`\`\`
`;

export const getDerivativeMarketTemplate = `
### Get Derivative Market Details

**Description**:
This query retrieves the details of a specific derivative market by its ID within the Exchange module. Derivative market details include information such as contract specifications, trading rules, margin requirements, and current market status. Monitoring specific derivative markets is essential for users to make informed trading decisions, assess market conditions, and manage their positions effectively.

**Request Format**:
\`\`\`json
{
    "marketId": string   // Derivative market ID (e.g., "BTC-USD-202510")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "marketId": "BTC-USD-202510"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Empty string for queries
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing derivative market details
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125011,
    "txHash": "",
    "codespace": "",
    "code": 0,
    "data": "CgpkZXJpdmF0aXZlX21hcmtldF9kZXRhaWxzAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_derivative_market\", \"attributes\": [{\"key\": \"market_id\", \"value\": \"BTC-USD-202510\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 135000,
    "gasUsed": 115000,
    "timestamp": "2025-10-12T21:05:10Z",
    "events": []
}
\`\`\`
`;

export const getBinaryOptionsMarketsTemplate = `
### Get Binary Options Markets

**Description**:
This query retrieves all binary options markets based on provided parameters within the Exchange module. Binary options are financial instruments that offer a fixed payout based on whether a specific condition is met at expiration. Monitoring binary options markets is essential for users to identify available trading opportunities, assess market liquidity, and manage their trading strategies effectively.

**Request Format**:
\`\`\`json
{
    "filter": {
        "baseAsset": string,   // (Optional) Base asset of the binary options (e.g., "ETH")
        "quoteAsset": string   // (Optional) Quote asset of the binary options (e.g., "USD")
    },
    "pagination": {
        "limit": number,        // (Optional) Number of binary options markets to retrieve
        "offset": number        // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "baseAsset": "ETH",
        "quoteAsset": "USD"
    },
    "pagination": {
        "limit": 3,
        "offset": 0
    }
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Empty string for queries
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing binary options markets
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125012,
    "txHash": "",
    "codespace": "",
    "code": 0,
    "data": "CgpiX2JpbmFyeV9vcHRpb25zX21hcmtldHMAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_binary_options_markets\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 140000,
    "gasUsed": 120000,
    "timestamp": "2025-10-13T22:10:20Z",
    "events": []
}
\`\`\`
`;

export const getBinaryOptionsMarketTemplate = `
### Get Binary Options Market Details

**Description**:
This query retrieves the details of a specific binary options market by its ID within the Exchange module. Binary options market details include information such as contract specifications, trading rules, payout structures, and current market status. Monitoring specific binary options markets is essential for users to make informed trading decisions, assess market conditions, and manage their trading strategies effectively.

**Request Format**:
\`\`\`json
{
    "marketId": string   // Binary options market ID (e.g., "ETH-USD-202510")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "marketId": "ETH-USD-202510"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Empty string for queries
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing binary options market details
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125013,
    "txHash": "",
    "codespace": "",
    "code": 0,
    "data": "CgpiX2JpbmFyeV9vcHRpb25zX21hcmtldF9kZXRhaWxzAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_binary_options_market\", \"attributes\": [{\"key\": \"market_id\", \"value\": \"ETH-USD-202510\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 145000,
    "gasUsed": 125000,
    "timestamp": "2025-10-14T23:15:30Z",
    "events": []
}
\`\`\`
`;

export const getDerivativeOrdersTemplate = `
### Get Derivative Orders

**Description**:
This query retrieves all derivative orders based on provided parameters within the Exchange module. Derivative orders include limit and market orders placed in derivative markets. Monitoring derivative orders is essential for users to track their trading activities, manage open positions, and analyze market trends effectively.

**Request Format**:
\`\`\`json
{
    "filter": {
        "subaccountId": string,   // (Optional) Subaccount ID to filter orders
        "marketId": string,       // (Optional) Market ID to filter orders
        "orderType": string       // (Optional) Type of order (e.g., "limit", "market")
    },
    "pagination": {
        "limit": number,          // (Optional) Number of orders to retrieve
        "offset": number          // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "subaccountId": "sub1account123...",
        "marketId": "BTC-USD-202510",
        "orderType": "limit"
    },
    "pagination": {
        "limit": 10,
        "offset": 0
    }
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Empty string for queries
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing derivative orders
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125014,
    "txHash": "",
    "codespace": "",
    "code": 0,
    "data": "CgpkZXJpdmF0aXZlX29yZGVycw==",
    "rawLog": "[{\"events\": [{\"type\": \"get_derivative_orders\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 150000,
    "gasUsed": 130000,
    "timestamp": "2025-10-15T00:20:40Z",
    "events": []
}
\`\`\`
`;

export const getDerivativeOrderHistoryTemplate = `
### Get Derivative Order History

**Description**:
This query retrieves the history of derivative orders based on provided parameters within the Exchange module. Derivative order history includes past orders, their statuses, execution details, and outcomes. Monitoring derivative order history is essential for users to analyze their trading performance, review past trading activities, and optimize future trading strategies.

**Request Format**:
\`\`\`json
{
    "filter": {
        "subaccountId": string,   // (Optional) Subaccount ID to filter order history
        "marketId": string,       // (Optional) Market ID to filter order history
        "status": string          // (Optional) Status of orders to filter (e.g., "filled", "cancelled")
    },
    "pagination": {
        "limit": number,          // (Optional) Number of historical orders to retrieve
        "offset": number          // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "subaccountId": "sub1account123...",
        "marketId": "BTC-USD-202510",
        "status": "filled"
    },
    "pagination": {
        "limit": 20,
        "offset": 0
    }
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Empty string for queries
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing derivative order history
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125015,
    "txHash": "",
    "codespace": "",
    "code": 0,
    "data": "CgpkZXJpdmF0aXZlX29yZGVyX2hpc3RvcnkAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_derivative_order_history\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 155000,
    "gasUsed": 135000,
    "timestamp": "2025-10-16T01:25:50Z",
    "events": []
}
\`\`\`
`;

export const getPositionsListTemplate = `
### Get Positions List

**Description**:
This query retrieves all exchange positions based on provided parameters within the Exchange module. Exchange positions represent users' holdings in various trading instruments, including spot, derivative, and binary options markets. Monitoring positions helps users manage their investments, assess exposure, and make informed trading decisions.

**Request Format**:
\`\`\`json
{
    "filter": {
        "subaccountId": string,   // (Optional) Subaccount ID to filter positions
        "marketId": string        // (Optional) Market ID to filter positions
    },
    "pagination": {
        "limit": number,          // (Optional) Number of positions to retrieve
        "offset": number          // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "subaccountId": "sub1account123...",
        "marketId": "ETH-USD-202510"
    },
    "pagination": {
        "limit": 15,
        "offset": 0
    }
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Empty string for queries
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing exchange positions
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125016,
    "txHash": "",
    "codespace": "",
    "code": 0,
    "data": "CgpkZXJpdmF0aXZlX3Bvc2l0aW9ucw==",
    "rawLog": "[{\"events\": [{\"type\": \"get_positions_list\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 160000,
    "gasUsed": 140000,
    "timestamp": "2025-10-17T02:30:00Z",
    "events": []
}
\`\`\`
`;

export const getPositionsV2Template = `
### Get Positions V2

**Description**:
This query retrieves all exchange positions version 2 based on provided parameters within the Exchange module. Positions V2 may include enhanced features such as improved data structures, additional metadata, and expanded functionalities. Monitoring Positions V2 helps users leverage the latest features, manage their investments more effectively, and gain deeper insights into their trading activities.

**Request Format**:
\`\`\`json
{
    "filter": {
        "subaccountId": string,   // (Optional) Subaccount ID to filter positions
        "marketId": string        // (Optional) Market ID to filter positions
    },
    "pagination": {
        "limit": number,          // (Optional) Number of positions to retrieve
        "offset": number          // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "subaccountId": "sub1account123...",
        "marketId": "ETH-USD-202510"
    },
    "pagination": {
        "limit": 20,
        "offset": 0
    }
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Empty string for queries
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing exchange positions V2
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125017,
    "txHash": "",
    "codespace": "",
    "code": 0,
    "data": "CgpkZXJpdmF0aXZlX3Bvc2l0aW9uc192Mg==",
    "rawLog": "[{\"events\": [{\"type\": \"get_positions_v2\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 165000,
    "gasUsed": 145000,
    "timestamp": "2025-10-18T03:35:10Z",
    "events": []
}
\`\`\`
`;

export const getDerivativeTradesTemplate = `
### Get Derivative Trades

**Description**:
This query retrieves all derivative trades based on provided parameters within the Exchange module. Derivative trades include executed trades in derivative markets, encompassing details such as trade price, volume, and counterparties. Monitoring derivative trades is essential for users to analyze their trading performance, assess market liquidity, and identify trading patterns.

**Request Format**:
\`\`\`json
{
    "filter": {
        "subaccountId": string,   // (Optional) Subaccount ID to filter trades
        "marketId": string,       // (Optional) Market ID to filter trades
        "tradeType": string       // (Optional) Type of trade (e.g., "buy", "sell")
    },
    "pagination": {
        "limit": number,          // (Optional) Number of trades to retrieve
        "offset": number          // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "subaccountId": "sub1account123...",
        "marketId": "ETH-USD-202510",
        "tradeType": "buy"
    },
    "pagination": {
        "limit": 25,
        "offset": 0
    }
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Empty string for queries
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing derivative trades
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125018,
    "txHash": "",
    "codespace": "",
    "code": 0,
    "data": "CgpkZXJpdmF0aXZlX3RyYWRlcw==",
    "rawLog": "[{\"events\": [{\"type\": \"get_derivative_trades\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 170000,
    "gasUsed": 150000,
    "timestamp": "2025-10-19T04:40:20Z",
    "events": []
}
\`\`\`
`;

export const getFundingPaymentsTemplate = `
### Get Funding Payments

**Description**:
This query retrieves all funding payments based on provided parameters within the Exchange module. Funding payments are periodic payments exchanged between traders to ensure that the perpetual swap price aligns with the underlying asset price. Monitoring funding payments is essential for users to understand their funding obligations, manage margin requirements, and assess the cost of maintaining positions.

**Request Format**:
\`\`\`json
{
    "filter": {
        "subaccountId": string,   // (Optional) Subaccount ID to filter funding payments
        "marketId": string        // (Optional) Market ID to filter funding payments
    },
    "pagination": {
        "limit": number,          // (Optional) Number of funding payments to retrieve
        "offset": number          // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "subaccountId": "sub1account123...",
        "marketId": "BTC-USD-202510"
    },
    "pagination": {
        "limit": 10,
        "offset": 0
    }
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Empty string for queries
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing funding payments
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125019,
    "txHash": "",
    "codespace": "",
    "code": 0,
    "data": "CgpmdW5kaW5nX3BheW1lbnRzAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_funding_payments\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 175000,
    "gasUsed": 155000,
    "timestamp": "2025-10-20T05:45:30Z",
    "events": []
}
\`\`\`
`;

export const getFundingRatesTemplate = `
### Get Funding Rates

**Description**:
This query retrieves all funding rates based on provided parameters within the Exchange module. Funding rates are periodic rates that traders pay or receive based on their positions in perpetual swap contracts. Monitoring funding rates is essential for users to understand the cost or benefit of maintaining long or short positions, manage their margin requirements, and make informed trading decisions.

**Request Format**:
\`\`\`json
{
    "filter": {
        "marketId": string,       // (Optional) Market ID to filter funding rates
        "timestamp": string       // (Optional) Specific timestamp to retrieve funding rates
    },
    "pagination": {
        "limit": number,          // (Optional) Number of funding rates to retrieve
        "offset": number          // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "marketId": "ETH-USD-202510",
        "timestamp": "2025-10-15T00:00:00Z"
    },
    "pagination": {
        "limit": 5,
        "offset": 0
    }
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Empty string for queries
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing funding rates
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125020,
    "txHash": "",
    "codespace": "",
    "code": 0,
    "data": "CgpmdW5kaW5nX3JhdGVzAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_funding_rates\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 180000,
    "gasUsed": 160000,
    "timestamp": "2025-10-21T06:50:40Z",
    "events": []
}
\`\`\`
`;

export const getDerivativeSubaccountOrdersListTemplate = `
### Get Derivative Subaccount Orders List

**Description**:
This query retrieves the list of derivative subaccount orders based on provided parameters within the Exchange module. Derivative subaccount orders include all orders placed by a specific subaccount in derivative markets. Monitoring subaccount orders helps users manage their open positions, track order statuses, and analyze trading performance.

**Request Format**:
\`\`\`json
{
    "subaccountId": string,   // Subaccount ID (e.g., "sub1account123...")
    "filter": {
        "marketId": string,   // (Optional) Market ID to filter orders
        "orderType": string   // (Optional) Type of order (e.g., "limit", "market")
    },
    "pagination": {
        "limit": number,      // (Optional) Number of orders to retrieve
        "offset": number      // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "subaccountId": "sub1account123...",
    "filter": {
        "marketId": "BTC-USD-202510",
        "orderType": "limit"
    },
    "pagination": {
        "limit": 10,
        "offset": 0
    }
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Empty string for queries
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing derivative subaccount orders
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125021,
    "txHash": "",
    "codespace": "",
    "code": 0,
    "data": "CgpkZXJpdmF0aXZlX3N1YmFjY291bnRfZXJkZXJzAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_derivative_subaccount_orders_list\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 185000,
    "gasUsed": 165000,
    "timestamp": "2025-10-22T07:55:50Z",
    "events": []
}
\`\`\`
`;

export const getDerivativeSubaccountTradesListTemplate = `
### Get Derivative Subaccount Trades List

**Description**:
This query retrieves the list of derivative subaccount trades based on provided parameters within the Exchange module. Derivative subaccount trades include all executed trades by a specific subaccount in derivative markets. Monitoring subaccount trades helps users analyze their trading performance, track trade histories, and assess the effectiveness of their trading strategies.

**Request Format**:
\`\`\`json
{
    "subaccountId": string,   // Subaccount ID (e.g., "sub1account123...")
    "filter": {
        "marketId": string,   // (Optional) Market ID to filter trades
        "tradeType": string   // (Optional) Type of trade (e.g., "buy", "sell")
    },
    "pagination": {
        "limit": number,      // (Optional) Number of trades to retrieve
        "offset": number      // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "subaccountId": "sub1account123...",
    "filter": {
        "marketId": "ETH-USD-202510",
        "tradeType": "buy"
    },
    "pagination": {
        "limit": 15,
        "offset": 0
    }
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Empty string for queries
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing derivative subaccount trades
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125022,
    "txHash": "",
    "codespace": "",
    "code": 0,
    "data": "CgpkZXJpdmF0aXZlX3N1YmFjY291bnRfZHJhZGVzAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_derivative_subaccount_trades_list\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 190000,
    "gasUsed": 170000,
    "timestamp": "2025-10-23T08:00:00Z",
    "events": []
}
\`\`\`
`;

export const getDerivativeOrderbooksV2Template = `
### Get Derivative Orderbooks V2

**Description**:
This query retrieves the orderbooks version 2 for specified derivative market IDs within the Exchange module. Orderbooks V2 provide detailed information about buy and sell orders, including prices, volumes, and order sequences. Monitoring orderbooks is essential for users to assess market liquidity, identify price trends, and execute informed trading strategies.

**Request Format**:
\`\`\`json
{
    "marketIds": [
        string   // List of derivative market IDs (e.g., ["BTC-USD-202510", "ETH-USD-202510"])
    ]
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "marketIds": ["BTC-USD-202510", "ETH-USD-202510"]
}
\`\`\`

**Response Format**:
\`\`\`json
[
    {
        "marketId": string,
        "orderbook": {
            "buyOrders": [
                {
                    "price": string,
                    "volume": string,
                    "sequence": number
                }
            ],
            "sellOrders": [
                {
                    "price": string,
                    "volume": string,
                    "sequence": number
                }
            ]
        }
    }
] | StandardResponse
\`\`\`

**Example Response**:
\`\`\`json
[
    {
        "marketId": "BTC-USD-202510",
        "orderbook": {
            "buyOrders": [
                {
                    "price": "50000",
                    "volume": "1.5",
                    "sequence": 1001
                },
                {
                    "price": "49950",
                    "volume": "2.0",
                    "sequence": 1002
                }
            ],
            "sellOrders": [
                {
                    "price": "50100",
                    "volume": "1.0",
                    "sequence": 2001
                },
                {
                    "price": "50200",
                    "volume": "1.2",
                    "sequence": 2002
                }
            ]
        }
    },
    {
        "marketId": "ETH-USD-202510",
        "orderbook": {
            "buyOrders": [
                {
                    "price": "4000",
                    "volume": "3.0",
                    "sequence": 1003
                },
                {
                    "price": "3990",
                    "volume": "4.0",
                    "sequence": 1004
                }
            ],
            "sellOrders": [
                {
                    "price": "4010",
                    "volume": "2.5",
                    "sequence": 2003
                },
                {
                    "price": "4020",
                    "volume": "3.0",
                    "sequence": 2004
                }
            ]
        }
    }
] | StandardResponse
\`\`\`
`;

export const getAtomicSwapHistoryTemplate = `
### Get Atomic Swap History

**Description**:
This query retrieves the atomic swap history based on provided parameters within the Exchange module. Atomic swaps facilitate the trustless exchange of assets between users without the need for intermediaries. Monitoring atomic swap history is essential for users to track their swap activities, analyze trading patterns, and ensure the security of their transactions.

**Request Format**:
\`\`\`json
{
    "filter": {
        "subaccountId": string,   // (Optional) Subaccount ID to filter swap history
        "asset": string,          // (Optional) Asset involved in the swap (e.g., "INJ")
        "status": string          // (Optional) Status of swaps to filter (e.g., "completed", "pending")
    },
    "pagination": {
        "limit": number,          // (Optional) Number of swap records to retrieve
        "offset": number          // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "subaccountId": "sub1account123...",
        "asset": "INJ",
        "status": "completed"
    },
    "pagination": {
        "limit": 10,
        "offset": 0
    }
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Empty string for queries
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing atomic swap history
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125023,
    "txHash": "",
    "codespace": "",
    "code": 0,
    "data": "CgppbmthbWl0X3N3YXBfaGlzdG9yeQAA",
    "rawLog": "[{\"events\": [{\"type\": \"get_atomic_swap_history\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 195000,
    "gasUsed": 175000,
    "timestamp": "2025-10-24T09:55:10Z",
    "events": []
}
\`\`\`
`;

export const msgBidTemplate = `
### Place Derivative Bid

**Description**:
This message broadcasts a transaction to place a bid in a specific derivative auction round within the Exchange module. Placing a bid allows participants to compete for the auctioned derivative contracts by offering a certain amount of INJ tokens. Successfully placing a bid updates the bid records, reflecting the participant's commitment to acquire the derivative assets. Monitoring bids is essential for understanding market participation, assessing bid competitiveness, and strategizing future bidding behaviors.

**Request Format**:
\`\`\`json
{
    "round": number,             // Auction round number to bid in (e.g., 1, 2, 3)
    "amount": string             // Amount to bid (e.g., "1000") in INJ_DENOM
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "round": 1,
    "amount": "1000"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Transaction hash
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing transaction details
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125024,
    "txHash": "XYZ789bidsuccessxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgpidWlkAA==",
    "rawLog": "[{\"events\": [{\"type\": \"bid\", \"attributes\": [{\"key\": \"round\", \"value\": \"1\"}, {\"key\": \"injective_address\", \"value\": \"inj1sender123...\"}, {\"key\": \"amount\", \"value\": \"1000INJ\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 200000,
    "gasUsed": 160000,
    "timestamp": "2025-10-25T10:00:00Z",
    "events": []
}
\`\`\`
`;

export const msgAdminUpdateBinaryOptionsMarketTemplate = `
### Admin Update Binary Options Market

**Description**:
This message broadcasts a transaction to update a binary options market as an admin within the Exchange module. Admin updates can include changes to market parameters, configurations, and operational settings. Successfully updating a binary options market ensures that the market adheres to the latest standards, regulations, and user requirements. Monitoring admin actions is essential for maintaining market integrity, ensuring compliance, and adapting to evolving trading environments.

**Request Format**:
\`\`\`json
{
    "marketId": string,              // Binary options market ID to update (e.g., "ETH-USD-202510")
    "newParameters": object          // Object containing the parameters to update
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "marketId": "ETH-USD-202510",
    "newParameters": {
        "expiration": "2025-12-31T23:59:59Z",
        "strikePrice": "4000"
    }
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Transaction hash
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing transaction details
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125025,
    "txHash": "YZA678grantauthxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgZhdWR0AA==",
    "rawLog": "[{\"events\": [{\"type\": \"admin_update_binary_options_market\", \"attributes\": [{\"key\": \"market_id\", \"value\": \"ETH-USD-202510\"}, {\"key\": \"parameter\", \"value\": \"expiration\"}, {\"key\": \"value\", \"value\": \"2025-12-31T23:59:59Z\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 250000,
    "gasUsed": 220000,
    "timestamp": "2025-10-26T11:05:10Z",
    "events": []
}
\`\`\`
`;

export const msgBatchCancelBinaryOptionsOrdersTemplate = `
### Batch Cancel Binary Options Orders

**Description**:
This message broadcasts a transaction to batch cancel multiple binary options orders within the Exchange module. Batch cancel operations allow users to efficiently cancel multiple orders simultaneously, reducing the number of transactions and associated fees. Successfully canceling orders updates the system state, removing the specified orders from the order books.

**Request Format**:
\`\`\`json
{
    "orderIds": [
        string   // List of binary options order IDs to cancel (e.g., ["order123", "order456"])
    ]
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "orderIds": ["order123", "order456"]
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Transaction hash
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing transaction details
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125026,
    "txHash": "BCD901batchcancelbinaryxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgpiYXRjaF9jYW5jZWwAA==",
    "rawLog": "[{\"events\": [{\"type\": \"batch_cancel_binary_options_orders\", \"attributes\": [{\"key\": \"order_ids\", \"value\": \"order123,order456\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 210000,
    "gasUsed": 180000,
    "timestamp": "2025-10-27T12:10:20Z",
    "events": []
}
\`\`\`
`;

export const msgBatchCancelDerivativeOrdersTemplate = `
### Batch Cancel Derivative Orders

**Description**:
This message broadcasts a transaction to batch cancel multiple derivative orders within the Exchange module. Batch cancel operations allow users to efficiently cancel multiple orders simultaneously, reducing the number of transactions and associated fees. Successfully canceling orders updates the system state, removing the specified orders from the order books.

**Request Format**:
\`\`\`json
{
    "orderIds": [
        string   // List of derivative order IDs to cancel (e.g., ["derivOrder123", "derivOrder456"])
    ]
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "orderIds": ["derivOrder123", "derivOrder456"]
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Transaction hash
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing transaction details
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125027,
    "txHash": "EFG234batchcancelderivativexyz...",
    "codespace": "",
    "code": 0,
    "data": "CgpkYXRjaF9jYW5jZWwAA==",
    "rawLog": "[{\"events\": [{\"type\": \"batch_cancel_derivative_orders\", \"attributes\": [{\"key\": \"order_ids\", \"value\": \"derivOrder123,derivOrder456\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 215000,
    "gasUsed": 185000,
    "timestamp": "2025-10-28T13:15:30Z",
    "events": []
}
\`\`\`
`;

export const msgBatchCancelSpotOrdersTemplate = `
### Batch Cancel Spot Orders

**Description**:
This message broadcasts a transaction to batch cancel multiple spot orders within the Exchange module. Batch cancel operations allow users to efficiently cancel multiple orders simultaneously, reducing the number of transactions and associated fees. Successfully canceling orders updates the system state, removing the specified orders from the order books.

**Request Format**:
\`\`\`json
{
    "orderIds": [
        string   // List of spot order IDs to cancel (e.g., ["spotOrder123", "spotOrder456"])
    ]
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "orderIds": ["spotOrder123", "spotOrder456"]
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Transaction hash
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing transaction details
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125028,
    "txHash": "UVW345batchcancelsportxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgpkYXRjaF9jYW5jZWwAA==",
    "rawLog": "[{\"events\": [{\"type\": \"batch_cancel_spot_orders\", \"attributes\": [{\"key\": \"order_ids\", \"value\": \"spotOrder123,spotOrder456\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 220000,
    "gasUsed": 190000,
    "timestamp": "2025-10-29T14:20:40Z",
    "events": []
}
\`\`\`
`;

export const msgBatchUpdateOrdersTemplate = `
### Batch Update Orders

**Description**:
This message broadcasts a transaction to batch update multiple orders within the Exchange module. Batch update operations allow users to modify multiple orders simultaneously, such as updating order prices or volumes, thereby enhancing trading efficiency and reducing the number of transactions. Successfully updating orders reflects the changes in the system state, adjusting the specified orders accordingly.

**Request Format**:
\`\`\`json
{
    "updates": [
        {
            "orderId": string,       // Order ID to update (e.g., "order123")
            "newPrice": string,      // New price for the order
            "newVolume": string      // New volume for the order
        }
    ]
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "updates": [
        {
            "orderId": "order123",
            "newPrice": "51000",
            "newVolume": "1.8"
        },
        {
            "orderId": "order456",
            "newPrice": "52000",
            "newVolume": "2.0"
        }
    ]
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Transaction hash
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing transaction details
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125029,
    "txHash": "ABC456batchupdateordersxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgptYXRjaF91cGRhdGUAA==",
    "rawLog": "[{\"events\": [{\"type\": \"batch_update_orders\", \"attributes\": [{\"key\": \"order_ids\", \"value\": \"order123,order456\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 225000,
    "gasUsed": 195000,
    "timestamp": "2025-10-30T15:25:50Z",
    "events": []
}
\`\`\`
`;

export const msgCancelBinaryOptionsOrderTemplate = `
### Cancel Binary Options Order

**Description**:
This message broadcasts a transaction to cancel a specific binary options order within the Exchange module. Canceling an order removes it from the order book, preventing it from being executed if it hasn't been filled yet. Successfully canceling an order updates the system state, reflecting the cancellation and freeing up available resources.

**Request Format**:
\`\`\`json
{
    "orderId": string   // Binary options order ID to cancel (e.g., "binaryOrder123")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "orderId": "binaryOrder123"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Transaction hash
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing transaction details
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125030,
    "txHash": "DEF567cancelbinaryxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgpjYW5jZWxfbW9kdWxlAA==",
    "rawLog": "[{\"events\": [{\"type\": \"cancel_binary_options_order\", \"attributes\": [{\"key\": \"order_id\", \"value\": \"binaryOrder123\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 230000,
    "gasUsed": 200000,
    "timestamp": "2025-10-31T16:30:00Z",
    "events": []
}
\`\`\`
`;

export const msgCancelDerivativeOrderTemplate = `
### Cancel Derivative Order

**Description**:
This message broadcasts a transaction to cancel a specific derivative order within the Exchange module. Canceling an order removes it from the order book, preventing it from being executed if it hasn't been filled yet. Successfully canceling an order updates the system state, reflecting the cancellation and freeing up available resources.

**Request Format**:
\`\`\`json
{
    "orderId": string   // Derivative order ID to cancel (e.g., "derivOrder123")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "orderId": "derivOrder123"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Transaction hash
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing transaction details
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125031,
    "txHash": "GHI678cancelderivativexyz...",
    "codespace": "",
    "code": 0,
    "data": "CgpjYW5jZWxfbW9kdWxlAA==",
    "rawLog": "[{\"events\": [{\"type\": \"cancel_derivative_order\", \"attributes\": [{\"key\": \"order_id\", \"value\": \"derivOrder123\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 235000,
    "gasUsed": 205000,
    "timestamp": "2025-11-01T17:35:10Z",
    "events": []
}
\`\`\`
`;

export const msgCancelSpotOrderTemplate = `
### Cancel Spot Order

**Description**:
This message broadcasts a transaction to cancel a specific spot order within the Exchange module. Canceling an order removes it from the order book, preventing it from being executed if it hasn't been filled yet. Successfully canceling an order updates the system state, reflecting the cancellation and freeing up available resources.

**Request Format**:
\`\`\`json
{
    "orderId": string   // Spot order ID to cancel (e.g., "spotOrder123")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "orderId": "spotOrder123"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Transaction hash
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing transaction details
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125032,
    "txHash": "JKL789cancelsportxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgpjYW5jZWxfbW9kdWxlAA==",
    "rawLog": "[{\"events\": [{\"type\": \"cancel_spot_order\", \"attributes\": [{\"key\": \"order_id\", \"value\": \"spotOrder123\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 240000,
    "gasUsed": 210000,
    "timestamp": "2025-11-02T18:40:20Z",
    "events": []
}
\`\`\`
`;

export const msgCreateBinaryOptionsLimitOrderTemplate = `
### Create Binary Options Limit Order

**Description**:
This message broadcasts a transaction to create a binary options limit order within the Exchange module. A binary options limit order allows users to set specific parameters for their order, such as price and volume, to be executed when market conditions meet the defined criteria. Successfully creating a limit order adds it to the order book, making it available for matching with opposing orders.

**Request Format**:
\`\`\`json
{
    "marketId": string,      // Binary options market ID (e.g., "ETH-USD-202510")
    "price": string,         // Price at which to place the limit order (e.g., "4000")
    "volume": string         // Volume of the order (e.g., "1.5")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "marketId": "ETH-USD-202510",
    "price": "4000",
    "volume": "1.5"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Transaction hash
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing transaction details
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125033,
    "txHash": "LMN012createbinaryxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgpkYXRjaF9sbWl0X29yZGVyAA==",
    "rawLog": "[{\"events\": [{\"type\": \"create_binary_options_limit_order\", \"attributes\": [{\"key\": \"market_id\", \"value\": \"ETH-USD-202510\"}, {\"key\": \"price\", \"value\": \"4000\"}, {\"key\": \"volume\", \"value\": \"1.5\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 245000,
    "gasUsed": 215000,
    "timestamp": "2025-11-03T19:45:30Z",
    "events": []
}
\`\`\`
`;

export const msgCreateBinaryOptionsMarketOrderTemplate = `
### Create Binary Options Market Order

**Description**:
This message broadcasts a transaction to create a binary options market order within the Exchange module. A binary options market order allows users to execute trades immediately at the current market price without specifying a price limit. Successfully creating a market order facilitates swift trade execution, enhancing trading flexibility and responsiveness to market conditions.

**Request Format**:
\`\`\`json
{
    "marketId": string,      // Binary options market ID (e.g., "ETH-USD-202510")
    "volume": string         // Volume of the order (e.g., "2.0")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "marketId": "ETH-USD-202510",
    "volume": "2.0"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Transaction hash
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing transaction details
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125034,
    "txHash": "NOP345createbinarymarketxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgpkYXRjaF9tYXJrZXRlAA==",
    "rawLog": "[{\"events\": [{\"type\": \"create_binary_options_market_order\", \"attributes\": [{\"key\": \"market_id\", \"value\": \"ETH-USD-202510\"}, {\"key\": \"volume\", \"value\": \"2.0\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 250000,
    "gasUsed": 220000,
    "timestamp": "2025-11-04T20:50:40Z",
    "events": []
}
\`\`\`
`;

export const msgCreateDerivativeLimitOrderTemplate = `
### Create Derivative Limit Order

**Description**:
This message broadcasts a transaction to create a derivative limit order within the Exchange module. A derivative limit order allows users to set specific parameters for their order, such as price and volume, to be executed when market conditions meet the defined criteria. Successfully creating a limit order adds it to the derivative order book, making it available for matching with opposing orders.

**Request Format**:
\`\`\`json
{
    "marketId": string,      // Derivative market ID (e.g., "BTC-USD-202510")
    "price": string,         // Price at which to place the limit order (e.g., "50000")
    "volume": string         // Volume of the order (e.g., "1.2")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "marketId": "BTC-USD-202510",
    "price": "50000",
    "volume": "1.2"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Transaction hash
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing transaction details
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125035,
    "txHash": "QRS678createderivativexyz...",
    "codespace": "",
    "code": 0,
    "data": "CgpkYXRjaF9saW1pdF9vcmRlcg==",
    "rawLog": "[{\"events\": [{\"type\": \"create_derivative_limit_order\", \"attributes\": [{\"key\": \"market_id\", \"value\": \"BTC-USD-202510\"}, {\"key\": \"price\", \"value\": \"50000\"}, {\"key\": \"volume\", \"value\": \"1.2\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 255000,
    "gasUsed": 225000,
    "timestamp": "2025-11-05T21:55:50Z",
    "events": []
}
\`\`\`
`;

export const msgCreateDerivativeMarketOrderTemplate = `
### Create Derivative Market Order

**Description**:
This message broadcasts a transaction to create a derivative market order within the Exchange module. A derivative market order allows users to execute trades immediately at the current market price without specifying a price limit. Successfully creating a market order facilitates swift trade execution, enhancing trading flexibility and responsiveness to market conditions.

**Request Format**:
\`\`\`json
{
    "marketId": string,      // Derivative market ID (e.g., "BTC-USD-202510")
    "volume": string         // Volume of the order (e.g., "2.5")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "marketId": "BTC-USD-202510",
    "volume": "2.5"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Transaction hash
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing transaction details
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125036,
    "txHash": "TUV901createderivativedetailsxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgpkYXRjaF9tYXJrZXRlAA==",
    "rawLog": "[{\"events\": [{\"type\": \"create_derivative_market_order\", \"attributes\": [{\"key\": \"market_id\", \"value\": \"BTC-USD-202510\"}, {\"key\": \"volume\", \"value\": \"2.5\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 260000,
    "gasUsed": 230000,
    "timestamp": "2025-11-06T23:00:00Z",
    "events": []
}
\`\`\`
`;

export const msgCreateSpotLimitOrderTemplate = `
### Create Spot Limit Order

**Description**:
This message broadcasts a transaction to create a spot limit order within the Exchange module. A spot limit order allows users to set specific parameters for their order, such as price and volume, to be executed when market conditions meet the defined criteria. Successfully creating a limit order adds it to the spot order book, making it available for matching with opposing orders.

**Request Format**:
\`\`\`json
{
    "marketId": string,      // Spot market ID (e.g., "ETH-USD")
    "price": string,         // Price at which to place the limit order (e.g., "2500")
    "volume": string         // Volume of the order (e.g., "3.0")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "marketId": "ETH-USD",
    "price": "2500",
    "volume": "3.0"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Transaction hash
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing transaction details
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125037,
    "txHash": "UVW012createspotlimitxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgpjYW5jZWxfbW9kdWxlAA==",
    "rawLog": "[{\"events\": [{\"type\": \"create_spot_limit_order\", \"attributes\": [{\"key\": \"market_id\", \"value\": \"ETH-USD\"}, {\"key\": \"price\", \"value\": \"2500\"}, {\"key\": \"volume\", \"value\": \"3.0\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 265000,
    "gasUsed": 235000,
    "timestamp": "2025-11-07T00:05:10Z",
    "events": []
}
\`\`\`
`;

export const msgCreateSpotMarketOrderTemplate = `
### Create Spot Market Order

**Description**:
This message broadcasts a transaction to create a spot market order within the Exchange module. A spot market order allows users to execute trades immediately at the current market price without specifying a price limit. Successfully creating a market order facilitates swift trade execution, enhancing trading flexibility and responsiveness to market conditions.

**Request Format**:
\`\`\`json
{
    "marketId": string,      // Spot market ID (e.g., "ETH-USD")
    "volume": string         // Volume of the order (e.g., "2.5")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "marketId": "ETH-USD",
    "volume": "2.5"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Transaction hash
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing transaction details
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125038,
    "txHash": "XYZ345createspotmarketxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgpjYW5jZWxfbW9kdWxlAA==",
    "rawLog": "[{\"events\": [{\"type\": \"create_spot_market_order\", \"attributes\": [{\"key\": \"market_id\", \"value\": \"ETH-USD\"}, {\"key\": \"volume\", \"value\": \"2.5\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 270000,
    "gasUsed": 240000,
    "timestamp": "2025-11-08T01:10:20Z",
    "events": []
}
\`\`\`
`;

export const msgDepositTemplate = `
### Deposit Funds

**Description**:
This message broadcasts a transaction to deposit funds into a specific account within the Exchange module. Depositing funds increases the user's balance, enabling them to participate in trading activities such as placing orders, bidding, and staking. Successfully depositing funds updates the account's balance, reflecting the new deposit amount.

**Request Format**:
\`\`\`json
{
    "amount": string,         // Amount to deposit (e.g., "1000")
    "denom": string           // Denomination of the asset (e.g., "INJ")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "amount": "1000",
    "denom": "INJ"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Transaction hash
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing transaction details
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125039,
    "txHash": "ABC567depositsuccessxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgpkZXBvc2l0AA==",
    "rawLog": "[{\"events\": [{\"type\": \"deposit\", \"attributes\": [{\"key\": \"amount\", \"value\": \"1000INJ\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 275000,
    "gasUsed": 245000,
    "timestamp": "2025-11-09T02:15:30Z",
    "events": []
}
\`\`\`
`;

export const msgExternalTransferTemplate = `
### External Transfer

**Description**:
This message broadcasts a transaction to perform an external transfer of funds within the Exchange module. External transfers enable users to move funds between different platforms or external wallets securely. Successfully performing an external transfer updates the account balances accordingly, reflecting the transferred amounts.

**Request Format**:
\`\`\`json
{
    "recipientAddress": string,   // Recipient's Injective address (e.g., "inj1recipient123...")
    "totalAmount": string,        // Total amount to transfer (e.g., "500")
    "denom": string               // Denomination of the asset (e.g., "INJ")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "recipientAddress": "inj1recipient123...",
    "totalAmount": "500",
    "denom": "INJ"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Transaction hash
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing transaction details
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125040,
    "txHash": "DEF678externaltransferxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgpleHRlcm5hbF90cmFuc2ZlcmUA",
    "rawLog": "[{\"events\": [{\"type\": \"external_transfer\", \"attributes\": [{\"key\": \"recipient_address\", \"value\": \"inj1recipient123...\"}, {\"key\": \"amount\", \"value\": \"500INJ\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 280000,
    "gasUsed": 250000,
    "timestamp": "2025-11-10T03:20:40Z",
    "events": []
}
\`\`\`
`;

export const msgIncreasePositionMarginTemplate = `
### Increase Position Margin

**Description**:
This message broadcasts a transaction to increase the margin of an existing position within the Exchange module. Increasing position margin enhances the leverage and reduces the liquidation risk of a position. Successfully increasing margin updates the position's margin balance, providing additional collateral for maintaining the position.

**Request Format**:
\`\`\`json
{
    "positionId": string,      // Position ID to increase margin (e.g., "position123")
    "additionalMargin": string,// Additional margin amount to add (e.g., "100")
    "denom": string            // Denomination of the margin asset (e.g., "INJ")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "positionId": "position123",
    "additionalMargin": "100",
    "denom": "INJ"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Transaction hash
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing transaction details
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125041,
    "txHash": "GHI789increasemarginxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgppbmNyZWFzZV9tYXJnaW5AA==",
    "rawLog": "[{\"events\": [{\"type\": \"increase_position_margin\", \"attributes\": [{\"key\": \"position_id\", \"value\": \"position123\"}, {\"key\": \"additional_margin\", \"value\": \"100INJ\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 285000,
    "gasUsed": 255000,
    "timestamp": "2025-11-11T04:25:50Z",
    "events": []
}
\`\`\`
`;

export const msgInstantSpotMarketLaunchTemplate = `
### Instant Spot Market Launch

**Description**:
This message broadcasts a transaction to instantly launch a new spot market within the Exchange module. Instantly launching a spot market allows administrators to create new trading pairs quickly, enabling users to start trading without delay. Successfully launching a spot market adds it to the active markets list, making it available for trading activities.

**Request Format**:
\`\`\`json
{
    "baseAsset": string,      // Base asset of the new market (e.g., "LINK")
    "quoteAsset": string,     // Quote asset of the new market (e.g., "USD")
    "minPriceTick": string,   // Minimum price tick size (e.g., "0.01")
    "minQuantityTick": string // Minimum quantity tick size (e.g., "0.1")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "baseAsset": "LINK",
    "quoteAsset": "USD",
    "minPriceTick": "0.01",
    "minQuantityTick": "0.1"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Transaction hash
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing transaction details
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125042,
    "txHash": "JKL012launchspotmarketxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgppbnN0YW50X3Nwb3RfbWFya2V0AA==",
    "rawLog": "[{\"events\": [{\"type\": \"instant_spot_market_launch\", \"attributes\": [{\"key\": \"base_asset\", \"value\": \"LINK\"}, {\"key\": \"quote_asset\", \"value\": \"USD\"}, {\"key\": \"min_price_tick\", \"value\": \"0.01\"}, {\"key\": \"min_quantity_tick\", \"value\": \"0.1\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 290000,
    "gasUsed": 260000,
    "timestamp": "2025-11-12T05:30:00Z",
    "events": []
}
\`\`\`
`;

export const msgLiquidatePositionTemplate = `
### Liquidate Position

**Description**:
This message broadcasts a transaction to liquidate a specific position within the Exchange module. Liquidation occurs when a position's margin falls below the required maintenance margin, leading to the automatic closure of the position to prevent further losses. Successfully liquidating a position updates the system state, reflecting the closure and any associated fees or penalties.

**Request Format**:
\`\`\`json
{
    "positionId": string,      // Position ID to liquidate (e.g., "position123")
    "marketId": string         // Market ID of the position (e.g., "BTC-USD-202510")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "positionId": "position123",
    "marketId": "BTC-USD-202510"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Transaction hash
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing transaction details
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125043,
    "txHash": "MNO345liquidatepositionxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgpsaXF1aWRhdGVfcG9zaXRpb24AA==",
    "rawLog": "[{\"events\": [{\"type\": \"liquidate_position\", \"attributes\": [{\"key\": \"position_id\", \"value\": \"position123\"}, {\"key\": \"market_id\", \"value\": \"BTC-USD-202510\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 295000,
    "gasUsed": 265000,
    "timestamp": "2025-11-13T06:35:10Z",
    "events": []
}
\`\`\`
`;

export const msgReclaimLockedFundsTemplate = `
### Reclaim Locked Funds

**Description**:
This message broadcasts a transaction to reclaim locked funds within the Exchange module. Reclaiming locked funds allows users to retrieve assets that were previously locked as collateral or margin for their positions. Successfully reclaiming funds updates the account balances, freeing up the specified assets for other uses.

**Request Format**:
\`\`\`json
{
    "subaccountId": string,   // Subaccount ID to reclaim funds from (e.g., "sub1account123...")
    "amount": string,         // Amount to reclaim (e.g., "500")
    "denom": string           // Denomination of the asset (e.g., "INJ")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "subaccountId": "sub1account123...",
    "amount": "500",
    "denom": "INJ"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Transaction hash
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing transaction details
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125044,
    "txHash": "PQR678reclaimfundsxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgpyZWNsaWFtX2xvY2tlZF9mdW5kcw==",
    "rawLog": "[{\"events\": [{\"type\": \"reclaim_locked_funds\", \"attributes\": [{\"key\": \"subaccount_id\", \"value\": \"sub1account123...\"}, {\"key\": \"amount\", \"value\": \"500INJ\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 300000,
    "gasUsed": 270000,
    "timestamp": "2025-11-14T07:40:20Z",
    "events": []
}
\`\`\`
`;

export const msgRewardsOptOutTemplate = `
### Opt Out of Rewards

**Description**:
This message broadcasts a transaction to opt out of receiving trading rewards within the Exchange module. Opting out means the user will no longer accumulate or receive any trading incentives or bonuses. Successfully opting out updates the account settings, reflecting the user's preference to exclude themselves from rewards programs.

**Request Format**:
\`\`\`json
{
    "account": string   // Account address opting out of rewards (e.g., "inj1account123...")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "account": "inj1account123..."
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Transaction hash
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing transaction details
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125045,
    "txHash": "STU901optoutrewardsxyz...",
    "codespace": "",
    "code": 0,
    "data": "Cgppb3B0X291dF9yZXdhcmRzAA==",
    "rawLog": "[{\"events\": [{\"type\": \"opt_out_of_rewards\", \"attributes\": [{\"key\": \"account\", \"value\": \"inj1account123...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 305000,
    "gasUsed": 275000,
    "timestamp": "2025-11-15T08:45:30Z",
    "events": []
}
\`\`\`
`;

export const msgSignDataTemplate = `
### Sign Data

**Description**:
This message broadcasts a transaction to sign arbitrary data within the Exchange module. Signing data allows users to provide cryptographic proof of ownership or authorization for specific actions. Successfully signing data updates the system state, recording the signed data for verification purposes.

**Request Format**:
\`\`\`json
{
    "data": string   // Data to be signed (e.g., "transaction details")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "data": "transaction details"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Transaction hash
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing signature details
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125046,
    "txHash": "VWX234signdataxyz...",
    "codespace": "",
    "code": 0,
    "data": "Cgppc19zaWduZGF0YQAA",
    "rawLog": "[{\"events\": [{\"type\": \"sign_data\", \"attributes\": [{\"key\": \"data\", \"value\": \"transaction details\"}, {\"key\": \"signature\", \"value\": \"abcdef123456\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 310000,
    "gasUsed": 280000,
    "timestamp": "2025-11-16T09:50:40Z",
    "events": []
}
\`\`\`
`;

export const msgWithdrawTemplate = `
### Withdraw Funds

**Description**:
This message broadcasts a transaction to withdraw funds from a specific account within the Exchange module. Withdrawing funds decreases the user's balance, enabling them to transfer assets to external wallets or other platforms. Successfully withdrawing funds updates the account's balance, reflecting the withdrawn amount.

**Request Format**:
\`\`\`json
{
    "amount": string,         // Amount to withdraw (e.g., "300")
    "denom": string           // Denomination of the asset (e.g., "INJ")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "amount": "300",
    "denom": "INJ"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Transaction hash
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing transaction details
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 125047,
    "txHash": "XYZ567withdrawsuccessxyz...",
    "codespace": "",
    "code": 0,
    "data": "Cgpkd2l0aGRyYXcAA==",
    "rawLog": "[{\"events\": [{\"type\": \"withdraw\", \"attributes\": [{\"key\": \"amount\", \"value\": \"300INJ\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 315000,
    "gasUsed": 285000,
    "timestamp": "2025-11-17T10:55:50Z",
    "events": []
}
\`\`\`
`;
