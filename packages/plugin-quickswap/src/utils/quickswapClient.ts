import { IAgentRuntime, logger } from '@elizaos/core';

export interface QuickswapResult {
    success: boolean;
    error?: string;
}

export interface AddLiquidityResult extends QuickswapResult {
    lpTokensReceived?: string;
    transactionHash?: string;
}

export interface CalculateLiquidityValueResult extends QuickswapResult {
    token0Value?: string;
    token1Value?: string;
}

export interface CalculateMidPriceResult extends QuickswapResult {
    midPrice?: string;
    invertedPrice?: string;
}

export interface CalculatePriceImpactResult extends QuickswapResult {
    priceImpactPercentage?: string;
    newPrice?: string;
}

export interface QuickswapClient {
    AddLiquidity(
        token0SymbolOrAddress: string,
        token1SymbolOrAddress: string,
        amount0: number,
        amount1: number
    ): Promise<AddLiquidityResult>;

    CalculateLiquidityValue(
        token0SymbolOrAddress: string,
        token1SymbolOrAddress: string,
        lpTokensAmount: number
    ): Promise<CalculateLiquidityValueResult>;

    CalculateMidPrice(
        token0SymbolOrAddress: string,
        token1SymbolOrAddress: string
    ): Promise<CalculateMidPriceResult>;

    calculatePriceImpact(
        inputTokenSymbolOrAddress: string,
        outputTokenSymbolOrAddress: string,
        inputAmount: number
    ): Promise<CalculatePriceImpactResult>;
}

class QuickswapClientImpl implements QuickswapClient {
    private apiUrl: string;

    constructor(apiUrl: string) {
        this.apiUrl = apiUrl;
    }

    async AddLiquidity(
        token0SymbolOrAddress: string,
        token1SymbolOrAddress: string,
        amount0: number,
        amount1: number
    ): Promise<AddLiquidityResult> {
        try {
            logger.info(`Adding liquidity: ${amount0} ${token0SymbolOrAddress} + ${amount1} ${token1SymbolOrAddress}`);

            const response = await fetch(`${this.apiUrl}/add-liquidity`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token0: token0SymbolOrAddress,
                    token1: token1SymbolOrAddress,
                    amount0,
                    amount1,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || 'Failed to add liquidity',
                };
            }

            return {
                success: true,
                lpTokensReceived: data.lpTokensReceived,
                transactionHash: data.transactionHash,
            };
        } catch (error) {
            logger.error('Error adding liquidity:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    async CalculateLiquidityValue(
        token0SymbolOrAddress: string,
        token1SymbolOrAddress: string,
        lpTokensAmount: number
    ): Promise<CalculateLiquidityValueResult> {
        try {
            logger.info(`Calculating liquidity value: ${lpTokensAmount} LP tokens for ${token0SymbolOrAddress}/${token1SymbolOrAddress}`);

            const response = await fetch(`${this.apiUrl}/calculate-liquidity-value`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token0: token0SymbolOrAddress,
                    token1: token1SymbolOrAddress,
                    lpTokensAmount,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || 'Failed to calculate liquidity value',
                };
            }

            return {
                success: true,
                token0Value: data.token0Value,
                token1Value: data.token1Value,
            };
        } catch (error) {
            logger.error('Error calculating liquidity value:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    async CalculateMidPrice(
        token0SymbolOrAddress: string,
        token1SymbolOrAddress: string
    ): Promise<CalculateMidPriceResult> {
        try {
            logger.info(`Calculating mid price for ${token0SymbolOrAddress}/${token1SymbolOrAddress}`);

            const response = await fetch(`${this.apiUrl}/calculate-mid-price`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token0: token0SymbolOrAddress,
                    token1: token1SymbolOrAddress,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || 'Failed to calculate mid price',
                };
            }

            return {
                success: true,
                midPrice: data.midPrice,
                invertedPrice: data.invertedPrice,
            };
        } catch (error) {
            logger.error('Error calculating mid price:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    async calculatePriceImpact(
        inputTokenSymbolOrAddress: string,
        outputTokenSymbolOrAddress: string,
        inputAmount: number
    ): Promise<CalculatePriceImpactResult> {
        try {
            logger.info(`Calculating price impact: ${inputAmount} ${inputTokenSymbolOrAddress} -> ${outputTokenSymbolOrAddress}`);

            const response = await fetch(`${this.apiUrl}/calculate-price-impact`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputToken: inputTokenSymbolOrAddress,
                    outputToken: outputTokenSymbolOrAddress,
                    inputAmount,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || 'Failed to calculate price impact',
                };
            }

            return {
                success: true,
                priceImpactPercentage: data.priceImpactPercentage,
                newPrice: data.newPrice,
            };
        } catch (error) {
            logger.error('Error calculating price impact:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
}

export async function initializeQuickswapClient(runtime: IAgentRuntime): Promise<QuickswapClient> {
    const apiUrl = runtime.getSetting('QUICKSWAP_API_URL');

    if (!apiUrl) {
        throw new Error('QUICKSWAP_API_URL setting is required');
    }

    return new QuickswapClientImpl(apiUrl);
}