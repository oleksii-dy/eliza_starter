# @elizaos/plugin-bridge

Cross-chain bridge aggregation plugin for ElizaOS that supports multiple protocols including LiFi, Wormhole, Hop, and Synapse for seamless token transfers across EVM chains.

## Features

- 🌉 **Multi-Protocol Support**: Integrates with LiFi, Wormhole, Hop, Synapse, and other major bridge protocols
- ⛓️ **Multi-Chain**: Supports Ethereum, Polygon, Arbitrum, Optimism, Base, and other EVM chains
- 🔄 **Route Optimization**: Automatically finds the best bridge routes based on cost, speed, and reliability
- 💰 **Fee Transparency**: Clear breakdown of gas costs, protocol fees, and slippage
- 🛡️ **Security**: Built-in validation, error handling, and slippage protection
- 📊 **Transaction Tracking**: Monitor bridge transaction status and completion

## Installation

```bash
npm install @elizaos/plugin-bridge
```

## Configuration

Add the following environment variables to your `.env` file:

```bash
# Required: Private key for EVM transactions (hex format with 0x prefix)
EVM_PRIVATE_KEY=0x1234567890abcdef...

# Optional: Supported EVM chains (comma-separated)
EVM_CHAINS=mainnet,arbitrum,polygon,base,optimism

# Optional: Default RPC provider URL
EVM_PROVIDER_URL=https://eth.llamarpc.com
```

## Usage

### In Agent Configuration

```json
{
  "name": "Bridge Agent",
  "plugins": ["@elizaos/plugin-bridge"],
  "settings": {
    "EVM_PRIVATE_KEY": "0x...",
    "EVM_CHAINS": "mainnet,arbitrum,polygon,base,optimism"
  }
}
```

### Natural Language Commands

The plugin responds to various bridge-related commands:

```
"Bridge 100 USDC from Ethereum to Polygon"
"Cross-chain transfer 0.5 ETH to Arbitrum"
"Move 1000 USDT from Polygon to Base"
"Send tokens to Optimism"
```

## Architecture

The plugin is built with a clean architecture consisting of:

- **BridgeService**: Core service managing bridge operations
- **Bridge Action**: Natural language processing for bridge requests
- **Bridge Info Provider**: Context provider for bridge capabilities
- **Comprehensive Testing**: E2E tests ensuring reliability

## License

MIT License
EOF < /dev/null