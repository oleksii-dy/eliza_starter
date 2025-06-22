# Crossmint Adapter Documentation

## Overview

The CrossmintAdapter integrates the Crossmint enterprise blockchain platform into the payment plugin, providing secure MPC (Multi-Party Computation) wallets and cross-chain payment capabilities.

## Features

- **MPC Wallets**: Secure multi-party computation wallets that don't expose private keys
- **Cross-Chain Support**: Ethereum, Polygon, Arbitrum, Optimism, Base, BSC, and Solana
- **Enterprise Security**: Bank-grade security without compromising on usability
- **Multiple Currencies**: Support for USDC, ETH, SOL, MATIC, and other major tokens

## Configuration

To use the CrossmintAdapter, ensure the Crossmint plugin is installed and configured:

```bash
npm install @elizaos/plugin-crossmint
```

### Environment Variables

```env
# Crossmint Configuration
CROSSMINT_API_KEY=your_api_key
CROSSMINT_PROJECT_ID=your_project_id
CROSSMINT_ENVIRONMENT=production  # or sandbox
```

## Supported Payment Methods

The CrossmintAdapter supports the following payment methods:

- `PaymentMethod.USDC_ETH` - USDC on Ethereum
- `PaymentMethod.ETH` - Native Ethereum
- `PaymentMethod.MATIC` - Polygon MATIC
- `PaymentMethod.ARB` - Arbitrum ETH
- `PaymentMethod.OP` - Optimism ETH
- `PaymentMethod.BASE` - Base ETH
- `PaymentMethod.USDC_SOL` - USDC on Solana
- `PaymentMethod.SOL` - Native Solana

## Usage Example

```typescript
import { PaymentService } from '@elizaos/plugin-payment';
import { PaymentMethod } from '@elizaos/plugin-payment/types';

// The adapter is automatically loaded when Crossmint plugin is available
const paymentService = runtime.getService('payment') as PaymentService;

// Process a payment using Crossmint MPC wallet
const paymentRequest = {
  id: asUUID('payment-001'),
  userId: asUUID('user-001'),
  agentId: runtime.agentId,
  actionName: 'PAYMENT',
  amount: BigInt(1000000), // 1 USDC (6 decimals)
  method: PaymentMethod.USDC_ETH,
  recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e',
  metadata: {
    description: 'Payment via Crossmint MPC wallet',
  },
};

const result = await paymentService.processPayment(paymentRequest, runtime);
```

## MPC Wallet Security

Crossmint MPC wallets provide enterprise-grade security:

1. **No Single Point of Failure**: Private keys are split across multiple parties
2. **No Key Exposure**: Private keys are never assembled in one place
3. **Audit Trail**: All transactions are logged and auditable
4. **Recovery Options**: Secure recovery without seed phrases

## Cross-Chain Operations

The adapter automatically handles cross-chain complexity:

```typescript
// Ethereum payment
const ethPayment = {
  method: PaymentMethod.ETH,
  amount: BigInt(1e18), // 1 ETH
  recipientAddress: '0x...',
};

// Solana payment (same interface)
const solPayment = {
  method: PaymentMethod.SOL,
  amount: BigInt(1e9), // 1 SOL
  recipientAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZjDpNqYV4N',
};
```

## Integration with Payment Service

The CrossmintAdapter is automatically detected and loaded by the PaymentService when:

1. The `@elizaos/plugin-crossmint` plugin is installed
2. The required Crossmint services are available in the runtime
3. Valid API credentials are configured

## Error Handling

Common errors and solutions:

| Error | Solution |
|-------|----------|
| "No Crossmint services found" | Ensure the Crossmint plugin is loaded before the payment plugin |
| "Invalid API credentials" | Check CROSSMINT_API_KEY and CROSSMINT_PROJECT_ID |
| "Unsupported chain" | Verify the payment method is supported by Crossmint |
| "Insufficient balance" | The MPC wallet needs to be funded |

## Testing

A test scenario is included for the CrossmintAdapter:

```bash
# Run the Crossmint integration scenario
npm test -- --scenario=payment-crossmint-integration
```

## Best Practices

1. **Use MPC for High-Value Transactions**: MPC wallets are ideal for treasury management
2. **Monitor Transaction Status**: Use the payment service events to track transaction progress
3. **Handle Network Delays**: Cross-chain operations may take longer than single-chain
4. **Implement Retry Logic**: Network issues may require transaction retries

## Limitations

- MPC wallets don't expose private keys (by design)
- Some DeFi protocols may not support MPC wallet signatures
- Cross-chain bridging is not yet implemented
- Balance queries require blockchain RPC access

## Support

For issues specific to the CrossmintAdapter:
- Check the [Crossmint documentation](https://docs.crossmint.com)
- Review the adapter logs for detailed error messages
- Ensure all required services are properly initialized 