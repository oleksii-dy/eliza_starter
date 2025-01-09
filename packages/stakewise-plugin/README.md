# StakeWise Plugin for Eliza

A plugin to fetch StakeWise vault data, including APY and TVL metrics, and validate them for accuracy and usability.

## Features

- Fetches APY (Annual Percentage Yield) and TVL (Total Value Locked) data for a specific StakeWise vault.
- Evaluates data for validity and quality using custom evaluators.
- Provides dynamic responses based on the user's query (e.g., APY, TVL, or both).
- Graceful error handling for API failures or invalid data.

## Prerequisites

- Node.js 23 or higher
- `pnpm` package manager

## Installation

1. Clone the ElizaOS repository.
2. Navigate to the `packages` folder:

   ```bash
   cd eliza/packages
   ```

3. Add the StakeWise plugin to the workspace:

   ```bash
   git clone https://github.com/your-username/stakewise-plugin.git
   cd stakewise-plugin
   pnpm install
   pnpm build
   ```

4. Link the plugin to the ElizaOS framework:

   ```bash
   pnpm link
   ```

## Usage

### Adding the Plugin to Your Character

Edit your character JSON file (e.g., `chaidette.character.json`) to include the StakeWise plugin:

```json
{
  "name": "Chaidette",
  "plugins": ["stakewise-plugin"],
  "description": "A bot that fetches DeFi metrics like APY and TVL."
}
```

### Start the Eliza Agent

```bash
pnpm start --characters="C:/path/to/your/character.json"
```

### Ask Your Agent Questions

- "What's the APY for the StakeWise vault?"
- "How much ETH is locked in the StakeWise vault?"

## API Endpoints

The plugin fetches data from the following StakeWise GraphQL API:

### Base URL:

```text
https://graphs.stakewise.io/mainnet/subgraphs/name/stakewise/prod
```

### APY Query (GraphQL):

```graphql
query {
  vaults(where: { addressString: "<VAULT_ADDRESS>" }) {
    apy
  }
}
```

### TVL Query (GraphQL):

```graphql
query {
  vault(id: "<VAULT_ADDRESS>") {
    totalAssets
  }
}
```

## Development

### Testing the Plugin

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Run the tests:

   ```bash
   pnpm test
   ```

### Code Structure

- **Actions**:
  - `fetchVaultData.ts`: Fetches APY and TVL data from the API.
- **Evaluators**:
  - `tvlApyEvaluator.ts`: Evaluates TVL and APY data for validity and usability.

### Customization

To fetch data for different vaults, edit the `vaultAddress` parameter in `fetchVaultData.ts` or pass it dynamically via user input.

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository.
2. Make your changes in a feature branch.
3. Submit a pull request with a clear description of your changes.

## License

This plugin is licensed under the MIT License.

## Acknowledgments

- Thanks to the ElizaOS team for creating a robust and extensible AI framework.
- Built using the StakeWise GraphQL API.

## Next Steps

1. Test the plugin thoroughly.
2. Follow the steps in the README.md to document installation and usage instructions.
3. Submit a PR to the ElizaOS repository with your plugin and the README.md.
