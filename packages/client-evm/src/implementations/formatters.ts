import { BlockchainEvent } from '../types';
import { EventFormatter } from '../messages';

/**
 * Formatter for Uniswap V3 USDC/DAI swap events.
 * Handles decimal formatting for both tokens:
 * - USDC: 6 decimals
 * - DAI: 18 decimals
 * Converts raw blockchain numbers into human-readable token amounts.
 */
export const usdcDaiSwapFormatter: EventFormatter = {
    formatEvent: (decoded: BlockchainEvent['decoded']) => {
        const formatTokenAmount = (amount: string, decimals: number) => {
            const value = BigInt(amount);
            return Number(value) / Math.pow(10, decimals);
        };

        const amount0 = formatTokenAmount(decoded.params.amount0, 6); // USDC decimals
        const amount1 = formatTokenAmount(decoded.params.amount1, 18); // DAI decimals

        return amount0 > 0
            ? `${amount0} USDC swapped for ${Math.abs(amount1)} DAI`
            : `${Math.abs(amount1)} DAI swapped for ${Math.abs(amount0)} USDC`;
    }
};