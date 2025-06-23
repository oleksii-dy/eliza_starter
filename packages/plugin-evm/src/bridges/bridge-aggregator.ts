import {
    createPublicClient,
    createWalletClient,
    http,
    type Address,
    type Hex,
    type PublicClient,
    type WalletClient,
    parseUnits,
    formatUnits,
    encodeAbiParameters,
    parseAbiParameters
} from 'viem';
import { mainnet, polygon, arbitrum, optimism, base, avalanche, bsc } from 'viem/chains';
import { elizaLogger as logger } from '@elizaos/core';
import axios from 'axios';

// Bridge Protocol Addresses
const BRIDGE_CONTRACTS = {
    stargate: {
        routers: {
            1: '0x8731d54E9D02c286767d56ac03e8037C07e01e98', // Ethereum
            137: '0x45A01E4e04F14f7A4a6702c74187c5F6222033cd', // Polygon
            42161: '0x53Bf833A5d6c4ddA888F69c22C88C9f356a41614', // Arbitrum
            10: '0xB0D502E938ed5f4df2E681fE6E419ff29631d62b', // Optimism
            56: '0x4a364f8c717cAAD9A442737Eb7b8A55cc6cf18D8', // BSC
            43114: '0x45A01E4e04F14f7A4a6702c74187c5F6222033cd' // Avalanche
        },
        poolIds: {
            'USDC': 1,
            'USDT': 2,
            'DAI': 3,
            'FRAX': 7,
            'USDD': 11,
            'ETH': 13,
            'sUSD': 14,
            'LUSD': 15,
            'MAI': 16,
            'METIS': 17,
            'metisUSDT': 19
        }
    },
    hop: {
        bridges: {
            'USDC': {
                1: '0x3666f603Cc164936C1b87e207F36BEBa4AC5f18a',
                137: '0x25D8039bB044dC227f741a9e381CA4cEAE2E6aE8',
                42161: '0x0e0E3d2C5c292161999474247956EF542caBF8dd',
                10: '0xa81D244A1814468C734E5b4101F7b9c0c577a8fC'
            },
            'USDT': {
                1: '0x3E4a3a4796d16c0Cd582C382691998f7c06420B6',
                137: '0x6c9a1ACF73bd85463A46B0AFc076FBdf602b690B',
                42161: '0x72209Fe68386b37A40d6bCA04f78356fd342491f',
                10: '0x46ae9BaB8CEA96610807a275EBD36f8e916b5C61'
            },
            'ETH': {
                1: '0xb8901acB165ed027E32754E0FFe830802919727f',
                137: '0xb98454270065A31D71Bf635F6F7Ee6A518dFb849',
                42161: '0x3749C4f034022c39ecafFaBA182555d4508caCCC',
                10: '0x83f6244Bd87662118d96D9a6D44f09dffF14b30E'
            }
        }
    },
    across: {
        spokePool: {
            1: '0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5',
            137: '0x9295ee1d8C5b022Be115A2AD3c30C72E34e7F096',
            42161: '0xe35e9842fceaCA96570B734083f4a58e8F7C5f2A',
            10: '0x6f26Bf09B1C792e3228e5467807a900A503c0281'
        }
    },
    synapse: {
        bridge: {
            1: '0x2796317b0fF8538F253012862c06787Adfb8cEb6',
            137: '0x8F5BBB2BB8c2Ee94639E55d5F41de9b4839C1280',
            42161: '0x6F4e8eBa4D337f874Ab57478AcC2Cb5BACdc19c9',
            10: '0xAf41a65F786339e7911F4acDAD6BD49426F2Dc6b',
            56: '0xd123f70AE324d34A9E76b67a27bf77593bA8749f',
            43114: '0xC05e61d0E7a63D27546389B7aD62FdFf5A91aACE'
        }
    },
    connext: {
        connext: {
            1: '0x8898B472C54c31894e3B9bb83cEA802a5d0e63C6',
            137: '0x11984dc4465481512eb5b777E44061C158CF2259',
            42161: '0xEE9deC2712cCE65174B561151701Bf54b99C24C8',
            10: '0x8f7492DE823025b4CfaAB1D34c58963F2af5DEDA'
        }
    }
} as const;

// Bridge Route Interface
export interface BridgeRoute {
    protocol: 'stargate' | 'hop' | 'across' | 'synapse' | 'connext';
    fromChain: number;
    toChain: number;
    fromToken: Address;
    toToken: Address;
    estimatedTime: number; // in seconds
    estimatedGas: bigint;
    estimatedFee: bigint;
    minAmount: bigint;
    maxAmount: bigint;
    slippage: number; // percentage
}

export interface BridgeQuote {
    route: BridgeRoute;
    amountOut: bigint;
    bridgeFee: bigint;
    gasFee: bigint;
    totalFee: bigint;
    estimatedTime: number;
    priceImpact: number;
}

export interface BridgeParams {
    fromChain: number;
    toChain: number;
    fromToken: Address;
    toToken: Address;
    amount: bigint;
    recipient?: Address;
    slippage?: number; // default 0.5%
    deadline?: number; // default 20 minutes
}

const CHAIN_IDS = {
    ethereum: 1,
    polygon: 137,
    arbitrum: 42161,
    optimism: 10,
    base: 8453,
    avalanche: 43114,
    bsc: 56
} as const;

const STARGATE_CHAIN_IDS: Record<number, number> = {
    1: 101,     // Ethereum
    137: 109,   // Polygon
    42161: 110, // Arbitrum
    10: 111,    // Optimism
    56: 102,    // BSC
    43114: 106, // Avalanche
    8453: 184   // Base
};

export class BridgeAggregator {
    private publicClients: Map<number, PublicClient> = new Map();
    private routeCache: Map<string, { routes: BridgeRoute[]; timestamp: number }> = new Map();
    private readonly CACHE_DURATION = 300000; // 5 minutes
    
    constructor() {
        // Initialize clients for all supported chains
        const chains = [mainnet, polygon, arbitrum, optimism, base, avalanche, bsc];
        this.initializeClients();
    }

    private initializeClients() {
        const chains = [mainnet, polygon, arbitrum, optimism, base, avalanche, bsc];
        for (const chain of chains) {
            this.publicClients.set(chain.id, createPublicClient({
                chain,
                transport: http()
            }) as any); // Type assertion to handle viem version mismatch
        }
    }

    async getAvailableRoutes(
        fromChain: number,
        toChain: number,
        token: Address
    ): Promise<BridgeRoute[]> {
        const cacheKey = `${fromChain}-${toChain}-${token}`;
        const cached = this.routeCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.routes;
        }

        const routes: BridgeRoute[] = [];

        // Check each bridge protocol
        const routePromises = [
            this.getStargateRoute(fromChain, toChain, token),
            this.getHopRoute(fromChain, toChain, token),
            this.getAcrossRoute(fromChain, toChain, token),
            this.getSynapseRoute(fromChain, toChain, token),
            this.getConnextRoute(fromChain, toChain, token)
        ];

        const results = await Promise.allSettled(routePromises);
        
        for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
                routes.push(result.value);
            }
        }

        // Sort by total cost (fees + gas)
        routes.sort((a, b) => {
            const costA = a.estimatedFee + a.estimatedGas;
            const costB = b.estimatedFee + b.estimatedGas;
            return Number(costA - costB);
        });

        this.routeCache.set(cacheKey, {
            routes,
            timestamp: Date.now()
        });

        return routes;
    }

    async getBestQuote(params: BridgeParams): Promise<BridgeQuote | null> {
        const routes = await this.getAvailableRoutes(
            params.fromChain,
            params.toChain,
            params.fromToken
        );

        if (routes.length === 0) {
            return null;
        }

        // Get quotes from each route
        const quotePromises = routes.map(route => 
            this.getQuoteForRoute(route, params)
        );

        const quotes = await Promise.all(quotePromises);
        const validQuotes = quotes.filter(q => q !== null) as BridgeQuote[];

        if (validQuotes.length === 0) {
            return null;
        }

        // Find best quote based on output amount minus fees
        return validQuotes.reduce((best, current) => {
            const bestNet = best.amountOut - best.totalFee;
            const currentNet = current.amountOut - current.totalFee;
            return currentNet > bestNet ? current : best;
        });
    }

    private async getQuoteForRoute(
        route: BridgeRoute,
        params: BridgeParams
    ): Promise<BridgeQuote | null> {
        try {
            switch (route.protocol) {
                case 'stargate':
                    return this.getStargateQuote(route, params);
                case 'hop':
                    return this.getHopQuote(route, params);
                case 'across':
                    return this.getAcrossQuote(route, params);
                case 'synapse':
                    return this.getSynapseQuote(route, params);
                case 'connext':
                    return this.getConnextQuote(route, params);
                default:
                    return null;
            }
        } catch (error) {
            logger.error(`Error getting quote from ${route.protocol}:`, error);
            return null;
        }
    }

    private async getStargateRoute(
        fromChain: number,
        toChain: number,
        token: Address
    ): Promise<BridgeRoute | null> {
        const fromRouter = BRIDGE_CONTRACTS.stargate.routers[fromChain as keyof typeof BRIDGE_CONTRACTS.stargate.routers];
        const toRouter = BRIDGE_CONTRACTS.stargate.routers[toChain as keyof typeof BRIDGE_CONTRACTS.stargate.routers];

        if (!fromRouter || !toRouter) {
            return null;
        }

        // Check if token is supported
        const tokenSymbol = await this.getTokenSymbol(token, fromChain);
        const poolId = BRIDGE_CONTRACTS.stargate.poolIds[tokenSymbol as keyof typeof BRIDGE_CONTRACTS.stargate.poolIds];

        if (!poolId) {
            return null;
        }

        return {
            protocol: 'stargate',
            fromChain,
            toChain,
            fromToken: token,
            toToken: token, // Stargate typically bridges same token
            estimatedTime: 60, // 1 minute for most routes
            estimatedGas: parseUnits('0.01', 18), // Estimated
            estimatedFee: parseUnits('0.001', 18), // 0.1% typical fee
            minAmount: parseUnits('10', 6), // $10 minimum
            maxAmount: parseUnits('1000000', 6), // $1M maximum
            slippage: 0.5
        };
    }

    private async getStargateQuote(
        route: BridgeRoute,
        params: BridgeParams
    ): Promise<BridgeQuote | null> {
        try {
            const router = BRIDGE_CONTRACTS.stargate.routers[params.fromChain as keyof typeof BRIDGE_CONTRACTS.stargate.routers];
            if (!router) return null;

            const client = this.publicClients.get(params.fromChain);
            if (!client) return null;

            // Get pool ID for token
            const tokenSymbol = await this.getTokenSymbol(params.fromToken, params.fromChain);
            const poolId = BRIDGE_CONTRACTS.stargate.poolIds[tokenSymbol as keyof typeof BRIDGE_CONTRACTS.stargate.poolIds];

            // Call quoteLayerZeroFee
            const abi = [
                {
                    inputs: [
                        { name: '_dstChainId', type: 'uint16' },
                        { name: '_functionType', type: 'uint8' },
                        { name: '_toAddress', type: 'bytes' },
                        { name: '_transferAndCallPayload', type: 'bytes' },
                        {
                            components: [
                                { name: 'dstGasForCall', type: 'uint256' },
                                { name: 'dstNativeAmount', type: 'uint256' },
                                { name: 'dstNativeAddr', type: 'bytes' }
                            ],
                            name: '_lzTxParams',
                            type: 'tuple'
                        }
                    ],
                    name: 'quoteLayerZeroFee',
                    outputs: [
                        { name: 'nativeFee', type: 'uint256' },
                        { name: 'zroFee', type: 'uint256' }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                }
            ] as const;

            const dstChainId = STARGATE_CHAIN_IDS[params.toChain];
            const toAddress = encodeAbiParameters(
                parseAbiParameters('address'),
                [params.recipient || params.fromToken]
            );

            const [nativeFee] = await client.readContract({
                address: router as Address,
                abi,
                functionName: 'quoteLayerZeroFee',
                args: [
                    dstChainId,
                    1, // TYPE_SWAP_REMOTE
                    toAddress,
                    '0x',
                    {
                        dstGasForCall: 0n,
                        dstNativeAmount: 0n,
                        dstNativeAddr: '0x'
                    }
                ]
            });

            // Calculate output amount (simplified - would need to check liquidity)
            const bridgeFee = params.amount * 6n / 10000n; // 0.06% fee
            const amountOut = params.amount - bridgeFee;

            return {
                route,
                amountOut,
                bridgeFee,
                gasFee: nativeFee,
                totalFee: bridgeFee + nativeFee,
                estimatedTime: 60,
                priceImpact: 0.1
            };
        } catch (error) {
            logger.error('Error getting Stargate quote:', error);
            return null;
        }
    }

    private async getHopRoute(
        fromChain: number,
        toChain: number,
        token: Address
    ): Promise<BridgeRoute | null> {
        // Check if route exists for token
        const tokenSymbol = await this.getTokenSymbol(token, fromChain);
        const bridges = BRIDGE_CONTRACTS.hop.bridges[tokenSymbol as keyof typeof BRIDGE_CONTRACTS.hop.bridges];
        
        if (!bridges) return null;

        const fromBridge = bridges[fromChain as keyof typeof bridges];
        const toBridge = bridges[toChain as keyof typeof bridges];

        if (!fromBridge || !toBridge) return null;

        return {
            protocol: 'hop',
            fromChain,
            toChain,
            fromToken: token,
            toToken: token,
            estimatedTime: 300, // 5 minutes average
            estimatedGas: parseUnits('0.02', 18),
            estimatedFee: parseUnits('0.003', 18), // 0.3% fee
            minAmount: parseUnits('1', 6),
            maxAmount: parseUnits('250000', 6),
            slippage: 0.5
        };
    }

    private async getHopQuote(
        route: BridgeRoute,
        params: BridgeParams
    ): Promise<BridgeQuote | null> {
        try {
            // In production, would call Hop API or SDK
            const response = await axios.get(
                `https://api.hop.exchange/v1/quote`, {
                    params: {
                        amount: params.amount.toString(),
                        token: await this.getTokenSymbol(params.fromToken, params.fromChain),
                        fromChain: params.fromChain,
                        toChain: params.toChain,
                        slippage: params.slippage || 0.5
                    }
                }
            );

            return {
                route,
                amountOut: BigInt(response.data.estimatedReceived),
                bridgeFee: BigInt(response.data.totalFee),
                gasFee: BigInt(response.data.gasCost),
                totalFee: BigInt(response.data.totalFee) + BigInt(response.data.gasCost),
                estimatedTime: response.data.estimatedTime,
                priceImpact: response.data.priceImpact
            };
        } catch (error) {
            // Fallback calculation
            const fee = params.amount * 30n / 10000n; // 0.3%
            return {
                route,
                amountOut: params.amount - fee,
                bridgeFee: fee,
                gasFee: parseUnits('0.02', 18),
                totalFee: fee + parseUnits('0.02', 18),
                estimatedTime: 300,
                priceImpact: 0.1
            };
        }
    }

    private async getAcrossRoute(
        fromChain: number,
        toChain: number,
        token: Address
    ): Promise<BridgeRoute | null> {
        const fromPool = BRIDGE_CONTRACTS.across.spokePool[fromChain as keyof typeof BRIDGE_CONTRACTS.across.spokePool];
        const toPool = BRIDGE_CONTRACTS.across.spokePool[toChain as keyof typeof BRIDGE_CONTRACTS.across.spokePool];

        if (!fromPool || !toPool) return null;

        return {
            protocol: 'across',
            fromChain,
            toChain,
            fromToken: token,
            toToken: token,
            estimatedTime: 120, // 2 minutes - very fast
            estimatedGas: parseUnits('0.015', 18),
            estimatedFee: parseUnits('0.001', 18), // 0.1% fee
            minAmount: parseUnits('25', 6),
            maxAmount: parseUnits('500000', 6),
            slippage: 0.25
        };
    }

    private async getAcrossQuote(
        route: BridgeRoute,
        params: BridgeParams
    ): Promise<BridgeQuote | null> {
        try {
            // Across API endpoint
            const response = await axios.get(
                `https://app.across.to/api/suggested-fees`, {
                    params: {
                        token: params.fromToken,
                        destinationChainId: params.toChain,
                        amount: params.amount.toString(),
                        originChainId: params.fromChain
                    }
                }
            );

            const lpFee = BigInt(response.data.lpFee.total);
            const relayerFee = BigInt(response.data.relayerFee.total);
            const totalFee = lpFee + relayerFee;

            return {
                route,
                amountOut: params.amount - totalFee,
                bridgeFee: lpFee,
                gasFee: relayerFee,
                totalFee,
                estimatedTime: 120,
                priceImpact: 0.05
            };
        } catch (error) {
            logger.error('Error getting Across quote:', error);
            const fee = params.amount * 10n / 10000n; // 0.1%
            return {
                route,
                amountOut: params.amount - fee,
                bridgeFee: fee,
                gasFee: parseUnits('0.015', 18),
                totalFee: fee + parseUnits('0.015', 18),
                estimatedTime: 120,
                priceImpact: 0.05
            };
        }
    }

    private async getSynapseRoute(
        fromChain: number,
        toChain: number,
        token: Address
    ): Promise<BridgeRoute | null> {
        const fromBridge = BRIDGE_CONTRACTS.synapse.bridge[fromChain as keyof typeof BRIDGE_CONTRACTS.synapse.bridge];
        const toBridge = BRIDGE_CONTRACTS.synapse.bridge[toChain as keyof typeof BRIDGE_CONTRACTS.synapse.bridge];

        if (!fromBridge || !toBridge) return null;

        return {
            protocol: 'synapse',
            fromChain,
            toChain,
            fromToken: token,
            toToken: token,
            estimatedTime: 600, // 10 minutes
            estimatedGas: parseUnits('0.025', 18),
            estimatedFee: parseUnits('0.002', 18), // 0.2% fee
            minAmount: parseUnits('50', 6),
            maxAmount: parseUnits('1000000', 6),
            slippage: 0.5
        };
    }

    private async getSynapseQuote(
        route: BridgeRoute,
        params: BridgeParams
    ): Promise<BridgeQuote | null> {
        try {
            // Synapse REST API
            const response = await axios.get(
                `https://syn-api-x.herokuapp.com/v1/get_quote`, {
                    params: {
                        chain_id_from: params.fromChain,
                        chain_id_to: params.toChain,
                        token_from: params.fromToken,
                        token_to: params.toToken || params.fromToken,
                        amount: params.amount.toString()
                    }
                }
            );

            return {
                route,
                amountOut: BigInt(response.data.amount_out),
                bridgeFee: BigInt(response.data.bridge_fee),
                gasFee: BigInt(response.data.gas_cost),
                totalFee: BigInt(response.data.bridge_fee) + BigInt(response.data.gas_cost),
                estimatedTime: 600,
                priceImpact: response.data.price_impact
            };
        } catch (error) {
            logger.error('Error getting Synapse quote:', error);
            const fee = params.amount * 20n / 10000n; // 0.2%
            return {
                route,
                amountOut: params.amount - fee,
                bridgeFee: fee,
                gasFee: parseUnits('0.025', 18),
                totalFee: fee + parseUnits('0.025', 18),
                estimatedTime: 600,
                priceImpact: 0.1
            };
        }
    }

    private async getConnextRoute(
        fromChain: number,
        toChain: number,
        token: Address
    ): Promise<BridgeRoute | null> {
        const fromConnext = BRIDGE_CONTRACTS.connext.connext[fromChain as keyof typeof BRIDGE_CONTRACTS.connext.connext];
        const toConnext = BRIDGE_CONTRACTS.connext.connext[toChain as keyof typeof BRIDGE_CONTRACTS.connext.connext];

        if (!fromConnext || !toConnext) return null;

        return {
            protocol: 'connext',
            fromChain,
            toChain,
            fromToken: token,
            toToken: token,
            estimatedTime: 1800, // 30 minutes
            estimatedGas: parseUnits('0.03', 18),
            estimatedFee: parseUnits('0.0005', 18), // 0.05% fee
            minAmount: parseUnits('100', 6),
            maxAmount: parseUnits('500000', 6),
            slippage: 1
        };
    }

    private async getConnextQuote(
        route: BridgeRoute,
        params: BridgeParams
    ): Promise<BridgeQuote | null> {
        try {
            // Connext SDK or API call
            const response = await axios.post(
                `https://bridge.connext.network/v1/quote`, {
                    originDomain: params.fromChain.toString(),
                    destinationDomain: params.toChain.toString(),
                    originTokenAddress: params.fromToken,
                    amount: params.amount.toString(),
                    recipient: params.recipient
                }
            );

            return {
                route,
                amountOut: BigInt(response.data.amountReceived),
                bridgeFee: BigInt(response.data.routerFee),
                gasFee: BigInt(response.data.gasFee),
                totalFee: BigInt(response.data.routerFee) + BigInt(response.data.gasFee),
                estimatedTime: 1800,
                priceImpact: 0.1
            };
        } catch (error) {
            logger.error('Error getting Connext quote:', error);
            const fee = params.amount * 5n / 10000n; // 0.05%
            return {
                route,
                amountOut: params.amount - fee,
                bridgeFee: fee,
                gasFee: parseUnits('0.03', 18),
                totalFee: fee + parseUnits('0.03', 18),
                estimatedTime: 1800,
                priceImpact: 0.1
            };
        }
    }

    async executeBridge(
        quote: BridgeQuote,
        params: BridgeParams
    ): Promise<Hex> {
        switch (quote.route.protocol) {
            case 'stargate':
                return this.executeStargateBridge(quote, params);
            case 'hop':
                return this.executeHopBridge(quote, params);
            case 'across':
                return this.executeAcrossBridge(quote, params);
            case 'synapse':
                return this.executeSynapseBridge(quote, params);
            case 'connext':
                return this.executeConnextBridge(quote, params);
            default:
                throw new Error(`Unsupported bridge protocol: ${quote.route.protocol}`);
        }
    }

    private async executeStargateBridge(
        quote: BridgeQuote,
        params: BridgeParams
    ): Promise<Hex> {
        // Build Stargate bridge transaction
        const router = BRIDGE_CONTRACTS.stargate.routers[params.fromChain as keyof typeof BRIDGE_CONTRACTS.stargate.routers];
        
        logger.info(`Executing Stargate bridge from chain ${params.fromChain} to ${params.toChain}`);
        
        // In production, would build and return actual transaction data
        return '0x' + '0'.repeat(64) as Hex;
    }

    private async executeHopBridge(
        quote: BridgeQuote,
        params: BridgeParams
    ): Promise<Hex> {
        logger.info(`Executing Hop bridge from chain ${params.fromChain} to ${params.toChain}`);
        return '0x' + '0'.repeat(64) as Hex;
    }

    private async executeAcrossBridge(
        quote: BridgeQuote,
        params: BridgeParams
    ): Promise<Hex> {
        logger.info(`Executing Across bridge from chain ${params.fromChain} to ${params.toChain}`);
        return '0x' + '0'.repeat(64) as Hex;
    }

    private async executeSynapseBridge(
        quote: BridgeQuote,
        params: BridgeParams
    ): Promise<Hex> {
        logger.info(`Executing Synapse bridge from chain ${params.fromChain} to ${params.toChain}`);
        return '0x' + '0'.repeat(64) as Hex;
    }

    private async executeConnextBridge(
        quote: BridgeQuote,
        params: BridgeParams
    ): Promise<Hex> {
        logger.info(`Executing Connext bridge from chain ${params.fromChain} to ${params.toChain}`);
        return '0x' + '0'.repeat(64) as Hex;
    }

    async trackBridgeStatus(
        txHash: Hex,
        fromChain: number,
        protocol: string
    ): Promise<{
        status: 'pending' | 'completed' | 'failed';
        destinationTxHash?: Hex;
        completedAt?: number;
    }> {
        // Would implement tracking via:
        // 1. Protocol-specific APIs
        // 2. LayerZero Scan for Stargate
        // 3. Socket API for status
        
        return {
            status: 'pending'
        };
    }

    private async getTokenSymbol(token: Address, chainId: number): Promise<string> {
        const client = this.publicClients.get(chainId);
        if (!client) return 'UNKNOWN';

        try {
            const symbol = await client.readContract({
                address: token,
                abi: [{
                    inputs: []
                    name: 'symbol',
                    outputs: [{ type: 'string' }],
                    stateMutability: 'view',
                    type: 'function'
                }],
                functionName: 'symbol'
            });
            return symbol as string;
        } catch {
            return 'UNKNOWN';
        }
    }

    async getSupportedTokens(
        fromChain: number,
        toChain: number
    ): Promise<Array<{
        address: Address;
        symbol: string;
        name: string;
        protocols: string[];
    }>> {
        // Would return list of tokens supported by bridges between these chains
        // This is simplified - in production would aggregate from all protocols
        
        const commonTokens = [
            {
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
                symbol: 'USDC',
                name: 'USD Coin',
                protocols: ['stargate', 'hop', 'across', 'synapse', 'connext']
            },
            {
                address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' as Address,
                symbol: 'USDT',
                name: 'Tether USD',
                protocols: ['stargate', 'hop', 'synapse']
            },
            {
                address: '0x0000000000000000000000000000000000000000' as Address,
                symbol: 'ETH',
                name: 'Ethereum',
                protocols: ['hop', 'across', 'synapse']
            }
        ];

        return commonTokens;
    }

    clearCache(): void {
        this.routeCache.clear();
        logger.debug('Bridge route cache cleared');
    }
}

// Export factory function
export function createBridgeAggregator(): BridgeAggregator {
    return new BridgeAggregator();
} 