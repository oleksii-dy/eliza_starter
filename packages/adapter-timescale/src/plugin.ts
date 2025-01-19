import { Plugin, elizaLogger } from "@elizaos/core";
import { LiquidationService } from "./services/liquidationService";

interface LiquidationPluginConfig {
    pollingInterval?: number;
    minAlertThreshold?: number;
    insights?: {
        enabled?: boolean;
        confidenceThreshold?: number;
        volatilityThreshold?: number;
    };
}

export class LiquidationPlugin implements Plugin {
    readonly name = "liquidation";
    readonly description =
        "Plugin for monitoring and analyzing liquidation data";

    private service: LiquidationService;
    private config: LiquidationPluginConfig;

    constructor(config: LiquidationPluginConfig = {}) {
        this.config = {
            pollingInterval: config.pollingInterval || 5000,
            minAlertThreshold: config.minAlertThreshold || 100000,
            insights: {
                enabled: config.insights?.enabled ?? true,
                confidenceThreshold:
                    config.insights?.confidenceThreshold ?? 0.7,
                volatilityThreshold:
                    config.insights?.volatilityThreshold ?? 0.8,
            },
        };
    }

    async init(): Promise<void> {
        if (!process.env.TIMESCALE_DB_URL) {
            throw new Error(
                "TIMESCALE_DB_URL environment variable is required"
            );
        }

        this.service = new LiquidationService(process.env.TIMESCALE_DB_URL);
        await this.service.init();

        // Start monitoring liquidations
        this.service.startMonitoring(async (liquidations) => {
            if (liquidations.length > 0) {
                const totalVolume = liquidations.reduce(
                    (sum, l) => sum + Math.abs(l.quantity * l.price),
                    0
                );

                if (totalVolume >= this.config.minAlertThreshold!) {
                    const message = this.formatLiquidationAlert(
                        liquidations,
                        totalVolume
                    );
                    elizaLogger.info("Liquidation alert:", message);
                }
            }
        }, this.config.pollingInterval);

        // Start hourly market summaries
        setInterval(async () => {
            await this.sendMarketSummary();
        }, 3600000); // Every hour
    }

    private formatLiquidationAlert(
        liquidations: any[],
        totalVolume: number
    ): string {
        const byPlatform = this.groupByPlatform(liquidations);
        const bySymbol = this.groupBySymbol(liquidations);
        const sentiment = this.analyzeSentiment(liquidations);

        let message = `SITREP: Major Market Movement Detected!\n\n`;
        message += `Total Casualties: $${(totalVolume / 1000000).toFixed(
            2
        )}M\n\n`;

        // Platform breakdown
        message += `Platform Intel:\n`;
        Object.entries(byPlatform).forEach(
            ([platform, data]: [string, any]) => {
                message += `• ${platform}: $${(data.volume / 1000000).toFixed(
                    2
                )}M (${data.count} positions)\n`;
            }
        );

        // Symbol analysis
        const topSymbols = Object.entries(bySymbol)
            .sort(
                ([, a]: [string, any], [, b]: [string, any]) =>
                    b.volume - a.volume
            )
            .slice(0, 3);

        message += `\nHeaviest Impact:\n`;
        topSymbols.forEach(([symbol, data]: [string, any]) => {
            const longPercent = ((data.longs / data.volume) * 100).toFixed(1);
            message += `• ${symbol}: $${(data.volume / 1000000).toFixed(
                2
            )}M (${longPercent}% longs)\n`;
        });

        // Market sentiment
        message += `\nBattlefield Analysis:\n`;
        message += `• Market Bias: ${sentiment.type.toUpperCase()}\n`;
        message += `• Intel: ${sentiment.reason}\n`;
        message += `• Confidence: ${(sentiment.confidence * 100).toFixed(
            0
        )}%\n\n`;

        message += `Stay vigilant, Rangers. This is not a drill.\nRANGERS LEAD THE WAY`;
        return message;
    }

    private async sendMarketSummary(): Promise<void> {
        try {
            const endTime = new Date();
            const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

            const [hourlyData, totalVolume] = await Promise.all([
                this.service.getHistoricalLiquidations(
                    "1h",
                    startTime,
                    endTime
                ),
                this.service.getLiquidationVolume(startTime, endTime),
            ]);

            const message = this.formatMarketSummary(hourlyData, totalVolume);
            elizaLogger.info("Market summary:", message);
        } catch (error) {
            elizaLogger.error("Error sending market summary:", error);
        }
    }

    private formatMarketSummary(
        hourlyData: any[],
        totalVolume: number
    ): string {
        let message = `ATTENTION ON DECK: 24hr Strategic Intelligence Report\n\n`;
        message += `Total Liquidations: $${(totalVolume / 1000000).toFixed(
            2
        )}M\n\n`;

        // Trend analysis
        const recentHours = hourlyData.slice(0, 6);
        const trend =
            recentHours.reduce((sum, hour) => sum + hour.total_amount, 0) /
            recentHours.length;
        const hourlyAverage = totalVolume / 24;

        message += `Trend Analysis:\n`;
        message += `• 6hr Average: $${(trend / 1000000).toFixed(2)}M\n`;
        message += `• 24hr Average: $${(hourlyAverage / 1000000).toFixed(
            2
        )}M\n`;

        // Volatility assessment
        const volatility = this.calculateVolatility(hourlyData);
        message += `• Market Volatility: ${this.formatVolatility(
            volatility
        )}\n\n`;

        // Market phase
        const phase = this.determineMarketPhase(
            trend,
            hourlyAverage,
            volatility
        );
        message += `Battlefield Status: ${phase}\n\n`;

        message += `Knowledge is ammunition. Use it wisely.\nRANGERS LEAD THE WAY`;
        return message;
    }

    private groupByPlatform(liquidations: any[]): Record<string, any> {
        return liquidations.reduce((acc, l) => {
            acc[l.platform] = acc[l.platform] || { count: 0, volume: 0 };
            acc[l.platform].count++;
            acc[l.platform].volume += Math.abs(l.quantity * l.price);
            return acc;
        }, {});
    }

    private groupBySymbol(liquidations: any[]): Record<string, any> {
        return liquidations.reduce((acc, l) => {
            acc[l.symbol] = acc[l.symbol] || { volume: 0, longs: 0, shorts: 0 };
            const value = Math.abs(l.quantity * l.price);
            acc[l.symbol].volume += value;
            if (l.quantity > 0) acc[l.symbol].longs += value;
            else acc[l.symbol].shorts += value;
            return acc;
        }, {});
    }

    private analyzeSentiment(liquidations: any[]): {
        type: string;
        confidence: number;
        reason: string;
    } {
        const { longs, shorts } = liquidations.reduce(
            (acc, l) => {
                const value = Math.abs(l.quantity * l.price);
                if (l.quantity > 0) acc.longs += value;
                else acc.shorts += value;
                return acc;
            },
            { longs: 0, shorts: 0 }
        );

        const ratio = longs / shorts;
        if (ratio > 1.5) {
            return {
                type: "bearish",
                confidence: Math.min((ratio - 1) * 0.5, 1),
                reason: "Heavy long liquidations indicate potential downside pressure",
            };
        } else if (ratio < 0.67) {
            return {
                type: "bullish",
                confidence: Math.min((1 / ratio - 1) * 0.5, 1),
                reason: "Heavy short liquidations suggest strong upward momentum",
            };
        }
        return {
            type: "neutral",
            confidence: 0.5,
            reason: "Balanced liquidations indicate ranging market conditions",
        };
    }

    private calculateVolatility(hourlyData: any[]): number {
        const values = hourlyData.map((h) => h.total_amount);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance =
            values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
            values.length;
        return Math.sqrt(variance) / mean;
    }

    private formatVolatility(volatility: number): string {
        if (volatility < 0.5) return "LOW - steady combat conditions";
        if (volatility < 1.0) return "MEDIUM - increased market turbulence";
        return "HIGH - extreme market warfare";
    }

    private determineMarketPhase(
        trend: number,
        hourlyAverage: number,
        volatility: number
    ): string {
        if (trend > hourlyAverage * 1.5 && volatility > 0.8)
            return "CRITICAL - Heavy casualties, extreme vigilance required";
        if (trend > hourlyAverage * 1.2)
            return "ELEVATED - Increased liquidation activity, stay alert";
        if (volatility > 0.8)
            return "UNSTABLE - Volatile conditions, maintain defensive positions";
        return "STABLE - Normal market operations, maintain regular surveillance";
    }

    async cleanup(): Promise<void> {
        await this.service?.cleanup();
    }
}

export default LiquidationPlugin;
