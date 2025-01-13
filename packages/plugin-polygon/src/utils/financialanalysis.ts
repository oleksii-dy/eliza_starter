import { getPriceHistoryByTicker, getCompanyFinancialsTicker } from './polygon.ts';
import dotenv from 'dotenv';
dotenv.config();

// Utility functions for calculating financial metrics from SEC report data
const MetricCalculator = {
    // Calculates net profit margin as a percentage
    // Formula: (Net Income / Revenue) * 100
    calculateNetProfitMargin(financials) {
        const netIncome = financials.income_statement.net_income_loss.value;
        const revenue = financials.income_statement.revenues.value;
        console.log("netIncome", netIncome);
        console.log("revenue", revenue);
        console.log("netIncome / revenue", netIncome / revenue);
        return (netIncome / revenue) * 100;
    },

    // Calculates Return on Equity as a percentage
    // Formula: (Net Income / Total Equity) * 100
    calculateROE(financials) {
        const netIncome = financials.income_statement.net_income_loss.value;
        const equity = financials.balance_sheet.equity.value;
        return (netIncome / equity) * 100;
    },

    // Calculates Current Ratio
    // Formula: Current Assets / Current Liabilities
    // Healthy ratio is typically > 1
    calculateCurrentRatio(financials) {
        const currentAssets = financials.balance_sheet.current_assets.value;
        const currentLiabilities = financials.balance_sheet.current_liabilities.value;
        return currentAssets / currentLiabilities;
    },

    // Calculates Debt to Equity ratio
    // Formula: Total Liabilities / Total Equity
    // Lower values indicate less leverage
    calculateDebtToEquity(financials) {
        const liabilities = financials.balance_sheet.liabilities.value;
        const equity = financials.balance_sheet.equity.value;
        return liabilities / equity;
    },

    // Calculates Free Cash Flow
    // Formula: Operating Cash Flow - Capital Expenditures (investing cash flow)
    calculateFreeCashFlow(financials) {
        const operatingCashFlow = financials.cash_flow_statement.net_cash_flow_from_operating_activities.value;
        const investingCashFlow = financials.cash_flow_statement.net_cash_flow_from_investing_activities.value;
        return operatingCashFlow - investingCashFlow;
    },

    // Operating Efficiency
    calculateRDToRevenue(financials) {
        const rdExpense = financials.income_statement.operating_expenses.value;
        const revenue = financials.income_statement.revenues.value;
        return (rdExpense / revenue) * 100;
    },

    // Profitability
    calculateGrossMargin(financials) {
        const grossProfit = financials.income_statement.gross_profit.value;
        const revenue = financials.income_statement.revenues.value;
        return (grossProfit / revenue) * 100;
    },

    calculateOperatingMargin(financials) {
        const operatingIncome = financials.income_statement.operating_income_loss.value;
        const revenue = financials.income_statement.revenues.value;
        return (operatingIncome / revenue) * 100;
    },

    // Per Share Metrics
    calculateEPS(financials) {
        return financials.income_statement.basic_earnings_per_share.value;
    },

    calculateDilutedEPS(financials) {
        return financials.income_statement.diluted_earnings_per_share.value;
    },

    // Asset Utilization
    calculateAssetTurnover(financials) {
        const revenue = financials.income_statement.revenues.value;
        const totalAssets = financials.balance_sheet.assets.value;
        return revenue / totalAssets;
    }
};

/**
 * Main class for analyzing stock fundamentals
 * Processes SEC financial data to calculate key metrics
 */
class StockAnalyzer {
    /**
     * Main analysis function that processes a stock
     * @param {string} ticker - Stock symbol to analyze
     * @returns {Promise<Object>} Calculated metrics
     */
    async analyzeStock(ticker: string) {
        try {
            // Fetch required data
            const [pricingData, financialData] = await Promise.all([
                this.fetchPricingData(ticker),
                this.fetchFinancialData(ticker)
            ]);
            // Calculate metrics
            const metrics = this.calculateMetrics(financialData);
            
            // Format output
            return {
                stock: {
                    ticker,
                    analysisDate: new Date().toISOString()
                },
                metrics: {
                    profitability: {
                        netProfitMargin: metrics.profitability.netProfitMargin,
                        returnOnEquity: metrics.profitability.roe,
                        revenueGrowth: metrics.profitability.revenueGrowth,
                        grossMargin: metrics.profitability.grossMargin,
                        operatingMargin: metrics.profitability.operatingMargin,
                        rdToRevenue: metrics.profitability.rdToRevenue
                    },
                    balanceSheet: {
                        currentRatio: metrics.balanceSheet.currentRatio,
                        debtToEquity: metrics.balanceSheet.debtToEquity,
                        assetTurnover: metrics.balanceSheet.assetTurnover
                    },
                    cashFlow: {
                        freeCashFlow: metrics.cashFlow.freeCashFlow,
                        fcfGrowth: metrics.cashFlow.fcfGrowth
                    },
                    perShare: {
                        basicEPS: metrics.perShare.basicEPS,
                        dilutedEPS: metrics.perShare.dilutedEPS
                    }
                }
            };
        } catch (error) {
            console.error(`Error analyzing ${ticker}:`, error);
            throw error;
        }
    }

    /**
     * Calculates all financial metrics for the stock
     * @param {Array} financialData - Array of financial statements
     * @returns {Object} Calculated metrics
     */
    private calculateMetrics(financialData) {
        const latestPeriod = financialData[0]; // Most recent financial period
        return {
            profitability: {
                netProfitMargin: MetricCalculator.calculateNetProfitMargin(latestPeriod.financials),
                roe: MetricCalculator.calculateROE(latestPeriod.financials),
                revenueGrowth: this.calculateGrowthRate(financialData, 'revenues'),
                grossMargin: MetricCalculator.calculateGrossMargin(latestPeriod.financials),
                operatingMargin: MetricCalculator.calculateOperatingMargin(latestPeriod.financials),
                rdToRevenue: MetricCalculator.calculateRDToRevenue(latestPeriod.financials)
            },
            balanceSheet: {
                currentRatio: MetricCalculator.calculateCurrentRatio(latestPeriod.financials),
                debtToEquity: MetricCalculator.calculateDebtToEquity(latestPeriod.financials),
                assetTurnover: MetricCalculator.calculateAssetTurnover(latestPeriod.financials)
            },
            cashFlow: {
                freeCashFlow: MetricCalculator.calculateFreeCashFlow(latestPeriod.financials),
                fcfGrowth: this.calculateGrowthRate(financialData, 'free_cash_flow')
            },
            perShare: {
                basicEPS: MetricCalculator.calculateEPS(latestPeriod.financials),
                dilutedEPS: MetricCalculator.calculateDilutedEPS(latestPeriod.financials)
            }
        };
    }

    // Add any private helper methods needed for calculations
    private calculateGrowthRate(financialData, metric) {
        // Implementation of growth rate calculation
    }

    private async fetchPricingData(ticker: string) {
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

    private async fetchFinancialData(ticker: string) {
        return getCompanyFinancialsTicker(ticker);
    }
}

// Example of expected output format:
const expectedOutput = {
    "stock": {
        "ticker": "AAPL",
        "analysisDate": "2025-01-12T00:00:00.000Z"
    },
    "metrics": {
        "profitability": {
            "netProfitMargin": 15.2,
            "returnOnEquity": 85.5,
            "revenueGrowth": 12.3,
            "grossMargin": 20.0,
            "operatingMargin": 10.0,
            "rdToRevenue": 5.0
        },
        "balanceSheet": {
            "currentRatio": 2.1,
            "debtToEquity": 1.5,
            "assetTurnover": 0.5
        },
        "cashFlow": {
            "freeCashFlow": 750000000,
            "fcfGrowth": 8.5
        },
        "perShare": {
            "basicEPS": 2.0,
            "dilutedEPS": 1.9
        }
    }
};

// Example usage
console.log('Starting analysis...');
const analyzer = new StockAnalyzer();
analyzer.analyzeStock('AAPL').then(analysis => {
    console.log('Stock Analysis Results:', JSON.stringify(analysis, null, 2));
}).catch(error => {
    console.error('Analysis failed:', error);
});