# Revised Implementation Plan: Production-Ready EVM Plugin

## Critical Discovery
The E2E tests in ElizaOS already receive a real `IAgentRuntime` instance. The test functions are called with actual runtime, not mocks. This changes our approach significantly.

## Phase 1: Fix Existing E2E Tests (Priority 1)

### 1.1 Update E2E Tests to Use Runtime Properly
**Issue**: Current E2E tests receive runtime but don't use it for real testing
**Files**:
- `src/__tests__/e2e/plugin-tests.ts`

**Fix**:
```typescript
// Current (fake test)
fn: async (runtime: IAgentRuntime) => {
    const walletService = runtime.getService('wallet');
    if (!walletService) {
        throw new Error('Wallet service not found');
    }
    // Just checks if service exists
}

// Fixed (real test)
fn: async (runtime: IAgentRuntime) => {
    // Test actual message processing
    const message: Memory = {
        id: `test-${Date.now()}` as UUID,
        entityId: runtime.agentId,
        roomId: 'test-room' as UUID,
        content: {
            text: 'send 0.001 ETH to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e on sepolia'
        },
        createdAt: Date.now()
    };
    
    // Process with real runtime
    await runtime.processMessage(message);
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify response
    const messages = await runtime.messageManager.getMessages({
        roomId: 'test-room',
        limit: 10
    });
    
    const response = messages.find(m => 
        m.userId === runtime.agentId && 
        m.id !== message.id
    );
    
    if (!response) {
        throw new Error('Agent did not respond to transfer request');
    }
    
    // Verify action was triggered
    if (!response.content.text.includes('transfer')) {
        throw new Error('Response does not mention transfer');
    }
}
```

### 1.2 Create Runtime Test Utilities
**New file**: `src/__tests__/runtime-utils.ts`
```typescript
import type { IAgentRuntime, Memory, UUID } from '@elizaos/core';

export async function sendMessageAndWaitForResponse(
    runtime: IAgentRuntime,
    text: string,
    roomId: string = 'test-room'
): Promise<Memory> {
    const message: Memory = {
        id: `msg-${Date.now()}-${Math.random()}` as UUID,
        entityId: 'test-user' as UUID,
        agentId: runtime.agentId,
        roomId: roomId as UUID,
        content: { text },
        createdAt: Date.now()
    };
    
    await runtime.processMessage(message);
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get response
    const messages = await runtime.messageManager.getMessages({
        roomId,
        limit: 20
    });
    
    const response = messages.find(m => 
        m.userId === runtime.agentId && 
        m.createdAt > message.createdAt
    );
    
    if (!response) {
        throw new Error(`No response to: ${text}`);
    }
    
    return response;
}
```

## Phase 2: Implement Missing Core Features

### 2.1 Token Balance Fetching (Critical)
**File**: `src/services/WalletBalanceService.ts`

**Current**: Returns empty array
**Fix**: Implement actual token fetching

```typescript
import { erc20Abi } from 'viem';

async getTokenBalances(address: string, chain: string): Promise<TokenBalance[]> {
    const walletProvider = await initWalletProvider(this.runtime);
    const publicClient = walletProvider.getPublicClient(chain as SupportedChain);
    
    // Get common tokens for the chain
    const tokens = this.getCommonTokensForChain(chain);
    const balances: TokenBalance[] = [];
    
    // Use multicall for efficiency
    const calls = tokens.map(token => ({
        address: token.address as Address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address as Address]
    }));
    
    try {
        const results = await publicClient.multicall({ contracts: calls });
        
        for (let i = 0; i < tokens.length; i++) {
            if (results[i].status === 'success') {
                const balance = results[i].result as bigint;
                if (balance > 0n) {
                    balances.push({
                        address: tokens[i].address,
                        symbol: tokens[i].symbol,
                        name: tokens[i].name,
                        decimals: tokens[i].decimals,
                        balance: balance.toString(),
                        uiAmount: Number(formatUnits(balance, tokens[i].decimals))
                    });
                }
            }
        }
    } catch (error) {
        logger.warn('Error fetching token balances:', error);
    }
    
    return balances;
}

private getCommonTokensForChain(chain: string): TokenInfo[] {
    // Start with hardcoded list, later integrate token lists
    const tokens: Record<string, TokenInfo[]> = {
        'sepolia': [
            {
                address: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06', // USDT
                symbol: 'USDT',
                name: 'Tether USD',
                decimals: 6
            },
            {
                address: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8', // USDC
                symbol: 'USDC',
                name: 'USD Coin',
                decimals: 6
            }
        ],
        'mainnet': [
            {
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                symbol: 'USDC',
                name: 'USD Coin',
                decimals: 6
            },
            {
                address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
                symbol: 'USDT',
                name: 'Tether USD',
                decimals: 6
            }
        ]
    };
    
    return tokens[chain] || [];
}
```

### 2.2 Smart Wallet Methods
**File**: `src/core/services/EVMWalletService.ts`

```typescript
// Add Safe SDK imports
import Safe from '@safe-global/protocol-kit';
import { SafeFactory } from '@safe-global/protocol-kit';

private safeSDK: Map<string, Safe> = new Map();

private async getSafeSDK(address: Address): Promise<Safe> {
    const cached = this.safeSDK.get(address);
    if (cached) return cached;
    
    const safe = await Safe.create({
        ethAdapter: this.ethAdapter,
        safeAddress: address
    });
    
    this.safeSDK.set(address, safe);
    return safe;
}

async addOwner(walletAddress: Address, newOwner: Address): Promise<Hash> {
    const safe = await this.getSafeSDK(walletAddress);
    const currentThreshold = await safe.getThreshold();
    
    const safeTransaction = await safe.createAddOwnerTx({
        ownerAddress: newOwner,
        threshold: currentThreshold // Keep same threshold
    });
    
    const txResponse = await safe.executeTransaction(safeTransaction);
    return txResponse.hash as Hash;
}

async removeOwner(walletAddress: Address, ownerToRemove: Address): Promise<Hash> {
    const safe = await this.getSafeSDK(walletAddress);
    const owners = await safe.getOwners();
    const threshold = await safe.getThreshold();
    
    // Safety check
    if (owners.length <= threshold) {
        throw new Error('Cannot remove owner: would violate threshold requirement');
    }
    
    const safeTransaction = await safe.createRemoveOwnerTx({
        ownerAddress: ownerToRemove,
        threshold // Keep same threshold
    });
    
    const txResponse = await safe.executeTransaction(safeTransaction);
    return txResponse.hash as Hash;
}

async getSmartWalletInfo(address: Address): Promise<SmartWalletInfo> {
    try {
        const safe = await this.getSafeSDK(address);
        
        const [owners, threshold, nonce, version] = await Promise.all([
            safe.getOwners(),
            safe.getThreshold(),
            safe.getNonce(),
            safe.getContractVersion()
        ]);
        
        return {
            type: 'safe',
            owners: owners as Address[],
            threshold,
            version,
            nonce,
            modules: [] // TODO: Get modules when needed
        };
    } catch (error) {
        // Not a Safe, check if AA wallet
        const bytecode = await this.publicClients.get(1)?.getBytecode({ address });
        if (bytecode && bytecode.length > 2) {
            return { type: 'aa', isSmartContract: true };
        }
        
        return { type: 'unknown' };
    }
}
```

### 2.3 Price Oracle Integration
**New file**: `src/oracles/price-service.ts`

```typescript
import { logger } from '@elizaos/core';

interface PriceData {
    price: number;
    timestamp: number;
}

export class PriceService {
    private cache = new Map<string, PriceData>();
    private cacheTTL = 60000; // 1 minute
    
    async getTokenPriceUSD(
        tokenAddress: string,
        chainId: number
    ): Promise<number> {
        const cacheKey = `${chainId}-${tokenAddress.toLowerCase()}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.price;
        }
        
        try {
            // Try CoinGecko API
            const chainName = this.getCoingeckoChainId(chainId);
            const url = `https://api.coingecko.com/api/v3/simple/token_price/${chainName}?contract_addresses=${tokenAddress}&vs_currencies=usd`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            const price = data[tokenAddress.toLowerCase()]?.usd || 0;
            
            this.cache.set(cacheKey, {
                price,
                timestamp: Date.now()
            });
            
            return price;
        } catch (error) {
            logger.warn('Failed to fetch price:', error);
            return 0;
        }
    }
    
    async getNativeTokenPriceUSD(chainId: number): Promise<number> {
        const nativeTokens: Record<number, string> = {
            1: 'ethereum',
            137: 'matic-network',
            42161: 'ethereum', // Arbitrum uses ETH
            10: 'ethereum', // Optimism uses ETH
        };
        
        const tokenId = nativeTokens[chainId];
        if (!tokenId) return 0;
        
        try {
            const response = await fetch(
                `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`
            );
            const data = await response.json();
            return data[tokenId]?.usd || 0;
        } catch (error) {
            logger.warn('Failed to fetch native token price:', error);
            return 0;
        }
    }
    
    private getCoingeckoChainId(chainId: number): string {
        const mapping: Record<number, string> = {
            1: 'ethereum',
            137: 'polygon-pos',
            42161: 'arbitrum-one',
            10: 'optimistic-ethereum',
            8453: 'base',
            11155111: 'ethereum', // Sepolia uses mainnet prices
        };
        
        return mapping[chainId] || 'ethereum';
    }
}
```

## Phase 3: Convert Unit Tests to Integration Tests

### 3.1 Test Structure
Instead of converting to "real runtime" for unit tests (which doesn't make sense), we'll:
1. Keep unit tests as unit tests with mocks (they test logic)
2. Add comprehensive integration tests that use real services
3. Ensure E2E tests actually test end-to-end flows

### 3.2 New Integration Test Example
**File**: `src/__tests__/integration/wallet-service.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { EVMWalletService } from '../../core/services/EVMWalletService';
import { createTestRuntime } from '../test-utils';
import type { IAgentRuntime } from '@elizaos/core';

describe('Wallet Service Integration', () => {
    let runtime: IAgentRuntime;
    let walletService: EVMWalletService;
    
    beforeAll(async () => {
        // Create minimal runtime with required dependencies
        runtime = {
            getSetting: (key: string) => {
                const settings: Record<string, string> = {
                    EVM_PRIVATE_KEY: process.env.TEST_PRIVATE_KEY!,
                    ETHEREUM_RPC_URL: process.env.ETHEREUM_RPC_URL!
                };
                return settings[key];
            },
            getService: () => null,
            // ... other required methods
        } as IAgentRuntime;
        
        walletService = await EVMWalletService.start(runtime);
    });
    
    it('should create wallet and check balance', async () => {
        const wallet = await walletService.createWallet({
            type: 'eoa',
            chain: 'sepolia'
        });
        
        expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
        
        // Get real balance
        const balance = await walletService.getBalance(wallet.address);
        expect(typeof balance).toBe('number');
    });
});
```

## Phase 4: Realistic Timeline

### Week 1: Foundation & Critical Fixes
- [x] Analyze existing code structure ✓
- [ ] Fix token balance fetching implementation
- [ ] Update E2E tests to use runtime properly
- [ ] Add price oracle service

### Week 2: Smart Wallet & Services
- [ ] Implement smart wallet methods
- [ ] Fix session validation
- [ ] Add proper error handling
- [ ] Integration test suite

### Week 3: Bridge & Cross-chain
- [ ] Implement bridge functionality
- [ ] Add multicall optimization
- [ ] Cross-chain testing
- [ ] Performance optimization

### Week 4: Production Hardening
- [ ] Security audit
- [ ] Load testing
- [ ] Documentation
- [ ] Final E2E validation

## Key Differences from Original Plan

1. **E2E Tests Already Get Runtime** - We don't need to create runtime infrastructure
2. **Unit Tests Stay as Unit Tests** - They test logic, not integration
3. **Focus on Missing Implementations** - Token balances, smart wallets, bridges
4. **Realistic Service Integration** - Use actual SDKs and APIs
5. **Proper Error Handling** - Not just throwing errors

## Success Metrics

1. **Token Balance Fetching** - Returns actual balances from chain
2. **Smart Wallet Methods** - Work with real Safe contracts
3. **E2E Tests** - Test actual message → action → response flow
4. **Price Oracle** - Returns real USD prices
5. **Error Handling** - Graceful failures with retry logic

## Next Immediate Steps

1. Implement `getTokenBalances` with multicall
2. Fix one E2E test to properly test message flow
3. Add price oracle service
4. Test with real testnet wallet 