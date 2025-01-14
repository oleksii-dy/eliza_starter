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
    },

    // Valuation Metrics
    calculateTrailingPE(financials, latestPrice) {
        const dilutedEPS = financials.income_statement.diluted_earnings_per_share.value;
        return latestPrice / dilutedEPS;
    },

    calculateMarketCap(latestPrice: number, financials: any): number {
        const sharesOutstanding = financials.income_statement.net_income_loss.value /
            financials.income_statement.basic_earnings_per_share.value;

        console.log('Net Income:', financials.income_statement.net_income_loss.value);
        console.log('EPS:', financials.income_statement.basic_earnings_per_share.value);
        console.log('Shares Outstanding:', sharesOutstanding);
        console.log('Latest Price:', latestPrice);

        const marketCap = latestPrice * sharesOutstanding;
        console.log('Calculated Market Cap:', marketCap);
        return marketCap;
    },

    calculatePriceToBook(financials: any, marketCap: number): number {
        const bookValue = financials.balance_sheet.equity.value;
        console.log('Book Value:', bookValue);
        return marketCap / bookValue;
    },

    calculatePriceToEBIT(financials: any, marketCap: number): number {
        const EBIT = financials.income_statement.income_loss_from_continuing_operations_before_tax.value;
        console.log('EBIT:', EBIT);
        return marketCap / EBIT;
    },

    calculatePriceToSales(financials: any, marketCap: number): number {
        const revenue = financials.income_statement.revenues.value;
        console.log('Revenue:', revenue);
        return marketCap / revenue;
    },

    // Growth Metrics
    calculateGrowthRate(currentValue: number, previousValue: number): number {
        return ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
    },

    calculateAverageGrowth(values: number[]): number {
        const growthRates = [];
        for (let i = 1; i < values.length; i++) {
            growthRates.push(this.calculateGrowthRate(values[i], values[i-1]));
        }
        return growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
    },

    calculateGrowthMetrics(financialData: any[]): any {
        const metrics = {
            sales: financialData.map(d => d.financials.income_statement.revenues.value),
            netIncome: financialData.map(d => d.financials.income_statement.net_income_loss.value),
            profitMargin: financialData.map(d =>
                (d.financials.income_statement.net_income_loss.value /
                d.financials.income_statement.revenues.value) * 100
            ),
            rdExpenses: financialData.map(d => d.financials.income_statement.operating_expenses.value),
            eps: financialData.map(d => d.financials.income_statement.basic_earnings_per_share.value)
        };

        return {
            salesGrowth: this.calculateAverageGrowth(metrics.sales),
            netIncomeGrowth: this.calculateAverageGrowth(metrics.netIncome),
            profitMarginGrowth: this.calculateAverageGrowth(metrics.profitMargin),
            rdExpenseGrowth: this.calculateAverageGrowth(metrics.rdExpenses),
            epsGrowth: this.calculateAverageGrowth(metrics.eps)
        };
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
            const metrics = this.calculateMetrics(financialData, pricingData);

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
                        rdToRevenue: metrics.profitability.rdToRevenue,
                        freeCashFlow: metrics.profitability.freeCashFlow
                    },
                    balanceSheet: {
                        currentRatio: metrics.balanceSheet.currentRatio,
                        debtToEquity: metrics.balanceSheet.debtToEquity,
                        assetTurnover: metrics.balanceSheet.assetTurnover
                    },
                    growth: {
                        salesGrowth: metrics.growth.salesGrowth,
                        netIncomeGrowth: metrics.growth.netIncomeGrowth,
                        profitMarginGrowth: metrics.growth.profitMarginGrowth,
                        rdExpenseGrowth: metrics.growth.rdExpenseGrowth,
                        epsGrowth: metrics.growth.epsGrowth,
                        fcfGrowth: metrics.growth.fcfGrowth
                    },
                    valuation: {
                        trailingPE: metrics.valuation.trailingPE,
                        priceToBook: metrics.valuation.priceToBook,
                        priceToEBIT: metrics.valuation.priceToEBIT,
                        priceToSales: metrics.valuation.priceToSales
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
    private calculateMetrics(financialData, pricingData) {
        const latestPeriod = financialData[0];
        const latestPrice = pricingData[pricingData.length - 1]?.c || 0;
        const marketCap = MetricCalculator.calculateMarketCap(latestPrice, latestPeriod.financials);

        // Log the number of reports being analyzed
        console.log("Number of financial reports analyzed:", financialData.length);
        console.log("Years covered:", financialData.map(d => d.fiscal_year));

        const growthMetrics = MetricCalculator.calculateGrowthMetrics(financialData);

        return {
            profitability: {
                netProfitMargin: MetricCalculator.calculateNetProfitMargin(latestPeriod.financials),
                roe: MetricCalculator.calculateROE(latestPeriod.financials),
                revenueGrowth: this.calculateGrowthRate(financialData, 'revenues'),
                grossMargin: MetricCalculator.calculateGrossMargin(latestPeriod.financials),
                operatingMargin: MetricCalculator.calculateOperatingMargin(latestPeriod.financials),
                rdToRevenue: MetricCalculator.calculateRDToRevenue(latestPeriod.financials),
                freeCashFlow: MetricCalculator.calculateFreeCashFlow(latestPeriod.financials)
            },
            balanceSheet: {
                currentRatio: MetricCalculator.calculateCurrentRatio(latestPeriod.financials),
                debtToEquity: MetricCalculator.calculateDebtToEquity(latestPeriod.financials),
                assetTurnover: MetricCalculator.calculateAssetTurnover(latestPeriod.financials)
            },
            growth: growthMetrics,
            valuation: {
                trailingPE: MetricCalculator.calculateTrailingPE(latestPeriod.financials, latestPrice),
                priceToBook: MetricCalculator.calculatePriceToBook(latestPeriod.financials, marketCap),
                priceToEBIT: MetricCalculator.calculatePriceToEBIT(latestPeriod.financials, marketCap),
                priceToSales: MetricCalculator.calculatePriceToSales(latestPeriod.financials, marketCap)
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
