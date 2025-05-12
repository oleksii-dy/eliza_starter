# @elizaos/plugin-polygon

A comprehensive Polygon network plugin for ElizaOS, enabling interactions with Polygon PoS chain, Ethereum L1 staking contracts, and bridging operations.

## Features

- **L1 & L2 RPC Support**: Connect to both Ethereum (L1) and Polygon (L2) networks
- **Staking Operations**:
  - Delegate MATIC to validators
  - Query validator details
  - Check delegation information
  - Withdraw staking rewards
  - Restake rewards
- **Bridging**: Transfer tokens between Ethereum L1 and Polygon L2
- **Checkpoint Status**: Verify if L2 blocks have been checkpointed to L1
- **Token Swaps**: Swap tokens on Polygon using LiFi integration

## Installation

```bash
# Install the plugin in your ElizaOS project
npm install @elizaos/plugin-polygon
```

## Configuration

Create a `.env` file with the following variables (see `env.example` for reference):

```
# Required RPC URLs
POLYGON_RPC_URL=https://polygon-rpc.com
ETHEREUM_RPC_URL=https://ethereum.infura.io/v3/YOUR_KEY

# Required for wallet operations
PRIVATE_KEY=your_private_key_here

# Optional: API key for gas estimations
POLYGONSCAN_KEY=your_polygonscan_api_key

# Enable the plugin
POLYGON_PLUGINS_ENABLED=true
```

### Advanced Configuration

For the planned Heimdall integration (governance operations):

```
HEIMDALL_RPC_URL=https://heimdall-api.polygon.technology
```

## Available Actions

### DELEGATE_POLYGON

Delegates (stakes) MATIC tokens to a validator on the Polygon network.

**Example query:**

```
Delegate 10 MATIC to validator ID 123
```

### GET_VALIDATOR_INFO

Retrieves information about a specific Polygon validator.

**Example query:**

```
Show details for Polygon validator 42
```

**Response includes:**

- Validator status
- Total staked amount
- Commission rate
- Signer address
- Contract address

### GET_DELEGATOR_INFO

Retrieves staking information for a specific delegator address (defaults to agent wallet).

**Example query:**

```
Show my delegation details for validator 123
```

**Response includes:**

- Delegated amount
- Pending rewards

### GET_CHECKPOINT_STATUS

Checks if a Polygon L2 block has been checkpointed to Ethereum L1.

**Example query:**

```
Check if Polygon block 42000000 has been checkpointed
```

### SWAP_POLYGON_TOKENS

Swaps tokens on Polygon using LiFi integration.

**Example query:**

```
Swap 100 USDC for DAI on Polygon with 0.3% slippage
```

### Governance Actions (Future)

The following actions will be available once Heimdall integration is complete:

- `PROPOSE_GOVERNANCE_POLYGON`
- `VOTE_GOVERNANCE_POLYGON`
- `EXECUTE_GOVERNANCE_POLYGON`
- `QUEUE_GOVERNANCE_POLYGON`

## Development

```bash
# Start development with hot-reloading
npm run dev

# Build the plugin
npm run build

# Test the plugin
npm run test
```

## Architecture

The plugin follows the standard ElizaOS plugin architecture with:

1. **Services**:

   - `PolygonRpcService`: Core service for L1/L2 interactions
   - Future: `HeimdallService` for Cosmos SDK interactions

2. **Providers**:

   - `PolygonWalletProvider`: Wallet provider for Polygon network

3. **Actions**:
   - Individual actions for staking, bridging, and other operations

## Troubleshooting

### Common Issues

1. **RPC Connection Errors**

   - Ensure your `ETHEREUM_RPC_URL` and `POLYGON_RPC_URL` are valid and accessible
   - Check for rate limiting if using free tier RPC providers

2. **Transaction Failures**

   - Insufficient funds: Ensure your wallet has enough MATIC/ETH for gas
   - Gas estimation failures: Try setting a manual gas limit or using a higher gas price

3. **Validator Not Found**
   - Verify the validator ID exists and is active on the network

### Debug Mode

Enable debug logging by setting:

```
LOG_LEVEL=debug
```

## License

MIT
