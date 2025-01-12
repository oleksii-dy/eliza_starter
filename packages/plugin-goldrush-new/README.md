# @elizaos/plugin-goldrush

A plugin for ElizaOS that integrates Covalent's GoldRush SDK for cross-chain wallet monitoring.

## Features

- Cross-chain wallet balance tracking (in chain's native currency)
- Basic transaction history (last 10 transactions)
- Support for multiple chains:
    - Ethereum
    - Solana
    - Algorand
    - Aptos
    - Cosmos
    - Tron
- Comprehensive error handling and logging

## Installation

```bash
pnpm add @elizaos/plugin-goldrush
```

## Configuration

1. Get a Covalent API key from [Covalent](https://www.covalenthq.com/platform/auth/register/)

2. Add your API key to your ElizaOS environment:

```bash
# .env file
COVALENT_API_KEY=your_api_key_here
```

3. Add the plugin to your ElizaOS configuration:

```typescript
import { goldrushPlugin } from "@elizaos/plugin-goldrush";

// The plugin will be automatically loaded if COVALENT_API_KEY is present
const config = {
    plugins: [goldrushPlugin],
};
```

## Usage

The plugin provides a provider that can be used to fetch wallet data:

```typescript
try {
    // Get wallet data - note that runtime parameter is required
    const result = await runtime.providers.goldrush.get(runtime, {
        address: "0x123...",
        chain: "eth-mainnet" // Optional, defaults to eth-mainnet
    });

    // The result includes:
    {
        address: string;        // The wallet address
        balance: string;        // Balance in chain's native currency (e.g., ETH for Ethereum)
        transactions: string[]; // Array of transaction hashes (up to 10 most recent)
        lastUpdated: number;    // Timestamp of when the data was fetched
    }
} catch (error) {
    // Handle specific error cases
    if (error.message.includes("Invalid Ethereum address")) {
        console.error("The provided address is not a valid Ethereum address");
    } else if (error.message.includes("Unsupported chain")) {
        console.error("The specified blockchain is not supported");
    } else if (error.message.includes("Invalid API key")) {
        console.error("Please check your Covalent API key configuration");
    } else {
        console.error("An error occurred while fetching wallet data:", error);
    }
}
```

## Supported Chains

- eth-mainnet (Ethereum Mainnet)
- solana-mainnet
- algorand-mainnet
- aptos-mainnet
- cosmos-mainnet
- tron-mainnet

## Error Messages

The provider may throw the following errors:

- `"Covalent API key is required"` - When initializing without an API key
- `"Invalid API key"` - When the provided API key is invalid
- `"Wallet address is required"` - When calling get() without an address
- `"Invalid Ethereum address format"` - When the address doesn't match the expected format
- `"Unsupported chain: {chain}"` - When the specified chain is not supported
- `"Failed to fetch wallet balances"` - When the Covalent API request fails
- `"An unknown error occurred while fetching wallet data"` - For unexpected errors

## Error Handling

The provider includes error handling for common scenarios:

- Invalid API key validation on initialization
- Invalid wallet address format checking
- Unsupported chain validation
- Network error handling with appropriate error messages
- Graceful handling of failed transaction fetches (continues with empty array)

## License

MIT
