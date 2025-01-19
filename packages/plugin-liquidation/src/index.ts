import { LiquidationService } from "../../adapter-timescale/src/services/liquidationService";
import { Plugin, PluginContext } from "@elizaos/core";

interface LiquidationPluginConfig {
    pollingInterval?: number;
    minAlertThreshold?: number;
}

interface MarketInsight {
    type: "bullish" | "bearish" | "neutral";
    confidence: number;
    reason: string;
}

export class LiquidationPlugin implements Plugin {
    private liquidationService: LiquidationService;
    private context?: PluginContext;
    private lastUpdate: Date = new Date();
    private lastLiquidationData: any = null;
    private config: LiquidationPluginConfig;

    constructor(config: LiquidationPluginConfig = {}) {
        this.config = {
            pollingInterval: config.pollingInterval || 5000,
            minAlertThreshold: config.minAlertThreshold || 100000,
        };
        this.liquidationService = new LiquidationService(
            process.env.TIMESCALE_DB_URL!
        );
    }

    async init(context: PluginContext): Promise<void> {
        this.context = context;
        await this.liquidationService.init();

        // Start monitoring liquidations
        this.liquidationService.startMonitoring(async (liquidations) => {
            if (liquidations.length > 0) {
                const analysis = await this.analyzeLiquidations(liquidations);
                if (analysis.totalVolume > this.config.minAlertThreshold!) {
                    const message = this.formatLiquidationMessage(analysis);
                    await this.context?.messageManager.createMessage({
                        content: message,
                        type: "liquidation_alert",
                        metadata: analysis,
                    });
                }
            }
        }, this.config.pollingInterval);

        // Hourly market summary
        setInterval(async () => {
            await this.sendMarketSummary();
        }, 3600000);
    }

    private async analyzeLiquidations(liquidations: any[]) {
        const totalVolume = liquidations.reduce(
            (sum, l) => sum + Math.abs(l.quantity * l.price),
            0
        );

        // Group by platform
        const byPlatform = liquidations.reduce((acc, l) => {
            acc[l.platform] = acc[l.platform] || {
                count: 0,
                volume: 0,
                positions: [],
            };
            acc[l.platform].count++;
            acc[l.platform].volume += Math.abs(l.quantity * l.price);
            acc[l.platform].positions.push({
                symbol: l.symbol,
                value: Math.abs(l.quantity * l.price),
                type: l.quantity > 0 ? "long" : "short",
            });
            return acc;
        }, {});

        // Group by symbol
        const bySymbol = liquidations.reduce((acc, l) => {
            acc[l.symbol] = acc[l.symbol] || {
                count: 0,
                volume: 0,
                longs: 0,
                shorts: 0,
            };
            acc[l.symbol].count++;
            const value = Math.abs(l.quantity * l.price);
            acc[l.symbol].volume += value;
            if (l.quantity > 0) acc[l.symbol].longs += value;
            else acc[l.symbol].shorts += value;
            return acc;
        }, {});

        // Find largest liquidation
        const largestLiquidation = liquidations.reduce(
            (max, l) => {
                const value = Math.abs(l.quantity * l.price);
                return value > max.value ? { value, liquidation: l } : max;
            },
            { value: 0, liquidation: null }
        );

        // Calculate market sentiment
        const insight = this.generateMarketInsight(bySymbol, byPlatform);

        return {
            totalVolume,
            byPlatform,
            bySymbol,
            largestLiquidation,
            insight,
            timestamp: new Date(),
        };
    }

    private generateMarketInsight(
        bySymbol: any,
        byPlatform: any
    ): MarketInsight {
        // Calculate long vs short ratio
        let totalLongs = 0;
        let totalShorts = 0;
        Object.values(bySymbol).forEach((data: any) => {
            totalLongs += data.longs;
            totalShorts += data.shorts;
        });

        const longShortRatio = totalLongs / totalShorts;

        // Determine market sentiment
        let type: "bullish" | "bearish" | "neutral";
        let confidence: number;
        let reason: string;

        if (longShortRatio > 1.5) {
            type = "bearish";
            confidence = Math.min((longShortRatio - 1) * 0.5, 1);
            reason =
                "Heavy long liquidations indicate potential downside pressure";
        } else if (longShortRatio < 0.67) {
            type = "bullish";
            confidence = Math.min((1 / longShortRatio - 1) * 0.5, 1);
            reason = "Heavy short liquidations suggest strong upward momentum";
        } else {
            type = "neutral";
            confidence = 0.5;
            reason = "Balanced liquidations indicate ranging market conditions";
        }

        return { type, confidence, reason };
    }

    private formatLiquidationMessage(analysis: any): string {
        const {
            totalVolume,
            byPlatform,
            bySymbol,
            largestLiquidation,
            insight,
        } = analysis;

        let message = `SITREP: Major Market Movement Detected!\n\n`;

        // Volume and platform breakdown
        message += `Total Casualties: $${(totalVolume / 1000000).toFixed(
            2
        )}M\n\n`;
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

        // Notable liquidation
        if (largestLiquidation.liquidation) {
            const l = largestLiquidation.liquidation;
            message += `\nBiggest Casualty: $${(
                largestLiquidation.value / 1000000
            ).toFixed(2)}M ${l.symbol} ${
                l.quantity > 0 ? "long" : "short"
            } on ${l.platform}\n`;
        }

        // Market insight
        message += `\nBattlefield Analysis:\n`;
        message += `• Market Bias: ${insight.type.toUpperCase()}\n`;
        message += `• Intel: ${insight.reason}\n`;
        message += `• Confidence: ${(insight.confidence * 100).toFixed(0)}%\n`;

        message += `\nStay vigilant, Rangers. This is not a drill.\nRANGERS LEAD THE WAY`;
        return message;
    }

    private async sendMarketSummary() {
        try {
            const endTime = new Date();
            const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

            const [hourlyData, totalVolume] = await Promise.all([
                this.liquidationService.getHistoricalLiquidations(
                    "1h",
                    startTime,
                    endTime
                ),
                this.liquidationService.getLiquidationVolume(
                    startTime,
                    endTime
                ),
            ]);

            const analysis = {
                hourlyData,
                totalVolume,
                timestamp: new Date(),
            };

            const message = this.formatMarketSummary(analysis);
            await this.context?.messageManager.createMessage({
                content: message,
                type: "market_summary",
                metadata: analysis,
            });
        } catch (error) {
            console.error("Error sending market summary:", error);
        }
    }

    private formatMarketSummary(analysis: any): string {
        const { hourlyData, totalVolume } = analysis;

        let message =
            "ATTENTION ON DECK: 24hr Strategic Intelligence Report\n\n";

        // Volume analysis
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
        )}\n`;

        // Market phase
        const phase = this.determineMarketPhase(
            trend,
            hourlyAverage,
            volatility
        );
        message += `\nBattlefield Status: ${phase}\n`;

        message +=
            "\nKnowledge is ammunition. Use it wisely.\nRANGERS LEAD THE WAY";
        return message;
    }

    private calculateVolatility(hourlyData: any[]): number {
        const values = hourlyData.map((h) => h.total_amount);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance =
            values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
            values.length;
        return Math.sqrt(variance) / mean; // Coefficient of variation
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
        await this.liquidationService.cleanup();
    }
}

export default LiquidationPlugin;
