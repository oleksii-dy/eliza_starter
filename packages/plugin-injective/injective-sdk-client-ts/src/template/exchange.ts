// exchange-templates.ts

export const msgCreateSpotLimitOrderTemplate = `
Extract spot limit order parameters:
- Market ID: {{marketId}}
- Subaccount ID: {{subaccountId}}
- Order type: {{orderType}}
- Trigger price: {{triggerPrice}}
- Fee recipient: {{feeRecipient}}
- Price: {{price}}
- Quantity: {{quantity}}
- Client ID: {{cid}}
`;

export const msgCreateSpotMarketOrderTemplate = `
Extract spot market order parameters:
- Market ID: {{marketId}}+
- Subaccount ID: {{subaccountId}}
- Order type: {{orderType}}
- Fee recipient: {{feeRecipient}}
- Price: {{price}}
- Quantity: {{quantity}}
`;

export const msgCreateDerivativeLimitOrderTemplate = `
Extract derivative limit order parameters:
- Market ID: {{marketId}}
- Subaccount ID: {{subaccountId}}
- Order type: {{orderType}}
- Trigger price: {{triggerPrice}}
- Fee recipient: {{feeRecipient}}
- Price: {{price}}
- Margin: {{margin}}
- Quantity: {{quantity}}
- Client ID: {{cid}}
`;

export const msgDepositTemplate = `
Extract deposit parameters:
- Subaccount ID: {{subaccountId}}
- Amount: {{amount}}
- Denom: {{denom}}
`;

export const msgWithdrawTemplate = `
Extract withdraw parameters:
- Subaccount ID: {{subaccountId}}
- Amount: {{amount}}
- Denom: {{denom}}
`;

export const msgExternalTransferTemplate = `
Extract external transfer parameters:
- Source subaccount ID: {{srcSubaccountId}}
- Destination subaccount ID: {{dstSubaccountId}}
- Amount: {{amount}}
- Denom: {{denom}}
`;

export const msgIncreasePositionMarginTemplate = `
Extract increase position margin parameters:
- Market ID: {{marketId}}
- Source subaccount ID: {{srcSubaccountId}}
- Destination subaccount ID: {{dstSubaccountId}}
- Amount: {{amount}}
`;

export const msgLiquidatePositionTemplate = `
Extract liquidate position parameters:
- Subaccount ID: {{subaccountId}}
- Market ID: {{marketId}}
- Order: {{order}}
`;

export const msgBatchCancelOrdersTemplate = `
Extract batch cancel orders parameters:
- Market IDs: {{marketIds}}
- Subaccount ID: {{subaccountId}}
- Order hashes: {{orderHashes}}
`;
