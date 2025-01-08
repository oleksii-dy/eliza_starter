// gov-templates.ts

export const getProposalsTemplate = `
Extract proposals query parameters:
- Status: {{status}}
- Pagination key: {{paginationKey}}
- Pagination limit: {{limit}}
`;

export const getProposalTemplate = `
Extract proposal query parameters:
- Proposal ID: {{proposalId}}
`;

export const msgVoteTemplate = `
Extract vote message parameters:
- Proposal ID: {{proposalId}}
- Vote option: {{vote}}
- Metadata: {{metadata}}
`;

export const msgSubmitTextProposalTemplate = `
Extract text proposal parameters:
- Title: {{title}}
- Description: {{description}}
- Initial deposit amount: {{amount}}
- Initial deposit denom: {{denom}}
`;

export const msgSubmitSpotMarketLaunchTemplate = `
Extract spot market launch proposal parameters:
- Title: {{title}}
- Description: {{description}}
- Ticker: {{ticker}}
- Base denom: {{baseDenom}}
- Quote denom: {{quoteDenom}}
- Min price tick size: {{minPriceTickSize}}
- Min quantity tick size: {{minQuantityTickSize}}
`;

export const msgSubmitPerpetualMarketLaunchTemplate = `
Extract perpetual market launch proposal parameters:
- Title: {{title}}
- Description: {{description}}
- Ticker: {{ticker}}
- Quote denom: {{quoteDenom}}
- Oracle base: {{oracleBase}}
- Oracle quote: {{oracleQuote}}
- Oracle scale factor: {{oracleScaleFactor}}
- Oracle type: {{oracleType}}
- Initial margin ratio: {{initialMarginRatio}}
- Maintenance margin ratio: {{maintenanceMarginRatio}}
`;

export const msgGovDepositTemplate = `
Extract governance deposit parameters:
- Proposal ID: {{proposalId}}
- Amount: {{amount}}
- Denom: {{denom}}
`;
