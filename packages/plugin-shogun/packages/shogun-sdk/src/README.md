# Shogun SDK

Integration SDK for Shogun Network API.

## Installation

```bash
pnpm install
```

## Build

```bash
pnpm build
```

## Environment Setup

Create a `.env` file in the root of the SDK package:

```env
# API Configuration
BASE_URL=https://api.intensitylabs.ai
API_KEY=ticc2iafmlc

# Network RPCs (optional)
SOLANA_RPC=https://api.mainnet-beta.solana.com
```

## Testing

Run the test suite:

```bash
pnpm test
```

Watch mode for development:

```bash
pnpm test:watch
```

### Test Coverage
The test suite currently covers:
- Quote fetching with valid EVM addresses on Base network
- Token swap parameters validation (ETH/USDC pairs)
- Dextra API response handling and estimation formatting