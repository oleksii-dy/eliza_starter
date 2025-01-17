# @elizaos/plugin-near Documentation

## Overview
### Purpose
The @elizaos/plugin-near is designed to connect with NEAR Protocol wallets and provide comprehensive management and interaction capabilities within the NEAR ecosystem. The plugin facilitates access to real-time information about account balances, token portfolios, and transaction functions, allowing seamless integration with applications that require such blockchain interactions.

### Key Features
Connects to NEAR wallets to manage accounts and retrieve information.,Implements token transfer and swap functionalities using NEAR.,Supports storage balance checks and validation of transfer content.,Provides configuration settings for connecting to different environments within NEAR.,Utilizes providers to supply dynamic contextual information for real-time interactions.,Incorporates a robust slippage and retry mechanism to handle transactions efficiently.

## Installation
# Installation and Integration Instructions for @elizaos/plugin-near

### 1. Adding the Plugin to Your ElizaOS Project:
- Add the following to your agent/package.json dependencies:
  ```json
  {
    "dependencies": {
      "@elizaos/plugin-near": "workspace:*"
    }
  }
  ```
- cd into the agent/ directory
- Run `pnpm install` to install the new dependency
- Run `pnpm build` to build the project with the new plugin

### 2. Importing and Using the Plugin:
- Import the plugin using: `import { nearPlugin } from "@elizaos/plugin-near";`
- Add it to the AgentRuntime plugins array

### 3. Integration Example:
```typescript
import { nearPlugin } from "@elizaos/plugin-near";

return new AgentRuntime({
    // other configuration...
    plugins: [
        nearPlugin,
        // other plugins...
    ],
});
```

### 4. Verification Steps:
- Ensure you see ["✓ Registering action: EXECUTE_SWAP_NEAR"] in the console

Make sure to follow these instructions carefully to successfully install and integrate the @elizaos/plugin-near plugin with your ElizaOS project.

## Configuration
# Configuration Documentation

## Required Environment Variables and Purposes

1. `NEAR_NETWORK`:
   - Purpose: Specifies the NEAR network to connect to.
   
2. `NEAR_RPC_URL`:
   - Purpose: Specifies the RPC URL for the NEAR network.
   
3. `NEAR_ADDRESS`:
   - Purpose: Specifies the NEAR account ID.
   
4. `NEAR_WALLET_SECRET_KEY`:
   - Purpose: Specifies the secret key for the NEAR wallet.
   
5. `SLIPPAGE_TOLERANCE`:
   - Purpose: Specifies the slippage tolerance value.

## Full .env Example File

```dotenv
NEAR_NETWORK=testnet
NEAR_RPC_URL=https://rpc.testnet.near.org
NEAR_ADDRESS=example.near
NEAR_WALLET_SECRET_KEY=secretKey123
SLIPPAGE_TOLERANCE=0.01
```

**Note:** Ensure the .env file is set in the .gitignore file to avoid committing sensitive information to the repository.

---

## Features

### Actions
### EXECUTE_SWAP_NEAR
Perform a token swap using Ref Finance.

#### Properties
- Name: EXECUTE_SWAP_NEAR
- Similes: SWAP_TOKENS_NEAR, TOKEN_SWAP_NEAR, TRADE_TOKENS_NEAR, EXCHANGE_TOKENS_NEAR

#### Handler
The handler function first initializes the Ref Finance SDK with the testnet environment. It then composes the state by either creating a new state or updating the existing state with the recent message. The function retrieves the wallet information using the walletProvider. It then composes the swap context with the state and template before generating an object with a large model class. The handler checks for the required parameters for the swap, including input token ID, output token ID, and amount. If any of the required parameters are missing, it informs the user and skips the swap. 

If all required parameters are present, the handler retrieves the NEAR account credentials and creates a keystore to connect to NEAR. It executes the token swap using the swapToken function with the specified input token ID, output token ID, amount, and slippage tolerance. It then signs and sends the transactions using the NEAR account and retrieves the transaction hashes. Finally, the handler notifies the user of the successful swap along with the transaction hashes.

#### Examples
- User 1:
    - Input Token ID: wrap.testnet
    - Output Token ID: ref.fakes.testnet
    - Amount: 1.0
- Agent:
    - Text: Swapping 1.0 NEAR for REF...
    - Action: TOKEN_SWAP
- Agent:
    - Text: Swap completed successfully! Transaction hash: ...

### SEND_NEAR
Transfer NEAR tokens to another account

#### Properties
- Name: SEND_NEAR
- Similes: TRANSFER_NEAR, SEND_TOKENS, TRANSFER_TOKENS, PAY_NEAR

#### Handler
The handler function for the SEND_NEAR action transfers the specified amount of NEAR tokens to the recipient account. It verifies the validity of the transfer content, initiates the transfer, and provides feedback to the user regarding the success or failure of the transaction.

#### Examples
- User 1: "Send 1.5 NEAR to bob.testnet"
- Agent: "I'll send 1.5 NEAR now..."
- Agent: "Successfully sent 1.5 NEAR to bob.testnet\nTransaction: ABC123XYZ"



### Providers
### WalletProvider
The WalletProvider is a class that serves as a provider for interacting with a NEAR wallet. It allows to fetch the portfolio of the wallet, including token balances and their values in USD.

#### Methods
The `get()` method of the WalletProvider class is used to retrieve the formatted portfolio of the connected wallet. This method takes in the runtime, message, and optional state, and returns a formatted string representing the wallet's portfolio.

The `connect()` method is used to establish a connection to the NEAR wallet using the provided wallet credentials. It retrieves the secret key and public key from the runtime settings, creates a KeyPair from the secret key, sets the key in the keystore, and connects to the NEAR network.

The `fetchPortfolioValue()` method fetches the current portfolio value of the connected wallet. It retrieves the account balance, converts yoctoNEAR to NEAR, fetches the NEAR price in USD, and constructs a WalletPortfolio object containing the total USD value, total NEAR balance, and token details.

The `fetchNearPrice()` method fetches the current NEAR price in USD from the CoinGecko API. It caches the fetched price for subsequent requests to reduce API calls.

The `formatPortfolio()` method formats the portfolio data into a human-readable string. It includes the account ID, total value in USD and NEAR, token balances, and market prices for each token in the portfolio.

The `getFormattedPortfolio()` method is a wrapper that fetches the portfolio data and formats it using the `formatPortfolio()` method. It handles any errors that may occur during the process and logs them using the `elizaLogger`.

Please note that the code provided is truncated for brevity and may not include the full implementation details of each method.



### Evaluators
No evaluators documentation available.

## Usage Examples
### providers/wallet.ts

### Common Use Cases
1. Fetching and displaying wallet portfolio data:
```typescript
const walletProvider = new WalletProvider("exampleAccountId");
const portfolioData = await walletProvider.getFormattedPortfolio(runtime);
console.log(portfolioData);
```

2. Connecting to NEAR wallet and fetching portfolio value:
```typescript
const walletProvider = new WalletProvider("exampleAccountId");
const connectedAccount = await walletProvider.connect(runtime);
const portfolioValue = await walletProvider.fetchPortfolioValue(runtime);
console.log(portfolioValue);
```

### Best Practices
- Use constructor to initialize a new instance of WalletProvider with the account ID.
- Utilize the getFormattedPortfolio method to retrieve and format the portfolio data asynchronously.

### actions/transfer.ts

### Common Use Cases

1. **Transfer NEAR Tokens**: 
   Transfer NEAR tokens from the current account to a recipient using the `transferNEAR` function.
   
   ```typescript
   const recipient = "example.near";
   const amount = "10";
   const transactionHash = await transferNEAR(runtime, recipient, amount);
   console.log("Transfer successful. Transaction hash: ", transactionHash);
   ```

2. **Check if Content is TransferContent**: 
   Check if a given content is of type `TransferContent` using the `isTransferContent` function.
   
   ```typescript
   const content = {
       recipient: "example.near",
       amount: "5"
   };
   const isTransfer = isTransferContent(runtime, content);
   console.log("Is content a transfer? ", isTransfer);
   ```

### Best Practices
- **Error Handling**: Always handle errors that may occur during the transfer process.
- **Validation**: Ensure that the recipient and amount are valid before initiating a transfer.

### environment.ts

### Common Use Cases
1. Fetching configuration settings for a specific environment using `getConfig` function:

```typescript
import { getConfig } from './environment';

const config = getConfig('testnet');
console.log(config);
```

2. Validating NEAR configuration using `validateNearConfig` function:

```typescript
import { validateNearConfig } from './environment';

validateNearConfig(runtime).then((nearConfig) => {
  console.log(nearConfig);
});
```

### Best Practices
- Ensure to provide a valid environment parameter when using `getConfig` function to retrieve accurate configuration settings.
- Handle the promise returned by `validateNearConfig` function using `then` or `async/await` to properly access the validated NEAR configuration.

### actions/swap.ts

### Common Use Cases

1. Checking storage balance before performing an action:
```typescript
const account = "alice";
const contractId = "exampleContract";
const hasBalance = await checkStorageBalance(account, contractId);
if (hasBalance) {
    // Proceed with the action
} else {
    // Handle insufficient storage balance
}
```

2. Swapping tokens using the FT protocol:
```typescript
const runtime = getAgentRuntime(); // Assuming getAgentRuntime function is defined
const inputTokenId = "token1";
const outputTokenId = "token2";
const amount = "100";
const slippageTolerance = 0.01;
const swapTransactions = await swapToken(runtime, inputTokenId, outputTokenId, amount, slippageTolerance);
// Process the swapTransactions returned from the function
```

### Best Practices

- Encapsulate the actions in try-catch blocks to handle any errors that may occur during the execution.
- Ensure proper error handling and validation of input parameters to prevent unexpected behavior.

## FAQ
### Q: My action is registered, but the agent is not calling it
Ensure that action's name clearly aligns with the task, and ensure you give a detailed description of the conditions that should trigger the action

### Q: What are the key responsibilities of the WalletProvider class?
The WalletProvider class connects to a NEAR wallet, retrieves portfolio information such as account balance and token details, and implements the Provider interface to supply dynamic and real-time data for agent interactions.

### Q: Can the transferNEAR function handle multiple token transfers in one call?
No, the transferNEAR function is designed to handle a single NEAR token transfer per function call, from one account to a specified recipient.

### Q: How can I perform a token swap using this plugin?
You can use the swapToken function to perform token swaps by specifying the input and output token IDs, the amount to be swapped, and an optional slippage tolerance to manage price variations during the swap process.

### Q: How can I extend the configuration for new environments?
You can extend the configuration by modifying the PROVIDER_CONFIG or using the getConfig function to add new environment settings, ensuring any new environments align with the expected schema defined in nearEnvSchema.

### Q: What should I do if I encounter an incorrect account balance?
Check if the storage balance is sufficient by using the checkStorageBalance function. Ensure that the account specified has the necessary permissions and connectivity to retrieve up-to-date balance information.

## Development

### TODO Items
No TODO items found.

## Troubleshooting Guide
### Transaction fails with insufficient funds error
- Cause: The account balance is less than the required amount for transaction fees and the transfer amount.
- Solution: Ensure the account has enough balance to cover both the transfer amount and transaction fees before initiating the transaction.

### Failure to retrieve wallet information
- Cause: Incorrect configuration or environmental variables for the NEAR network.
- Solution: Verify that all necessary environment variables are correctly set and that the network configurations in PROVIDER_CONFIG align with your target environment.

### Token swap not executing
- Cause: Incorrect input or output token IDs or insufficient slippage tolerance.
- Solution: Double-check token IDs and ensure the slippage tolerance is set appropriately to execute the swap considering market volatility.

### Debugging Tips
- Verify that all environmental variables are set correctly and match the network you intend to interact with.
- Use the validateNearConfig function to confirm that the NEAR configuration is valid and correctly applied.
- Ensure your agent runtime has the necessary permissions and connectivity needed to interface with the NEAR network.
