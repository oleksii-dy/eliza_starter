// oracle-templates.ts
export const getPriceTemplate = `
Extract price query parameters:
- Base Symbol: {{baseSymbol}} (string) - Base asset symbol
- Quote Symbol: {{quoteSymbol}} (string) - Quote asset symbol
- Oracle Type: {{oracleType}} (OracleType) - Type of oracle (Band, Pyth, Chainlink, etc.)
`;

export const getPricesTemplate = `
Extract prices query parameters:
- Base Symbols: {{baseSymbols}} (string[]) - Array of base asset symbols
- Quote Symbol: {{quoteSymbol}} (string) - Quote asset symbol
- Oracle Type: {{oracleType}} (OracleType) - Type of oracle
`;

export const getOracleParamsTemplate = `
Extract oracle parameters query:
- Returns the current oracle module parameters
`;

export const getOracleVotesTemplate = `
Extract oracle votes query parameters:
- Validator: {{validator}} (string) - Validator address
- Round: {{round}} (number?) - Optional voting round
`;

export const msgRelayPriceFeedPriceTemplate = `
Extract price feed relay parameters:
- Symbol: {{symbol}} (string) - Asset symbol
- Price: {{price}} (string) - Asset price
- Oracle Type: {{oracleType}} (OracleType) - Type of oracle
- Timestamp: {{timestamp}} (number) - Price timestamp
- Relayer: {{relayer}} (string) - Address of the relayer
`;

export const msgRelayBandRatesTemplate = `
Extract Band protocol relay parameters:
- Symbols: {{symbols}} (string[]) - Array of asset symbols
- Rates: {{rates}} (string[]) - Array of corresponding rates
- Resolve Times: {{resolveTimes}} (number[]) - Array of resolution timestamps
- RequestIDs: {{requestIds}} (number[]) - Array of Band request IDs
- Relayer: {{relayer}} (string) - Address of the relayer
`;

export const msgRelayPythPricesTemplate = `
Extract Pyth price relay parameters:
- Price Feeds: {{priceFeeds}} (object[]) - Array of price feed data
  - Symbol: {{priceFeeds.symbol}} (string) - Asset symbol
  - Price: {{priceFeeds.price}} (string) - Asset price
  - Conf: {{priceFeeds.conf}} (string) - Price confidence interval
  - Expo: {{priceFeeds.expo}} (number) - Price exponent
  - PublishTime: {{priceFeeds.publishTime}} (number) - Publication timestamp
- Relayer: {{relayer}} (string) - Address of the relayer
`;

export const msgSetOracleParamsTemplate = `
Extract oracle params update parameters:
- Authority: {{authority}} (string) - Address with authority to update params
- Params: {{params}} (object) - Updated parameters
  - Pyth: {{params.pyth}} (object) - Pyth oracle parameters
    - MinUpkeepInterval: {{params.pyth.minUpkeepInterval}} (number) - Minimum interval between updates
    - PriceFeedIds: {{params.pyth.priceFeedIds}} (string[]) - Array of price feed IDs
  - Band: {{params.band}} (object) - Band oracle parameters
    - FeeLimit: {{params.band.feeLimit}} (string) - Maximum fee for data requests
    - MinCount: {{params.band.minCount}} (number) - Minimum validator count
    - AskCount: {{params.band.askCount}} (number) - Number of validators to request from
  - PriceFeederPriceTimeout: {{params.priceFeederPriceTimeout}} (number) - Timeout for price feeder updates
  - MedianPriceTimeout: {{params.medianPriceTimeout}} (number) - Timeout for median price calculations
`;

export const msgSetOracleVolatilityParamsTemplate = `
Extract volatility params update parameters:
- Authority: {{authority}} (string) - Address with authority to update params
- Params: {{params}} (object) - Volatility parameters
  - WindowSize: {{params.windowSize}} (number) - Size of the volatility window
  - AnnualScale: {{params.annualScale}} (number) - Annual scaling factor
  - MinPricePoints: {{params.minPricePoints}} (number) - Minimum required price points
`;