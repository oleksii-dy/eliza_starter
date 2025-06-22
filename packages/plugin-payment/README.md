# @elizaos/plugin-payment

A comprehensive payment integration plugin for ElizaOS that enables agents to process payments, manage custodial wallets, and monetize actions.

## Overview

The payment plugin provides a flexible middleware system that allows any action to require payment before execution. It integrates with existing wallet services (EVM, Solana) and provides a unified interface for payment processing.

## Features

- **Payment Middleware**: Easily wrap any action to require payment
- **Multi-Currency Support**: USDC, ETH, SOL, and more
- **Wallet Integration**: Works with EVM and Solana wallet services
- **Custodial Wallets**: Manage user funds securely
- **Payment Confirmation**: Built-in confirmation flow for payments
- **Trust Integration**: Respects role-based permissions
- **Flexible Configuration**: Per-action payment requirements

## Installation

```bash
npm install @elizaos/plugin-payment
```

## Quick Start

### 1. Add the Plugin

```typescript
import { paymentPlugin } from '@elizaos/plugin-payment';

// Add to your agent's plugins
const agent = new Agent({
  plugins: [paymentPlugin],
  // ... other configuration
});
```

### 2. Use Payment Middleware

Wrap any action with payment requirements:

```typescript
import { createPaymentMiddleware, PaymentMethod } from '@elizaos/plugin-payment';

// Create your action handler
const myActionHandler = async (runtime, message, state, options, callback) => {
  // Your action logic here
  return true;
};

// Wrap with payment middleware
const paidActionHandler = createPaymentMiddleware({
  amount: BigInt(1000000), // 1 USDC (6 decimals)
  method: PaymentMethod.USDC_ETH,
  requiresConfirmation: true,
  skipForOwner: true, // Owners don't pay
})(myActionHandler);

// Use in your action
export const myPaidAction: Action = {
  name: 'MY_PAID_ACTION',
  handler: paidActionHandler,
  // ... rest of action config
};
```

## Example: Research Action

The plugin includes a sample research action that costs 1 USDC:

```typescript
import { researchAction } from '@elizaos/plugin-payment';

// User: "research the latest developments in AI"
// Assistant: "This research request requires payment of 1 USDC. Please confirm to proceed."
// User: "confirm"
// Assistant: *provides research results*
```

## Payment Methods

Supported payment methods:

- `USDC_ETH` - USDC on Ethereum
- `USDC_SOL` - USDC on Solana
- `ETH` - Native Ethereum
- `SOL` - Native Solana
- `BTC` - Bitcoin (coming soon)
- `MATIC` - Polygon
- `ARB` - Arbitrum
- `OP` - Optimism
- `BASE` - Base

## Configuration

### Payment Service Configuration

```typescript
const paymentConfig = {
  enabled: true,
  preferredMethods: [PaymentMethod.USDC_ETH, PaymentMethod.ETH],
  minimumConfirmations: new Map([
    [PaymentMethod.USDC_ETH, 12],
    [PaymentMethod.ETH, 12],
  ]),
  maxTransactionAmount: new Map([
    [PaymentMethod.USDC_ETH, BigInt(10000) * BigInt(10 ** 6)], // 10k USDC
  ]),
  requireConfirmationAbove: new Map([
    [PaymentMethod.USDC_ETH, BigInt(100) * BigInt(10 ** 6)], // 100 USDC
  ]),
  feePercentage: 0.01, // 1% fee
  timeoutSeconds: 300, // 5 minutes
};
```

### Middleware Options

```typescript
interface PaymentMiddlewareOptions {
  amount: bigint; // Amount in smallest unit
  method: PaymentMethod; // Payment currency
  requiresConfirmation?: boolean; // Require user confirmation
  skipForOwner?: boolean; // Skip payment for owners
  skipForAdmin?: boolean; // Skip payment for admins
  skipForRole?: string; // Skip for specific role
  metadata?: any; // Additional metadata
}
```

## Architecture

### Core Components

1. **PaymentService**: Main service handling payment processing
2. **Payment Middleware**: Wraps actions to require payment
3. **Wallet Adapters**: Integrate with different wallet services
4. **Payment Confirmation**: Task-based confirmation flow

### Payment Flow

1. User triggers a paid action
2. Middleware checks user balance
3. If insufficient funds, prompts for payment
4. Creates confirmation task if required
5. Processes payment on confirmation
6. Executes original action
7. Emits payment events

## API Reference

### IPaymentService

```typescript
interface IPaymentService {
  // Process a payment request
  processPayment(request: PaymentRequest, runtime: IAgentRuntime): Promise<PaymentResult>;

  // Check payment status
  checkPaymentStatus(paymentId: UUID, runtime: IAgentRuntime): Promise<PaymentStatus>;

  // Get user balance
  getUserBalance(userId: UUID, runtime: IAgentRuntime): Promise<Map<PaymentMethod, bigint>>;

  // Transfer to main wallet
  transferToMainWallet(
    userId: UUID,
    amount: bigint,
    method: PaymentMethod,
    runtime: IAgentRuntime
  ): Promise<PaymentResult>;

  // Check if user has sufficient funds
  hasSufficientFunds(
    userId: UUID,
    amount: bigint,
    method: PaymentMethod,
    runtime: IAgentRuntime
  ): Promise<boolean>;
}
```

### Payment Events

The service emits events for payment lifecycle:

- `PAYMENT_REQUESTED`
- `PAYMENT_PROCESSING`
- `PAYMENT_CONFIRMING`
- `PAYMENT_COMPLETED`
- `PAYMENT_FAILED`
- `PAYMENT_CANCELLED`

## Trust Integration

The payment system integrates with the trust system:

- Owners and admins can be exempted from payments
- Role-based payment requirements
- Trust scores can affect payment limits

## Future Enhancements

- [ ] Subscription payments
- [ ] Recurring billing
- [ ] Payment plans
- [ ] Multi-signature payments
- [ ] Escrow services
- [ ] Payment analytics
- [ ] Refund system
- [ ] Invoice generation

## Contributing

Contributions are welcome! Please see the main ElizaOS contributing guidelines.

## License

MIT - see LICENSE file for details
