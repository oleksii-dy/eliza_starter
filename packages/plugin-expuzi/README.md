# @elizaos/plugin-expuzi

A plugin for DeFi token analysis and risk assessment within the ElizaOS ecosystem.

## Description

The Expuzi plugin provides comprehensive token analysis capabilities, including contract auditing, risk scoring, market data analysis, and social sentiment tracking. It helps users evaluate DeFi tokens by analyzing multiple risk factors and providing actionable insights.

## Installation

```bash
pnpm install @elizaos/plugin-expuzi
```

## Configuration

The plugin requires the following environment variables:

```typescript
WALLET_ADDRESS=<Your Sui wallet address>
COINGECKO_API_KEY=<Your CoinGecko API key>
```

## Usage

### Basic Integration

```typescript
import { DefiDetectorPlugin } from "@elizaos/plugin-expuzi";
```

### Analysis Examples

```typescript
// The plugin responds to natural language commands like:

"Audit BTC";
"Check risk score for ETH";
"Analyze token contract 0x123...";
"Evaluate token safety for USDC";
```

## API Reference

### Actions

#### AUDIT_TOKEN

Performs comprehensive token analysis including contract, market, and social metrics.

**Capabilities:**
- Contract analysis
- Risk scoring (0-100)
- Market data analysis
- Social sentiment tracking
- Warning detection

## Risk Scoring System

The plugin uses a 100-point risk scoring system:

1. **Market Risk (0-25 points)**
   - Price volatility
   - Market cap assessment
   - Volume analysis
   - Liquidity metrics

2. **Contract Risk (0-25 points)**
   - Code quality
   - Ownership structure
   - Supply distribution
   - Technical configuration

## Development Guide

### Setting Up Development Environment

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

3. Run tests:

```bash
pnpm test
```

4. Build the plugin:

```bash
pnpm run build
```

## Future Enhancements

1. **Advanced Analysis Features**
   - Multi-chain support
   - Historical trend analysis
   - Machine learning integration
   - Automated risk alerts

2. **Integration Capabilities**
   - DEX liquidity analysis
   - Cross-chain data aggregation
   - Real-time price monitoring
   - Automated trading signals

3. **Security Features**
   - Smart contract vulnerability scanning
   - Rug pull detection
   - Wallet interaction analysis
   - Transaction simulation

## Contributing

Contributions are welcome! Please see the [CONTRIBUTING.md](../../CONTRIBUTING.md) file for guidelines.

## Credits

This plugin integrates with:
- [Sui Network](https://sui.io/): Smart contract platform
- [CoinGecko](https://www.coingecko.com/): Market data provider
- [ElizaOS](https://github.com/lggg123/eliza): Core platform

## License

This plugin is part of the Eliza project. See the main repository for license information.