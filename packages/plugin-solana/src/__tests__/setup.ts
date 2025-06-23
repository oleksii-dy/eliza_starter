import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';
import { Keypair, Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { logger } from '@elizaos/core';

// Load environment variables from .env file
dotenv.config();

// Global test wallet for devnet
export let testKeypair: Keypair;
export let testConnection: Connection;
export let testPublicKey: PublicKey;

// Test configuration
export const TEST_CONFIG = {
    network: process.env.SOLANA_NETWORK || 'devnet',
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    commitment: 'confirmed' as const,
    skipPreflight: false,
    // Test wallet with some devnet SOL
    testMnemonic: process.env.TEST_WALLET_MNEMONIC || '',
    // Common test tokens on devnet
    tokens: {
        USDC: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vpe2QaEkt', // Devnet USDC
        USDT: 'H9gBUJs5Kc5zyiKRTzZcYom4Hpj8VPHBmEiGEReJsZpL', // Devnet USDT
    }
};

beforeAll(async () => {
    logger.info('Setting up test environment...');
    
    // Initialize connection
    testConnection = new Connection(TEST_CONFIG.rpcUrl, TEST_CONFIG.commitment);
    
    // Generate or load test keypair
    if (TEST_CONFIG.testMnemonic) {
        // In production, you'd derive from mnemonic
        // For now, using a random keypair
        testKeypair = Keypair.generate();
    } else {
        testKeypair = Keypair.generate();
    }
    
    testPublicKey = testKeypair.publicKey;
    
    // Check balance and request airdrop if needed
    try {
        const balance = await testConnection.getBalance(testPublicKey);
        logger.info(`Test wallet balance: ${balance / LAMPORTS_PER_SOL} SOL`);
        
        if (balance < 0.1 * LAMPORTS_PER_SOL && TEST_CONFIG.network === 'devnet') {
            logger.info('Requesting airdrop...');
            const signature = await testConnection.requestAirdrop(
                testPublicKey,
                1 * LAMPORTS_PER_SOL
            );
            await testConnection.confirmTransaction(signature);
            logger.info('Airdrop confirmed');
        }
    } catch (error) {
        logger.warn('Could not check balance or request airdrop:', error);
    }
    
    // Set environment variables for tests
    process.env.SOLANA_NETWORK = TEST_CONFIG.network;
    process.env.SOLANA_RPC_URL = TEST_CONFIG.rpcUrl;
    process.env.SOLANA_PUBLIC_KEY = testPublicKey.toBase58();
    process.env.WALLET_PUBLIC_KEY = testPublicKey.toBase58();
    
    logger.info('Test environment ready');
});

afterAll(async () => {
    logger.info('Cleaning up test environment...');
    // Any cleanup needed
});

/**
 * Helper to create a test runtime with real connections
 */
export function createTestRuntime(overrides: any = {}) {
    return {
        agentId: 'test-agent',
        character: {
            name: 'TestAgent',
            bio: ['Test agent for Solana plugin'],
            system: 'You are a test agent',
        },
        getSetting: (key: string) => {
            const settings: Record<string, string> = {
                SOLANA_RPC_URL: TEST_CONFIG.rpcUrl,
                SOLANA_NETWORK: TEST_CONFIG.network,
                SOLANA_PUBLIC_KEY: testPublicKey.toBase58(),
                WALLET_PUBLIC_KEY: testPublicKey.toBase58(),
                SOL_ADDRESS: 'So11111111111111111111111111111111111111112',
                SLIPPAGE: '1',
                ...overrides.settings,
            };
            return settings[key];
        },
        getService: (name: string) => {
            return overrides.services?.[name] || null;
        },
        db: {
            query: async () => []
            execute: async () => ({ changes: 0 }),
            ...overrides.db,
        },
        logger: {
            info: logger.info,
            warn: logger.warn,
            error: logger.error,
            debug: logger.debug,
        },
        providers: []
        actions: []
        evaluators: []
        ...overrides,
    };
}

/**
 * Helper to wait for transaction confirmation
 */
export async function waitForConfirmation(
    connection: Connection,
    signature: string,
    commitment: 'confirmed' | 'finalized' = 'confirmed'
): Promise<void> {
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction(
        {
            signature,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        },
        commitment
    );
}

/**
 * Helper to create test tokens on devnet
 */
export async function ensureTestTokens(): Promise<{
    usdcMint: PublicKey;
    usdtMint: PublicKey;
}> {
    return {
        usdcMint: new PublicKey(TEST_CONFIG.tokens.USDC),
        usdtMint: new PublicKey(TEST_CONFIG.tokens.USDT),
    };
}