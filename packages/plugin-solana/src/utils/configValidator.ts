import { IAgentRuntime, logger } from '@elizaos/core';

interface ConfigValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export function validateSolanaConfig(runtime: IAgentRuntime): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required settings
    const requiredSettings = [
        { key: 'SOL_ADDRESS', description: 'Native SOL token address' },
        { key: 'SLIPPAGE', description: 'Default slippage tolerance' },
    ];

    // Recommended settings
    const recommendedSettings = [
        { key: 'SOLANA_RPC_URL', description: 'Solana RPC endpoint', default: 'https://api.mainnet-beta.solana.com' },
        { key: 'SOLANA_NETWORK', description: 'Solana network', default: 'mainnet-beta' },
        { key: 'HELIUS_API_KEY', description: 'Helius API key for enhanced RPC' },
        { key: 'BIRDEYE_API_KEY', description: 'Birdeye API key for price data' },
    ];

    // Check required settings
    for (const setting of requiredSettings) {
        const value = runtime.getSetting(setting.key);
        if (!value) {
            errors.push(`Missing required setting: ${setting.key} - ${setting.description}`);
        }
    }

    // Check wallet configuration
    const walletSecretKey = runtime.getSetting('WALLET_SECRET_KEY');
    const walletPrivateKey = runtime.getSetting('WALLET_PRIVATE_KEY');
    const solanaPrivateKey = runtime.getSetting('SOLANA_PRIVATE_KEY');
    const walletSecretSalt = runtime.getSetting('WALLET_SECRET_SALT');

    if (!walletSecretKey && !walletPrivateKey && !solanaPrivateKey && !walletSecretSalt) {
        errors.push('No wallet configuration found. You must provide one of: WALLET_SECRET_KEY, WALLET_PRIVATE_KEY, SOLANA_PRIVATE_KEY, or WALLET_SECRET_SALT');
    }

    // Check recommended settings
    for (const setting of recommendedSettings) {
        const value = runtime.getSetting(setting.key);
        if (!value) {
            warnings.push(`Missing recommended setting: ${setting.key} - ${setting.description}. Using default: ${setting.default || 'none'}`);
        }
    }

    // Validate RPC URL format
    const rpcUrl = runtime.getSetting('SOLANA_RPC_URL');
    if (rpcUrl && !isValidUrl(rpcUrl)) {
        errors.push(`Invalid SOLANA_RPC_URL format: ${rpcUrl}`);
    }

    // Validate network
    const network = runtime.getSetting('SOLANA_NETWORK');
    const validNetworks = ['mainnet-beta', 'testnet', 'devnet', 'localnet'];
    if (network && !validNetworks.includes(network)) {
        warnings.push(`Unknown SOLANA_NETWORK: ${network}. Valid options: ${validNetworks.join(', ')}`);
    }

    // Validate slippage
    const slippage = runtime.getSetting('SLIPPAGE');
    if (slippage) {
        const slippageNum = parseFloat(slippage);
        if (isNaN(slippageNum) || slippageNum < 0 || slippageNum > 100) {
            errors.push(`Invalid SLIPPAGE value: ${slippage}. Must be a number between 0 and 100`);
        }
    }

    // Log results
    if (errors.length > 0) {
        logger.error('Solana plugin configuration errors:', errors);
    }
    if (warnings.length > 0) {
        logger.warn('Solana plugin configuration warnings:', warnings);
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

export function generateConfigTemplate(): string {
    return `# Solana Plugin Configuration Template
# Add these to your .env file

# Required Settings
SOL_ADDRESS=So11111111111111111111111111111111111111112
SLIPPAGE=1

# Wallet Configuration (provide one of these)
# Option 1: Base58 encoded secret key
WALLET_SECRET_KEY=your_base58_secret_key_here

# Option 2: Alternative names for the private key
# WALLET_PRIVATE_KEY=your_private_key_here
# SOLANA_PRIVATE_KEY=your_private_key_here

# Option 3: Salt for key derivation
# WALLET_SECRET_SALT=your_salt_here

# Network Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_NETWORK=mainnet-beta

# Optional: Enhanced RPC and Price Data
# HELIUS_API_KEY=your_helius_api_key
# BIRDEYE_API_KEY=your_birdeye_api_key

# Optional: Public key (if using salt-based derivation)
# WALLET_PUBLIC_KEY=your_public_key_here
`;
} 