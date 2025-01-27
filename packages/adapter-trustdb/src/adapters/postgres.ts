import { v4 as uuidv4 } from "uuid";
import {
    Recommender,
    RecommenderMetrics,
    TokenPerformance,
    TokenRecommendation,
    RecommenderMetricsHistory,
    TradePerformance,
    Transaction,
    ITrustDatabase,
} from "../types";
import { PostgresDatabaseAdapter } from "@elizaos/adapter-postgres";
import { elizaLogger } from "@elizaos/core";

export class TrustPostgresDatabase
    extends PostgresDatabaseAdapter
    implements ITrustDatabase
{
    constructor(dbConfig: string | any) {
        const connectionConfig =
            typeof dbConfig === "string"
                ? { connectionString: dbConfig }
                : dbConfig;

        super(connectionConfig);
    }

    public async initialize(): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query("BEGIN");

            const { rows } = await client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'recommenders'
                );
            `);

            if (!rows[0].exists) {
                elizaLogger.info(
                    "Applying trust database schema - tables missing"
                );
                await client.query(this.getDatabaseSchema());
                elizaLogger.info("Successfully applied database schema");
            }

            await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");
            elizaLogger.error("Database initialization failed:", error);
            throw error;
        } finally {
            client.release();
        }
    }

    private getDatabaseSchema(): string {
        return `
            CREATE TABLE IF NOT EXISTS recommenders (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                address TEXT UNIQUE NOT NULL,
                solana_pubkey TEXT UNIQUE,
                telegram_id TEXT UNIQUE,
                discord_id TEXT UNIQUE,
                twitter_id TEXT UNIQUE,
                ip TEXT
            );

            CREATE TABLE IF NOT EXISTS recommender_metrics (
                recommender_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                trust_score DECIMAL DEFAULT 0,
                total_recommendations INTEGER DEFAULT 0,
                successful_recs INTEGER DEFAULT 0,
                avg_token_performance DECIMAL DEFAULT 0,
                risk_score DECIMAL DEFAULT 0,
                consistency_score DECIMAL DEFAULT 0,
                virtual_confidence DECIMAL DEFAULT 0,
                last_active_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                trust_decay DECIMAL DEFAULT 0,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (recommender_id) REFERENCES recommenders(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS token_performance (
                token_address TEXT PRIMARY KEY,
                symbol TEXT,
                price_change_24h DECIMAL,
                volume_change_24h DECIMAL,
                trade_24h_change DECIMAL,
                liquidity DECIMAL,
                liquidity_change_24h DECIMAL,
                holder_change_24h DECIMAL,
                rug_pull BOOLEAN DEFAULT FALSE,
                is_scam BOOLEAN DEFAULT FALSE,
                market_cap_change24h DECIMAL,
                sustained_growth BOOLEAN DEFAULT FALSE,
                rapid_dump BOOLEAN DEFAULT FALSE,
                suspicious_volume BOOLEAN DEFAULT FALSE,
                validation_trust DECIMAL DEFAULT 0,
                balance DECIMAL DEFAULT 0,
                initial_market_cap DECIMAL DEFAULT 0,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS token_recommendations (
                id UUID PRIMARY KEY,
                recommender_id UUID NOT NULL,
                token_address TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                initial_market_cap DECIMAL,
                initial_liquidity DECIMAL,
                initial_price DECIMAL,
                FOREIGN KEY (recommender_id) REFERENCES recommenders(id) ON DELETE CASCADE,
                FOREIGN KEY (token_address) REFERENCES token_performance(token_address) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS recommender_metrics_history (
                history_id UUID PRIMARY KEY,
                recommender_id UUID NOT NULL,
                trust_score DECIMAL,
                total_recommendations INTEGER,
                successful_recs INTEGER,
                avg_token_performance DECIMAL,
                risk_score DECIMAL,
                consistency_score DECIMAL,
                virtual_confidence DECIMAL DEFAULT 0,
                trust_decay DECIMAL,
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (recommender_id) REFERENCES recommenders(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS trade (
                token_address TEXT NOT NULL,
                recommender_id UUID NOT NULL,
                sell_recommender_id UUID,
                buy_price DECIMAL NOT NULL,
                sell_price DECIMAL,
                buy_timestamp TIMESTAMP NOT NULL,
                sell_timestamp TIMESTAMP,
                buy_amount DECIMAL NOT NULL,
                sell_amount DECIMAL,
                buy_sol DECIMAL NOT NULL,
                received_sol DECIMAL,
                buy_value_usd DECIMAL NOT NULL,
                sell_value_usd DECIMAL,
                profit_usd DECIMAL,
                profit_percent DECIMAL,
                buy_market_cap DECIMAL NOT NULL,
                sell_market_cap DECIMAL,
                market_cap_change DECIMAL,
                buy_liquidity DECIMAL NOT NULL,
                sell_liquidity DECIMAL,
                liquidity_change DECIMAL,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                rapiddump BOOLEAN DEFAULT FALSE,
                PRIMARY KEY (token_address, recommender_id, buy_timestamp),
                FOREIGN KEY (token_address) REFERENCES token_performance(token_address) ON DELETE CASCADE,
                FOREIGN KEY (recommender_id) REFERENCES recommenders(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS simulation_trade (
                token_address TEXT NOT NULL,
                recommender_id UUID NOT NULL,
                buy_price DECIMAL NOT NULL,
                sell_price DECIMAL,
                buy_timestamp TIMESTAMP NOT NULL,
                sell_timestamp TIMESTAMP,
                buy_amount DECIMAL NOT NULL,
                sell_amount DECIMAL,
                buy_sol DECIMAL NOT NULL,
                received_sol DECIMAL,
                buy_value_usd DECIMAL NOT NULL,
                sell_value_usd DECIMAL,
                profit_usd DECIMAL,
                profit_percent DECIMAL,
                buy_market_cap DECIMAL NOT NULL,
                sell_market_cap DECIMAL,
                market_cap_change DECIMAL,
                buy_liquidity DECIMAL NOT NULL,
                sell_liquidity DECIMAL,
                liquidity_change DECIMAL,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                rapiddump BOOLEAN DEFAULT FALSE,
                PRIMARY KEY (token_address, recommender_id, buy_timestamp),
                FOREIGN KEY (token_address) REFERENCES token_performance(token_address) ON DELETE CASCADE,
                FOREIGN KEY (recommender_id) REFERENCES recommenders(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS transactions (
                token_address TEXT NOT NULL,
                transaction_hash TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                amount DECIMAL NOT NULL,
                price DECIMAL NOT NULL,
                timestamp TIMESTAMP NOT NULL,
                is_simulation BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (token_address) REFERENCES token_performance(token_address) ON DELETE CASCADE
            );`;
    }

    /**
     * Adds a new recommender to the database.
     * @param recommender Recommender object
     * @returns boolean indicating success
     */
    async addRecommender(recommender: Recommender): Promise<string | null> {
        return this.withDatabase(async () => {
            const id = recommender.id || uuidv4();
            try {
                const result = await this.pool.query(
                    `INSERT INTO recommenders (
                        id,
                        address,
                        solana_pubkey,
                        telegram_id,
                        discord_id,
                        twitter_id,
                        ip
                    )
                    VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (address) DO NOTHING
                    RETURNING id`,
                    [
                        id,
                        recommender.address,
                        recommender.solanaPubkey || null,
                        recommender.telegramId || null,
                        recommender.discordId || null,
                        recommender.twitterId || null,
                        recommender.ip || null,
                    ]
                );

                return result.rowCount > 0 ? id : null;
            } catch (error) {
                elizaLogger.error("Error adding recommender:", error);
                return null;
            }
        }, "addRecommender");
    }

    /**
     * Retrieves a recommender by any identifier.
     * @param identifier Any of the recommender's identifiers
     * @returns Recommender object or null
     */
    async getRecommender(identifier: string): Promise<Recommender | null> {
        return this.withDatabase(async () => {
            const result = await this.pool.query(
                `SELECT id,
                        address,
                        solana_pubkey as "solanaPubkey",
                        telegram_id as "telegramId",
                        discord_id as "discordId",
                        twitter_id as "twitterId",
                        ip
                 FROM recommenders
                 WHERE id::text = $1
                    OR address = $1
                    OR solana_pubkey = $1
                    OR telegram_id = $1
                    OR discord_id = $1
                    OR twitter_id = $1`,
                [identifier]
            );

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];
        }, "getRecommender");
    }

    /**
     * Retrieves an existing recommender or creates a new one if not found.
     * Also initializes metrics for the recommender if they haven't been initialized yet.
     * @param recommender Recommender object containing at least one identifier
     * @returns Recommender object with all details, or null if failed
     */
    async getOrCreateRecommender(
        recommender: Recommender
    ): Promise<Recommender | null> {
        return this.withDatabase(async () => {
            try {
                await this.pool.query("BEGIN");

                const existingRecommenderResult = await this.pool.query(
                    `SELECT
                        id,
                        address,
                        solana_pubkey as "solanaPubkey",
                        telegram_id as "telegramId",
                        discord_id as "discordId",
                        twitter_id as "twitterId",
                        ip
                    FROM recommenders
                    WHERE id::text = $1 OR address = $2`,
                    [recommender.id, recommender.address]
                );

                if (existingRecommenderResult.rows.length > 0) {
                    await this.initializeRecommenderMetrics(
                        existingRecommenderResult.rows[0].id
                    );
                    await this.pool.query("COMMIT");
                    return existingRecommenderResult.rows[0];
                }

                const newRecommenderId = await this.addRecommender(recommender);
                if (!newRecommenderId) {
                    throw new Error("Failed to add new recommender.");
                }

                await this.initializeRecommenderMetrics(newRecommenderId);

                const newRecommenderResult = await this.pool.query(
                    `SELECT
                        id,
                        address,
                        solana_pubkey as "solanaPubkey",
                        telegram_id as "telegramId",
                        discord_id as "discordId",
                        twitter_id as "twitterId",
                        ip
                    FROM recommenders
                    WHERE id::text = $1`,
                    [newRecommenderId]
                );

                await this.pool.query("COMMIT");
                return newRecommenderResult.rows[0];
            } catch (error) {
                await this.pool.query("ROLLBACK");
                elizaLogger.error("Error in getOrCreateRecommender:", error);
                return null;
            }
        }, "getOrCreateRecommender");
    }

    /**
     * Retrieves an existing recommender or creates a new one if not found.
     * Also initializes metrics for the recommender if they haven't been initialized yet.
     * @param discordId Discord ID of the recommender
     * @returns Recommender object with all details, or null if failed
     */
    async getOrCreateRecommenderWithDiscordId(
        discordId: string
    ): Promise<Recommender | null> {
        return this.withDatabase(async () => {
            try {
                // Attempt to retrieve the recommender
                const existingRecommender =
                    await this.getRecommender(discordId);

                if (existingRecommender) {
                    // Recommender exists, ensure metrics are initialized
                    await this.initializeRecommenderMetrics(
                        existingRecommender.id!
                    );
                    return existingRecommender;
                }

                // Recommender does not exist, create a new one
                const newRecommender: Recommender = {
                    id: uuidv4(),
                    address: discordId, // Using discordId as address as per original implementation
                    discordId: discordId,
                };

                const newRecommenderId =
                    await this.addRecommender(newRecommender);
                if (!newRecommenderId) {
                    throw new Error("Failed to add new recommender.");
                }

                // Initialize metrics for the new recommender
                const metricsInitialized =
                    await this.initializeRecommenderMetrics(newRecommenderId);
                if (!metricsInitialized) {
                    throw new Error(
                        "Failed to initialize recommender metrics."
                    );
                }

                // Retrieve and return the newly created recommender
                const recommender = await this.getRecommender(newRecommenderId);
                if (!recommender) {
                    throw new Error(
                        "Failed to retrieve the newly created recommender."
                    );
                }

                return recommender;
            } catch (error) {
                elizaLogger.error(
                    "Error in getOrCreateRecommenderWithDiscordId:",
                    error
                );
                return null;
            }
        }, "getOrCreateRecommenderWithDiscordId");
    }

    /**
     * Retrieves an existing recommender or creates a new one if not found.
     * Also initializes metrics for the recommender if they haven't been initialized yet.
     * @param telegramId Telegram ID of the recommender
     * @returns Recommender object with all details, or null if failed
     */
    async getOrCreateRecommenderWithTelegramId(
        telegramId: string
    ): Promise<Recommender | null> {
        return this.withDatabase(async () => {
            try {
                // Attempt to retrieve the recommender
                const existingRecommender =
                    await this.getRecommender(telegramId);

                if (existingRecommender) {
                    // Recommender exists, ensure metrics are initialized
                    await this.initializeRecommenderMetrics(
                        existingRecommender.id!
                    );
                    return existingRecommender;
                }

                // Recommender does not exist, create a new one
                const newRecommender: Recommender = {
                    id: uuidv4(),
                    address: telegramId, // Using telegramId as address as per original implementation
                    telegramId: telegramId,
                };

                const newRecommenderId =
                    await this.addRecommender(newRecommender);
                if (!newRecommenderId) {
                    throw new Error("Failed to add new recommender.");
                }

                // Initialize metrics for the new recommender
                const metricsInitialized =
                    await this.initializeRecommenderMetrics(newRecommenderId);
                if (!metricsInitialized) {
                    throw new Error(
                        "Failed to initialize recommender metrics."
                    );
                }

                // Retrieve and return the newly created recommender
                const recommender = await this.getRecommender(newRecommenderId);
                if (!recommender) {
                    throw new Error(
                        "Failed to retrieve the newly created recommender."
                    );
                }

                return recommender;
            } catch (error) {
                elizaLogger.error(
                    "Error in getOrCreateRecommenderWithTelegramId:",
                    error
                );
                return null;
            }
        }, "getOrCreateRecommenderWithTelegramId");
    }

    /**
     * Initializes metrics for a recommender if not present.
     * @param recommenderId Recommender's UUID
     */
    async initializeRecommenderMetrics(
        recommenderId: string
    ): Promise<boolean> {
        return this.withDatabase(async () => {
            try {
                const result = await this.pool.query(
                    `INSERT INTO recommender_metrics (recommender_id)
                     VALUES ($1)
                     ON CONFLICT (recommender_id) DO NOTHING
                     RETURNING recommender_id`,
                    [recommenderId]
                );

                // In PostgreSQL, we check if a row was inserted by checking rowCount
                return result.rowCount > 0;
            } catch (error) {
                elizaLogger.error(
                    "Error initializing recommender metrics:",
                    error
                );
                return false;
            }
        }, "initializeRecommenderMetrics");
    }

    /**
     * Retrieves metrics for a recommender.
     * @param recommenderId Recommender's UUID
     * @returns RecommenderMetrics object or null
     */
    async getRecommenderMetrics(
        recommenderId: string
    ): Promise<RecommenderMetrics | null> {
        return this.withDatabase(async () => {
            try {
                const { rows } = await this.pool.query(
                    `SELECT
                        recommender_id as "recommenderId",
                        trust_score::float as "trustScore",
                        total_recommendations::integer as "totalRecommendations",
                        successful_recs::integer as "successfulRecs",
                        avg_token_performance::float as "avgTokenPerformance",
                        risk_score::float as "riskScore",
                        consistency_score::float as "consistencyScore",
                        virtual_confidence::float as "virtualConfidence",
                        last_active_date as "lastActiveDate",
                        trust_decay::float as "trustDecay",
                        last_updated as "lastUpdated"
                    FROM recommender_metrics
                    WHERE recommender_id = $1`,
                    [recommenderId]
                );

                if (rows.length === 0) return null;

                return {
                    ...rows[0],
                    lastUpdated: new Date(rows[0].lastUpdated),
                };
            } catch (error) {
                elizaLogger.error("Error getting recommender metrics:", error);
                return null;
            }
        }, "getRecommenderMetrics");
    }

    /**
     * Logs the current metrics of a recommender into the history table.
     * @param recommenderId Recommender's UUID
     */
    async logRecommenderMetricsHistory(recommenderId: string): Promise<void> {
        return this.withDatabase(async () => {
            try {
                const currentMetrics =
                    await this.getRecommenderMetrics(recommenderId);
                if (!currentMetrics) {
                    console.warn(
                        `No metrics found for recommender ID: ${recommenderId}`
                    );
                    return;
                }

                const history: RecommenderMetricsHistory = {
                    historyId: uuidv4(),
                    recommenderId: currentMetrics.recommenderId,
                    trustScore: currentMetrics.trustScore,
                    totalRecommendations: currentMetrics.totalRecommendations,
                    successfulRecs: currentMetrics.successfulRecs,
                    avgTokenPerformance: currentMetrics.avgTokenPerformance,
                    riskScore: currentMetrics.riskScore,
                    consistencyScore: currentMetrics.consistencyScore,
                    virtualConfidence: currentMetrics.virtualConfidence,
                    trustDecay: currentMetrics.trustDecay,
                    recordedAt: new Date(),
                };

                await this.pool.query(
                    `INSERT INTO recommender_metrics_history (
                        history_id,
                        recommender_id,
                        trust_score,
                        total_recommendations,
                        successful_recs,
                        avg_token_performance,
                        risk_score,
                        consistency_score,
                        virtual_confidence,
                        trust_decay,
                        recorded_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                    [
                        history.historyId,
                        history.recommenderId,
                        history.trustScore,
                        history.totalRecommendations,
                        history.successfulRecs,
                        history.avgTokenPerformance,
                        history.riskScore,
                        history.consistencyScore,
                        history.virtualConfidence,
                        history.trustDecay,
                        history.recordedAt,
                    ]
                );

                elizaLogger.log(
                    `Logged metrics history for recommender ID: ${recommenderId}`
                );
            } catch (error) {
                elizaLogger.error(
                    "Error logging recommender metrics history:",
                    error
                );
                throw error; // Re-throw to be handled by withDatabase wrapper
            }
        }, "logRecommenderMetricsHistory");
    }

    /**
     * Updates metrics for a recommender.
     * @param metrics RecommenderMetrics object
     */
    async updateRecommenderMetrics(metrics: RecommenderMetrics): Promise<void> {
        return this.withDatabase(async () => {
            try {
                // Log current metrics before updating
                await this.logRecommenderMetricsHistory(metrics.recommenderId);

                await this.pool.query(
                    `UPDATE recommender_metrics
                     SET trust_score = $1,
                         total_recommendations = $2,
                         successful_recs = $3,
                         avg_token_performance = $4,
                         risk_score = $5,
                         consistency_score = $6,
                         virtual_confidence = $7,
                         trust_decay = $8,
                         last_updated = CURRENT_TIMESTAMP
                     WHERE recommender_id = $9`,
                    [
                        metrics.trustScore,
                        metrics.totalRecommendations,
                        metrics.successfulRecs,
                        metrics.avgTokenPerformance,
                        metrics.riskScore,
                        metrics.consistencyScore,
                        metrics.virtualConfidence,
                        metrics.trustDecay,
                        metrics.recommenderId,
                    ]
                );

                elizaLogger.log(
                    `Updated metrics for recommender ID: ${metrics.recommenderId}`
                );
            } catch (error) {
                elizaLogger.error("Error updating recommender metrics:", error);
                throw error; // Re-throw to be handled by withDatabase wrapper
            }
        }, "updateRecommenderMetrics");
    }

    /**
     * Adds or updates token performance metrics.
     * @param performance TokenPerformance object
     */
    async upsertTokenPerformance(
        performance: TokenPerformance
    ): Promise<boolean> {
        return this.withDatabase(async () => {
            if (
                [
                    performance.priceChange24h,
                    performance.volumeChange24h,
                    performance.trade_24h_change,
                    performance.liquidity,
                ].some((val) => Number.isNaN(val) || !Number.isFinite(val))
            ) {
                return false;
            }

            const validationTrust = await this.calculateValidationTrust(
                performance.tokenAddress
            );

            const sql = `
                INSERT INTO token_performance (
                    token_address, symbol, price_change_24h, volume_change_24h,
                    trade_24h_change, liquidity, liquidity_change_24h, holder_change_24h,
                    rug_pull, is_scam, market_cap_change24h, sustained_growth,
                    rapid_dump, suspicious_volume, validation_trust, balance,
                    initial_market_cap, last_updated
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP)
                ON CONFLICT (token_address) DO UPDATE SET
                    symbol = EXCLUDED.symbol,
                    price_change_24h = EXCLUDED.price_change_24h,
                    volume_change_24h = EXCLUDED.volume_change_24h,
                    trade_24h_change = EXCLUDED.trade_24h_change,
                    liquidity = EXCLUDED.liquidity,
                    liquidity_change_24h = EXCLUDED.liquidity_change_24h,
                    holder_change_24h = EXCLUDED.holder_change_24h,
                    rug_pull = EXCLUDED.rug_pull,
                    is_scam = EXCLUDED.is_scam,
                    market_cap_change24h = EXCLUDED.market_cap_change24h,
                    sustained_growth = EXCLUDED.sustained_growth,
                    rapid_dump = EXCLUDED.rapid_dump,
                    suspicious_volume = EXCLUDED.suspicious_volume,
                    validation_trust = $15,
                    balance = EXCLUDED.balance,
                    initial_market_cap = EXCLUDED.initial_market_cap,
                    last_updated = CURRENT_TIMESTAMP
                RETURNING token_address;
            `;

            const values = [
                performance.tokenAddress,
                performance.symbol,
                performance.priceChange24h,
                performance.volumeChange24h,
                performance.trade_24h_change,
                performance.liquidity,
                performance.liquidityChange24h,
                performance.holderChange24h,
                performance.rugPull,
                performance.isScam,
                performance.marketCapChange24h,
                performance.sustainedGrowth,
                performance.rapidDump,
                performance.suspiciousVolume,
                validationTrust || performance.validationTrust,
                performance.balance,
                performance.initialMarketCap,
            ];

            const result = await this.pool.query(sql, values);
            return result.rowCount > 0;
        }, "upsertTokenPerformance");
    }

    /**
     * Updates the balance for a token.
     * @param tokenAddress Token address
     * @param balance New balance
     * @returns boolean indicating success
     */
    async updateTokenBalance(
        tokenAddress: string,
        balance: number
    ): Promise<boolean> {
        return this.withDatabase(async () => {
            const sql = `
                UPDATE token_performance
                SET balance = $1,
                    last_updated = CURRENT_TIMESTAMP
                WHERE token_address = $2;
            `;

            try {
                const result = await this.pool.query(sql, [
                    balance,
                    tokenAddress,
                ]);

                if (result.rowCount > 0) {
                    elizaLogger.log(
                        `Updated token balance for ${tokenAddress}`
                    );
                    return true;
                } else {
                    console.warn(
                        `No record found to update for token address: ${tokenAddress}`
                    );
                    return false;
                }
            } catch (error) {
                elizaLogger.error("Error updating token balance:", error);
                return false;
            }
        }, "updateTokenBalance");
    }

    /**
     * Retrieves token performance metrics.
     * @param tokenAddress Token's address
     * @returns TokenPerformance object or null
     */
    async getTokenPerformance(
        tokenAddress: string
    ): Promise<TokenPerformance | null> {
        return this.withDatabase(async () => {
            const sql = `SELECT * FROM token_performance WHERE token_address = $1;`;
            const result = await this.pool.query(sql, [tokenAddress]);

            if (result.rows.length === 0) return null;

            const row = result.rows[0];
            return {
                tokenAddress: row.token_address,
                symbol: row.symbol,
                priceChange24h: Number(row.price_change_24h),
                volumeChange24h: Number(row.volume_change_24h),
                trade_24h_change: Number(row.trade_24h_change),
                liquidity: Number(row.liquidity),
                liquidityChange24h: Number(row.liquidity_change_24h),
                holderChange24h: Number(row.holder_change_24h),
                rugPull: row.rug_pull,
                isScam: row.is_scam,
                marketCapChange24h: Number(row.market_cap_change24h),
                sustainedGrowth: row.sustained_growth,
                rapidDump: row.rapid_dump,
                suspiciousVolume: row.suspicious_volume,
                validationTrust: Number(row.validation_trust),
                balance: Number(row.balance),
                initialMarketCap: Number(row.initial_market_cap),
                lastUpdated: new Date(row.last_updated),
            };
        }, "getTokenPerformance");
    }

    /**
     * Retrieves the balance for a token.
     * @param tokenAddress Token address
     * @returns Balance or null
     */
    async getTokenBalance(tokenAddress: string): Promise<number> {
        return this.withDatabase(async () => {
            const sql = `SELECT CAST(balance AS FLOAT) as balance FROM token_performance WHERE token_address = $1;`;
            const result = await this.pool.query(sql, [tokenAddress]);
            return result.rows[0]?.balance || 0;
        }, "getTokenBalance");
    }

    /**
     * Retrieves all token performances with a balance greater than zero.
     * @returns Array of TokenPerformance objects
     */
    async getAllTokenPerformancesWithBalance(): Promise<TokenPerformance[]> {
        return this.withDatabase(async () => {
            const sql = `
                SELECT
                    token_address,
                    symbol,
                    CAST(price_change_24h AS FLOAT) as price_change_24h,
                    CAST(volume_change_24h AS FLOAT) as volume_change_24h,
                    CAST(trade_24h_change AS FLOAT) as trade_24h_change,
                    CAST(liquidity AS FLOAT) as liquidity,
                    CAST(liquidity_change_24h AS FLOAT) as liquidity_change_24h,
                    CAST(holder_change_24h AS FLOAT) as holder_change_24h,
                    rug_pull,
                    is_scam,
                    CAST(market_cap_change24h AS FLOAT) as market_cap_change24h,
                    sustained_growth,
                    rapid_dump,
                    suspicious_volume,
                    CAST(validation_trust AS FLOAT) as validation_trust,
                    CAST(balance AS FLOAT) as balance,
                    CAST(initial_market_cap AS FLOAT) as initial_market_cap,
                    last_updated
                FROM token_performance
                WHERE balance > 0;
            `;

            const result = await this.pool.query(sql);
            return result.rows.map((row) => ({
                tokenAddress: row.token_address,
                symbol: row.symbol,
                priceChange24h: row.price_change_24h,
                volumeChange24h: row.volume_change_24h,
                trade_24h_change: row.trade_24h_change,
                liquidity: row.liquidity,
                liquidityChange24h: row.liquidity_change_24h,
                holderChange24h: row.holder_change_24h,
                rugPull: row.rug_pull,
                isScam: row.is_scam,
                marketCapChange24h: row.market_cap_change24h,
                sustainedGrowth: row.sustained_growth,
                rapidDump: row.rapid_dump,
                suspiciousVolume: row.suspicious_volume,
                validationTrust: row.validation_trust,
                balance: row.balance,
                initialMarketCap: row.initial_market_cap,
                lastUpdated: new Date(row.last_updated),
            }));
        }, "getAllTokenPerformancesWithBalance");
    }

    // ----- TokenRecommendations Methods -----

    /**
     * Calculates the average trust score of all recommenders who have recommended a specific token.
     * @param tokenAddress The address of the token.
     * @returns The average trust score (validationTrust).
     */
    async calculateValidationTrust(tokenAddress: string): Promise<number> {
        return this.withDatabase(async () => {
            const sql = `
                SELECT DISTINCT ON (tr.recommender_id)
                    rm.trust_score
                FROM token_recommendations tr
                JOIN recommender_metrics rm ON tr.recommender_id = rm.recommender_id
                WHERE tr.token_address = $1;
            `;

            try {
                const result = await this.pool.query(sql, [tokenAddress]);

                if (result.rows.length === 0) {
                    return 0;
                }

                const totalTrust = result.rows.reduce(
                    (acc, row) => acc + Number(row.trust_score),
                    0
                );
                return totalTrust / result.rows.length;
            } catch (error) {
                elizaLogger.error(
                    `Error calculating validation trust for token address: ${tokenAddress}`,
                    error
                );
                return 0;
            }
        }, "calculateValidationTrust");
    }

    /**
     * Adds a new token recommendation.
     * @param recommendation TokenRecommendation object
     * @returns boolean indicating success
     */
    async addTokenRecommendation(
        recommendation: TokenRecommendation
    ): Promise<boolean> {
        return this.withDatabase(async () => {
            const sql = `
                INSERT INTO token_recommendations (
                    id,
                    recommender_id,
                    token_address,
                    timestamp,
                    initial_market_cap,
                    initial_liquidity,
                    initial_price
                ) VALUES ($1, $2, $3, $4, $5, $6, $7);
            `;

            try {
                const result = await this.pool.query(sql, [
                    recommendation.id || uuidv4(),
                    recommendation.recommenderId,
                    recommendation.tokenAddress,
                    recommendation.timestamp || new Date().toISOString(),
                    recommendation.initialMarketCap ?? null,
                    recommendation.initialLiquidity ?? null,
                    recommendation.initialPrice ?? null,
                ]);

                elizaLogger.log(
                    `Added token recommendation for ${recommendation.tokenAddress}`
                );
                return result.rowCount > 0;
            } catch (error) {
                elizaLogger.error("Error adding token recommendation:", error);
                return false;
            }
        }, "addTokenRecommendation");
    }

    /**
     * Retrieves all recommendations made by a recommender.
     * @param recommenderId Recommender's UUID
     * @returns Array of TokenRecommendation objects
     */
    async getRecommendationsByRecommender(
        recommenderId: string
    ): Promise<TokenRecommendation[]> {
        return this.withDatabase(async () => {
            const sql = `
                SELECT *
                FROM token_recommendations
                WHERE recommender_id = $1
                ORDER BY timestamp DESC;
            `;

            try {
                const result = await this.pool.query(sql, [recommenderId]);

                if (result.rows.length === 0) {
                    console.warn(
                        `No recommendations found for recommender ID: ${recommenderId}`
                    );
                    return [];
                }

                return result.rows.map((row) => ({
                    id: row.id,
                    recommenderId: row.recommender_id,
                    tokenAddress: row.token_address,
                    timestamp: new Date(row.timestamp),
                    initialMarketCap: row.initial_market_cap ?? null,
                    initialLiquidity: row.initial_liquidity ?? null,
                    initialPrice: row.initial_price ?? null,
                }));
            } catch (error) {
                elizaLogger.error(
                    `Error retrieving recommendations for recommender ID: ${recommenderId}`,
                    error
                );
                return [];
            }
        }, "getRecommendationsByRecommender");
    }

    /**
     * Retrieves all recommendations for a specific token.
     * @param tokenAddress Token's address
     * @returns Array of TokenRecommendation objects
     */
    async getRecommendationsByToken(
        tokenAddress: string
    ): Promise<TokenRecommendation[]> {
        const sql = `
            SELECT id,
                   recommender_id as "recommenderId",
                   token_address as "tokenAddress",
                   timestamp,
                   CAST(initial_market_cap AS FLOAT) as "initialMarketCap",
                   CAST(initial_liquidity AS FLOAT) as "initialLiquidity",
                   CAST(initial_price AS FLOAT) as "initialPrice"
            FROM token_recommendations
            WHERE token_address = $1
            ORDER BY timestamp DESC;
        `;

        try {
            const result = await this.pool.query(sql, [tokenAddress]);

            if (result.rows.length === 0) {
                console.warn(
                    `No recommendations found for token address: ${tokenAddress}`
                );
                return [];
            }

            return result.rows.map((row) => ({
                ...row,
                timestamp: new Date(row.timestamp),
                initialMarketCap: row.initialMarketCap ?? undefined,
                initialLiquidity: row.initialLiquidity ?? undefined,
                initialPrice: row.initialPrice ?? undefined,
            }));
        } catch (error) {
            elizaLogger.error(
                `Error retrieving recommendations for token address: ${tokenAddress}`,
                error
            );
            return [];
        }
    }

    /**
     * Retrieves all recommendations within a specific timeframe.
     * @param startDate Start date
     * @param endDate End date
     * @returns Array of TokenRecommendation objects
     */
    async getRecommendationsByDateRange(
        startDate: Date,
        endDate: Date
    ): Promise<TokenRecommendation[]> {
        return this.withDatabase(async () => {
            const sql = `
                SELECT *
                FROM token_recommendations
                WHERE timestamp BETWEEN $1 AND $2
                ORDER BY timestamp DESC;
            `;

            try {
                const result = await this.pool.query(sql, [
                    startDate.toISOString(),
                    endDate.toISOString(),
                ]);

                if (result.rows.length === 0) {
                    console.warn(
                        `No recommendations found between ${startDate} and ${endDate}`
                    );
                    return [];
                }

                return result.rows.map((row) => ({
                    id: row.id,
                    recommenderId: row.recommender_id,
                    tokenAddress: row.token_address,
                    timestamp: new Date(row.timestamp),
                    initialMarketCap: row.initial_market_cap ?? undefined,
                    initialLiquidity: row.initial_liquidity ?? undefined,
                    initialPrice: row.initial_price ?? undefined,
                }));
            } catch (error) {
                elizaLogger.error(
                    `Error retrieving recommendations for date range: ${startDate} - ${endDate}`,
                    error
                );
                return [];
            }
        }, "getRecommendationsByDateRange");
    }

    /**
     * Retrieves historical metrics for a recommender.
     * @param recommenderId Recommender's UUID
     * @returns Array of RecommenderMetricsHistory objects
     */
    async getRecommenderMetricsHistory(
        recommenderId: string
    ): Promise<RecommenderMetricsHistory[]> {
        return this.withDatabase(async () => {
            const sql = `
                SELECT *
                FROM recommender_metrics_history
                WHERE recommender_id = $1
                ORDER BY recorded_at DESC;
            `;

            try {
                const result = await this.pool.query(sql, [recommenderId]);

                return result.rows.map((row) => ({
                    historyId: row.history_id,
                    recommenderId: row.recommender_id,
                    trustScore: Number(row.trust_score),
                    totalRecommendations: row.total_recommendations,
                    successfulRecs: row.successful_recs,
                    avgTokenPerformance: Number(row.avg_token_performance),
                    riskScore: Number(row.risk_score),
                    consistencyScore: Number(row.consistency_score),
                    virtualConfidence: Number(row.virtual_confidence),
                    trustDecay: Number(row.trust_decay),
                    recordedAt: new Date(row.recorded_at),
                }));
            } catch (error) {
                elizaLogger.error(
                    `Error retrieving metrics history for recommender ID: ${recommenderId}`,
                    error
                );
                return [];
            }
        }, "getRecommenderMetricsHistory");
    }

    /**
     * Inserts a new trade performance into the specified table.
     * @param trade The TradePerformance object containing trade details.
     * @param isSimulation Whether the trade is a simulation. If true, inserts into simulation_trade; otherwise, into trade.
     * @returns boolean indicating success.
     */
    async addTradePerformance(
        trade: TradePerformance,
        isSimulation: boolean
    ): Promise<boolean> {
        return this.withDatabase(async () => {
            const tableName = isSimulation ? "simulation_trade" : "trade";
            const sql = `
                INSERT INTO ${tableName} (
                    token_address,
                    recommender_id,
                    buy_price,
                    sell_price,
                    buy_timestamp,
                    sell_timestamp,
                    buy_amount,
                    sell_amount,
                    buy_sol,
                    received_sol,
                    buy_value_usd,
                    sell_value_usd,
                    profit_usd,
                    profit_percent,
                    buy_market_cap,
                    sell_market_cap,
                    market_cap_change,
                    buy_liquidity,
                    sell_liquidity,
                    liquidity_change,
                    last_updated,
                    rapidDump
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, $15, $16, $17, $18,
                    $19, $20, $21, $22
                );
            `;

            try {
                const result = await this.pool.query(sql, [
                    trade.token_address,
                    trade.recommender_id,
                    trade.buy_price,
                    trade.sell_price || null,
                    trade.buy_timeStamp,
                    trade.sell_timeStamp || null,
                    trade.buy_amount,
                    trade.sell_amount || null,
                    trade.buy_sol,
                    trade.received_sol || null,
                    trade.buy_value_usd,
                    trade.sell_value_usd || null,
                    trade.profit_usd || null,
                    trade.profit_percent || null,
                    trade.buy_market_cap,
                    trade.sell_market_cap || null,
                    trade.market_cap_change || null,
                    trade.buy_liquidity,
                    trade.sell_liquidity || null,
                    trade.liquidity_change || null,
                    trade.last_updated,
                    trade.rapidDump,
                ]);

                return result.rowCount > 0;
            } catch (error) {
                elizaLogger.error(
                    `Error inserting trade into ${tableName}:`,
                    error
                );
                return false;
            }
        }, "addTradePerformance");
    }

    /**
     * Updates an existing trade with sell details.
     * @param tokenAddress The address of the token.
     * @param recommenderId The UUID of the recommender.
     * @param buyTimeStamp The timestamp when the buy occurred.
     * @param sellDetails An object containing sell-related details.
     * @param isSimulation Whether the trade is a simulation. If true, updates in simulation_trade; otherwise, in trade.
     * @returns boolean indicating success.
     */
    async updateTradePerformanceOnSell(
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
    ): Promise<boolean> {
        return this.withDatabase(async () => {
            const tableName = isSimulation ? "simulation_trade" : "trade";
            const sql = `
                UPDATE ${tableName}
                SET
                    sell_price = $1,
                    sell_timestamp = $2,
                    sell_amount = $3,
                    received_sol = $4,
                    sell_value_usd = $5,
                    profit_usd = $6,
                    profit_percent = $7,
                    sell_market_cap = $8,
                    market_cap_change = $9,
                    sell_liquidity = $10,
                    liquidity_change = $11,
                    rapiddump = $12,
                    sell_recommender_id = $13
                WHERE
                    token_address = $14 AND
                    recommender_id = $15 AND
                    buy_timestamp = $16;
            `;

            try {
                const result = await this.pool.query(sql, [
                    sellDetails.sell_price,
                    sellDetails.sell_timeStamp,
                    sellDetails.sell_amount,
                    sellDetails.received_sol,
                    sellDetails.sell_value_usd,
                    sellDetails.profit_usd,
                    sellDetails.profit_percent,
                    sellDetails.sell_market_cap,
                    sellDetails.market_cap_change,
                    sellDetails.sell_liquidity,
                    sellDetails.liquidity_change,
                    sellDetails.rapidDump,
                    sellDetails.sell_recommender_id,
                    tokenAddress,
                    recommenderId,
                    buyTimeStamp,
                ]);

                return result.rowCount > 0;
            } catch (error) {
                if (error.code === "22P02") {
                    // Invalid UUID error code
                    return false;
                }
                throw error;
            }
        }, "updateTradePerformanceOnSell");
    }

    /**
     * Retrieves trade performance metrics.
     * @param tokenAddress Token's address
     * @param recommenderId Recommender's UUID
     * @param buyTimeStamp Timestamp when the buy occurred
     * @param isSimulation Whether the trade is a simulation. If true, retrieves from simulation_trade; otherwise, from trade.
     * @returns TradePerformance object or null
     */
    async getTradePerformance(
        tokenAddress: string,
        recommenderId: string,
        buyTimeStamp: string,
        isSimulation: boolean
    ): Promise<TradePerformance | null> {
        return this.withDatabase(async () => {
            const tableName = isSimulation ? "simulation_trade" : "trade";
            const sql = `
                SELECT
                    token_address,
                    recommender_id,
                    CAST(buy_price AS FLOAT) as buy_price,
                    CAST(sell_price AS FLOAT) as sell_price,
                    buy_timestamp,
                    sell_timestamp,
                    CAST(buy_amount AS FLOAT) as buy_amount,
                    CAST(sell_amount AS FLOAT) as sell_amount,
                    CAST(buy_sol AS FLOAT) as buy_sol,
                    CAST(received_sol AS FLOAT) as received_sol,
                    CAST(buy_value_usd AS FLOAT) as buy_value_usd,
                    CAST(sell_value_usd AS FLOAT) as sell_value_usd,
                    CAST(profit_usd AS FLOAT) as profit_usd,
                    CAST(profit_percent AS FLOAT) as profit_percent,
                    CAST(buy_market_cap AS FLOAT) as buy_market_cap,
                    CAST(sell_market_cap AS FLOAT) as sell_market_cap,
                    CAST(market_cap_change AS FLOAT) as market_cap_change,
                    CAST(buy_liquidity AS FLOAT) as buy_liquidity,
                    CAST(sell_liquidity AS FLOAT) as sell_liquidity,
                    CAST(liquidity_change AS FLOAT) as liquidity_change,
                    last_updated,
                    rapiddump
                FROM ${tableName}
                WHERE token_address = $1
                AND recommender_id = $2
                AND buy_timestamp = $3;
            `;

            try {
                const result = await this.pool.query(sql, [
                    tokenAddress,
                    recommenderId,
                    buyTimeStamp,
                ]);

                if (result.rows.length === 0) {
                    return null;
                }

                const row = result.rows[0];
                return {
                    token_address: row.token_address,
                    recommender_id: row.recommender_id,
                    buy_price: Number(row.buy_price),
                    sell_price: row.sell_price ? Number(row.sell_price) : null,
                    buy_timeStamp: row.buy_timestamp,
                    sell_timeStamp: row.sell_timestamp || null,
                    buy_amount: Number(row.buy_amount),
                    sell_amount: row.sell_amount
                        ? Number(row.sell_amount)
                        : null,
                    buy_sol: Number(row.buy_sol),
                    received_sol: row.received_sol
                        ? Number(row.received_sol)
                        : null,
                    buy_value_usd: Number(row.buy_value_usd),
                    sell_value_usd: row.sell_value_usd
                        ? Number(row.sell_value_usd)
                        : null,
                    profit_usd: row.profit_usd ? Number(row.profit_usd) : null,
                    profit_percent: row.profit_percent
                        ? Number(row.profit_percent)
                        : null,
                    buy_market_cap: Number(row.buy_market_cap),
                    sell_market_cap: row.sell_market_cap
                        ? Number(row.sell_market_cap)
                        : null,
                    market_cap_change: row.market_cap_change
                        ? Number(row.market_cap_change)
                        : null,
                    buy_liquidity: Number(row.buy_liquidity),
                    sell_liquidity: row.sell_liquidity
                        ? Number(row.sell_liquidity)
                        : null,
                    liquidity_change: row.liquidity_change
                        ? Number(row.liquidity_change)
                        : null,
                    last_updated: row.last_updated,
                    rapidDump: row.rapiddump,
                };
            } catch (error) {
                if (error.code === "22P02") {
                    // Invalid UUID error code
                    return null;
                }
                throw error;
            }
        }, "getTradePerformance");
    }

    /**
     * Retrieves the latest trade performance metrics without requiring buyTimeStamp.
     * @param tokenAddress Token's address
     * @param recommenderId Recommender's UUID
     * @param isSimulation Whether the trade is a simulation. If true, retrieves from simulation_trade; otherwise, from trade.
     * @returns TradePerformance object or null
     */
    async getLatestTradePerformance(
        tokenAddress: string,
        recommenderId: string,
        isSimulation: boolean
    ): Promise<TradePerformance | null> {
        return this.withDatabase(async () => {
            const tableName = isSimulation ? "simulation_trade" : "trade";
            const sql = `
                SELECT *
                FROM ${tableName}
                WHERE token_address = $1
                  AND recommender_id = $2
                ORDER BY buy_timeStamp DESC
                LIMIT 1;
            `;

            try {
                const result = await this.pool.query(sql, [
                    tokenAddress,
                    recommenderId,
                ]);

                if (result.rows.length === 0) {
                    console.warn(
                        `No trade performance found in ${tableName} for token: ${tokenAddress}, recommender: ${recommenderId}`
                    );
                    return null;
                }

                const row = result.rows[0];

                return {
                    token_address: row.token_address,
                    recommender_id: row.recommender_id,
                    buy_price: row.buy_price,
                    sell_price: row.sell_price ?? null,
                    buy_timeStamp: row.buy_timestamp,
                    sell_timeStamp: row.sell_timestamp ?? null,
                    buy_amount: row.buy_amount,
                    sell_amount: row.sell_amount ?? null,
                    buy_sol: row.buy_sol,
                    received_sol: row.received_sol ?? null,
                    buy_value_usd: row.buy_value_usd,
                    sell_value_usd: row.sell_value_usd ?? null,
                    profit_usd: row.profit_usd ?? null,
                    profit_percent: row.profit_percent ?? null,
                    buy_market_cap: row.buy_market_cap,
                    sell_market_cap: row.sell_market_cap ?? null,
                    market_cap_change: row.market_cap_change ?? null,
                    buy_liquidity: row.buy_liquidity,
                    sell_liquidity: row.sell_liquidity ?? null,
                    liquidity_change: row.liquidity_change ?? null,
                    last_updated: new Date(row.last_updated).toISOString(),
                    rapidDump: row.rapiddump,
                };
            } catch (error) {
                elizaLogger.error(
                    `Error retrieving latest trade performance for token: ${tokenAddress}, recommender: ${recommenderId}`,
                    error
                );
                return null;
            }
        }, "getLatestTradePerformance");
    }

    // ----- Transactions Methods -----

    /**
     * Adds a new transaction to the database.
     * @param transaction Transaction object
     * @returns boolean indicating success
     */
    async addTransaction(transaction: Transaction): Promise<boolean> {
        return this.withDatabase(async () => {
            try {
                const sql = `
                    INSERT INTO transactions (
                        token_address,
                        transaction_hash,
                        type,
                        amount,
                        price,
                        is_simulation,
                        timestamp
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7);
                `;

                const result = await this.pool.query(sql, [
                    transaction.tokenAddress,
                    transaction.transactionHash,
                    transaction.type,
                    transaction.amount,
                    transaction.price,
                    transaction.isSimulation,
                    transaction.timestamp,
                ]);

                return result.rowCount > 0;
            } catch (error) {
                // Handle unique constraint violation
                if (error.code === "23505") {
                    // Postgres unique constraint violation code
                    return false;
                }
                throw error; // Re-throw other errors
            }
        }, "addTransaction");
    }

    /**
     * Retrieves all transactions for a specific token.
     * @param tokenAddress Token's address
     * @returns Array of Transaction objects
     */
    async getTransactionsByToken(tokenAddress: string): Promise<Transaction[]> {
        return this.withDatabase(async () => {
            const sql = `
                SELECT
                    token_address,
                    transaction_hash,
                    type,
                    CAST(amount AS FLOAT) as amount,
                    CAST(price AS FLOAT) as price,
                    is_simulation,
                    timestamp::text
                FROM transactions
                WHERE token_address = $1
                ORDER BY timestamp DESC;
            `;

            const result = await this.pool.query(sql, [tokenAddress]);

            if (result.rows.length === 0) {
                return [];
            }

            return result.rows.map((row) => ({
                tokenAddress: row.token_address,
                transactionHash: row.transaction_hash,
                type: row.type as "buy" | "sell",
                amount: Number(row.amount),
                price: Number(row.price),
                isSimulation: row.is_simulation,
                timestamp: row.timestamp,
            }));
        }, "getTransactionsByToken");
    }

    /**
     * Executes a custom query on the trade table with parameters.
     * @param query SQL query string
     * @param params Query parameters
     * @returns Array of TradePerformance objects
     */
    async getTradesByQuery(
        query: string,
        params: any[]
    ): Promise<TradePerformance[]> {
        return this.withDatabase(async () => {
            try {
                const result = await this.pool.query(query, params);

                if (result.rows.length === 0) {
                    console.warn("No trades found for the provided query.");
                    return [];
                }

                return result.rows.map((row) => ({
                    token_address: row.token_address,
                    recommender_id: row.recommender_id,
                    buy_price: row.buy_price,
                    sell_price: row.sell_price ?? null,
                    buy_timeStamp: row.buy_timestamp,
                    sell_timeStamp: row.sell_timestamp ?? null,
                    buy_amount: row.buy_amount,
                    sell_amount: row.sell_amount ?? null,
                    buy_sol: row.buy_sol,
                    received_sol: row.received_sol ?? null,
                    buy_value_usd: row.buy_value_usd,
                    sell_value_usd: row.sell_value_usd ?? null,
                    profit_usd: row.profit_usd ?? null,
                    profit_percent: row.profit_percent ?? null,
                    buy_market_cap: row.buy_market_cap,
                    sell_market_cap: row.sell_market_cap ?? null,
                    market_cap_change: row.market_cap_change ?? null,
                    buy_liquidity: row.buy_liquidity,
                    sell_liquidity: row.sell_liquidity ?? null,
                    liquidity_change: row.liquidity_change ?? null,
                    last_updated: new Date(row.last_updated).toISOString(),
                    rapidDump: row.rapiddump,
                }));
            } catch (error) {
                elizaLogger.error("Error executing trade query:", error);
                return [];
            }
        }, "getTradesByQuery");
    }

    async closeConnection(): Promise<void> {
        await this.pool.end();
    }
}
