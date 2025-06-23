# ElizaOS AgentKit Plugin

A comprehensive blockchain interaction plugin for ElizaOS that integrates Coinbase's AgentKit to provide wallet management and blockchain operations across multiple chains.

## Features

- **Multi-chain Support**: EVM (Ethereum, Base, etc.) and SVM (Solana) networks
- **30+ Action Providers**: DeFi, NFTs, bridges, social, and data operations
- **Multiple Wallet Providers**: CDP, Viem, Privy, ZeroDev, Smart Wallets
- **Service Architecture**: Proper ElizaOS service pattern with lifecycle management
- **Admin Panel**: React-based frontend for wallet management and action execution
- **Comprehensive Testing**: Unit tests, E2E runtime tests, and Cypress frontend tests

## Installation

```bash
bun install @elizaos/plugin-agentkit
```

## Configuration

Set the following environment variables:

```env
# Required for CDP Wallet Provider
CDP_API_KEY_NAME=your_api_key_name
CDP_API_KEY_PRIVATE_KEY=your_api_key_private_key

# Optional
CDP_NETWORK_ID=base-mainnet  # default: base-mainnet
```

## Usage

### Character Configuration

Add the plugin to your character file:

```json
{
    "name": "Your Agent",
    "plugins": ["@elizaos/plugin-agentkit"],
    "settings": {
        "CDP_API_KEY_NAME": "your_api_key_name",
        "CDP_API_KEY_PRIVATE_KEY": "your_api_key_private_key",
        "CDP_NETWORK_ID": "base-mainnet"
    }
}
```

### Available Actions

The plugin dynamically registers actions based on the available AgentKit tools:

- **Wallet Operations**: GET_BALANCE, TRANSFER, NATIVE_TRANSFER
- **DeFi**: SWAP, STAKE, LEND, BORROW (Compound, Morpho, Moonwell)
- **NFTs**: MINT_NFT, TRANSFER_NFT (ERC721)
- **Tokens**: DEPLOY_TOKEN, TRANSFER_TOKEN (ERC20)
- **Bridges**: ACROSS_BRIDGE
- **Data**: PYTH_PRICE, MESSARI_DATA, DEFILLAMA_TVL
- **Social**: BASENAME_REGISTER, FARCASTER_POST

### Wallet Provider

The plugin provides wallet context to the agent:

```typescript
// The wallet provider adds wallet information to the agent's context
const walletInfo = await runtime.providers.find(p => p.name === 'agentKitWallet').get(runtime, message, state);
// Returns: { walletAddress: "0x...", balance: { ETH: "1.5", USDC: "1000" } }
```

### Admin Panel

Access the admin panel at: `/api/agents/{agentId}/plugins/agentkit/admin`

Features:
- View wallet address and balances
- Execute actions with parameters
- Real-time transaction status
- Error handling and validation

## Architecture

### Service Pattern

```typescript
export class AgentKitService extends Service {
    static serviceName = "agentkit";
    static serviceType = ServiceType.WALLET;
    
    // Lifecycle management
    static async start(runtime: IAgentRuntime): Promise<AgentKitService>
    async stop(): Promise<void>
    
    // AgentKit access
    getAgentKit(): CdpAgentkit | null
    isReady(): boolean
}
```

### Action Chaining

Actions return `ActionResult` for chaining:

```typescript
interface ActionResult {
    success: boolean;
    data?: any;
    error?: string;
    metadata: {
        toolName: string;
        [key: string]: any;
    };
}
```

### Routes

The plugin exposes several API routes:

- `GET /api/agentkit/wallet` - Get wallet information
- `GET /api/agentkit/actions` - List available actions
- `POST /api/agentkit/execute` - Execute an action
- `GET /api/agentkit/config` - Get configuration status
- `GET /admin` - Admin panel UI

## Testing

### Unit Tests

```bash
bun test src/__tests__/unit
```

### E2E Runtime Tests

```bash
elizaos test
```

### Cypress Frontend Tests

```bash
npx cypress run --spec "src/__tests__/cypress/e2e/agentkit-admin.cy.ts"
```

## Development

### Project Structure

```
plugin-agentkit/
├── src/
│   ├── index.ts           # Plugin entry point
│   ├── actions.ts         # Dynamic action registration
│   ├── provider.ts        # Wallet context provider
│   ├── routes.ts          # API routes
│   ├── services/
│   │   └── AgentKitService.ts
│   ├── frontend/
│   │   └── AgentKitAdmin.tsx
│   └── __tests__/
│       ├── unit/
│       ├── e2e/
│       └── cypress/
└── agentkit/              # Coinbase AgentKit source
```

### Building

```bash
bun run build
```

## Troubleshooting

### Missing CDP Credentials

If you see "AgentKit service not available", ensure your CDP API credentials are set:

```bash
export CDP_API_KEY_NAME="your_key_name"
export CDP_API_KEY_PRIVATE_KEY="your_private_key"
```

### Wallet Not Initialized

The plugin creates a new wallet on first run and saves it to `wallet_data.txt`. Delete this file to create a new wallet.

### Action Not Found

Actions are dynamically registered based on the network and available tools. Some actions may not be available on all networks.

## License

MIT

## Contributing

Contributions are welcome! Please read the ElizaOS development workflow documentation before submitting PRs.

## Support

For issues and questions:
- GitHub Issues: [elizaos/elizaos](https://github.com/elizaos/elizaos/issues)
- Discord: [ElizaOS Community](https://discord.gg/elizaos)
