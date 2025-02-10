# @elizaos/plugin-navi

Core NAVI Liquidity Protocol plugin for Eliza OS that provides essential services and actions for token operations and wallet management.

## Overview

This plugin provides functionality to:

- Check Wallet Balance
- Supply Token to NAVI
- Borrow Token from NAVI
- Repay Debt to NAVI
- Withdraw Token from NAVI

## Installation

```bash
npm install @elizaos/plugin-navi
```

## Configuration

The plugin requires the following environment variables:

```env
NAVI_PRIVATE_KEY=your_private_key
NAVI_NETWORK=mainnet|devnet
```

## Usage

Import and register the plugin in your Eliza configuration:

```typescript
import { naviPlugin } from "@elizaos/plugin-navi";

export default {
    plugins: [naviPlugin],
    // ... other configuration
};
```

## Features

### Check Wallet Balance

Query wallet balance and portfolio value:

```typescript
// Example conversation
User: "What's my wallet balance?";
Assistant: "Your wallet contains 10.5 SUI ($42.00 USD)...";
```

## API Reference

### Actions

- `GET_BALANCE`: Check Wallet Balance

### Providers

- `walletProvider`: Manages wallet interactions with the NAVI Liquidity Protocol, including balance queries and portfolio tracking

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm run test
```

## Dependencies

- `navi-sdk`: NAVI SDK Project for Sui Defi Ecosystem
- `node-cache`: Caching implementation
- Other standard dependencies listed in package.json

## Contributing

Contributions are welcome! Please see the [CONTRIBUTING.md](CONTRIBUTING.md) file for more information.

## Credits

This plugin integrates with and builds upon several key technologies:

- [NAVI Blockchain](https://naviprotocol.com/): NAVI is the first Native One-Stop Liquidity Protocol on Sui. It enables users to participate as liquidity providers or borrowers within the Sui Ecosystem.
- [node-cache](https://www.npmjs.com/package/node-cache): Caching implementation

Special thanks to:

- The NAVI team for developing NAVI Liquidity Protocol
- The NAVI Developer community
- The Eliza community for their contributions and feedback

For more information about NAVI blockchain capabilities:

- [NAVI Liquidity Protocol](https://naviprotocol.io/)
- [NAVI Dashboard](https://app.naviprotocol.io/)
- [NAVI GitHub Repository](https://github.com/naviprotocol)

## License

This plugin is part of the Eliza project. See the main project repository for license information.
