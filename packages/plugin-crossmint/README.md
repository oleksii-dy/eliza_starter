# CrossMint Plugin for ElizaOS

Enterprise blockchain infrastructure plugin providing MPC wallets, X.402 payment protocol support, and cross-chain capabilities.

## Features

- **MPC Wallets**: Multi-Party Computation wallets for enhanced security
- **X.402 Payment Protocol**: HTTP-native payment requests and processing
- **Cross-Chain Support**: Ethereum, Polygon, Arbitrum, Optimism, Base, BSC, Solana
- **NFT Infrastructure**: Minting, management, and collection support
- **Enterprise Security**: Production-grade blockchain infrastructure
- **Real-time Verification**: Instant payment status and settlement tracking

## Installation

```bash
npm install @elizaos/plugin-crossmint
```

## Configuration

Set the following environment variables:

```bash
# Required
CROSSMINT_API_KEY=your_crossmint_api_key
CROSSMINT_PROJECT_ID=your_project_id

# Optional
CROSSMINT_ENVIRONMENT=sandbox  # or 'production'
CROSSMINT_BASE_URL=https://api.crossmint.io/api/v1
CROSSMINT_WEBHOOK_SECRET=your_webhook_secret
CROSSMINT_RETRY_ATTEMPTS=3
CROSSMINT_RETRY_DELAY=1000
CROSSMINT_TIMEOUT=30000
CROSSMINT_ENABLE_WEBHOOKS=false
CROSSMINT_WEBHOOK_ENDPOINT=https://your-domain.com/webhooks/crossmint
```

## Usage

### In Agent Configuration

```typescript
import { crossmintPlugin } from '@elizaos/plugin-crossmint';

export const character = {
  name: "CrossMint Agent",
  plugins: [crossmintPlugin],
  // ... other configuration
};
```

### Available Actions

#### CREATE_X402_PAYMENT
Create HTTP-native payment requests using X.402 protocol:

```
"Create a payment request for 25 USDC on Ethereum"
"Request payment of 0.1 SOL from someone"
```

#### CROSSMINT_TRANSFER
Transfer tokens using MPC wallets:

```
"Send 100 USDC to 0x742d35Cc6639C0532fBa4c81D63eD2c0c57C1234 on Ethereum"
"Transfer 0.5 SOL to 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
```

#### CREATE_CROSSMINT_WALLET
Create MPC or custodial wallets:

```
"Create an MPC wallet on Ethereum for me"
"I need a new Solana wallet called 'Trading Wallet'"
```

#### MINT_NFT
Mint NFTs using CrossMint infrastructure:

```
"Mint an NFT called 'Digital Artwork #1' to address 0x... using contract 0x..."
"Create NFT 'Special Edition Card' with description 'Limited edition' on Polygon"
```

#### CHECK_PAYMENT_STATUS
Verify X.402 payment completion:

```
"Check the status of payment payment-123abc456def"
"What is the status of my payment ID payment-789xyz?"
```

### Providers

The plugin includes several providers for context:

- **CROSSMINT_WALLET**: Wallet information and capabilities
- **CROSSMINT_PORTFOLIO**: Portfolio and balance information (dynamic)
- **CROSSMINT_PAYMENTS**: X.402 payment information (dynamic)

## X.402 Payment Protocol

CrossMint implements the X.402 payment protocol, enabling HTTP-native payments:

```typescript
// Example X.402 payment request
{
  "id": "payment-123",
  "amount": "25.00",
  "currency": "USDC",
  "network": "ethereum",
  "description": "Service payment",
  "paymentLink": "https://crossmint.io/pay/...",
  "expiresAt": "2024-01-01T12:00:00Z"
}
```

## Supported Networks

- **Ethereum** (ETH)
- **Polygon** (MATIC)
- **Arbitrum** (ETH)
- **Optimism** (ETH)
- **Base** (ETH)
- **BSC** (BNB)
- **Solana** (SOL)

## Security Features

- **MPC Wallets**: Distributed key management
- **Enterprise Infrastructure**: Production-grade security
- **API Key Authentication**: Secure API access
- **Webhook Verification**: Signed webhook payloads
- **Rate Limiting**: Built-in retry logic with exponential backoff

## Error Handling

The plugin includes comprehensive error handling:

- **CrossMintError**: Base error class
- **CrossMintAuthError**: Authentication failures
- **CrossMintValidationError**: Input validation errors
- **CrossMintNetworkError**: Network and API errors

## Development

```bash
# Build the plugin
bun run build

# Run tests
bun test

# Type checking
bun run type-check
```

## API Reference

### Services

- **CrossMintService**: Core API client
- **CrossMintUniversalWalletService**: Universal wallet interface implementation

### Types

- **X402PaymentRequest/Response**: Payment protocol types
- **CrossMintWallet**: Wallet management types
- **CrossMintTransaction**: Transaction types
- **CrossMintNFT**: NFT types

## Support

For issues and questions:

1. Check the [CrossMint Documentation](https://docs.crossmint.io)
2. Review the plugin source code
3. Open an issue in the ElizaOS repository

## License

MIT License - see LICENSE file for details.