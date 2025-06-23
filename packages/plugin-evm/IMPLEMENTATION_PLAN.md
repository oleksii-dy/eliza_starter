# Implementation Plan: Making EVM Plugin Production-Ready

## Overview
This plan addresses all critical issues identified in the code review, prioritizing real functionality over mocks and ensuring all features work in production.

## Phase 1: Fix Test Infrastructure (Foundation)

### 1.1 Create Real Runtime Test Environment
**Priority**: CRITICAL - Must do first
**Files to modify**:
- Create `src/tests/runtime-test-utils.ts` - Real runtime factory
- Update all test files to use real runtime
- Remove `createMockRuntime` completely

**Implementation**:
```typescript
// New runtime-test-utils.ts
import { createAgentRuntime } from '@elizaos/core';
import { evmPlugin } from '../index';

export async function createTestRuntime() {
    const runtime = await createAgentRuntime({
        character: {
            name: 'TestAgent',
            plugins: ['@elizaos/plugin-evm'],
            settings: {
                EVM_PRIVATE_KEY: process.env.TEST_PRIVATE_KEY,
                ETHEREUM_RPC_URL: process.env.ETHEREUM_RPC_URL
            }
        },
        plugins: [evmPlugin]
    });
    
    await runtime.initialize();
    return runtime;
}
```

### 1.2 Convert E2E Tests to Real Runtime
**Files**:
- `src/__tests__/e2e/plugin-tests.ts`
- Create new `src/__tests__/e2e/runtime-integration.test.ts`

**Approach**:
- Use actual ElizaOS runtime
- Test real message processing
- Validate actual responses
- Use test wallets with real testnet funds

## Phase 2: Implement Core Functionality

### 2.1 Fix Token Balance Fetching
**File**: `src/services/WalletBalanceService.ts`
**Implementation**:
```typescript
async getTokenBalances(address: string, chain: string): Promise<TokenBalance[]> {
    const walletProvider = await initWalletProvider(this.runtime);
    const publicClient = walletProvider.getPublicClient(chain as SupportedChain);
    
    // Get token list for chain
    const tokens = await this.getTokenList(chain);
    const balances: TokenBalance[] = [];
    
    // Fetch balances using multicall
    const calls = tokens.map(token => ({
        address: token.address,
        abi: erc20ABI,
        functionName: 'balanceOf',
        args: [address]
    }));
    
    const results = await publicClient.multicall({ contracts: calls });
    
    // Process results
    for (let i = 0; i < tokens.length; i++) {
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
    
    return balances;
}

private async getTokenList(chain: string): Promise<TokenInfo[]> {
    // Integrate with token lists standard
    const response = await fetch(`https://tokens.coingecko.com/${chain}/all.json`);
    const data = await response.json();
    return data.tokens;
}
```

### 2.2 Implement Smart Wallet Methods
**File**: `src/core/services/EVMWalletService.ts`
**Implementation**:
```typescript
async addOwner(walletAddress: Address, newOwner: Address): Promise<Hash> {
    const safe = await this.getSafeContract(walletAddress);
    const tx = await safe.addOwnerWithThreshold(newOwner, await safe.getThreshold());
    return tx.hash;
}

async removeOwner(walletAddress: Address, owner: Address): Promise<Hash> {
    const safe = await this.getSafeContract(walletAddress);
    const owners = await safe.getOwners();
    const threshold = await safe.getThreshold();
    
    // Ensure we don't go below threshold
    if (owners.length <= threshold) {
        throw new Error('Cannot remove owner: would go below threshold');
    }
    
    const prevOwner = this.findPrevOwner(owners, owner);
    const tx = await safe.removeOwner(prevOwner, owner, threshold);
    return tx.hash;
}

async getSmartWalletInfo(address: Address): Promise<SmartWalletInfo> {
    try {
        const safe = await this.getSafeContract(address);
        const [owners, threshold, version, modules] = await Promise.all([
            safe.getOwners(),
            safe.getThreshold(),
            safe.VERSION(),
            safe.getModules()
        ]);
        
        return {
            type: 'safe',
            owners,
            threshold: Number(threshold),
            modules,
            version
        };
    } catch {
        // Try AA wallet detection
        return this.detectAAWallet(address);
    }
}
```

### 2.3 Implement Bridge Functionality
**File**: `src/core/services/EVMUniversalWalletService.ts`
**Implementation**:
```typescript
async bridge(params: BridgeParams): Promise<UniversalTransactionResult> {
    if (!this.bridgeAggregator) {
        throw new Error('Bridge aggregator not initialized');
    }
    
    // Get quotes from multiple bridges
    const quotes = await this.bridgeAggregator.getQuotes({
        fromChain: params.fromChain,
        toChain: params.toChain,
        fromToken: params.token,
        toToken: params.token,
        amount: params.amount,
        fromAddress: params.from || await this.getDefaultAddress(),
        toAddress: params.to || await this.getDefaultAddress()
    });
    
    if (quotes.length === 0) {
        throw new Error('No bridge routes available');
    }
    
    // Select best quote
    const bestQuote = quotes.sort((a, b) => 
        Number(b.toAmount) - Number(a.toAmount)
    )[0];
    
    // Execute bridge transaction
    const tx = await this.bridgeAggregator.executeBridge(bestQuote);
    
    return {
        hash: tx.hash,
        status: 'pending',
        chain: params.fromChain,
        bridgeInfo: {
            fromChain: params.fromChain,
            toChain: params.toChain,
            fromAmount: params.amount,
            toAmount: bestQuote.toAmount,
            bridge: bestQuote.bridge,
            estimatedTime: bestQuote.estimatedTime
        }
    };
}
```

### 2.4 Add Price Oracle Integration
**Implementation**:
```typescript
// New file: src/oracles/price-oracle.ts
export class PriceOracle {
    private cache: Map<string, { price: number; timestamp: number }> = new Map();
    private cacheDuration = 60000; // 1 minute
    
    async getTokenPrice(tokenAddress: string, chainId: number): Promise<number> {
        const cacheKey = `${chainId}-${tokenAddress}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
            return cached.price;
        }
        
        // Try multiple price sources
        const price = await this.fetchPrice(tokenAddress, chainId);
        
        this.cache.set(cacheKey, { price, timestamp: Date.now() });
        return price;
    }
    
    private async fetchPrice(tokenAddress: string, chainId: number): Promise<number> {
        // Try CoinGecko first
        try {
            const response = await fetch(
                `https://api.coingecko.com/api/v3/simple/token_price/${this.getChainName(chainId)}?contract_addresses=${tokenAddress}&vs_currencies=usd`
            );
            const data = await response.json();
            return data[tokenAddress.toLowerCase()]?.usd || 0;
        } catch {
            // Fallback to on-chain oracle (Chainlink)
            return this.getChainlinkPrice(tokenAddress, chainId);
        }
    }
}
```

## Phase 3: Replace Mock Tests with Runtime Tests

### 3.1 Example: Convert Transfer Test
**Before** (Mock-based):
```typescript
it('should execute transfer', async () => {
    const mockRuntime = createMockRuntime();
    mockRuntime.useModel.mockResolvedValueOnce('...');
    // ... mock-based test
});
```

**After** (Runtime-based):
```typescript
it('should execute transfer on real testnet', async () => {
    const runtime = await createTestRuntime();
    const message = {
        content: { text: 'transfer 0.001 ETH to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e' },
        userId: 'test-user',
        roomId: 'test-room'
    };
    
    // Process with real runtime
    await runtime.processMessage(message);
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check actual response
    const messages = await runtime.messageManager.getMessages({ roomId: 'test-room' });
    const response = messages.find(m => m.userId === runtime.agentId);
    
    expect(response).toBeDefined();
    expect(response.content.text).toContain('transfer');
    
    // Verify on-chain
    const receipt = await getTransactionReceipt(response.content.hash);
    expect(receipt.status).toBe('success');
});
```

### 3.2 Test Organization
**New structure**:
```
src/__tests__/
├── runtime/          # Real runtime tests
│   ├── setup.ts     # Runtime initialization
│   ├── transfer.test.ts
│   ├── swap.test.ts
│   └── defi.test.ts
├── integration/      # Multi-service tests
│   └── workflows.test.ts
└── e2e/             # Full plugin tests
    └── scenarios.test.ts
```

## Phase 4: Complete Missing Features

### 4.1 Session Validation
```typescript
async validateSession(sessionId: UUID, action: SessionPermission): Promise<boolean> {
    const session = await this.getSession(sessionId);
    if (!session || !session.isActive) return false;
    
    // Check expiry
    if (session.expiresAt < Date.now()) {
        await this.revokeSession(sessionId);
        return false;
    }
    
    // Check permissions
    if (!session.permissions.includes(action.action)) {
        return false;
    }
    
    // Check spending limits
    if (action.value && session.spendingLimits) {
        const spent = await this.getSessionSpending(sessionId);
        if (spent + action.value > session.spendingLimits.total) {
            return false;
        }
    }
    
    // Check contract whitelist
    if (action.contract && session.allowedContracts) {
        if (!session.allowedContracts.includes(action.contract)) {
            return false;
        }
    }
    
    return true;
}
```

### 4.2 Implement Caching Strategy
```typescript
class CacheManager {
    private cache: Map<string, CacheEntry> = new Map();
    
    async get<T>(key: string, fetcher: () => Promise<T>, ttl: number): Promise<T> {
        const cached = this.cache.get(key);
        
        if (cached && Date.now() - cached.timestamp < ttl) {
            return cached.data as T;
        }
        
        const data = await fetcher();
        this.cache.set(key, { data, timestamp: Date.now() });
        
        // Schedule cleanup
        setTimeout(() => this.cache.delete(key), ttl);
        
        return data;
    }
    
    invalidate(pattern: string) {
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        }
    }
}
```

## Phase 5: Production Hardening

### 5.1 Error Handling
```typescript
class ProductionErrorHandler {
    static handle(error: unknown, context: string): never {
        logger.error(`Error in ${context}:`, error);
        
        // Sanitize error for user
        if (error instanceof Error) {
            const sanitized = this.sanitizeError(error);
            throw new Error(`${context} failed: ${sanitized}`);
        }
        
        throw new Error(`${context} failed: Unknown error`);
    }
    
    private static sanitizeError(error: Error): string {
        // Remove sensitive data from error messages
        let message = error.message;
        message = message.replace(/0x[a-fA-F0-9]{40}/g, '[ADDRESS]');
        message = message.replace(/0x[a-fA-F0-9]{64}/g, '[HASH]');
        return message;
    }
}
```

### 5.2 Add Retry Mechanisms
```typescript
async function withRetry<T>(
    fn: () => Promise<T>,
    options: { retries: number; delay: number; backoff: number }
): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i <= options.retries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            
            if (i < options.retries) {
                const delay = options.delay * Math.pow(options.backoff, i);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    throw lastError!;
}
```

## Implementation Timeline

### Week 1: Foundation
- [ ] Set up real runtime test infrastructure
- [ ] Convert critical tests to runtime tests
- [ ] Fix token balance fetching

### Week 2: Core Features
- [ ] Implement smart wallet methods
- [ ] Add bridge functionality
- [ ] Integrate price oracles

### Week 3: Testing & Validation
- [ ] Convert all tests to runtime tests
- [ ] Add comprehensive E2E scenarios
- [ ] Performance testing

### Week 4: Production Hardening
- [ ] Error handling improvements
- [ ] Add retry mechanisms
- [ ] Security audit
- [ ] Documentation update

## Success Criteria
1. All tests use real runtime - no mocks
2. All TODO comments resolved
3. All features work on mainnet and testnet
4. 90%+ code coverage with runtime tests
5. Performance benchmarks met
6. Security audit passed 