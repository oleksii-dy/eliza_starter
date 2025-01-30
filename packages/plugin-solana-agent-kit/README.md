# @elizaos/plugin-solana-agent-kit

A Solana blockchain plugin for Eliza OS that integrates with solana-agent-kit to provide essential blockchain operations and DeFAi capabilities.

## Overview

The [Solana Agent Kit](https://github.com/sendaifun/solana-agent-kit) plugin serves as a bridge between Eliza OS and the [Solana](https://solana.com) blockchain, providing a suite of actions for token operations, DeFi interactions, and asset management. It leverages the solana-agent-kit library to enable secure and efficient blockchain operations.

## Features

### Token Operations
- **Token Creation**: Deploy new tokens with customizable parameters
- **Token Transfers**: Send tokens between wallets
- **Token Info**: Retrieve detailed token information

### DeFi Operations
- **Token Swaps**: Execute trades between tokens
- **Lending**: Participate in lending protocols
- **Staking**: Stake tokens for rewards

### Work Platform Integration
- **GibWork Tasks**: Create and manage tasks on the GibWork platform
- **Task Management**: Handle task creation and rewards

## Installation

```bash
npm install @elizaos/plugin-solana-agent-kit
```

## Configuration

The plugin requires several environment variables for proper operation:

```typescript
const envSchema = {
    TEE_MODE: string(optional),                    // Trusted Execution Environment mode
    WALLET_SECRET_SALT: string(optional),          // Salt for wallet key derivation
    SOLANA_PRIVATE_KEY: string,                    // Wallet private key
    SOLANA_PUBLIC_KEY: string,                     // Wallet public key
    SOLANA_RPC_URL: string,                        // Solana RPC endpoint
    OPENAI_API_KEY: string(optional),              // OpenAI API key for certain operations
};
```

## Actions

### createToken
Creates a new token on the Solana blockchain.

```typescript
const result = await runtime.executeAction("CREATE_TOKEN", {
    name: "Example Token",
    uri: "https://example.com/token.json",
    symbol: "EXMPL",
    decimals: 9,
    initialSupply: 1000000
});
```

### transfer
Transfers tokens between wallets.

```typescript
const result = await runtime.executeAction("TRANSFER", {
    tokenAddress: "TokenAddressHere",
    recipient: "RecipientAddressHere",
    amount: "1000"
});
```

### swap
Executes token swaps.

```typescript
const result = await runtime.executeAction("SWAP", {
    inputTokenSymbol: "SOL",
    outputTokenSymbol: "USDC",
    amount: 0.1
});
```

### lend
Participates in lending protocols.

```typescript
const result = await runtime.executeAction("LEND", {
    amount: 100
});
```

### stake
Stakes tokens for rewards.

```typescript
const result = await runtime.executeAction("STAKE", {
    amount: 100
});
```

### getTokenInfo
Retrieves token information.

```typescript
const result = await runtime.executeAction("GET_TOKEN_INFO", {
    tokenAddress: "TokenAddressHere"
});
```

### gibwork
Creates tasks on the GibWork platform.

```typescript
const result = await runtime.executeAction("CREATE_GIBWORK_TASK", {
    title: "Build a Solana dApp",
    content: "Create a simple Solana dApp with React frontend",
    requirements: "Experience with Rust and React",
    tags: ["solana", "rust", "react"],
    tokenMintAddress: "TokenAddressHere",
    tokenAmount: 100
});
```

## Security Features

### Wallet Management
- Secure key derivation and storage
- TEE (Trusted Execution Environment) support
- Multiple key format support (base58, base64)

### Transaction Safety
- Input validation
- Error handling
- Transaction confirmation checks

## Development

```bash
# Build the plugin
npm run build

# Run tests
npm run test

# Run linting
npm run lint
```

## Dependencies

Key dependencies include:
- @coral-xyz/anchor
- @solana/web3.js
- @solana/spl-token
- solana-agent-kit
- bignumber.js
- bs58

## Contributing

Contributions are welcome! Please ensure your pull requests adhere to the following guidelines:
- Follow the existing code style
- Add tests for new functionality
- Update documentation as needed

## License

This plugin is part of the Eliza project. See the main project repository for license information.
