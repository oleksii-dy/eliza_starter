// exchange-templates.ts
// Market Related Templates
export const getDerivativeMarketsTemplate = `
Extract derivative markets query parameters:
- Quote Denom: {{quoteDenom}} (string?) - Optional quote denomination filter
- Market Status: {{marketStatus}} (string?) - Optional market status filter
- Market Statuses: {{marketStatuses}} (string[]?) - Optional array of market statuses
`;

export const getSpotMarketsTemplate = `
Extract spot markets query parameters:
- Base Denom: {{baseDenom}} (string?) - Optional base denomination filter
- Quote Denom: {{quoteDenom}} (string?) - Optional quote denomination filter
- Market Status: {{marketStatus}} (string?) - Optional market status filter
- Market Statuses: {{marketStatuses}} (string[]?) - Optional array of market statuses
`;

// Order Related Templates
export const createSpotLimitOrderTemplate = `
Extract spot limit order parameters:
- Market ID: {{marketId}} (string) - Unique identifier of the spot market
- Subaccount ID: {{subaccountId}} (string) - Subaccount placing the order
- Order Type: {{orderType}} (OrderType) - Type of the order (BUY/SELL)
- Price: {{price}} (string) - Limit price for the order
- Quantity: {{quantity}} (string) - Order quantity
- Fee Recipient: {{feeRecipient}} (string) - Address to receive trading fees
- Trigger Price: {{triggerPrice}} (string?) - Optional trigger price for conditional orders
- CID: {{cid}} (string?) - Optional client order ID
`;

export const createDerivativeLimitOrderTemplate = `
Extract derivative limit order parameters:
- Market ID: {{marketId}} (string) - Unique identifier of the derivative market
- Subaccount ID: {{subaccountId}} (string) - Subaccount placing the order
- Order Type: {{orderType}} (OrderType) - Type of the order (BUY/SELL)
- Price: {{price}} (string) - Limit price for the order
- Quantity: {{quantity}} (string) - Order quantity
- Margin: {{margin}} (string) - Initial margin for the position
- Fee Recipient: {{feeRecipient}} (string) - Address to receive trading fees
- Trigger Price: {{triggerPrice}} (string?) - Optional trigger price for conditional orders
- CID: {{cid}} (string?) - Optional client order ID
`;

export const batchCancelOrdersTemplate = `
Extract batch cancel orders parameters:
- Orders: {{orders}} (object[]) - Array of orders to cancel
  - Market ID: {{orders.marketId}} (string) - Market identifier
  - Subaccount ID: {{orders.subaccountId}} (string) - Subaccount identifier
  - Order Hash: {{orders.orderHash}} (string?) - Optional order hash
  - Order Mask: {{orders.orderMask}} (OrderMask?) - Optional order mask
  - CID: {{orders.cid}} (string?) - Optional client order ID
`;

// Position Related Templates
export const getPositionsTemplate = `
Extract positions query parameters:
- Market ID: {{marketId}} (string?) - Optional market identifier filter
- Market IDs: {{marketIds}} (string[]?) - Optional array of market identifiers
- Subaccount ID: {{subaccountId}} (string?) - Optional subaccount identifier
- Direction: {{direction}} (TradeDirection?) - Optional trade direction filter
- Pagination: {{pagination}} (PaginationOption?) - Optional pagination parameters
`;

export const increasePositionMarginTemplate = `
Extract position margin increase parameters:
- Market ID: {{marketId}} (string) - Market identifier
- Source Subaccount ID: {{srcSubaccountId}} (string) - Source subaccount
- Destination Subaccount ID: {{dstSubaccountId}} (string) - Destination subaccount
- Amount: {{amount}} (string) - Amount to increase margin by
`;

// Funding Related Templates
export const getFundingPaymentsTemplate = `
Extract funding payments query parameters:
- Market ID: {{marketId}} (string?) - Optional market identifier filter
- Market IDs: {{marketIds}} (string[]?) - Optional array of market identifiers
- Subaccount ID: {{subaccountId}} (string?) - Optional subaccount identifier
- Pagination: {{pagination}} (PaginationOption?) - Optional pagination parameters
`;

export const getFundingRatesTemplate = `
Extract funding rates query parameters:
- Market ID: {{marketId}} (string?) - Market identifier
- Pagination: {{pagination}} (PaginationOption?) - Optional pagination parameters
`;

// Trade Related Templates
export const getTradesTemplate = `
Extract trades query parameters:
- Market ID: {{marketId}} (string?) - Optional market identifier filter
- Market IDs: {{marketIds}} (string[]?) - Optional array of market identifiers
- Subaccount ID: {{subaccountId}} (string?) - Optional subaccount identifier
- Account Address: {{accountAddress}} (string?) - Optional account address
- Direction: {{direction}} (TradeDirection?) - Optional trade direction filter
- Start Time: {{startTime}} (number?) - Optional start timestamp
- End Time: {{endTime}} (number?) - Optional end timestamp
- Execution Side: {{executionSide}} (TradeExecutionSide?) - Optional execution side filter
- Execution Types: {{executionTypes}} (TradeExecutionType[]?) - Optional execution types filter
- Pagination: {{pagination}} (PaginationOption?) - Optional pagination parameters
`;

// Subaccount Related Templates
export const getSubaccountBalancesTemplate = `
Extract subaccount balances query parameters:
- Subaccount ID: {{subaccountId}} (string) - Subaccount identifier
`;

export const getSubaccountHistoryTemplate = `
Extract subaccount history query parameters:
- Subaccount ID: {{subaccountId}} (string) - Subaccount identifier
- Denom: {{denom}} (string?) - Optional denomination filter
- Transfer Types: {{transferTypes}} (string[]?) - Optional transfer types filter
- Pagination: {{pagination}} (PaginationOption?) - Optional pagination parameters
`;

export const depositTemplate = `
Extract deposit parameters:
- Subaccount ID: {{subaccountId}} (string) - Destination subaccount
- Amount: {{amount}} (object) - Amount to deposit
  - Amount: {{amount.amount}} (string) - Deposit amount
  - Denom: {{amount.denom}} (string) - Token denomination
`;

export const withdrawTemplate = `
Extract withdrawal parameters:
- Subaccount ID: {{subaccountId}} (string) - Source subaccount
- Amount: {{amount}} (object) - Amount to withdraw
  - Amount: {{amount.amount}} (string) - Withdrawal amount
  - Denom: {{amount.denom}} (string) - Token denomination
`;