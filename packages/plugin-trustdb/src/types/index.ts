import { UUID } from "@elizaos/core";

export interface Recommender {
    id: string | UUID;
    address: string;
    solanaPubkey?: string | null;
    telegramId?: string | null;
    discordId?: string | null;
    twitterId?: string | null;
    ip?: string | null;
}

export interface RecommenderMetrics {
    recommenderId: string;
    trustScore: number;
    totalRecommendations: number;
    successfulRecs: number;
    avgTokenPerformance: number;
    riskScore: number;
    consistencyScore: number;
    virtualConfidence: number;
    lastActiveDate: Date;
    trustDecay: number;
    lastUpdated: Date;
}

export interface TokenPerformance {
    tokenAddress: string;
    symbol: string;
    priceChange24h: number;
    volumeChange24h: number;
    trade_24h_change: number;
    liquidity: number;
    liquidityChange24h: number;
    holderChange24h: number;
    rugPull: boolean;
    isScam: boolean;
    marketCapChange24h: number;
    sustainedGrowth: boolean;
    rapidDump: boolean;
    suspiciousVolume: boolean;
    validationTrust: number;
    balance: number;
    initialMarketCap: number;
    lastUpdated: Date;
}

export interface TokenRecommendation {
    id: string | UUID;
    recommenderId: string;
    tokenAddress: string;
    timestamp: Date;
    initialMarketCap?: number;
    initialLiquidity?: number;
    initialPrice?: number;
}

export interface RecommenderMetricsHistory {
    historyId: string | UUID;
    recommenderId: string;
    trustScore: number;
    totalRecommendations: number;
    successfulRecs: number;
    avgTokenPerformance: number;
    riskScore: number;
    consistencyScore: number;
    virtualConfidence: number;
    trustDecay: number;
    recordedAt: Date;
}

export interface TradePerformance {
    token_address: string;
    recommender_id: string;
    buy_price: number;
    sell_price: number | null;
    buy_timeStamp: string;
    sell_timeStamp: string | null;
    buy_amount: number;
    sell_amount: number | null;
    buy_sol: number;
    received_sol: number | null;
    buy_value_usd: number;
    sell_value_usd: number | null;
    profit_usd: number | null;
    profit_percent: number | null;
    buy_market_cap: number;
    sell_market_cap: number | null;
    market_cap_change: number | null;
    buy_liquidity: number;
    sell_liquidity: number | null;
    liquidity_change: number | null;
    last_updated: string;
    rapidDump: boolean;
}

export interface RecommenderMetricsRow {
    recommender_id: string;
    trust_score: number;
    total_recommendations: number;
    successful_recs: number;
    avg_token_performance: number;
    risk_score: number;
    consistency_score: number;
    virtual_confidence: number;
    last_active_date: Date;
    trust_decay: number;
    last_updated: string;
}

export interface TokenPerformanceRow {
    token_address: string;
    symbol: string;
    price_change_24h: number;
    volume_change_24h: number;
    trade_24h_change: number;
    liquidity: number;
    liquidity_change_24h: number;
    holder_change_24h: number;
    rug_pull: number;
    is_scam: number;
    market_cap_change24h: number;
    sustained_growth: number;
    rapid_dump: number;
    suspicious_volume: number;
    validation_trust: number;
    balance: number;
    initial_market_cap: number;
    last_updated: string;
}

export interface Transaction {
    tokenAddress: string;
    transactionHash: string;
    type: "buy" | "sell";
    amount: number;
    price: number;
    isSimulation: boolean;
    timestamp: string;
}

export interface ITrustDatabase {
    initialize(): Promise<void>;
    addRecommender(recommender: Recommender): Promise<string | null>;
    getRecommender(identifier: string): Promise<Recommender | null>;
    getOrCreateRecommender(
        recommender: Recommender
    ): Promise<Recommender | null>;
    getOrCreateRecommenderWithDiscordId(
        discordId: string
    ): Promise<Recommender | null>;
    getOrCreateRecommenderWithTelegramId(
        telegramId: string
    ): Promise<Recommender | null>;
    initializeRecommenderMetrics(recommenderId: string): Promise<boolean>;
    getRecommenderMetrics(
        recommenderId: string
    ): Promise<RecommenderMetrics | null>;
    logRecommenderMetricsHistory(recommenderId: string): Promise<void>;
    updateRecommenderMetrics(metrics: RecommenderMetrics): Promise<void>;
    upsertTokenPerformance(performance: TokenPerformance): Promise<boolean>;
    updateTokenBalance(tokenAddress: string, balance: number): Promise<boolean>;
    getTokenPerformance(tokenAddress: string): Promise<TokenPerformance | null>;
    getTokenBalance(tokenAddress: string): Promise<number>;
    getAllTokenPerformancesWithBalance(): Promise<TokenPerformance[]>;
    calculateValidationTrust(tokenAddress: string): Promise<number>;
    addTokenRecommendation(
        recommendation: TokenRecommendation
    ): Promise<boolean>;
    getRecommendationsByRecommender(
        recommenderId: string
    ): Promise<TokenRecommendation[]>;
    getRecommendationsByToken(
        tokenAddress: string
    ): Promise<TokenRecommendation[]>;
    getRecommendationsByDateRange(
        startDate: Date,
        endDate: Date
    ): Promise<TokenRecommendation[]>;
    getRecommenderMetricsHistory(
        recommenderId: string
    ): Promise<RecommenderMetricsHistory[]>;
    addTradePerformance(
        trade: TradePerformance,
        isSimulation: boolean
    ): Promise<boolean>;
    updateTradePerformanceOnSell(
        tokenAddress: string,
        recommenderId: string,
        buyTimeStamp: string,
        sellDetails: {
            sell_price: number;
            sell_timeStamp: string;
            sell_amount: number;
            received_sol: number;
            sell_value_usd: number;
            profit_usd: number;
            profit_percent: number;
            sell_market_cap: number;
            market_cap_change: number;
            sell_liquidity: number;
            liquidity_change: number;
            rapidDump: boolean;
            sell_recommender_id: string | null;
        },
        isSimulation: boolean
    ): Promise<boolean>;
    getTradePerformance(
        tokenAddress: string,
        recommenderId: string,
        buyTimeStamp: string,
        isSimulation: boolean
    ): Promise<TradePerformance | null>;
    getLatestTradePerformance(
        tokenAddress: string,
        recommenderId: string,
        isSimulation: boolean
    ): Promise<TradePerformance | null>;
    addTransaction(transaction: Transaction): Promise<boolean>;
    getTransactionsByToken(tokenAddress: string): Promise<Transaction[]>;
    getTradesByQuery(query: string, params: any[]): Promise<TradePerformance[]>;
    closeConnection(): void;
}
