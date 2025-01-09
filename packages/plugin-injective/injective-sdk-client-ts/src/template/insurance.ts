// insurance-templates.ts
export const getInsuranceFundTemplate = `
Extract insurance fund query parameters:
- Market ID: {{marketId}} (string) - Market identifier for the insurance fund
`;

export const getEstimatedRedemptionsTemplate = `
Extract estimated redemptions query parameters:
- Market ID: {{marketId}} (string) - Market identifier
- Address: {{address}} (string) - Address to check redemptions for
`;

export const getPendingRedemptionsTemplate = `
Extract pending redemptions query parameters:
- Market ID: {{marketId}} (string) - Market identifier
- Address: {{address}} (string) - Address to check pending redemptions for
`;

export const msgCreateInsuranceFundTemplate = `
Extract insurance fund creation parameters:
- Fund: {{fund}} (object) - Fund configuration
  - Ticker: {{fund.ticker}} (string) - Market ticker symbol
  - Quote Denom: {{fund.quoteDenom}} (string) - Quote denomination
  - Oracle Base: {{fund.oracleBase}} (string) - Oracle base asset
  - Oracle Quote: {{fund.oracleQuote}} (string) - Oracle quote asset
  - Oracle Type: {{fund.oracleType}} (OracleType) - Type of oracle
  - Expiry: {{fund.expiry}} (number?) - Optional expiration timestamp
- Deposit: {{deposit}} (object) - Initial deposit
  - Amount: {{deposit.amount}} (string) - Deposit amount
  - Denom: {{deposit.denom}} (string) - Deposit denomination
`;

export const msgRequestRedemptionTemplate = `
Extract redemption request parameters:
- Market ID: {{marketId}} (string) - Market identifier
- Amount: {{amount}} (object) - Amount to redeem
  - Denom: {{amount.denom}} (string) - Token denomination
  - Amount: {{amount.amount}} (string) - Redemption amount
`;

export const msgUnderwriteTemplate = `
Extract underwrite parameters:
- Market ID: {{marketId}} (string) - Market identifier
- Amount: {{amount}} (object) - Amount to underwrite
  - Denom: {{amount.denom}} (string) - Token denomination
  - Amount: {{amount.amount}} (string) - Underwrite amount
`;
