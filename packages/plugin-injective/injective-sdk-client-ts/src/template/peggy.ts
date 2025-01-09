// peggy-templates.ts
export const msgSendToEthTemplate = `
Extract Ethereum bridge transfer parameters:
- Amount: {{amount}} (object) - Amount to transfer
  - Denom: {{amount.denom}} (string) - Token denomination
  - Amount: {{amount.amount}} (string) - Transfer amount
- Bridge Fee: {{bridgeFee}} (object?) - Optional bridge fee
  - Denom: {{bridgeFee.denom}} (string) - Fee denomination
  - Amount: {{bridgeFee.amount}} (string) - Fee amount
`;
