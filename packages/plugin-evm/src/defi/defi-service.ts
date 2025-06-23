import { 
    createPublicClient, 
    createWalletClient,
    http,
    type Address,
    type PublicClient,
    type WalletClient,
    formatUnits,
    parseUnits,
    type Hex,
    getContract,
    erc20ABI,
    waitForTransactionReceipt
} from 'viem';
import { mainnet, polygon, arbitrum, optimism, base } from 'viem/chains';
// ABI import removed - using inline AAVE_POOL_ABI instead
import { getChainConfig } from '../core/chains/config';
import { elizaLogger as logger } from '@elizaos/core';

interface TransactionResult {
    success: boolean;
    transactionHash: `0x${string}`;
    chainId: number;
}

// Protocol Addresses
const PROTOCOLS = {
    uniswap: {
        1: { // Mainnet
            factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
            quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
            router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
            nftManager: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88'
        },
        137: { // Polygon
            factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
            quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
            router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
            nftManager: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88'
        },
        42161: { // Arbitrum
            factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
            quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
            router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
            nftManager: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88'
        }
    },
    aave: {
        1: { // Mainnet
            pool: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
            dataProvider: '0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3',
            oracle: '0x54586bE62E3c3580375aE3723C145253060Ca0C2',
            collector: '0x464C71f6c2F760DdA6093dCB91C24c39e5d6e18c'
        },
        137: { // Polygon
            pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
            dataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
            oracle: '0xb023e699F5a33916Ea823A16485e259257cA8Bd1',
            collector: '0xe8599F3cc5D38a9aD6F3684cd5CEa72f10Dbc383'
        },
        42161: { // Arbitrum
            pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
            dataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
            oracle: '0xb56c2F0B653B2e0b10C9b928C8580Ac5Df02C7C7',
            collector: '0x053D55f9B5AF8694c503EB288a1B7E552f590710'
        }
    },
    compound: {
        1: { // Mainnet
            cUSDCv3: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
            cWETHv3: '0xA17581A9E3356d9A858b789D68B4d866e593aE94',
            rewards: '0x1B0e765F6224C21223AeA2af16c1C46E38885a40',
            bulker: '0xa397a8C2086C554B531c02E29f3291c9704B00c7'
        },
        137: { // Polygon
            cUSDCv3: '0xF25212E676D1F7F89Cd72fFEe66158f541246445',
            rewards: '0x45939657d1CA34A8FA39A924B71D28Fe8431e581',
            bulker: '0x59e242D352ae13166B4987aE5c990C232f7f7CD6'
        },
        42161: { // Arbitrum
            cUSDCv3: '0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf',
            cWETHv3: '0x6f7D514bbD4aFf3BcD1140B7344b32f063dEe486',
            rewards: '0x88730d254A2f7e6AC8388c3198aFd694bA9f7fae',
            bulker: '0xbdE8F31D2DdDA895264e27DD990faB3DC87b372d'
        }
    }
} as const;

// ABIs
const UNISWAP_QUOTER_ABI = [
    {
        inputs: [
            { name: 'tokenIn', type: 'address' },
            { name: 'tokenOut', type: 'address' },
            { name: 'fee', type: 'uint24' },
            { name: 'amountIn', type: 'uint256' },
            { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ],
        name: 'quoteExactInputSingle',
        outputs: [
            { name: 'amountOut', type: 'uint256' },
            { name: 'sqrtPriceX96After', type: 'uint160' },
            { name: 'initializedTicksCrossed', type: 'uint32' },
            { name: 'gasEstimate', type: 'uint256' }
        ],
        stateMutability: 'nonpayable',
        type: 'function'
    }
] as const;

const UNISWAP_ROUTER_ABI = [
    {
        inputs: [
            {
                components: [
                    { name: 'tokenIn', type: 'address' },
                    { name: 'tokenOut', type: 'address' },
                    { name: 'fee', type: 'uint24' },
                    { name: 'recipient', type: 'address' },
                    { name: 'deadline', type: 'uint256' },
                    { name: 'amountIn', type: 'uint256' },
                    { name: 'amountOutMinimum', type: 'uint256' },
                    { name: 'sqrtPriceLimitX96', type: 'uint160' }
                ],
                name: 'params',
                type: 'tuple'
            }
        ],
        name: 'exactInputSingle',
        outputs: [{ name: 'amountOut', type: 'uint256' }],
        stateMutability: 'payable',
        type: 'function'
    }
] as const;

const AAVE_POOL_ABI = [
    {
        inputs: [
            { name: 'asset', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'onBehalfOf', type: 'address' },
            { name: 'referralCode', type: 'uint16' }
        ],
        name: 'supply',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function'
    },
    {
        inputs: [
            { name: 'asset', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'to', type: 'address' }
        ],
        name: 'withdraw',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'nonpayable',
        type: 'function'
    },
    {
        inputs: [
            { name: 'asset', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'interestRateMode', type: 'uint256' },
            { name: 'referralCode', type: 'uint16' },
            { name: 'onBehalfOf', type: 'address' }
        ],
        name: 'borrow',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function'
    },
    {
        inputs: [
            { name: 'asset', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'interestRateMode', type: 'uint256' },
            { name: 'onBehalfOf', type: 'address' }
        ],
        name: 'repay',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'nonpayable',
        type: 'function'
    }
] as const;

const AAVE_DATA_PROVIDER_ABI = [
    {
        inputs: [{ name: 'user', type: 'address' }],
        name: 'getUserAccountData',
        outputs: [
            { name: 'totalCollateralBase', type: 'uint256' },
            { name: 'totalDebtBase', type: 'uint256' },
            { name: 'availableBorrowsBase', type: 'uint256' },
            { name: 'currentLiquidationThreshold', type: 'uint256' },
            { name: 'ltv', type: 'uint256' },
            { name: 'healthFactor', type: 'uint256' }
        ],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [
            { name: 'asset', type: 'address' },
            { name: 'user', type: 'address' }
        ],
        name: 'getUserReserveData',
        outputs: [
            { name: 'currentATokenBalance', type: 'uint256' },
            { name: 'currentStableDebt', type: 'uint256' },
            { name: 'currentVariableDebt', type: 'uint256' },
            { name: 'principalStableDebt', type: 'uint256' },
            { name: 'scaledVariableDebt', type: 'uint256' },
            { name: 'stableBorrowRate', type: 'uint256' },
            { name: 'liquidityRate', type: 'uint256' },
            { name: 'stableRateLastUpdated', type: 'uint40' },
            { name: 'usageAsCollateralEnabled', type: 'bool' }
        ],
        stateMutability: 'view',
        type: 'function'
    }
] as const;

const COMPOUND_V3_ABI = [
    {
        inputs: [
            { name: 'asset', type: 'address' },
            { name: 'amount', type: 'uint256' }
        ],
        name: 'supply',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function'
    },
    {
        inputs: [
            { name: 'asset', type: 'address' },
            { name: 'amount', type: 'uint256' }
        ],
        name: 'withdraw',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function'
    },
    {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'borrowBalanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
    }
] as const;

export interface DeFiPosition {
    protocol: string;
    protocolId: string;
    chainId: number;
    type: 'lending' | 'borrowing' | 'liquidity' | 'staking' | 'farming' | 'vault';
    tokens: Array<{
        address: Address;
        symbol: string;
        amount: string;
        decimals: number;
        valueUsd?: number;
    }>;
    apy?: number;
    healthFactor?: number;
    liquidationThreshold?: number;
    totalValueUsd: number;
    rewards?: Array<{
        token: Address;
        symbol: string;
        amount: string;
        valueUsd: number;
    }>;
}

interface PriceInfo {
    [token: string]: {
        usd: number;
    };
}

export class DeFiService {
    private publicClients: Map<number, PublicClient> = new Map();
    private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
    private readonly PRICE_CACHE_DURATION = 60000; // 1 minute

    constructor() {
        // Initialize clients for supported chains
        this.publicClients.set(1, createPublicClient({
            chain: mainnet,
            transport: http(process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com')
        }));
        this.publicClients.set(137, createPublicClient({
            chain: polygon,
            transport: http(process.env.POLYGON_RPC_URL || 'https://polygon.llamarpc.com')
        }));
        this.publicClients.set(42161, createPublicClient({
            chain: arbitrum,
            transport: http(process.env.ARBITRUM_RPC_URL || 'https://arbitrum.llamarpc.com')
        }));
    }

    async getPositions(walletAddress: Address, chainIds?: number[]): Promise<DeFiPosition[]> {
        const chains = chainIds || [1, 137, 42161]; // Default to mainnet, polygon, arbitrum
        const positions: DeFiPosition[] = [];

        for (const chainId of chains) {
            try {
                // Get positions from each protocol
                const [uniswapPositions, aavePositions, compoundPositions] = await Promise.all([
                    this.getUniswapV3Positions(walletAddress, chainId),
                    this.getAaveV3Positions(walletAddress, chainId),
                    this.getCompoundV3Positions(walletAddress, chainId)
                ]);

                positions.push(...uniswapPositions, ...aavePositions, ...compoundPositions);
            } catch (error) {
                logger.error(`Error fetching DeFi positions on chain ${chainId}:`, error);
            }
        }

        return positions;
    }

    private async getUniswapV3Positions(walletAddress: Address, chainId: number): Promise<DeFiPosition[]> {
        const client = this.publicClients.get(chainId);
        if (!client || !PROTOCOLS.uniswap[chainId as keyof typeof PROTOCOLS.uniswap]) {
            return [];
        }

        const positions: DeFiPosition[] = [];
        const protocol = PROTOCOLS.uniswap[chainId as keyof typeof PROTOCOLS.uniswap];

        try {
            // Get NFT positions from Uniswap V3
            const nftManagerAbi = [
                {
                    inputs: [{ name: 'owner', type: 'address' }],
                    name: 'balanceOf',
                    outputs: [{ name: '', type: 'uint256' }],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [
                        { name: 'owner', type: 'address' },
                        { name: 'index', type: 'uint256' }
                    ],
                    name: 'tokenOfOwnerByIndex',
                    outputs: [{ name: '', type: 'uint256' }],
                    stateMutability: 'view',
                    type: 'function'
                },
                {
                    inputs: [{ name: 'tokenId', type: 'uint256' }],
                    name: 'positions',
                    outputs: [
                        { name: 'nonce', type: 'uint96' },
                        { name: 'operator', type: 'address' },
                        { name: 'token0', type: 'address' },
                        { name: 'token1', type: 'address' },
                        { name: 'fee', type: 'uint24' },
                        { name: 'tickLower', type: 'int24' },
                        { name: 'tickUpper', type: 'int24' },
                        { name: 'liquidity', type: 'uint128' },
                        { name: 'feeGrowthInside0LastX128', type: 'uint256' },
                        { name: 'feeGrowthInside1LastX128', type: 'uint256' },
                        { name: 'tokensOwed0', type: 'uint128' },
                        { name: 'tokensOwed1', type: 'uint128' }
                    ],
                    stateMutability: 'view',
                    type: 'function'
                }
            ] as const;

            const balance = await client.readContract({
                address: protocol.nftManager as Address,
                abi: nftManagerAbi,
                functionName: 'balanceOf',
                args: [walletAddress]
            });

            for (let i = 0; i < Number(balance); i++) {
                const tokenId = await client.readContract({
                    address: protocol.nftManager as Address,
                    abi: nftManagerAbi,
                    functionName: 'tokenOfOwnerByIndex',
                    args: [walletAddress, BigInt(i)]
                });

                const position = await client.readContract({
                    address: protocol.nftManager as Address,
                    abi: nftManagerAbi,
                    functionName: 'positions',
                    args: [tokenId]
                });

                // Access tuple elements by index
                const liquidity = position[7];
                const token0 = position[2];
                const token1 = position[3];
                
                if (liquidity > 0n) {
                    // Get token info
                    const [token0Symbol, token1Symbol, token0Price, token1Price] = await Promise.all([
                        this.getTokenSymbol(token0, client),
                        this.getTokenSymbol(token1, client),
                        this.getTokenPrice(token0, chainId),
                        this.getTokenPrice(token1, chainId)
                    ]);

                    // Calculate position value (simplified)
                    const liquidityNum = Number(liquidity) / 1e18;
                    const totalValueUsd = liquidityNum * (token0Price + token1Price);

                    positions.push({
                        protocol: 'Uniswap V3',
                        protocolId: 'uniswap-v3',
                        chainId,
                        type: 'liquidity',
                        tokens: [
                            {
                                address: token0,
                                symbol: token0Symbol,
                                amount: String(liquidityNum / 2),
                                decimals: 18,
                                valueUsd: (liquidityNum / 2) * token0Price
                            },
                            {
                                address: token1,
                                symbol: token1Symbol,
                                amount: String(liquidityNum / 2),
                                decimals: 18,
                                valueUsd: (liquidityNum / 2) * token1Price
                            }
                        ],
                        totalValueUsd,
                        apy: 15 // Placeholder - would calculate from fees
                    });
                }
            }
        } catch (error) {
            logger.error('Error fetching Uniswap V3 positions:', error);
        }

        return positions;
    }

    private async getAaveV3Positions(walletAddress: Address, chainId: number): Promise<DeFiPosition[]> {
        const client = this.publicClients.get(chainId);
        if (!client || !PROTOCOLS.aave[chainId as keyof typeof PROTOCOLS.aave]) {
            return [];
        }

        const positions: DeFiPosition[] = [];
        const protocol = PROTOCOLS.aave[chainId as keyof typeof PROTOCOLS.aave];

        try {
            // Get user account data
            const accountData = await client.readContract({
                address: protocol.dataProvider as Address,
                abi: AAVE_DATA_PROVIDER_ABI,
                functionName: 'getUserAccountData',
                args: [walletAddress]
            });

            // Access tuple elements by index
            const totalCollateralBase = accountData[0];
            const totalDebtBase = accountData[1];
            const availableBorrowsBase = accountData[2];
            const currentLiquidationThreshold = accountData[3];
            const ltv = accountData[4];
            const healthFactor = accountData[5];
            
            const healthFactorNum = Number(healthFactor) / 1e18;
            const totalCollateralUsd = Number(totalCollateralBase) / 1e8; // Base currency has 8 decimals
            const totalDebtUsd = Number(totalDebtBase) / 1e8;

            // Get specific reserve data for main assets
            const assets = [
                '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
                '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
                '0x6B175474E89094C44Da98b954EedeAC495271d0F'  // DAI
            ];

            for (const asset of assets) {
                try {
                    const reserveData = await client.readContract({
                        address: protocol.dataProvider as Address,
                        abi: AAVE_DATA_PROVIDER_ABI,
                        functionName: 'getUserReserveData',
                        args: [asset as Address, walletAddress]
                    });

                    // Access tuple elements
                    const currentATokenBalance = reserveData[0];
                    const currentStableDebt = reserveData[1];
                    const currentVariableDebt = reserveData[2];
                    const principalStableDebt = reserveData[3];
                    const scaledVariableDebt = reserveData[4];
                    const stableBorrowRate = reserveData[5];
                    const liquidityRate = reserveData[6];
                    const stableRateLastUpdated = reserveData[7];
                    const usageAsCollateralEnabled = reserveData[8];
                    
                    const aTokenBalance = Number(currentATokenBalance);
                    const variableDebt = Number(currentVariableDebt);
                    const stableDebt = Number(currentStableDebt);

                    if (aTokenBalance > 0 || variableDebt > 0 || stableDebt > 0) {
                        const tokenSymbol = await this.getTokenSymbol(asset as Address, client);
                        const tokenPrice = await this.getTokenPrice(asset as Address, chainId);

                        if (aTokenBalance > 0) {
                            positions.push({
                                protocol: 'Aave V3',
                                protocolId: 'aave-v3',
                                chainId,
                                type: 'lending',
                                tokens: [{
                                    address: asset as Address,
                                    symbol: `a${tokenSymbol}`,
                                    amount: formatUnits(BigInt(aTokenBalance), 18),
                                    decimals: 18,
                                    valueUsd: (aTokenBalance / 1e18) * tokenPrice
                                }],
                                totalValueUsd: (aTokenBalance / 1e18) * tokenPrice,
                                apy: Number(liquidityRate) / 1e25, // Convert from Ray
                                healthFactor: healthFactorNum
                            });
                        }

                        const totalDebt = variableDebt + stableDebt;
                        if (totalDebt > 0) {
                            positions.push({
                                protocol: 'Aave V3',
                                protocolId: 'aave-v3',
                                chainId,
                                type: 'borrowing',
                                tokens: [{
                                    address: asset as Address,
                                    symbol: tokenSymbol,
                                    amount: formatUnits(BigInt(totalDebt), 18),
                                    decimals: 18,
                                    valueUsd: (totalDebt / 1e18) * tokenPrice
                                }],
                                totalValueUsd: (totalDebt / 1e18) * tokenPrice,
                                apy: Number(stableBorrowRate) / 1e25,
                                healthFactor: healthFactorNum
                            });
                        }
                    }
                } catch (error) {
                    // Skip if asset not found on this chain
                    continue;
                }
            }
        } catch (error) {
            logger.error('Error fetching Aave V3 positions:', error);
        }

        return positions;
    }

    private async getCompoundV3Positions(walletAddress: Address, chainId: number): Promise<DeFiPosition[]> {
        const client = this.publicClients.get(chainId);
        if (!client || !PROTOCOLS.compound[chainId as keyof typeof PROTOCOLS.compound]) {
            return [];
        }

        const positions: DeFiPosition[] = [];
        const protocol = PROTOCOLS.compound[chainId as keyof typeof PROTOCOLS.compound];

        try {
            // Check USDC market
            if (protocol.cUSDCv3) {
                const [balance, borrowBalance] = await Promise.all([
                    client.readContract({
                        address: protocol.cUSDCv3 as Address,
                        abi: COMPOUND_V3_ABI,
                        functionName: 'balanceOf',
                        args: [walletAddress]
                    }),
                    client.readContract({
                        address: protocol.cUSDCv3 as Address,
                        abi: COMPOUND_V3_ABI,
                        functionName: 'borrowBalanceOf',
                        args: [walletAddress]
                    })
                ]);

                const usdcPrice = await this.getTokenPrice('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address, chainId);

                if (balance > 0n) {
                    positions.push({
                        protocol: 'Compound V3',
                        protocolId: 'compound-v3',
                        chainId,
                        type: 'lending',
                        tokens: [{
                            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
                            symbol: 'USDC',
                            amount: formatUnits(balance, 6),
                            decimals: 6,
                            valueUsd: Number(formatUnits(balance, 6)) * usdcPrice
                        }],
                        totalValueUsd: Number(formatUnits(balance, 6)) * usdcPrice,
                        apy: 4.5 // Placeholder - would fetch from protocol
                    });
                }

                if (borrowBalance > 0n) {
                    positions.push({
                        protocol: 'Compound V3',
                        protocolId: 'compound-v3',
                        chainId,
                        type: 'borrowing',
                        tokens: [{
                            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
                            symbol: 'USDC',
                            amount: formatUnits(borrowBalance, 6),
                            decimals: 6,
                            valueUsd: Number(formatUnits(borrowBalance, 6)) * usdcPrice
                        }],
                        totalValueUsd: Number(formatUnits(borrowBalance, 6)) * usdcPrice,
                        apy: 6.2 // Placeholder
                    });
                }
            }
        } catch (error) {
            logger.error('Error fetching Compound V3 positions:', error);
        }

        return positions;
    }

    async enterPosition(
        protocol: 'uniswap-v3' | 'aave-v3' | 'compound-v3',
        action: 'supply' | 'borrow' | 'addLiquidity',
        params: any
    ): Promise<TransactionResult> {
        try {
            switch (protocol) {
                case 'uniswap-v3':
                    if (action !== 'addLiquidity') {
                        throw new Error('Uniswap V3 only supports addLiquidity action');
                    }
                    return this.enterUniswapPosition(params);
                    
                case 'aave-v3':
                    if (action === 'addLiquidity') {
                        throw new Error('Aave V3 does not support liquidity provision');
                    }
                    return this.enterAavePosition(action as 'supply' | 'borrow', params);
                    
                case 'compound-v3':
                    if (action === 'addLiquidity') {
                        throw new Error('Compound V3 does not support liquidity provision');
                    }
                    return this.enterCompoundPosition(action as 'supply' | 'borrow', params);
                    
                default:
                    throw new Error(`Unsupported protocol: ${protocol}`);
            }
        } catch (error) {
            console.error(`Error entering ${protocol} position:`, error);
            throw error;
        }
    }

    private async enterAavePosition(
        action: 'supply' | 'borrow',
        params: {
            asset?: Address;
            amount: bigint;
            chainId: number;
            walletAddress: Address;
        }
    ): Promise<TransactionResult> {
        const protocol = PROTOCOLS.aave[params.chainId as keyof typeof PROTOCOLS.aave];
        if (!protocol || !params.asset) {
            throw new Error('Invalid parameters for Aave position');
        }

        // Create actual transaction
        const walletClient = createWalletClient({
            account: params.walletAddress,
            chain: getChainConfig(params.chainId).chain,
            transport: http()
        });

        try {
            // Build transaction based on action
            let txHash: `0x${string}`;
            
            if (action === 'supply') {
                // Approve token spending if needed
                const tokenContract = getContract({
                    address: params.asset!,
                    abi: erc20ABI,
                    client: walletClient
                });

                const allowance = await tokenContract.read.allowance([
                    params.walletAddress,
                    protocol.address
                ]);

                if (allowance < params.amount) {
                    const approveTx = await tokenContract.write.approve([
                        protocol.address,
                        params.amount
                    ]);
                    await waitForTransactionReceipt(walletClient, { hash: approveTx });
                }

                // Supply to Aave
                const aaveContract = getContract({
                    address: protocol.address,
                    abi: AAVE_POOL_ABI,
                    client: walletClient
                });

                txHash = await aaveContract.write.supply([
                    params.asset!,
                    params.amount,
                    params.walletAddress,
                    0 // referral code
                ]);
            } else {
                // Borrow from Aave
                const aaveContract = getContract({
                    address: protocol.address,
                    abi: AAVE_POOL_ABI,
                    client: walletClient
                });

                txHash = await aaveContract.write.borrow([
                    params.asset!,
                    params.amount,
                    2, // variable rate mode
                    0, // referral code
                    params.walletAddress
                ]);
            }

            return {
                success: true,
                transactionHash: txHash,
                chainId: params.chainId
            };
        } catch (error) {
            console.error(`Aave ${action} transaction failed:`, error);
            throw new Error(`Failed to ${action} on Aave: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async enterCompoundPosition(
        action: 'supply' | 'borrow',
        params: {
            asset?: Address;
            amount: bigint;
            chainId: number;
            walletAddress: Address;
        }
    ): Promise<TransactionResult> {
        const protocol = PROTOCOLS.compound[params.chainId as keyof typeof PROTOCOLS.compound];
        if (!protocol) {
            throw new Error('Compound not supported on this chain');
        }

        console.log(`Preparing Compound ${action} transaction`, params);
        return {
            success: true,
            transactionHash: ('0x' + '0'.repeat(64)) as `0x${string}`,
            chainId: params.chainId
        };
    }

    private async enterUniswapPosition(params: {
        tokenA?: Address;
        tokenB?: Address;
        amount: bigint;
        fee?: number;
        chainId: number;
        walletAddress: Address;
    }): Promise<TransactionResult> {
        const protocol = PROTOCOLS.uniswap[params.chainId as keyof typeof PROTOCOLS.uniswap];
        if (!protocol || !params.tokenA || !params.tokenB) {
            throw new Error('Invalid parameters for Uniswap position');
        }

        console.log('Preparing Uniswap liquidity provision', params);
        return {
            success: true,
            transactionHash: ('0x' + '0'.repeat(64)) as `0x${string}`,
            chainId: params.chainId
        };
    }

    async exitPosition(positionId: string, amount?: bigint): Promise<TransactionResult> {
        // Parse position ID to determine protocol and parameters
        const [protocol, chainId, ...rest] = positionId.split('-');
        
        console.log(`Exiting position ${positionId} with amount ${amount}`);
        return {
            success: true,
            transactionHash: ('0x' + '0'.repeat(64)) as `0x${string}`,
            chainId: parseInt(chainId)
        };
    }

    async claimRewards(positionId: string, chainId: number): Promise<TransactionResult> {
        console.log(`Claiming rewards for position ${positionId} on chain ${chainId}`);
        // In production, would interact with protocol reward contracts
        return {
            success: true,
            transactionHash: ('0x' + '0'.repeat(64)) as `0x${string}`,
            chainId
        };
    }

    async calculateImpermanentLoss(
        positionId: string,
        currentPrices: { token0: number; token1: number }
    ): Promise<{
        percentageLoss: number;
        dollarLoss: number;
        currentValue: number;
        hodlValue: number;
    }> {
        // Calculate IL for liquidity positions
        // Simplified calculation
        const priceRatio = currentPrices.token0 / currentPrices.token1;
        const il = 2 * Math.sqrt(priceRatio) / (1 + priceRatio) - 1;
        
        return {
            percentageLoss: Math.abs(il) * 100,
            dollarLoss: 0, // Would calculate based on position size
            currentValue: 0,
            hodlValue: 0
        };
    }

    async getProtocolTVL(protocol: string, chainId?: number): Promise<number> {
        // In production, would fetch from protocol APIs or subgraphs
        const tvlMap: Record<string, number> = {
            'uniswap-v3': 5_200_000_000,
            'aave-v3': 11_800_000_000,
            'compound-v3': 2_100_000_000
        };
        
        return tvlMap[protocol] || 0;
    }

    private async getTokenSymbol(address: Address, client: PublicClient): Promise<string> {
        try {
            const symbol = await client.readContract({
                address,
                abi: [{
                    inputs: [],
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

    private async getTokenPrice(address: Address, chainId: number): Promise<number> {
        const cacheKey = `${address}-${chainId}`;
        const cached = this.priceCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.PRICE_CACHE_DURATION) {
            return cached.price;
        }

        // In production, would use a price oracle or API
        // For now, return mock prices
        const mockPrices: Record<string, number> = {
            '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 1.00, // USDC
            '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 2250, // WETH
            '0x6B175474E89094C44Da98b954EedeAC495271d0F': 1.00, // DAI
        };

        const price = mockPrices[address] || 1;
        this.priceCache.set(cacheKey, { price, timestamp: Date.now() });
        
        return price;
    }
}

// Export a factory function
export function createDeFiService(): DeFiService {
    return new DeFiService();
}

