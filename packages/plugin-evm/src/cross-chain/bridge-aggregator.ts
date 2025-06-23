import { IAgentRuntime, logger } from '@elizaos/core';
import type { Address, Hex, Hash } from 'viem';
import { formatUnits, parseUnits } from 'viem';
import { ChainConfigService } from '../core/chains/config';
import { TokenService } from '../tokens/token-service';
import { MEVProtectionService } from '../core/security/mev-protection';

export interface BridgeProtocol {
    name: string;
    id: string;
    supportedChains: number[];
    supportedTokens?: Record<number, Address[]>; // chainId => token addresses
    estimateTime: (fromChain: number, toChain: number) => number; // in seconds
    minAmount?: bigint;
    maxAmount?: bigint;
}

export interface BridgeRoute {
    protocol: BridgeProtocol;
    fromChain: number;
    toChain: number;
    fromToken: Address;
    toToken: Address;
    estimatedTime: number;
    estimatedGas: bigint;
    bridgeFee: bigint;
    exchangeRate: number;
    slippage: number;
}

export interface BridgeQuote {
    route: BridgeRoute;
    fromAmount: bigint;
    toAmount: bigint;
    toAmountMin: bigint; // After slippage
    totalFee: bigint; // Bridge fee + gas
    priceImpact: number;
    validUntil: number; // Timestamp
}

export interface BridgeParams {
    fromChain: number;
    toChain: number;
    fromToken: Address;
    toToken: Address;
    amount: bigint;
    recipient?: Address;
    slippageTolerance?: number; // in basis points (100 = 1%)
    maxFee?: bigint;
    preferredProtocols?: string[];
}

export interface BridgeStatus {
    transactionHash: Hash;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    fromChain: number;
    toChain: number;
    bridgeProtocol: string;
    estimatedArrival?: number;
    actualArrival?: number;
    fromAmount: bigint;
    toAmount?: bigint;
    errorMessage?: string;
}

// Common bridge protocols
const BRIDGE_PROTOCOLS: BridgeProtocol[] = [
    {
        name: 'Stargate',
        id: 'stargate',
        supportedChains: [1, 10, 137, 42161, 43114, 56],
        estimateTime: (from, to) => {
            // Layer 1 to Layer 1: ~15 minutes
            // Layer 1 to Layer 2: ~10 minutes
            // Layer 2 to Layer 2: ~2 minutes
            const isL1 = (chain: number) => [1, 56, 43114].includes(chain);
            if (isL1(from) && isL1(to)) return 900;
            if (isL1(from) || isL1(to)) return 600;
            return 120;
        }
    },
    {
        name: 'Hop Protocol',
        id: 'hop',
        supportedChains: [1, 10, 137, 42161, 100],
        estimateTime: () => 300 // ~5 minutes average
    },
    {
        name: 'Synapse',
        id: 'synapse',
        supportedChains: [1, 10, 137, 42161, 43114, 56, 250],
        estimateTime: () => 600 // ~10 minutes average
    },
    {
        name: 'Across',
        id: 'across',
        supportedChains: [1, 10, 137, 42161],
        estimateTime: () => 120 // ~2 minutes (optimistic)
    },
    {
        name: 'LayerZero',
        id: 'layerzero',
        supportedChains: [1, 10, 137, 42161, 43114, 56, 250, 324],
        estimateTime: () => 180 // ~3 minutes
    }
];

export class BridgeAggregatorService {
    private chainService: ChainConfigService;
    private tokenService: TokenService;
    private mevProtection: MEVProtectionService;
    private pendingBridges: Map<Hash, BridgeStatus> = new Map();
    private quoteCache: Map<string, { quote: BridgeQuote; timestamp: number }> = new Map();
    private readonly QUOTE_TTL = 60 * 1000; // 1 minute

    constructor(
        private runtime: IAgentRuntime
    ) {
        this.chainService = new ChainConfigService(runtime);
        this.tokenService = new TokenService(runtime);
        this.mevProtection = new MEVProtectionService(runtime);
    }

    /**
     * Get best bridge quote across all protocols
     */
    async getBestQuote(params: BridgeParams): Promise<BridgeQuote | null> {
        const cacheKey = this.getQuoteCacheKey(params);
        
        // Check cache
        const cached = this.quoteCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.QUOTE_TTL) {
            return cached.quote;
        }

        try {
            // Get quotes from all applicable protocols
            const quotes = await this.getAllQuotes(params);
            
            if (quotes.length === 0) {
                logger.warn('No bridge quotes available for route');
                return null;
            }

            // Sort by best output amount (after fees)
            const sortedQuotes = quotes.sort((a, b) => {
                // Compare net amounts after all fees
                const netA = a.toAmountMin - a.totalFee;
                const netB = b.toAmountMin - b.totalFee;
                return Number(netB - netA);
            });

            // Apply user preferences if any
            let bestQuote = sortedQuotes[0];
            if (params.preferredProtocols && params.preferredProtocols.length > 0) {
                const preferred = sortedQuotes.find(q => 
                    params.preferredProtocols!.includes(q.route.protocol.id)
                );
                if (preferred) {
                    // Use preferred if output is within 1% of best
                    const threshold = bestQuote.toAmountMin * 99n / 100n;
                    if (preferred.toAmountMin >= threshold) {
                        bestQuote = preferred;
                    }
                }
            }

            // Check max fee constraint
            if (params.maxFee && bestQuote.totalFee > params.maxFee) {
                logger.warn('Best quote exceeds max fee constraint');
                // Find best quote within fee limit
                const withinLimit = sortedQuotes.find(q => q.totalFee <= params.maxFee!);
                if (!withinLimit) {
                    return null;
                }
                bestQuote = withinLimit;
            }

            // Cache the quote
            this.quoteCache.set(cacheKey, {
                quote: bestQuote,
                timestamp: Date.now()
            });

            return bestQuote;
        } catch (error) {
            logger.error('Error getting bridge quotes:', error);
            return null;
        }
    }

    /**
     * Execute bridge transaction
     */
    async executeBridge(
        quote: BridgeQuote,
        recipient?: Address
    ): Promise<Hash> {
        try {
            // Validate quote is still valid
            if (Date.now() > quote.validUntil) {
                throw new Error('Bridge quote has expired');
            }

            // Get fresh balance check
            const balance = await this.tokenService.getTokenBalance(
                quote.route.fromToken,
                this.getWalletAddress(),
                quote.route.fromChain
            );

            if (balance.balance < quote.fromAmount) {
                throw new Error('Insufficient balance for bridge');
            }

            // Build bridge transaction based on protocol
            const bridgeTx = await this.buildBridgeTransaction(quote, recipient);

            // Analyze MEV risk for bridge transaction
            const mevAnalysis = await this.mevProtection.analyzeMEVRisk(bridgeTx);
            
            // Send with appropriate protection
            const protectionLevel = mevAnalysis.isSandwichable ? 'maximum' : 'basic';
            const txHash = await this.mevProtection.sendProtectedTransaction(
                bridgeTx,
                protectionLevel
            );

            // Track bridge status
            const status: BridgeStatus = {
                transactionHash: txHash,
                status: 'pending',
                fromChain: quote.route.fromChain,
                toChain: quote.route.toChain,
                bridgeProtocol: quote.route.protocol.id,
                estimatedArrival: Date.now() + (quote.route.estimatedTime * 1000),
                fromAmount: quote.fromAmount
            };

            this.pendingBridges.set(txHash, status);

            // Start monitoring
            this.monitorBridgeStatus(txHash);

            logger.info(`Bridge initiated: ${txHash}`);
            return txHash;
        } catch (error) {
            logger.error('Error executing bridge:', error);
            throw new Error(`Bridge execution failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get bridge status
     */
    async getBridgeStatus(txHash: Hash): Promise<BridgeStatus | null> {
        // Check local cache first
        const cached = this.pendingBridges.get(txHash);
        if (cached) {
            return cached;
        }

        // Query from chain or bridge protocol
        return await this.queryBridgeStatus(txHash);
    }

    /**
     * Find all available routes
     */
    async findRoutes(
        fromChain: number,
        toChain: number,
        token?: Address
    ): Promise<BridgeRoute[]> {
        const routes: BridgeRoute[] = [];

        for (const protocol of BRIDGE_PROTOCOLS) {
            // Check if protocol supports both chains
            if (!protocol.supportedChains.includes(fromChain) ||
                !protocol.supportedChains.includes(toChain)) {
                continue;
            }

            // Check if protocol supports the token (if specified)
            if (token && protocol.supportedTokens) {
                const supportedOnFrom = protocol.supportedTokens[fromChain]?.includes(token);
                const supportedOnTo = protocol.supportedTokens[toChain]?.includes(token);
                if (!supportedOnFrom || !supportedOnTo) {
                    continue;
                }
            }

            // Create route
            const route: BridgeRoute = {
                protocol,
                fromChain,
                toChain,
                fromToken: token || '0x0000000000000000000000000000000000000000', // Native token
                toToken: token || '0x0000000000000000000000000000000000000000',
                estimatedTime: protocol.estimateTime(fromChain, toChain),
                estimatedGas: await this.estimateGas(protocol, fromChain),
                bridgeFee: await this.getBridgeFee(protocol, fromChain, toChain),
                exchangeRate: 1, // Simplified - same token
                slippage: 0.5 // 0.5% default
            };

            routes.push(route);
        }

        return routes;
    }

    /**
     * Private helper methods
     */
    private async getAllQuotes(params: BridgeParams): Promise<BridgeQuote[]> {
        const routes = await this.findRoutes(
            params.fromChain,
            params.toChain,
            params.fromToken
        );

        const quotes: BridgeQuote[] = [];

        for (const route of routes) {
            try {
                const quote = await this.getProtocolQuote(route, params);
                if (quote) {
                    quotes.push(quote);
                }
            } catch (error) {
                logger.warn(`Failed to get quote from ${route.protocol.name}:`, error);
            }
        }

        return quotes;
    }

    private async getProtocolQuote(
        route: BridgeRoute,
        params: BridgeParams
    ): Promise<BridgeQuote | null> {
        // This would integrate with specific bridge protocol APIs
        // For now, return a simulated quote
        
        const bridgeFee = route.bridgeFee;
        const slippage = params.slippageTolerance || 50; // 0.5% default
        const toAmount = params.amount - bridgeFee; // Simplified
        const toAmountMin = toAmount * BigInt(10000 - slippage) / 10000n;

        return {
            route,
            fromAmount: params.amount,
            toAmount,
            toAmountMin,
            totalFee: bridgeFee + route.estimatedGas,
            priceImpact: 0.1, // 0.1% simulated
            validUntil: Date.now() + 60000 // 1 minute
        };
    }

    private async buildBridgeTransaction(
        quote: BridgeQuote,
        recipient?: Address
    ): Promise<any> {
        // Protocol-specific transaction building
        // This is a simplified placeholder
        return {
            to: '0x0000000000000000000000000000000000000000', // Bridge contract
            data: '0x', // Encoded bridge call
            value: quote.fromAmount,
            chainId: quote.route.fromChain
        };
    }

    private async monitorBridgeStatus(txHash: Hash): Promise<void> {
        const checkStatus = async () => {
            try {
                const status = await this.queryBridgeStatus(txHash);
                if (status) {
                    this.pendingBridges.set(txHash, status);
                    
                    if (status.status === 'completed' || status.status === 'failed') {
                        // Stop monitoring
                        return;
                    }
                }
                
                // Continue monitoring
                setTimeout(checkStatus, 30000); // Check every 30 seconds
            } catch (error) {
                logger.error(`Error monitoring bridge ${txHash}:`, error);
            }
        };

        // Start monitoring
        checkStatus();
    }

    private async queryBridgeStatus(txHash: Hash): Promise<BridgeStatus | null> {
        // This would query the specific bridge protocol's API
        // For now, return cached status
        return this.pendingBridges.get(txHash) || null;
    }

    private async estimateGas(
        protocol: BridgeProtocol,
        chainId: number
    ): Promise<bigint> {
        // Protocol and chain specific gas estimation
        // Simplified estimation
        const baseGas = 200000n;
        const multiplier = protocol.id === 'layerzero' ? 150n : 100n;
        return baseGas * multiplier / 100n;
    }

    private async getBridgeFee(
        protocol: BridgeProtocol,
        fromChain: number,
        toChain: number
    ): Promise<bigint> {
        // Protocol specific fee calculation
        // Simplified: 0.1% of amount
        return parseUnits('0.001', 18); // Example fee
    }

    private getWalletAddress(): Address {
        // Get from wallet service
        return '0x0000000000000000000000000000000000000000';
    }

    private getQuoteCacheKey(params: BridgeParams): string {
        return `${params.fromChain}-${params.toChain}-${params.fromToken}-${params.toToken}-${params.amount}`;
    }

    /**
     * Clear caches
     */
    clearCaches(): void {
        this.quoteCache.clear();
        this.pendingBridges.clear();
        logger.debug('Bridge aggregator caches cleared');
    }

    /**
     * Estimate bridge time for UI display
     */
    estimateBridgeTime(fromChain: number, toChain: number): {
        fastest: number;
        average: number;
        slowest: number;
    } {
        const times = BRIDGE_PROTOCOLS
            .filter(p => 
                p.supportedChains.includes(fromChain) && 
                p.supportedChains.includes(toChain)
            )
            .map(p => p.estimateTime(fromChain, toChain));

        if (times.length === 0) {
            return { fastest: 0, average: 0, slowest: 0 };
        }

        return {
            fastest: Math.min(...times),
            average: times.reduce((a, b) => a + b, 0) / times.length,
            slowest: Math.max(...times)
        };
    }
}

// Export factory function
export function createBridgeAggregatorService(runtime: IAgentRuntime): BridgeAggregatorService {
    return new BridgeAggregatorService(runtime);
}

