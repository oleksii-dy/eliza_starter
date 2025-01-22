# @elizaos/plugin-sei

Sei Network plugin for Eliza OS that enables Eliza agents to perform actions on the Sei blockchain.
## Overview

This plugin provides functionality to:

- Transfer SEI tokens between wallets
- Query wallet balances

## Installation

```bash
npm install @elizaos/plugin-sei
```

## Configuration

The plugin requires the following environment variables:

```env
SEI_PRIVATE_KEY=your_private_key
```

## Usage

Import and register the plugin in your Eliza configuration:

```typescript
import { seiPlugin } from "@elizaos/plugin-sei";

export default {
    plugins: [seiPlugin],
    // ... other configuration
};
```

## Features

### Send Token

Transfer SEI tokens to another address:

```typescript
// Example conversation
User: "Send 1 SEI to 0x4f2e63be8e7fe287836e29cde6f3d5cbc96eefd0c0e3f3747668faa2ae7324b0";
Assistant: "I'll send 1 SEI token now...";
```

### Check Wallet Balance

Query wallet balance and portfolio value:

```typescript
// Example conversation
User: "What's my wallet balance?";
Assistant: "Your wallet contains 10.5 SEI ($42.00 USD)...";
```

## API Reference

### Actions

- `SEND_TOKEN`: Transfer SEI to a specified address

### Providers

- `walletProvider`: Manages wallet interactions with the Sei network, including balance queries and portfolio tracking

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm run test
```

## Future Enhancements

The following features and improvements are planned for future releases:

## Contributing

Contributions are welcome! Please see the [CONTRIBUTING.md](CONTRIBUTING.md) file for more information.

## Credits

This plugin integrates with and builds upon several key technologies:

- [Sei Blockchain](https://sei.io/): The fastest EVM blockchain

## License

This plugin is part of the Eliza project. See the main project repository for license information.
