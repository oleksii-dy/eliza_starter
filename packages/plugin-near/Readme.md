# Plugin Near

A plugin designed for handling NEAR blockchain operations with support for actions like token transfers and swaps.

## Overview

The Plugin Near provides developers with a seamless way to interact with the NEAR blockchain. It includes functionality for wallet interactions, token transfers, and token swaps, making it easier to build NEAR-based applications.

### Features

- Wallet integration
- Token transfer capabilities
- Token swap functionality

## Installation Instructions

To install the plugin, use the following command:

```bash
npm install plugin-near
```

## Configuration Requirements

### Environment Variables

Ensure the following environment variables are set:

| Variable Name       | Description                                              |
| ------------------- | -------------------------------------------------------- |
| `NEAR_NETWORK`      | NEAR network to connect to (e.g., `testnet`, `mainnet`). |
| `WALLET_SECRET_KEY` | Secret key for the wallet.                               |
| `RPC_URL`           | RPC endpoint for NEAR interactions.                      |

### TypeScript Configuration

The plugin assumes a TypeScript environment. Ensure your `tsconfig.json` includes the necessary compiler options:

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "target": "ES6",
    "moduleResolution": "node",
    "strict": true
  }
}
```

## Usage Examples

### Wallet Provider

The Wallet Provider enables interactions with a NEAR wallet.

```typescript
import { WalletProvider } from 'plugin-near';

const wallet = new WalletProvider();

// Connect to a wallet
await wallet.connect();

// Check wallet balance
const balance = await wallet.getBalance();
console.log('Wallet Balance:', balance);
```

### Transfer Tokens

The Transfer action allows transferring tokens to another address.

```typescript
import { transfer } from 'plugin-near/actions/transfer';

const transferResult = await transfer({
  to: 'receiver.near',
  amount: '10', // in NEAR tokens
  walletProvider: wallet,
});

console.log('Transfer Successful:', transferResult);
```

### Swap Tokens

The Swap action facilitates token swaps.

```typescript
import { swap } from 'plugin-near/actions/swap';

const swapResult = await swap({
  fromToken: 'near',
  toToken: 'dai',
  amount: '5', // in NEAR tokens
  walletProvider: wallet,
});

console.log('Swap Successful:', swapResult);
```

## API Reference

### WalletProvider

#### Methods

- `connect()`: Connects to the wallet.
- `getBalance()`: Fetches the wallet's balance.

### Transfer

#### Parameters

- `to`: Address to transfer tokens to.
- `amount`: Amount of tokens to transfer.
- `walletProvider`: An instance of `WalletProvider`.

#### Returns

A promise that resolves with the transaction result.

### Swap

#### Parameters

- `fromToken`: Token to swap from.
- `toToken`: Token to swap to.
- `amount`: Amount to swap.
- `walletProvider`: An instance of `WalletProvider`.

#### Returns

A promise that resolves with the swap result.

## Common Issues/Troubleshooting

### Issue: Insufficient Funds

**Solution**: Ensure the wallet has enough balance for the transaction, including gas fees.

### Issue: RPC Endpoint Unreachable

**Solution**: Verify the `RPC_URL` environment variable is set correctly and the endpoint is operational.

### Issue: Wallet Connection Fails

**Solution**: Check that the `WALLET_SECRET_KEY` is correctly set and the wallet supports the NEAR network specified.

## Additional Documentation

### Examples Folder

Include sample projects in the `examples/` directory for users to reference.

### Testing Guide

- Run tests using `npm test`.
- Ensure integration tests cover all major functionalities.

### Plugin Development Guide

To extend this plugin, add new actions or providers in the `src/` directory.

### Security Best Practices

- Store secret keys securely.
- Use environment variables for sensitive information.
- Regularly update dependencies.

### Performance Optimization Guide

- Optimize RPC calls by batching transactions where possible.
- Use efficient algorithms for token operations.

## License

MIT
