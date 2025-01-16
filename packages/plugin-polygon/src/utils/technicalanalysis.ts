import { getPriceHistoryByTicker } from './polygon.ts';
import dotenv from 'dotenv';
dotenv.config();

// Utility functions for calculating technical indicators
const TechnicalIndicators = {
    // Calculate Simple Moving Average
    calculateSMA(prices: number[], period: number): number {
        if (prices.length < period) return 0;
        const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
        return sum / period;
    },

    // Calculate Exponential Moving Average
    calculateEMA(prices: number[], period: number): number {
        if (prices.length < period) return 0;
        const multiplier = 2 / (period + 1);
        let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
        
        for (let i = period; i < prices.length; i++) {
            ema = (prices[i] - ema) * multiplier + ema;
        }
        return ema;
    },

    // Calculate RSI
    calculateRSI(prices: number[], period: number = 14): number {
        if (prices.length < period + 1) return 50;

        let gains = 0;
        let losses = 0;

        for (let i = 1; i <= period; i++) {
            const difference = prices[i] - prices[i - 1];
            if (difference >= 0) {
                gains += difference;
            } else {
                losses -= difference;
            }
        }

        let avgGain = gains / period;
        let avgLoss = losses / period;

        for (let i = period + 1; i < prices.length; i++) {
            const difference = prices[i] - prices[i - 1];
            if (difference >= 0) {
                avgGain = (avgGain * (period - 1) + difference) / period;
                avgLoss = (avgLoss * (period - 1)) / period;
            } else {
                avgGain = (avgGain * (period - 1)) / period;
                avgLoss = (avgLoss * (period - 1) - difference) / period;
            }
        }

        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    },

    // Calculate MACD
    calculateMACD(prices: number[]): { macd: number, signal: number, histogram: number } {
        const ema12 = this.calculateEMA(prices, 12);
        const ema26 = this.calculateEMA(prices, 26);
        const macd = ema12 - ema26;
        const signal = this.calculateEMA([...prices.slice(0, -1), macd], 9);
        const histogram = macd - signal;

        return { macd, signal, histogram };
    },

    // Calculate Bollinger Bands
    calculateBollingerBands(prices: number[], period: number = 20): {
        upper: number,
        middle: number,
        lower: number
    } {
        const sma = this.calculateSMA(prices.slice(-period), period);
        const standardDeviation = Math.sqrt(
            prices.slice(-period).reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period
        );

        return {
            upper: sma + (standardDeviation * 2),
            middle: sma,
            lower: sma - (standardDeviation * 2)
        };
    },

    // Identify Support and Resistance
    identifySupportResistance(prices: number[]): { support: number, resistance: number } {
        const sortedPrices = [...prices].sort((a, b) => a - b);
        const lowerQuartile = sortedPrices[Math.floor(prices.length * 0.25)];
        const upperQuartile = sortedPrices[Math.floor(prices.length * 0.75)];

        return {
            support: lowerQuartile,
            resistance: upperQuartile
        };
    }
};

/**
 * Main class for analyzing technical indicators
 * Processes price history to calculate technical signals
 */
class TechnicalAnalyzer {
    /**
     * Analyzes technical indicators for a given stock
     * @param {string} ticker - Stock symbol to analyze
     * @returns {Promise<Object>} Technical analysis results
     */
    async analyzeTechnical(ticker: string) {
        try {
            const priceData = await this.fetchPriceData(ticker);
            const closePrices = priceData.map(d => d.c);
            
            // Calculate all technical indicators
            const indicators = this.calculateIndicators(closePrices);
            
            // Calculate scores for each indicator
            const scores = this.calculateScores(indicators, closePrices[closePrices.length - 1]);
            
            return {
                stock: {
                    ticker,
                    analysisDate: new Date().toISOString()
                },
                scores
            };
        } catch (error) {
            console.error(`Error analyzing ${ticker}:`, error);
            throw error;
        }
    }

    private calculateIndicators(prices: number[]) {
        return {
            sma20: TechnicalIndicators.calculateSMA(prices, 20),
            sma50: TechnicalIndicators.calculateSMA(prices, 50),
            sma200: TechnicalIndicators.calculateSMA(prices, 200),
            rsi: TechnicalIndicators.calculateRSI(prices),
            macd: TechnicalIndicators.calculateMACD(prices),
            bollingerBands: TechnicalIndicators.calculateBollingerBands(prices),
            supportResistance: TechnicalIndicators.identifySupportResistance(prices)
        };
    }

    private calculateScores(indicators: any, currentPrice: number): {
        [key: string]: number
    } {
        const scores = {
            trend_score: this.calculateTrendScore(indicators, currentPrice),
            momentum_score: this.calculateMomentumScore(indicators),
            volatility_score: this.calculateVolatilityScore(indicators, currentPrice),
            support_resistance_score: this.calculateSupportResistanceScore(
                indicators.supportResistance,
                currentPrice
            )
        };

        return scores;
    }

    private calculateTrendScore(indicators: any, currentPrice: number): number {
        let score = 0;
        
        // Score based on moving average relationships
        if (currentPrice > indicators.sma200) score += 0.3;
        if (currentPrice > indicators.sma50) score += 0.2;
        if (currentPrice > indicators.sma20) score += 0.1;
        if (indicators.sma20 > indicators.sma50) score += 0.2;
        if (indicators.sma50 > indicators.sma200) score += 0.2;

        return Math.max(-1, Math.min(1, score));
    }

    private calculateMomentumScore(indicators: any): number {
        let score = 0;
        
        // RSI scoring
        if (indicators.rsi > 70) score -= 0.5;
        else if (indicators.rsi < 30) score += 0.5;
        else score += (indicators.rsi - 50) / 40;

        // MACD scoring
        if (indicators.macd.histogram > 0) score += 0.3;
        else score -= 0.3;
        
        return Math.max(-1, Math.min(1, score));
    }

    private calculateVolatilityScore(indicators: any, currentPrice: number): number {
        const { upper, lower, middle } = indicators.bollingerBands;
        const bandWidth = (upper - lower) / middle;
        let score = 0;

        // Score based on position within Bollinger Bands
        if (currentPrice > upper) score -= 0.5;
        else if (currentPrice < lower) score += 0.5;
        else score += (currentPrice - middle) / (upper - middle);

        // Adjust score based on band width
        score *= (1 - bandWidth);

        return Math.max(-1, Math.min(1, score));
    }

    private calculateSupportResistanceScore(
        { support, resistance }: { support: number, resistance: number },
        currentPrice: number
    ): number {
        const range = resistance - support;
        const position = (currentPrice - support) / range;
        
        // Score based on position between support and resistance
        let score = 1 - (2 * position);
        
        // Adjust score based on proximity to levels
        if (Math.abs(currentPrice - support) / range < 0.1) score += 0.3;
        if (Math.abs(currentPrice - resistance) / range < 0.1) score -= 0.3;

        return Math.max(-1, Math.min(1, score));
    }

    private async fetchPriceData(ticker: string) {
        const now = new Date();
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(now.getFullYear() - 2);
        
        const fullData = await getPriceHistoryByTicker(
            ticker,
            twoYearsAgo.getTime(),
            now.getTime(),
            "day"
        );

        return fullData[0]?.history.map(({ date, close }) => ({ t: date, c: close })) || [];
    }
}

// Example usage
console.log('Starting technical analysis...');
const analyzer = new TechnicalAnalyzer();
analyzer.analyzeTechnical('AAPL').then(analysis => {
    console.log('Technical Analysis Results:', JSON.stringify(analysis, null, 2));
}).catch(error => {
    console.error('Analysis failed:', error);
});

export default TechnicalAnalyzer;
