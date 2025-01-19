import { PostgresDatabaseAdapter } from "@elizaos/adapter-postgres";
import { elizaLogger } from "@elizaos/core";
import { Pool } from "pg";

export interface LiquidationData {
    id: string;
    created_at: Date;
    market_id: string;
    quantity: number;
    price: number;
    platform: string;
    symbol: string;
}

export interface AggregatedLiquidation {
    bucketed_time: Date;
    market_id: string;
    total_amount: number;
    total_count: number;
}

export class TimescaleDBAdapter extends PostgresDatabaseAdapter {
    constructor(connectionString: string) {
        super(connectionString);
        elizaLogger.info("TimescaleDB adapter initialized");
    }

    // Get real-time liquidations with pagination
    async getLiquidations(params: {
        startTime?: Date;
        endTime?: Date;
        limit?: number;
        offset?: number;
    }): Promise<LiquidationData[]> {
        const { limit = 100, offset = 0 } = params;
        const query = `
            SELECT * FROM liquidation
            WHERE ($1::timestamp IS NULL OR created_at >= $1)
            AND ($2::timestamp IS NULL OR created_at <= $2)
            ORDER BY created_at DESC
            LIMIT $3 OFFSET $4
        `;
        const result = await this.query(query, [
            params.startTime,
            params.endTime,
            limit,
            offset,
        ]);
        return result.rows;
    }

    // Get aggregated liquidation data based on time intervals
    async getAggregatedLiquidations(params: {
        interval: "1h" | "4h" | "12h" | "24h";
        startTime: Date;
        endTime: Date;
    }): Promise<AggregatedLiquidation[]> {
        const query = `
            SELECT
                time_bucket($1, created_at) as bucketed_time,
                market_id,
                SUM(ABS(quantity * price)) as total_amount,
                COUNT(*) as total_count
            FROM liquidation
            WHERE created_at BETWEEN $2 AND $3
            GROUP BY bucketed_time, market_id
            ORDER BY bucketed_time DESC
        `;
        const result = await this.query(query, [
            params.interval,
            params.startTime,
            params.endTime,
        ]);
        return result.rows;
    }

    // Get liquidations by market ID
    async getLiquidationsByMarket(params: {
        marketId: string;
        limit?: number;
        offset?: number;
    }): Promise<LiquidationData[]> {
        const { limit = 100, offset = 0 } = params;
        const query = `
            SELECT * FROM liquidation
            WHERE market_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;
        const result = await this.query(query, [
            params.marketId,
            limit,
            offset,
        ]);
        return result.rows;
    }

    // Get total liquidation volume in a time range
    async getTotalLiquidationVolume(params: {
        startTime: Date;
        endTime: Date;
    }): Promise<number> {
        const query = `
            SELECT SUM(ABS(quantity * price)) as total_volume
            FROM liquidation
            WHERE created_at BETWEEN $1 AND $2
        `;
        const result = await this.query(query, [
            params.startTime,
            params.endTime,
        ]);
        return result.rows[0]?.total_volume || 0;
    }
}

export { default as LiquidationPlugin } from "./plugin";
export { default as LiquidationService } from "./services/liquidationService";
