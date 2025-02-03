# @elizaos/plugin-multiversx

MultiversX blockchain integration plugin for Eliza OS that enables token management and transfers.

This plugin is under development and 
## Overview

This plugin serves as the foundation for interacting with the MultiversX ecosystem, enabling secure and efficient blockchain transactions and token management within Eliza OS.


## Features

- EGLD and ESDT token transfers
- Token creation and management
- Multiple network support (mainnet, devnet, testnet)
- Secure transaction signing
- Automatic nonce management
- Transaction status tracking
- Built-in denomination handling
- Comprehensive error handling

---

## User Guide

### Installation

To install the plugin, run:

```bash
pnpm install @elizaos/plugin-multiversx
```

### Configuration

Before using the plugin, configure the necessary environment variables at ElizaOS level:

```.env
MVX_PRIVATE_KEY=your-wallet-private-key
MVX_NETWORK=devnet  # mainnet, devnet, or testnet
```

#### Private key
The MVX_PRIVATE_KEY variable need to be generate using `mxpy wallet convert` as it use the specific hex format. 

You will need to have at least the mxpy version **9.11.0** install on your machine as it have been added in this [release](https://github.com/multiversx/mx-sdk-py-cli/releases/tag/v9.11.0). 

You can check the documentation to install or update to a specific version [here](https://docs.multiversx.com/sdk-and-tools/sdk-py/installing-mxpy).

Example:

``` shell 
# You can check the help command to see the options
~$ mxpy wallet convert -h
usage: mxpy wallet convert [-h] ...

Convert a wallet from one format to another

options:
  -h, --help                                      show this help message and exit
  --infile INFILE                                 path to the input file
  --outfile OUTFILE                               path to the output file
  --in-format {raw-mnemonic,keystore-mnemonic,keystore-secret-key,pem}
                                                  the format of the input file
  --out-format {raw-mnemonic,keystore-mnemonic,keystore-secret-key,pem,address-bech32,address-hex,secret-key}
                                                  the format of the output file
# To transform a pem file into an hex secret key:
~$ mxpy wallet convert --infile wallet.pem --in-format pem --out-format secret-key
Output:

po8ed118werc69c9be506df87f76d6e919f61d3559ed8g68bb78b39fcddc8t9y
```

#### Environment

The plugin supports the following networks:

- Mainnet
- Devnet
- Testnet



### Usage

#### Sending Tokens

```typescript
import { multiversxPlugin } from "@elizaos/plugin-multiversx";

// Send EGLD
const result = await eliza.execute({
    action: "SEND_TOKEN",
    content: {
        tokenAddress: "erd1...",
        amount: "1",
        tokenIdentifier: "EGLD",
    },
});

// Send ESDT
const result = await eliza.execute({
    action: "SEND_TOKEN",
    content: {
        tokenAddress: "erd1...",
        amount: "100",
        tokenIdentifier: "TEST-a1b2c3",
    },
});
```

#### Creating a Token

```typescript
const result = await eliza.execute({
    action: "CREATE_TOKEN",
    content: {
        tokenName: "TestToken",
        tokenTicker: "TEST",
        decimals: "18",
        amount: "1000000",
    },
});
```

### Troubleshooting

#### Common Issues

1. **Transaction Failures**
    - Ensure the wallet has sufficient balance.
    - Verify that network configuration matches the intended network.
    - Double-check token identifiers.
    - Validate recipient address format.

2. **Configuration Problems**
    - Confirm the private key format.
    - Check that the network selection is valid.
    - Ensure environment variables are correctly set.
    - Verify wallet permissions for token operations.

3. **Token Creation Issues**
    - Validate the token name and ticker format.
    - Ensure enough EGLD is available for issuance fees.
    - Check that token identifiers are unique.

4. **Network Connectivity**
    - Verify network endpoint availability.
    - Check API rate limits.
    - Monitor network status.
    - Confirm proper network selection.

### Security Best Practices

1. **Key Management**
    - Never expose private keys in code.
    - Store sensitive data in environment variables.
    - Implement key rotation policies.
    - Regularly monitor wallet activity.

2. **Transaction Safety**
    - Validate all transaction parameters.
    - Implement transaction limits.
    - Use proper denomination handling.
    - Double-check recipient addresses.

3. **Network Security**
    - Use secure network connections.
    - Implement retry mechanisms.
    - Monitor for suspicious activity.
    - Keep dependencies updated.

4. **Error Handling**
    - Implement comprehensive error logging.
    - Handle network timeouts gracefully.
    - Validate all user inputs.
    - Provide clear error messages.

---

## Contributor Guide

### Adding a New Action

When adding a new action, reuse providers and utilities from existing actions where possible. If necessary, add more utilities to benefit other actions.

1. Add the action to the `actions` directory following the existing naming conventions.
2. Export the action in the `index.ts` file.

### Setting Up a Development Environment

To set up your development environment:

```bash
git clone https://github.com/elizaOS/plugin-multiversx.git
cd plugin-multiversx
pnpm install
```

To run tests:

```bash
pnpm test
```

For watch mode during development:

```bash
pnpm test:watch
```

### Dependencies

- @multiversx/sdk-core: ^13.15.0
- bignumber.js: ^9.1.2
- tsup: ^8.3.5
- vitest: ^2.1.5

### Contributing Guidelines

Contributions are welcome! Please see the [CONTRIBUTING.md](../../CONTRIBUTING.md) file for details on how to contribute.

---

## Credits & Additional Resources

This plugin integrates with the [MultiversX blockchain](https://multiversx.com/) using their official SDK.

Special thanks to:
- The MultiversX team for developing the MultiversX blockchain.
- The Eliza community for their contributions and feedback.

For more information about MultiversX blockchain capabilities:
- [MultiversX Documentation](https://docs.multiversx.com/)
- [MultiversX Developer Portal](https://docs.multiversx.com/developers/getting-started/introduction)
- [MultiversX GitHub Repository](https://github.com/multiversx/mx-sdk-js)

## License

This plugin is part of the Eliza project. See the main project repository for license information.

