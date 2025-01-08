// bank-templates.ts

export const getBankBalanceTemplate = `
Extract bank balance parameters:
- Denom: {{denom}}
`;

export const getBankBalancesTemplate = `
Extract bank balances parameters:
- Address: {{address}}
- Pagination key: {{paginationKey}}
- Pagination limit: {{limit}}
- Pagination reverse : {{reverse}}
- Pagination countTotal : {{countTotal}}
- Pagination endTime : {{endTime}}
- Pagination startTime : {{startTime}}
- Pagination fromNumber : {{fromNumber}}
- Pagination toNumber : {{toNumber}}
if pagination options are not specified assume null
`;

export const getSupplyOfTemplate = `
Extract supply parameters:
- Denom: {{denom}}
`;

export const getDenomMetadataTemplate = `
Extract denom metadata parameters:
- Denom: {{denom}}
`;

export const getDenomOwnersTemplate = `
Extract denom owners parameters:
- Denom: {{denom}}
`;

export const msgSendTemplate = `
Extract send message parameters:
- Amount: {{amount}}
- Denom: {{denom}}
- Source address: {{srcInjectiveAddress}}
- Destination address: {{dstInjectiveAddress}}
`;

export const msgMultiSendTemplate = `
Extract multi-send message parameters:
Inputs (array of addresses and coins):
{{#each inputs}}
Input {{@index + 1}}:
  - Address: {{address}}
  - Coins: {{coins}}
{{/each}}

Outputs (array of addresses and coins):
{{#each outputs}}
Output {{@index + 1}}:
  - Address: {{address}}
  - Coins: {{coins}}
{{/each}}
`;
