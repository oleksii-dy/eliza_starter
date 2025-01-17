# @elizaos/plugin-sui Documentation

## Overview
### Purpose
The @elizaos/plugin-sui is designed to facilitate seamless integration with the SUI blockchain by providing tools and utilities for interacting with wallet data and transaction management. Its main aim is to allow developers and agents within the Eliza ecosystem to leverage SUI's blockchain features by accessing real-time data and performing secure transactions, all while maintaining robust data handling and integration capabilities.

### Key Features
Interaction with SUI wallets through the WalletProvider class,Transfer of content via the TransferContent interface,Portfolio management and balance tracking with the WalletPortfolio interface,Real-time pricing information via the Prices interface,Environment network configuration using the SuiNetwork and SuiConfig types,Content validation and configuration validation through specific functions

## Installation
## Installation and Integration Instructions for @elizaos/plugin-sui

### 1. Add the plugin to your ElizaOS project:
- Add the following to your agent/package.json dependencies:
```json
{
  "dependencies": {
    "@elizaos/plugin-sui": "workspace:*"
  }
}
```
- cd into the agent/ directory
- Run `pnpm install` to install the new dependency
- Run `pnpm build` to build the project with the new plugin

### 2. Import and Use the Plugin:
- Import the plugin using: `import { suiPlugin } from "@elizaos/plugin-sui";`
- Add it to the AgentRuntime plugins array in your code

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
Ensure successful integration by verifying that you see `["✓ Registering action: SEND_TOKEN"]` in the console.

Remember to follow the installation and integration instructions carefully to successfully incorporate the @elizaos/plugin-sui plugin into your ElizaOS project.

## Configuration
# Configuration Documentation

### Required Environment Variables:
1. **SUI_NETWORK**:
   - Purpose: Specifies the network configuration for the application.
  
2. **SUI_PRIVATE_KEY**:
   - Purpose: Specifies the private key for the application.

### Example .env file:
```
SUI_NETWORK=mainnet
SUI_PRIVATE_KEY=your_private_key_here
```

Please ensure that you set these environment variables in the .env file. Also, remember to add the .env file to your .gitignore to prevent it from being committed to the repository.

## Features

### Actions
### SEND_TOKEN
Transfer tokens from the agent's wallet to another address

#### Properties
- Name: SEND_TOKEN
- Similes: 
  - TRANSFER_TOKEN
  - TRANSFER_TOKENS
  - SEND_TOKENS
  - SEND_SUI
  - PAY

#### Handler
The handler for the SEND_TOKEN action transfers tokens from the agent's wallet to the specified recipient address. It validates the transfer request, composes the necessary transfer context, generates transfer content based on a schema, and initiates the token transfer using the SuiClient.

#### Examples
- User {{user1}}: "Send 1 SUI tokens to 0x4f2e63be8e7fe287836e29cde6f3d5cbc96eefd0c0e3f3747668faa2ae7324b0"
- Agent {{user2}}: "I'll send 1 SUI tokens now..."
- Agent {{user2}}: "Successfully sent 1 SUI tokens to 0x4f2e63be8e7fe287836e29cde6f3d5cbc96eefd0c0e3f3747668faa2ae7324b0, Transaction: 0x39a8c432d9bdad993a33cc1faf2e9b58fb7dd940c0425f1d6db3997e4b4b05c0"



### Providers
### WalletProvider
The WalletProvider is a class that allows fetching and managing wallet-related data such as portfolio value and prices of assets.

#### Methods
The `fetchPortfolioValue()` method retrieves the portfolio value associated with a wallet address. It first checks if the data is present in the cache and fetches the required prices and SUI amount. It then calculates the total value in USD and SUI, saves it to the cache, and returns the portfolio data.

The `fetchPrices()` method fetches the current prices of assets, specifically the SUI price in USD. It checks the cache first and then fetches the data from an external API, caching the result for future use.

The `formatPortfolio(runtime, portfolio)` method formats the wallet portfolio data as a string for display. It includes the character name, wallet address, total value in USD, and total SUI amount.

The `getFormattedPortfolio(runtime)` method is a helper method that fetches the portfolio value, formats it using `formatPortfolio()`, and returns the formatted portfolio report as a string.

The `WalletProvider` class also contains functions for caching data and handling retries when fetching prices.



### Evaluators
No evaluators documentation available.

## Usage Examples
### providers/wallet.ts

#### Common Use Cases
1. **Fetching Portfolio Data**: Utilize the `fetchPortfolioValue` method to asynchronously fetch the portfolio value of a wallet.
   ```typescript
   const wallet = new WalletProvider(suiClient, "example_address", cacheManager);
   wallet.fetchPortfolioValue().then((portfolio) => {
       console.log(portfolio);
   }).catch((error) => {
       console.error(error);
   });
   ```

2. **Formatting Portfolio**: Use the `formatPortfolio` method to format and generate a summary of a character's wallet portfolio.
   ```typescript
   const wallet = new WalletProvider(suiClient, "example_address", cacheManager);
   const runtime = { characterName: "Alice" };
   const portfolio = { totalUsd: "1000", totalSui: "500" };
   const formattedSummary = wallet.formatPortfolio(runtime, portfolio);
   console.log(formattedSummary);
   ```

#### Best Practices
- **Properly Handle Promise Rejections**: Always handle promise rejections from asynchronous methods like `fetchPortfolioValue` to avoid uncaught errors.
- **Optimize Cache Usage**: Balance the usage of cache methods like `readFromCache` and `writeToCache` to improve data retrieval performance and reduce unnecessary network requests.

### actions/transfer.ts

### Common Use Cases
1. **Transfer content to a recipient:**
```typescript
import { TransferContent } from './interfaces';
import { isTransferContent } from './functions';

const transfer: TransferContent = {
  recipient: 'Alice',
  amount: 10
};

if (isTransferContent(transfer)) {
  // Perform transfer logic
}
```

2. **Validate if a given content is a transfer:**
```typescript
import { isTransferContent } from './functions';
import { Content } from './interfaces';

const content: Content = {
  recipient: 'Bob',
  amount: 5
};

if (isTransferContent(content)) {
  // Content is a transfer
} else {
  // Content is not a transfer
}
```

### Best Practices
- **Ensure proper typing of transfer content:** It is recommended to use the `TransferContent` interface to define transfer objects to ensure that all necessary properties are included.
- **Use the `isTransferContent` function for validation:** To accurately determine if a content object is a transfer, always use the `isTransferContent` function for validation.

### enviroment.ts

### Common Use Cases
1. **Initializing SuiConfig** 

You can use the code to validate a SuiConfig object by providing the necessary runtime information.

```typescript
const runtime: IAgentRuntime = {
    SUI_PRIVATE_KEY: 'private_key_here',
    SUI_NETWORK: 'network_here'
};

validateSuiConfig(runtime)
    .then((config: SuiConfig) => {
        console.log('Validated SuiConfig:', config);
    })
    .catch((error: Error) => {
        console.error('Error validating SuiConfig:', error);
    });
```

2. **Updating SuiConfig**

You can modify the runtime information and revalidate the SuiConfig object.

```typescript
runtime.SUI_PRIVATE_KEY = 'new_private_key_here';

validateSuiConfig(runtime)
    .then((config: SuiConfig) => {
        console.log('Updated SuiConfig:', config);
    })
    .catch((error: Error) => {
        console.error('Error updating SuiConfig:', error);
    });
```

### Best Practices
- **Handling Errors**: Always handle errors in the promises returned by the `validateSuiConfig` function to ensure proper error handling.
- **Runtime Information**: Ensure that the runtime object provided to the function contains the necessary SUI_PRIVATE_KEY and SUI_NETWORK values for successful validation.

## FAQ
### Q: What is the role of the WalletProvider class?
The WalletProvider class serves as an interface for fetching and caching wallet data. It facilitates the retrieval of wallet portfolio information and is integral to managing financial data within the SUI ecosystem.

### Q: Is it possible to customize the networks the plugin connects to?
Yes, the plugin supports different network environments through the SuiNetwork type, which allows connections to 'mainnet', 'testnet', 'devnet', or 'localnet'.

### Q: How can I validate my SUI configuration?
You can validate your SUI configuration by utilizing the validateSuiConfig function. This function retrieves SUI configuration parameters from runtime or environment variables and ensures they are correctly set.

### Q: How does the TransferContent interface facilitate transactions?
The TransferContent interface extends from a general Content interface and provides properties for managing the recipient address and transfer amount, enabling structured and secure transaction processes.

### Q: How do I check if a content object is of type TransferContent?
You can use the isTransferContent function, which accepts a content object and returns a boolean indicating whether the object is of the TransferContent type.

### Q: My action is registered, but the agent is not calling it
Ensure that the action's name clearly aligns with the task and provide a detailed description of the conditions that should trigger the action.

## Development

### TODO Items
No TODO items found.

## Troubleshooting Guide
### The WalletProvider class fails to retrieve data
- Cause: There might be a network connectivity issue or incorrect configuration settings
- Solution: Check network availability and ensure that SUI configuration settings are correct and accessible

### TransferContent transactions are not processing correctly
- Cause: Invalid recipient address format or amount
- Solution: Verify that the recipient address and amount are correctly formatted and valid for the transaction

### Debugging Tips
- Verify environment variables and configuration settings for SUI integration
- Use logging to track the flow of data through the WalletProvider
- Check network status and ensure correct network settings with SuiNetwork
