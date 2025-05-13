# ElizaOS Polygon Plugin

This plugin provides integration with the Polygon blockchain network, allowing ElizaOS to interact with both Ethereum (L1) and Polygon (L2) networks.

## Features

- Account and balance management on both Ethereum and Polygon
- Token interactions (MATIC and ERC20 tokens)
- Governance interactions (proposals, voting, delegation)
- Staking operations (validators, delegation, rewards)
- Bridge operations between L1 and L2
- Block and transaction information retrieval

## Configuration

The plugin requires the following configuration parameters:

| Parameter          | Description                                 | Required | Default                                                               |
| ------------------ | ------------------------------------------- | -------- | --------------------------------------------------------------------- |
| `ETHEREUM_RPC_URL` | Ethereum (L1) JSON-RPC endpoint URL         | No       | https://mainnet.infura.io/v3/acc75dee85124d4db03ba3b3a9a9e3ab         |
| `POLYGON_RPC_URL`  | Polygon (L2) JSON-RPC endpoint URL          | No       | https://polygon-mainnet.infura.io/v3/acc75dee85124d4db03ba3b3a9a9e3ab |
| `PRIVATE_KEY`      | Private key for transaction signing         | Yes      | None                                                                  |
| `POLYGONSCAN_KEY`  | PolygonScan API key for gas estimations     | Yes      | None                                                                  |
| `GOVERNOR_ADDRESS` | Address of the governance contract          | No       | None                                                                  |
| `TOKEN_ADDRESS`    | Address of the governance token contract    | No       | None                                                                  |
| `TIMELOCK_ADDRESS` | Address of the timelock controller contract | No       | None                                                                  |

### RPC URL Configuration

The plugin now includes default RPC URLs for both Ethereum and Polygon networks. These defaults will be used if you don't provide your own URLs. However, for production use, it's recommended to provide your own RPC URLs to ensure reliable performance.

You can obtain RPC URLs from providers like:

- [Infura](https://infura.io/)
- [Alchemy](https://www.alchemy.com/)
- [QuickNode](https://www.quicknode.com/)
- [Ankr](https://www.ankr.com/)

## Recent Updates

### TypeScript Fixes (June 2024)

- Fixed TypeScript errors in the `PolygonRpcProvider` implementation
- Updated contract interaction methods to use `readContract` instead of `getContract` for better type safety
- Streamlined ethers.js imports to only include necessary types
- Improved error handling in RPC methods
- Added proper typing for ERC20 ABIs with `as const`

## Usage

Once configured, the plugin provides various actions for interacting with the Polygon network:

### Basic Information

- `GET_L2_BLOCK_NUMBER` - Get the current block number on Polygon
- `GET_L2_BLOCK_DETAILS` - Get detailed information about a specific block
- `GET_TRANSACTION_DETAILS` - Get detailed information about a specific transaction
- `GET_NATIVE_BALANCE` - Get MATIC balance for an address
- `GET_ERC20_BALANCE` - Get token balance for an address

### Transactions

- `TRANSFER_POLYGON` - Transfer MATIC or tokens on Polygon
- `BRIDGE_DEPOSIT` - Deposit assets from Ethereum to Polygon

### Staking and Governance

- `GET_VALIDATOR_INFO` - Get information about a validator
- `GET_DELEGATOR_INFO` - Get information about a delegator
- `DELEGATE_POLYGON` - Delegate MATIC to a validator
- `WITHDRAW_REWARDS` - Withdraw staking rewards
- `PROPOSE_GOVERNANCE` - Create a governance proposal
- `VOTE_GOVERNANCE` - Vote on a governance proposal
- `GET_GOVERNANCE_INFO` - Get information about governance proposals
- `GET_VOTING_POWER` - Get voting power for an address

## Development

To build the plugin:

```bash
npm run build
```

To run tests:

```bash
npm run test
```

## Publishing

Before publishing your plugin to the ElizaOS registry, ensure you meet these requirements:

1. **GitHub Repository**

   - Create a public GitHub repository for this plugin
   - Add the 'elizaos-plugins' topic to the repository
   - Use 'main' as the default branch

2. **Required Assets**

   - Add images to the `images/` directory:
     - `logo.jpg` (400x400px square, <500KB)
     - `banner.jpg` (1280x640px, <1MB)

3. **Publishing Process**

   ```bash
   # Check if your plugin meets all registry requirements
   npx elizaos plugin publish --test

   # Publish to the registry
   npx elizaos plugin publish
   ```

After publishing, your plugin will be submitted as a pull request to the ElizaOS registry for review.

## Configuration

The `agentConfig` section in `package.json` defines the parameters your plugin requires:

```json
"agentConfig": {
  "pluginType": "elizaos:plugin:1.0.0",
  "pluginParameters": {
    "API_KEY": {
      "type": "string",
      "description": "API key for the service"
    }
  }
}
```

Customize this section to match your plugin's requirements.

## Documentation

Provide clear documentation about:

- What your plugin does
- How to use it
- Required API keys or credentials
- Example usage
