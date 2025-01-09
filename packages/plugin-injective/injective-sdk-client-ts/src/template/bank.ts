// bank-templates.ts
export const getBankBalanceTemplate = `
Extract bank balance parameters:
- Denom: {{denom}} (string) - Denomination of the token to query
`;

export const getBankBalancesTemplate = `
Extract bank balances parameters:
- Pagination: {{pagination}} (PaginationOption?) - Optional pagination parameters
`;

export const getSupplyOfTemplate = `
Extract supply parameters:
- Denom: {{denom}} (string) - Denomination of the token to query supply for
`;

export const getDenomMetadataTemplate = `
Extract denomination metadata parameters:
- Denom: {{denom}} (string) - Denomination to query metadata for
`;

export const getDenomOwnersTemplate = `
Extract denomination owners parameters:
- Denom: {{denom}} (string) - Denomination to query owners for
`;

export const bankBalanceTemplate = `
Extract specific bank balance parameters:
- Account Address: {{accountAddress}} (string) - Address to query balance for
- Denom: {{denom}} (string) - Denomination of the token
`;

export const msgSendTemplate = `
Extract send transaction parameters:
- Amount: {{amount}} (object | object[]) - Amount(s) to send with denomination and amount
  - Denom: {{amount.denom}} (string) - Token denomination
  - Amount: {{amount.amount}} (string) - Amount to send
- Source Address: {{srcInjectiveAddress}} (string) - Address sending the funds
- Destination Address: {{dstInjectiveAddress}} (string) - Address receiving the funds
`;

export const msgMultiSendTemplate = `
Extract multi-send transaction parameters:
- Inputs: {{inputs}} (object[]) - Array of source addresses and amounts
  - Address: {{inputs.address}} (string) - Source address
  - Coins: {{inputs.coins}} (Coin[]) - Array of coins to send
- Outputs: {{outputs}} (object[]) - Array of destination addresses and amounts
  - Address: {{outputs.address}} (string) - Destination address
  - Coins: {{outputs.coins}} (Coin[]) - Array of coins to receive
`;
