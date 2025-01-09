// gov-templates.ts
export const getProposalsTemplate = `
Extract proposals query parameters:
- Status: {{status}} (ProposalStatus) - Status of proposals to query
- Pagination: {{pagination}} (PaginationOption?) - Optional pagination parameters
`;

export const getProposalTemplate = `
Extract proposal query parameters:
- Proposal ID: {{proposalId}} (number) - Unique identifier of the proposal
`;

export const getProposalDepositsTemplate = `
Extract proposal deposits query parameters:
- Proposal ID: {{proposalId}} (number) - Proposal identifier
- Pagination: {{pagination}} (PaginationOption?) - Optional pagination parameters
`;

export const getProposalVotesTemplate = `
Extract proposal votes query parameters:
- Proposal ID: {{proposalId}} (number) - Proposal identifier
- Pagination: {{pagination}} (PaginationOption?) - Optional pagination parameters
`;

export const getProposalTallyTemplate = `
Extract proposal tally query parameters:
- Proposal ID: {{proposalId}} (number) - Proposal identifier to get tally for
`;

export const msgSubmitProposalExpiryFuturesMarketLaunchTemplate = `
Extract futures market launch proposal parameters:
- Market: {{market}} (object) - Market configuration
  - Title: {{market.title}} (string) - Proposal title
  - Description: {{market.description}} (string) - Detailed description
  - Ticker: {{market.ticker}} (string) - Market ticker symbol
  - Quote Denom: {{market.quoteDenom}} (string) - Quote denomination
  - Oracle Base: {{market.oracleBase}} (string) - Oracle base asset
  - Oracle Quote: {{market.oracleQuote}} (string) - Oracle quote asset
  - Expiry: {{market.expiry}} (number) - Market expiration timestamp
  - Oracle Scale Factor: {{market.oracleScaleFactor}} (number) - Oracle scaling factor
  - Oracle Type: {{market.oracleType}} (OracleType) - Type of oracle
  - Initial Margin Ratio: {{market.initialMarginRatio}} (string) - Initial margin requirement
  - Maintenance Margin Ratio: {{market.maintenanceMarginRatio}} (string) - Maintenance margin requirement
  - Maker Fee Rate: {{market.makerFeeRate}} (string) - Maker fee rate
  - Taker Fee Rate: {{market.takerFeeRate}} (string) - Taker fee rate
  - Min Price Tick Size: {{market.minPriceTickSize}} (string) - Minimum price increment
  - Min Quantity Tick Size: {{market.minQuantityTickSize}} (string) - Minimum quantity increment
- Deposit: {{deposit}} (object) - Initial deposit
  - Amount: {{deposit.amount}} (string) - Deposit amount
  - Denom: {{deposit.denom}} (string) - Deposit denomination
`;

export const msgSubmitProposalSpotMarketLaunchTemplate = `
Extract spot market launch proposal parameters:
- Market: {{market}} (object) - Market configuration
  - Title: {{market.title}} (string) - Proposal title
  - Description: {{market.description}} (string) - Detailed description
  - Ticker: {{market.ticker}} (string) - Market ticker symbol
  - Base Denom: {{market.baseDenom}} (string) - Base denomination
  - Quote Denom: {{market.quoteDenom}} (string) - Quote denomination
  - Min Price Tick Size: {{market.minPriceTickSize}} (string) - Minimum price increment
  - Min Quantity Tick Size: {{market.minQuantityTickSize}} (string) - Minimum quantity increment
  - Maker Fee Rate: {{market.makerFeeRate}} (string) - Maker fee rate
  - Taker Fee Rate: {{market.takerFeeRate}} (string) - Taker fee rate
  - Min Notional: {{market.minNotional}} (string) - Minimum order notional value
- Deposit: {{deposit}} (object) - Initial deposit
  - Amount: {{deposit.amount}} (string) - Deposit amount
  - Denom: {{deposit.denom}} (string) - Deposit denomination
`;

export const msgSubmitProposalPerpetualMarketLaunchTemplate = `
Extract perpetual market launch proposal parameters:
- Market: {{market}} (object) - Market configuration
  - Title: {{market.title}} (string) - Proposal title
  - Description: {{market.description}} (string) - Detailed description
  - Ticker: {{market.ticker}} (string) - Market ticker symbol
  - Quote Denom: {{market.quoteDenom}} (string) - Quote denomination
  - Oracle Base: {{market.oracleBase}} (string) - Oracle base asset
  - Oracle Quote: {{market.oracleQuote}} (string) - Oracle quote asset
  - Oracle Scale Factor: {{market.oracleScaleFactor}} (number) - Oracle scaling factor
  - Oracle Type: {{market.oracleType}} (OracleType) - Type of oracle
  - Initial Margin Ratio: {{market.initialMarginRatio}} (string) - Initial margin requirement
  - Maintenance Margin Ratio: {{market.maintenanceMarginRatio}} (string) - Maintenance margin requirement
  - Maker Fee Rate: {{market.makerFeeRate}} (string) - Maker fee rate
  - Taker Fee Rate: {{market.takerFeeRate}} (string) - Taker fee rate
  - Min Price Tick Size: {{market.minPriceTickSize}} (string) - Minimum price increment
  - Min Quantity Tick Size: {{market.minQuantityTickSize}} (string) - Minimum quantity increment
  - Min Notional: {{market.minNotional}} (string) - Minimum order notional value
- Deposit: {{deposit}} (object) - Initial deposit
  - Amount: {{deposit.amount}} (string) - Deposit amount
  - Denom: {{deposit.denom}} (string) - Deposit denomination
`;

export const msgVoteTemplate = `
Extract vote parameters:
- Proposal ID: {{proposalId}} (number) - Proposal identifier
- Metadata: {{metadata}} (string) - Additional vote metadata
- Vote: {{vote}} (VoteOption) - Vote option (Yes/No/Abstain/NoWithVeto)
`;

export const msgSubmitTextProposalTemplate = `
Extract text proposal submission parameters:
- Title: {{title}} (string) - Proposal title
- Description: {{description}} (string) - Detailed description
- Deposit: {{deposit}} (object) - Initial deposit
  - Amount: {{deposit.amount}} (string) - Deposit amount
  - Denom: {{deposit.denom}} (string) - Deposit denomination
`;

export const msgSubmitProposalSpotMarketParamUpdateTemplate = `
Extract spot market parameter update proposal parameters:
- Market: {{market}} (object) - Market configuration
  - Title: {{market.title}} (string) - Proposal title
  - Description: {{market.description}} (string) - Detailed description
  - Market ID: {{market.marketId}} (string) - Market identifier
  - Maker Fee Rate: {{market.makerFeeRate}} (string) - New maker fee rate
  - Taker Fee Rate: {{market.takerFeeRate}} (string) - New taker fee rate
  - Relayer Fee Share Rate: {{market.relayerFeeShareRate}} (string) - New relayer fee share
  - Min Price Tick Size: {{market.minPriceTickSize}} (string) - New minimum price increment
  - Min Quantity Tick Size: {{market.minQuantityTickSize}} (string) - New minimum quantity increment
  - Status: {{market.status}} (MarketStatus) - New market status
- Deposit: {{deposit}} (object) - Initial deposit
  - Amount: {{deposit.amount}} (string) - Deposit amount
  - Denom: {{deposit.denom}} (string) - Deposit denomination
`;

export const msgSubmitGenericProposalTemplate = `
Extract generic proposal submission parameters:
- Title: {{title}} (string) - Proposal title
- Summary: {{summary}} (string) - Proposal summary
- Expedited: {{expedited}} (boolean?) - Optional expedited processing flag
- Metadata: {{metadata}} (string?) - Optional additional metadata
- Messages: {{messages}} (Msgs[]) - Array of messages to be executed
- Deposit: {{deposit}} (object) - Initial deposit
  - Amount: {{deposit.amount}} (string) - Deposit amount
  - Denom: {{deposit.denom}} (string) - Deposit denomination
`;

export const msgGovDepositTemplate = `
Extract governance deposit parameters:
- Proposal ID: {{proposalId}} (number) - Proposal identifier
- Amount: {{amount}} (object) - Deposit amount
  - Amount: {{amount.amount}} (string) - Amount value
  - Denom: {{amount.denom}} (string) - Token denomination
`;
