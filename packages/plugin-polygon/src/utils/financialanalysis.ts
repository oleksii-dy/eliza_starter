import { getPriceHistoryByTicker, getCompanyFinancialsTicker } from './polygon.ts';
import { elizaLogger } from '@elizaos/core';
import dotenv from 'dotenv';
dotenv.config();

// Utility functions for calculating financial metrics from SEC report data
const MetricCalculator = {
    // Calculates net profit margin as a percentage
    // Formula: (Net Income / Revenue) * 100
    calculateNetProfitMargin(financials) {
        try {
            const netIncome = financials?.income_statement?.net_income_loss?.value ?? 0;
            const revenue = financials?.income_statement?.revenues?.value;
            if (!revenue) return null;
            return (netIncome / revenue) * 100;
        } catch (error) {
            return null;
        }
    },

    calculateROE(financials) {
        try {
            const netIncome = financials?.income_statement?.net_income_loss?.value ?? 0;
            const equity = financials?.balance_sheet?.equity?.value;
            if (!equity) return null;
            return (netIncome / equity) * 100;
        } catch (error) {
            return null;
        }
    },

    calculateCurrentRatio(financials) {
        try {
            const currentAssets = financials?.balance_sheet?.current_assets?.value;
            const currentLiabilities = financials?.balance_sheet?.current_liabilities?.value;
            if (!currentAssets || !currentLiabilities) return null;
            return currentAssets / currentLiabilities;
        } catch (error) {
            return null;
        }
    },

    calculateDebtToEquity(financials) {
        try {
            const liabilities = financials?.balance_sheet?.liabilities?.value;
            const equity = financials?.balance_sheet?.equity?.value;
            if (!liabilities || !equity) return null;
            return liabilities / equity;
        } catch (error) {
            return null;
        }
    },

    calculateFreeCashFlow(financials) {
        try {
            const operatingCashFlow = financials?.cash_flow_statement?.net_cash_flow_from_operating_activities?.value ?? 0;
            const investingCashFlow = financials?.cash_flow_statement?.net_cash_flow_from_investing_activities?.value ?? 0;
            return operatingCashFlow - investingCashFlow;
        } catch (error) {
            return null;
        }
    },

    calculateRDToRevenue(financials) {
        try {
            const rdExpense = financials?.income_statement?.operating_expenses?.value ?? 0;
            const revenue = financials?.income_statement?.revenues?.value;
            if (!revenue) return null;
            return (rdExpense / revenue) * 100;
        } catch (error) {
            return null;
        }
    },

    calculateGrossMargin(financials) {
        try {
            const grossProfit = financials?.income_statement?.gross_profit?.value ?? 0;
            const revenue = financials?.income_statement?.revenues?.value;
            if (!revenue) return null;
            return (grossProfit / revenue) * 100;
        } catch (error) {
            return null;
        }
    },

    calculateOperatingMargin(financials) {
        try {
            const operatingIncome = financials?.income_statement?.operating_income_loss?.value ?? 0;
            const revenue = financials?.income_statement?.revenues?.value;
            if (!revenue) return null;
            return (operatingIncome / revenue) * 100;
        } catch (error) {
            return null;
        }
    },

    calculateEPS(financials) {
        try {
            return financials?.income_statement?.basic_earnings_per_share?.value ?? null;
        } catch (error) {
            return null;
        }
    },

    calculateDilutedEPS(financials) {
        try {
            return financials?.income_statement?.diluted_earnings_per_share?.value ?? null;
        } catch (error) {
            return null;
        }
    },

    calculateAssetTurnover(financials) {
        try {
            const revenue = financials?.income_statement?.revenues?.value;
            const totalAssets = financials?.balance_sheet?.assets?.value;
            if (!revenue || !totalAssets) return null;
            return revenue / totalAssets;
        } catch (error) {
            return null;
        }
    },

    calculateTrailingPE(financials, latestPrice) {
        try {
            const dilutedEPS = financials?.income_statement?.diluted_earnings_per_share?.value;
            if (!dilutedEPS || !latestPrice) return null;
            return latestPrice / dilutedEPS;
        } catch (error) {
            return null;
        }
    },

    calculateMarketCap(latestPrice: number, financials: any): number | null {
        try {
            const netIncome = financials?.income_statement?.net_income_loss?.value;
            const basicEPS = financials?.income_statement?.basic_earnings_per_share?.value;
            if (!netIncome || !basicEPS || !latestPrice) return null;

            const sharesOutstanding = netIncome / basicEPS;
            return latestPrice * sharesOutstanding;
        } catch (error) {
            return null;
        }
    },

    calculatePriceToBook(financials: any, marketCap: number): number | null {
        try {
            const bookValue = financials?.balance_sheet?.equity?.value;
            if (!bookValue || !marketCap) return null;
            return marketCap / bookValue;
        } catch (error) {
            return null;
        }
    },

    calculatePriceToEBIT(financials: any, marketCap: number): number | null {
        try {
            const EBIT = financials?.income_statement?.income_loss_from_continuing_operations_before_tax?.value;
            if (!EBIT || !marketCap) return null;
            return marketCap / EBIT;
        } catch (error) {
            return null;
        }
    },

    calculatePriceToSales(financials: any, marketCap: number): number | null {
        try {
            const revenue = financials?.income_statement?.revenues?.value;
            if (!revenue || !marketCap) return null;
            return marketCap / revenue;
        } catch (error) {
            return null;
        }
    },

    calculateGrowthRate(currentValue: number, previousValue: number): number | null {
        try {
            if (!currentValue || !previousValue) return null;
            return ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
        } catch (error) {
            return null;
        }
    },

    calculateAverageGrowth(values: number[]): number | null {
        try {
            if (!values?.length) return null;
            const growthRates = [];
            for (let i = 1; i < values.length; i++) {
                const growth = this.calculateGrowthRate(values[i], values[i-1]);
                if (growth !== null) growthRates.push(growth);
            }
            if (!growthRates.length) return null;
            return growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
        } catch (error) {
            return null;
        }
    },

    calculateGrowthMetrics(financialData: any[]): any {
        try {
            if (!financialData?.length) return null;

            const metrics = {
                sales: financialData.map(d => d?.financials?.income_statement?.revenues?.value).filter(Boolean),
                netIncome: financialData.map(d => d?.financials?.income_statement?.net_income_loss?.value).filter(Boolean),
                profitMargin: financialData.map(d => {
                    const netIncome = d?.financials?.income_statement?.net_income_loss?.value;
                    const revenue = d?.financials?.income_statement?.revenues?.value;
                    return revenue ? (netIncome / revenue) * 100 : null;
                }).filter(Boolean),
                rdExpenses: financialData.map(d => d?.financials?.income_statement?.operating_expenses?.value).filter(Boolean),
                eps: financialData.map(d => d?.financials?.income_statement?.basic_earnings_per_share?.value).filter(Boolean)
            };

            return {
                salesGrowth: metrics.sales.length ? this.calculateAverageGrowth(metrics.sales) : null,
                netIncomeGrowth: metrics.netIncome.length ? this.calculateAverageGrowth(metrics.netIncome) : null,
                profitMarginGrowth: metrics.profitMargin.length ? this.calculateAverageGrowth(metrics.profitMargin) : null,
                rdExpenseGrowth: metrics.rdExpenses.length ? this.calculateAverageGrowth(metrics.rdExpenses) : null,
                epsGrowth: metrics.eps.length ? this.calculateAverageGrowth(metrics.eps) : null
            };
        } catch (error) {
            return null;
        }
    }
};

/**
 * Main class for analyzing stock fundamentals
 * Processes SEC financial data to calculate key metrics
 */
export class StockAnalyzer {
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
        elizaLogger.log("Setting date range for price history - current date:", now.toISOString());
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(now.getFullYear() - 2);
        elizaLogger.log("Two years ago date:", twoYearsAgo.toISOString());

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
