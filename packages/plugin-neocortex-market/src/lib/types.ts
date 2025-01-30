export type TrendingTokens = TrendingToken[];

export interface TrendingToken {
    isMintable: string;
    tokensBurned: string;
    tokensBurnedPercentage: string;
    lpBurnt: string;
    coinSupply: string;
    coinMetadata: CoinMetadata;
    tokensInLiquidity: string;
    percentageTokenSupplyInLiquidity: string;
    isCoinHoneyPot: string;
    suspiciousActivities: any[];
    top10HolderPercentage: string;
    top20HolderPercentage: string;
    fullyDilutedMarketCap: string;
    marketCap: string;
    totalLiquidityUsd: string;
    timeCreated: string;
    coin: string;
    coinDev: string;
    price5mAgo: string;
    price1hAgo: string;
    price6hAgo: string;
    price24hAgo: string;
    percentagePriceChange5m: string;
    percentagePriceChange1h: string;
    percentagePriceChange6h: string;
    percentagePriceChange24h: string;
    coinDevHoldings: string;
    coinDevHoldingsPercentage: string;
    buyVolume5m: string;
    buyVolume1h: string;
    buyVolume6h: string;
    buyVolume24h: string;
    sellVolume5m: string;
    sellVolume1h: string;
    sellVolume6h: string;
    sellVolume24h: string;
    volume5m: string;
    volume1h: string;
    volume6h: string;
    volume24h: string;
    coinPrice: string;
}

export interface CoinMetadata {
    _id?: string;
    coinType?: string;
    decimals: string;
    id: string;
    name: string;
    symbol: string;
    supply?: string;
    description?: string;
    iconUrl?: string;
}
