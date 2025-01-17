# @elizaos/plugin-sui Documentation

## Overview
### Purpose
The @elizaos/plugin-sui is designed to facilitate interaction between the Eliza agent and the SUI blockchain. It enables real-time access to wallet information, seamless transaction handling, and pricing data management. This plugin acts as a bridge to bring dynamic blockchain data into agent interactions, ensuring accurate and timely access to financial data for both USD and SUI-based portfolios.

### Key Features
Supports retrieving wallet information using a WalletProvider,Handles transfers with clear recipient and amount specifications,Monitors wallet portfolio with total USD and SUI value display,Integrates multiple blockchain network environments: mainnet, testnet, devnet, and localnet,Validates SUI configurations derived from runtime settings or environment variables,Provides real-time SUI pricing information in USD

## Installation
## Installation and Integration Instructions for @elizaos/plugin-sui

### 1. Add the Plugin to Your ElizaOS Project:
- Add the following to your agent/package.json dependencies:
  ```json
  {
    "dependencies": {
      "@elizaos/plugin-sui": "workspace:*"
    }
  }
  ```
- cd into the agent/ directory
- Run pnpm install to install the new dependency
- Run pnpm build to build the project with the new plugin

### 2. Import and Use the Plugin:
- Import the plugin using: `import { suiPlugin } from "@elizaos/plugin-sui";`
- Add it to the AgentRuntime plugins array

### 3. Integration Example:
```typescript
import { suiPlugin } from "@elizaos/plugin-sui";

return new AgentRuntime({
    // other configuration...
    plugins: [
        suiPlugin,
        // other plugins...
    ],
});
```

### 4. Verification Steps:
Make sure to see ["✓ Registering action: SEND_TOKEN"] in the console to ensure successful integration.

Please follow these steps carefully to successfully install, integrate, and verify the @elizaos/plugin-sui plugin in your ElizaOS project. Thank you! 

## Configuration
# Configuration Documentation

## Required Environment Variables
- `SUI_NETWORK`: Specifies the network to use for the application.
- `SUI_PRIVATE_KEY`: Specifies the private key needed for authentication.

## Full .env Example File
```
SUI_NETWORK=development
SUI_PRIVATE_KEY=myPrivateKey123
```

**Note:** Make sure to set the configuration in the .env file and add the .env file to the .gitignore to prevent it from being committed to the repository.

## Features

### Actions
### SEND_TOKEN
Transfer tokens from the agent's wallet to another address

#### Properties
- Name: SEND_TOKEN
- Similes: TRANSFER_TOKEN, TRANSFER_TOKENS, SEND_TOKENS, SEND_SUI, PAY

#### Handler
The handler for the SEND_TOKEN action transfers tokens from the agent's wallet to the specified recipient address. It validates the transfer request and processes the transaction using the SUI network.

#### Examples
- User1: "Send 1 SUI tokens to 0x4f2e63be8e7fe287836e29cde6f3d5cbc96eefd0c0e3f3747668faa2ae7324b0"
- Agent: "I'll send 1 SUI tokens now..."
- Agent: "Successfully sent 1 SUI tokens to 0x4f2e63be8e7fe287836e29cde6f3d5cbc96eefd0c0e3f3747668faa2ae7324b0, Transaction: 0x39a8c432d9bdad993a33cc1faf2e9b58fb7dd940c0425f1d6db3997e4b4b05c0"



### Providers
### Wallet Provider
The Wallet Provider offers functionality to fetch wallet information such as portfolio value and prices of assets.

#### Methods
The `getFormattedPortfolio()` method is used to get a formatted string representing the portfolio value of a wallet. It fetches the required data, formats it, and returns the string.

The `fetchPortfolioValue()` method fetches the portfolio value of the wallet by retrieving balances and prices of assets. It caches the data and returns the portfolio value.

The `fetchPrices()` method retrieves the current prices of assets. It fetches the data with retries in case of errors and caches the prices.

The `formatPortfolio()` method takes the portfolio data and formats it into a readable string that includes wallet address, total value, and total SUI tokens.

Other private methods handle caching of data, fetching prices with retries, and reading/writing data to cache.



### Evaluators
No evaluators documentation available.

## Usage Examples
### providers/wallet.ts

### Common Use Cases
1. Fetching and displaying wallet portfolio information:
```typescript
const wallet = new WalletProvider(suiClient, '0x123abc', cacheManager);
const portfolio = await wallet.fetchPortfolioValue();
const formattedPortfolio = wallet.formatPortfolio(runtime, portfolio);
console.log(formattedPortfolio);
```

2. Caching fetched prices data for future use:
```typescript
const wallet = new WalletProvider(suiClient, '0x123abc', cacheManager);
const prices = await wallet.fetchPrices();
console.log(prices);

// Prices data is automatically cached for future use
```

### Best Practices
- Use the `fetchPricesWithRetry` method to ensure reliable fetching of prices data in case of errors.
- Utilize the `writeToCache` method to store frequently accessed data in the cache for faster retrieval.

### actions/transfer.ts

### Common Use Cases
1. Checking if a given content is of type TransferContent:
```typescript
import { isTransferContent } from './actions/transfer';
import { TransferContent } from './interfaces';

const transfer: TransferContent = {
  recipient: "Alice",
  amount: 100
};

const isTransfer = isTransferContent(transfer); // Returns true
```

2. Using the SuiNetwork type to specify a network type for a blockchain system:
```typescript
import { SuiNetwork } from './types';

const network: SuiNetwork = "mainnet";
```

### Best Practices
- Make use of the provided interfaces and types to ensure type safety and avoid errors in your code.
- Use the isTransferContent function to validate the content type before performing any transfer-related operations.

### enviroment.ts

- Use Case 1: Validating SUI configuration 
```typescript
import { validateSuiConfig } from 'environment';

// Assuming IAgentRuntime is defined elsewhere
const runtime: IAgentRuntime = ...;

validateSuiConfig(runtime)
  .then((config) => {
    console.log("SUI configuration validated: ", config);
  })
  .catch((error) => {
    console.error("Error validating SUI configuration: ", error);
  });
```

- Use Case 2: Using SuiConfig interface
```typescript
import { SuiConfig } from 'environment';

const sampleConfig: SuiConfig = {
  // Define your SUI configuration properties here
};

console.log("Sample SUI config: ", sampleConfig);
```

### Best Practices
- Always ensure to handle the promises from the `validateSuiConfig` function using `.then()` and `.catch()`.
- Make sure to define the required properties in the SuiConfig interface while using it.

## FAQ
### Q: My action is registered, but the agent is not calling it
Ensure that action's name clearly aligns with the task, and ensure you give a detailed description of the conditions that should trigger the action.

### Q: Can the WalletProvider fetch information for multiple networks?
Yes, the WalletProvider can be configured to interact with different SuiNetwork environments such as mainnet, testnet, devnet, and localnet.

### Q: How can I validate my SUI configuration?
Use the validateSuiConfig function, which checks your configuration against the SuiEnvSchema using values from your runtime settings or environment variables.

### Q: What steps should I take to perform a token transfer?
Use the TransferContent interface to specify the recipient and amount, then ensure the content passes the isTransferContent check before initiating the transfer.

### Q: How do I fetch and display my wallet portfolio using this plugin?
The walletProvider function can be used to get a formatted portfolio string. It retrieves the total USD and SUI amounts from the WalletPortfolio interface.

### Q: How can I extend the functionality of this plugin?
You can extend the plugin by implementing custom Actions and Evaluators that interact with the WalletProvider and utilize dynamic data access provided by the plugin's API.

## Development

### TODO Items
No TODO items found.

## Troubleshooting Guide
### SUI configuration validation is failing
- Cause: Incorrect or undefined environment variables in the runtime settings
- Solution: Ensure all necessary environment variables are set and align with the SuiEnvSchema requirements.

### Error fetching wallet portfolio
- Cause: Misconfiguration in connecting to the specified network
- Solution: Verify the SuiConfig and ensure the correct network type (mainnet, testnet, etc.) is being used.

### Debugging Tips
- Always ensure the correct network is selected for your operations.
- Check environment variables and runtime configurations to ensure they meet the required formats.
- Use the logging functionalities within your development environment to trace errors during real-time agent interactions.
- Regularly update your network keys and credentials to avoid unauthorized access issues.
