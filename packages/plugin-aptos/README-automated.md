# @elizaos/plugin-aptos Documentation

## Overview
### Purpose
The @elizaos/plugin-aptos is a specialized plugin designed to facilitate seamless interactions between an agent and the Aptos blockchain ecosystem. This plugin enables users to manage and interact with digital wallet portfolios, execute financial transactions, and retrieve market prices in real-time. It achieves this by providing core functionalities such as caching wallet data, fetching price information, and facilitating monetary transfers. By integrating with the agent runtime, it ensures that users can dynamically access and manage financial data through conversational templates in a consistent and efficient manner.

### Key Features
Handles caching of wallet data for optimized performance.,Fetches real-time price information in USD and APT.,Facilitates monetary transfers with recipient and amount details.,Validates and manages Aptos configuration settings.,Provides structured interfaces for handling TransferContent, WalletPortfolio, and Prices.,Integrates smoothly with agent runtime for dynamic and contextual information supply.

## Installation
## Installation and Integration Instructions for @elizaos/plugin-aptos

### 1. Adding the Plugin to Your ElizaOS Project

- Add the following to your agent/package.json dependencies:
  ```json
  {
    "dependencies": {
      "@elizaos/plugin-aptos": "workspace:*"
    }
  }
  ```

- Run the following commands in your terminal:
  1. cd agent/
  2. pnpm install
  3. pnpm build

### 2. Importing and Using the Plugin

- Import the plugin using the following syntax:
  ```javascript
  import { aptosPlugin } from "@elizaos/plugin-aptos";
  ```

- Add the plugin to the AgentRuntime plugins array in your setup code.

### 3. Integration Example

```typescript
import { aptosPlugin } from "@elizaos/plugin-aptos";

return new AgentRuntime({
    // other configuration...
    plugins: [
        aptosPlugin,
        // other plugins...
    ],
});
```

### 4. Verification Steps

After integration, ensure you see the following message in the console:
["✓ Registering action: SEND_TOKEN"]

Make sure to follow these steps carefully to successfully install and integrate the @elizaos/plugin-aptos plugin into your ElizaOS project.

## Configuration
# Configuration Documentation

## Required Environment Variables

1. `APTOS_PRIVATE_KEY`
   - Purpose: Used for setting the private key in the runtime. 

2. `APTOS_NETWORK`
   - Purpose: Used for setting the network in the runtime as a Network object.

## Example .env File

```env
APTOS_PRIVATE_KEY=your_private_key_value
APTOS_NETWORK=your_network_value
```

To configure the application, create a `.env` file in the root directory of the project and add the required environment variables with their respective values.

Please ensure to add the `.env` file to the `.gitignore` file to prevent it from being committed to the repository.

## Features

### Actions
### SEND_TOKEN
Transfer tokens from the agent's wallet to another address

#### Properties
- Name: SEND_TOKEN
- Similes: ["TRANSFER_TOKEN", "TRANSFER_TOKENS", "SEND_TOKENS", "SEND_APT", "PAY"]

#### Handler
The handler for the SEND_TOKEN action transfers tokens from the agent's wallet to another address. It validates the transfer content, composes the transfer context, generates transfer content, and sends the tokens using the Aptos blockchain.

#### Examples
- User: "Send 69 APT tokens to 0x4f2e63be8e7fe287836e29cde6f3d5cbc96eefd0c0e3f3747668faa2ae7324b0"
- Agent: "I'll send 69 APT tokens now..."
- Agent: "Successfully sent 69 APT tokens to 0x4f2e63be8e7fe287836e29cde6f3d5cbc96eefd0c0e3f3747668faa2ae7324b0, Transaction: 0x39a8c432d9bdad993a33cc1faf2e9b58fb7dd940c0425f1d6db3997e4b4b05c0"



### Providers
### WalletProvider
The WalletProvider class provides methods to fetch and manage wallet data.

#### Methods
The `fetchPortfolioValue()` method is used to fetch the portfolio value of a wallet based on the specified address. It retrieves the APT prices and the APT amount held by the account to calculate the total USD value and total APT value of the portfolio.

The `fetchPrices()` method is responsible for fetching the current prices of APT from an external API. It retries the fetch operation with backoff logic in case of failure and caches the retrieved prices for future use.

The `formatPortfolio()` method takes the runtime and portfolio data as input and formats the portfolio information into a string. It includes the character name, wallet address, total USD value, and total APT value in a human-readable format.

The `getFormattedPortfolio()` method is a wrapper that invokes `fetchPortfolioValue()` to retrieve the portfolio data and then formats it using `formatPortfolio()`. It catches any errors that occur during the process and returns an error message if needed.



### Evaluators
No evaluators documentation available.

## Usage Examples
### providers/wallet.ts

### Common Use Cases
1. Creating an instance of WalletProvider and fetching prices for a wallet:
```typescript
import { WalletProvider } from './providers/wallet';

const aptosClient = new Aptos();
const walletAddress = '0xabcdef123456789';
const cacheManager = new ICacheManager();

const walletProvider = new WalletProvider(aptosClient, walletAddress, cacheManager);
walletProvider.fetchPrices().then((prices) => {
    console.log(prices); // Prices fetched successfully
}).catch((error) => {
    console.error(error); // Error fetching prices
});
```

2. Reading and writing data to cache using the WalletProvider instance:
```typescript
// Assume walletProvider is initialized as in the previous example

const dataToCache = { key: 'value' };
const cacheKey = 'cachedData';

walletProvider.writeToCache(cacheKey, dataToCache).then(() => {
    walletProvider.readFromCache(cacheKey).then((cachedData) => {
        console.log(cachedData); // { key: 'value' } - Data read from cache
    }).catch((error) => {
        console.error(error); // Error reading from cache
    });
}).catch((error) => {
    console.error(error); // Error writing to cache
});
```

### Best Practices
- Ensure to handle errors properly when calling asynchronous methods to avoid unhandled promises.
- Use consistent cache keys and data structures for easy retrieval and storage of cached data.

### actions/transfer.ts

### Common Use Cases
1. **Transfer funds to a recipient**: 
```typescript
import { TransferContent, isTransferContent } from './actions/transfer';

const transferData: TransferContent = {
  recipient: 'John Doe',
  amount: 100
};

if (isTransferContent(transferData)) {
  // Process the transfer
} else {
  console.log('Invalid transfer content');
}
```

2. **Validate transfer content**: 
```typescript
import { TransferContent, isTransferContent } from './actions/transfer';

const invalidTransferData = {
  recipient: 'Jane Smith',
  amount: '200 dollars'
};

if (isTransferContent(invalidTransferData)) {
  // Process the transfer
} else {
  console.log('Invalid transfer content');
}
```

### Best Practices
- **Validate input data**: It is a good practice to use the `isTransferContent` function to validate the transfer content before processing it to ensure data integrity.
- **Type checking**: Ensure that the `recipient` is of type string and the `amount` is of type string or number as specified in the `TransferContent` interface. This prevents unexpected errors during the transfer process.

### enviroment.ts

### Common Use Cases
1. **Create and validate Aptos configuration:**
This code can be used to create and validate an Aptos configuration by retrieving required settings from the runtime and environment variables. For example, if you have an agent runtime environment set up and want to validate the Aptos configuration, you can use the `validateAptosConfig` function with the runtime environment as a parameter.

```typescript
const runtime: IAgentRuntime = {
  // Define properties of the agent runtime environment
};

validateAptosConfig(runtime)
  .then((config: AptosConfig) => {
    // Use the validated Aptos configuration
  })
  .catch((error: Error) => {
    // Handle any validation errors
  });
```

2. **Access Aptos configuration settings:**
Once the Aptos configuration is validated, you can access the settings defined in the configuration for various purposes. For example, if you need to access a specific setting from the Aptos configuration, you can retrieve it from the validated configuration object.

```typescript
validateAptosConfig(runtime)
  .then((config: AptosConfig) => {
    const settingValue = config.settingName;
    // Do something with the setting value
  })
  .catch((error: Error) => {
    // Handle any validation errors
  });
```

### Best Practices
- **Error Handling:** It is recommended to handle any potential errors thrown during the validation process to ensure the reliability of the configuration.
- **Modularization:** Consider modularizing the code that interacts with the validated Aptos configuration to keep it organized and maintainable.

## FAQ
### Q: How can I transfer funds using the @elizaos/plugin-aptos?
To transfer funds, you need to use the TransferContent interface, providing details such as the recipient's address and the amount to be transferred. The plugin will handle the validation and execution of the transaction.

### Q: Can the WalletProvider fetch and cache wallet data in real-time?
Yes, the WalletProvider class is designed to fetch and cache wallet data, ensuring that information is up-to-date and accessed efficiently during interactions.

### Q: How do I validate my Aptos configuration settings?
You can validate your Aptos configuration by using the validateAptosConfig function, which checks the runtime environment settings. It returns a promise that resolves with the validated configuration or throws an error if validation fails.

### Q: How can I extend the plugin to support additional currencies?
To support additional currencies, you can extend the existing interfaces and functions to include new currency properties and update the logic that fetches and processes price data accordingly.

### Q: My action is registered, but the agent is not calling it.
Ensure that the action's name clearly aligns with the task, and provide a detailed description of the conditions that should trigger the action. Verify that your runtime environment is correctly set up to recognize the action.

## Development

### TODO Items
No TODO items found.

## Troubleshooting Guide
### Wallet data not updating in real-time.
- Cause: Possible caching issue or stale data retrieval.
- Solution: Check the caching mechanism within the WalletProvider and ensure it is set to update at appropriate intervals or upon specific triggers.

### Error during fund transfer execution.
- Cause: Invalid recipient address or amount format.
- Solution: Use the isTransferContent function to validate whether the provided content adheres to the expected TransferContent structure before proceeding.

### Debugging Tips
- Use console logs or breakpoints to monitor data flow within the WalletProvider class.
- Ensure that all necessary environment variables are correctly set before initializing the plugin.
- Verify that the TransferContent interface's properties match the expected types and format before executing any transactions.
