# @elizaos/plugin-flow Documentation

## Overview
### Purpose
@elizaos/plugin-flow is designed to facilitate seamless integration with the Flow blockchain, providing a robust framework for interacting with Flow-based smart contracts and assets. This plugin enables agents to efficiently manage tasks such as executing transactions, retrieving account information, and managing blockchain interactions through a series of well-defined classes and interfaces. By leveraging the Flow SDK, the plugin ensures that developers can interact with blockchain networks, including mainnet, testnet, and emulator, within their agent-based systems.

### Key Features
Execute Flow blockchain transactions using Cadence code with specified authorizations.,Retrieve and manage account information and balances.,Interact with the Flow blockchain across different network types (mainnet, testnet, emulator) with configurable RPC endpoints.,Use FlowConnector and FlowWalletProvider to perform blockchain operations within an integrated runtime environment.,Validate Flow configuration and ensure correct environment setup.

## Installation
## Installation and Integration Instructions for ElizaOS Plugin @elizaos/plugin-flow

### 1. Adding the Plugin to Your ElizaOS Project:
- Add the following to your agent/package.json dependencies:
```json
{
  "dependencies": {
    "@elizaos/plugin-flow": "workspace:*"
  }
}
```
- cd into the agent/ directory
- Run `pnpm install` to install the new dependency
- Run `pnpm build` to build the project with the new plugin

### 2. Importing and Using the Plugin:
- Import the plugin using: `import { flowPlugin } from "@elizaos/plugin-flow";`
- Add it to the AgentRuntime plugins array

### 3. Integration Example:
```typescript
import { flowPlugin } from "@elizaos/plugin-flow";

return new AgentRuntime({
    // other configuration...
    plugins: [
        flowPlugin,
        // other plugins...
    ],
});
```

### 4. Verification Steps:
- Ensure you see `["✓ Registering action: SEND_COIN"]` in the console after integration

Make sure to follow these steps for successful installation and integration of the @elizaos/plugin-flow plugin for ElizaOS.

## Configuration
# Configuration Documentation

## Required Environment Variables:

1. `FLOW_ADDRESS`:
   - Purpose: This environment variable is used to specify the address for the Flow network.

2. `FLOW_PRIVATE_KEY`:
   - Purpose: This environment variable is used to set the private key for the Flow network.

3. `FLOW_NETWORK`:
   - Purpose: This environment variable is used to define the network type for the Flow network.

4. `FLOW_ENDPOINT_URL`:
   - Purpose: This environment variable is used to set the endpoint URL for the Flow network.

## .env Example File:

```dotenv
FLOW_ADDRESS=your_flow_address
FLOW_PRIVATE_KEY=your_flow_private_key
FLOW_NETWORK=your_flow_network
FLOW_ENDPOINT_URL=your_flow_endpoint_url
```

Please ensure to set these environment variables in the `.env` file. Make sure to include the `.env` file in the `.gitignore` to avoid committing sensitive information to the repository.

If there are no environment variables found, the response will be:
"No Environment Variables Found"

## Features

### Actions
### SEND_COIN
Call this action to transfer any fungible token/coin from the agent's Flow wallet to another address

#### Properties
- Name: SEND_COIN
- Similes: SEND_TOKEN, SEND_TOKEN_ON_FLOW, TRANSFER_TOKEN_ON_FLOW, TRANSFER_TOKENS_ON_FLOW, TRANSFER_FLOW, SEND_FLOW, PAY_BY_FLOW

#### Handler
The handler for this action processes the messages received, validates the content, and transfers the specified token/coin to the intended recipient address.

#### Examples
- User {{user1}}: "Send 1 FLOW to 0xa2de93114bae3e73"
  Agent {{user2}}: "Sending 1 FLOW tokens now, pls wait..."

- User {{user1}}: "Send 1 FLOW - A.1654653399040a61.FlowToken to 0xa2de93114bae3e73"
  Agent {{user2}}: "Sending 1 FLOW tokens now, pls wait..."

- User {{user1}}: "Send 1000 FROTH - 0xb73bf8e6a4477a952e0338e6cc00cc0ce5ad04ba to 0x000000000000000000000002e44fbfbd00395de5"
  Agent {{user2}}: "Sending 1000 FROTH tokens now, pls wait..."



### Providers
### Flow Wallet Provider
Flow wallet Provider is a class that allows interaction with the Flow blockchain network for wallet-related functionalities.

#### Methods
The `sendTransaction` method is used to send a transaction to the Flow blockchain network using Cadence code and arguments. It also takes an optional `authz` parameter for authorization.

The `executeScript` method executes a script on the Flow blockchain network using Cadence code, arguments, and a default value to return.

The `buildAuthorization` method constructs an authorization object for signing transactions with the provided private key and account index.

The `signMessage` method signs a message using the provided private key.

The `syncAccountInfo` method synchronizes the account information of the wallet provider with the Flow blockchain network.

The `getWalletBalance` method retrieves the wallet balance from the cache or synchronizes the account information and returns the balance.

The `queryAccountBalanceInfo` method queries the balance information of the wallet provider's account on the Flow blockchain network.

The `isFlowAddress` function checks if an address is a valid Flow address.

The `isEVMAddress` function checks if an address is a valid EVM address.

The `isCadenceIdentifier` function checks if a string is a valid Cadence identifier.

The `getSignerAddress` function retrieves the signer address from the runtime settings.

The `get` method in the `flowWalletProvider` object injects the Flow wallet provider into the runtime context if the necessary settings are configured and retrieves the wallet balance information for the user.


### Flow Connector Provider
This provider offers functionality related to the Flow connector for AI agents.

#### Methods
The `get()` method is used to retrieve the status of the Flow connector for the current user. It returns a string containing information about the Flow network and endpoint that the user is connected to.



### Evaluators
No evaluators documentation available.

## Usage Examples
### actions/transfer.ts

### Common Use Cases
1. **First use case with code example:**
   - Creating a transfer action for sending tokens to a recipient address.
   ```typescript
   const transferAction = new TransferAction();
   const transferContent: TransferContent = {
       token: 'ETH',
       amount: 10,
       recipient: '0x1234567890ABCDEF',
       match: false
   };
   transferAction.transfer(transferContent);
   ```

2. **Second use case with code example:**
   - Processing incoming messages to execute transfer actions.
   ```typescript
   const transferAction = new TransferAction();
   const messages: any[] = [...]; // Incoming messages to process
   transferAction.processMessages(messages);
   ```

### Best Practices
- **Avoid direct manipulation of transfer content:**
  It is recommended to use the provided `TransferAction` methods for creating and executing transfer actions to ensure proper handling of transfer content.

- **Validate recipient addresses:**
  Before executing a transfer action, make sure to validate the recipient address format to prevent errors in the transfer process.

### providers/connector.provider.ts

### Common Use Cases
1. Initialize the FlowConnectorProvider with a runtime object:
```typescript
import { FlowConnectorProvider } from 'providers/connector.provider';

const runtime = new Runtime(); // Example runtime object
const connectorProvider = new FlowConnectorProvider(runtime);
```

2. Fetch the status of the Flow connector:
```typescript
import { FlowConnectorProvider } from 'providers/connector.provider';

const runtime = new Runtime(); // Example runtime object
const connectorProvider = new FlowConnectorProvider(runtime);
const connectorStatus = connectorProvider.getConnectorStatus();
```

### Best Practices
- Ensure to use the constructor to properly initialize the FlowConnectorProvider with a runtime object.
- Use the getConnectorStatus method to easily fetch the status of the Flow connector.

### providers/utils/flow.connector.ts

### Common Use Cases
1. Initializing the Flow SDK and executing various operations such as sending transactions, executing scripts, and retrieving account information.
```typescript
import { FlowConnector } from 'providers/utils/flow.connector';

const flowJSON = { /* Flow script JSON object */ };
const network = "mainnet";
const defaultRpcEndpoint = "https://mainnet.onflow.org";

const flowConn = new FlowConnector(flowJSON, network, defaultRpcEndpoint);
flowConn.getAccount("0x1234567890abcdef").then((account) => {
    console.log(account);
});
```

2. Sending a transaction with specified code, arguments, and authorizations.
```typescript
import { FlowConnector } from 'providers/utils/flow.connector';

const flowJSON = { /* Flow script JSON object */ };
const network = "mainnet";
const defaultRpcEndpoint = "https://mainnet.onflow.org";

const flowConn = new FlowConnector(flowJSON, network, defaultRpcEndpoint);
const code = "cadence code here";
const args = { /* arguments object */ };
const mainAuthz = { /* main authorization object */ };
const extraAuthz = [ /* additional authorizations array */ ];

flowConn.sendTransaction(code, args, mainAuthz, extraAuthz).then(() => {
    console.log("Transaction sent successfully");
});
```

### Best Practices
- When using the `FlowConnector` class, ensure to initialize the Flow SDK by calling the necessary methods like `getAccount`, `sendTransaction`, `executeScript`, etc. to avoid errors related to uninitialized SDK.
- Supply valid network type and default RPC endpoint while creating an instance of `FlowConnector` to ensure proper communication with the Flow network.

### providers/wallet.provider.ts

### Common Use Cases
1. FlowWalletProvider can be used to interact with the Flow blockchain network for sending transactions, executing scripts, and managing wallet balances.
```typescript
const walletProvider = new FlowWalletProvider();
walletProvider.network = "mainnet";
walletProvider.sendTransaction({ /* transaction details */ });
walletProvider.executeScript({ /* script details */ });
console.log(walletProvider.getWalletBalance());
```

2. The isFlowAddress function can be used to verify if a given address is a valid Flow address.
```typescript
const address = "f8d6e0586b0a20c7";
if (isFlowAddress(address)) {
    console.log("Valid Flow address");
} else {
    console.log("Invalid Flow address");
}
```

### Best Practices
- Ensure to set the network property of the FlowWalletProvider instance before interacting with the blockchain network.
- Use the syncAccountInfo method to keep the account information updated for accurate balance checks.

### types/index.ts

### Common Use Cases

1. Executing a Cadence script using the provided interfaces:
```typescript
import { IFlowSigner, TransactionResponse, FlowAccountBalanceInfo, IFlowScriptExecutor } from "./types";

const signer: IFlowSigner = {...};
const scriptExecutor: IFlowScriptExecutor = {...};

const code = "pub fun main(): Int { return 42 }";
const args = (arg: any) => [{ type: "String", value: arg }];

// Execute a script with arguments
scriptExecutor.executeScript(code, args("Hello"), 0).then(result => {
    console.log(result);
});

// Execute a transaction
const transactionCode = "transaction() {...}";
const transactionArgs = [{ type: "String", value: "example" }];
const transactionResponse = new TransactionResponse(signer);
transactionResponse.executeTransaction(transactionCode, transactionArgs).then(result => {
    console.log(result);
});

// Get account balance info
const address = "0x123456789";
const balanceInfo = new FlowAccountBalanceInfo(signer);
balanceInfo.getAccountBalance(address).then(result => {
    console.log(result);
});
```

2. Implementing custom scripts using the provided interfaces:
```typescript
import { IFlowScriptExecutor } from "./types";

class MyScriptExecutor implements IFlowScriptExecutor {
    executeScript(code: string, args: fcl.ArgumentFunction, defaultValue: T): Promise<T> {
        // Custom implementation for executing a Cadence script
    }
}

// Create an instance of custom script executor
const myScriptExecutor = new MyScriptExecutor();

// Use custom script executor
myScriptExecutor.executeScript("pub fun main(): String { return \"Custom Script\" }", args("Example"), "").then(result => {
    console.log(result);
});
```

### Best Practices

- Always handle promises returned by executing scripts or transactions to properly capture the results or errors.
- Use TypeScript to ensure type safety and proper usage of interfaces and functions.

### environment.ts

### Common Use Cases
1. Validate Flow Blockchain configuration based on runtime settings and environment variables:
```typescript
import { IAgentRuntime } from 'runtimeModule';
import { FlowConfig, validateFlowConfig } from 'environment';

const runtime: IAgentRuntime = // initialize the runtime object
validateFlowConfig(runtime)
  .then((config: FlowConfig) => {
    // Use the validated Flow Blockchain configuration
  })
  .catch((error: Error) => {
    console.error(error);
  });
```

2. Define and use a custom FlowConfig object:
```typescript
import { FlowConfig } from 'environment';

const customFlowConfig: FlowConfig = {
  // Add custom Flow Blockchain configuration properties
  port: 9000,
  nodeURL: 'https://custom-node-url.com'
};

// Use the custom FlowConfig object as needed
```

### Best Practices
- When using the `validateFlowConfig` function, ensure that you have set up the `IAgentRuntime` object correctly to provide the necessary runtime settings.
- When defining a custom FlowConfig object, make sure to include all required properties as per the schema to avoid errors during validation.

### queries.ts

- Use Case 1: Querying the balance of an EVM ERC20 token
```typescript
import { queryEvmERC20BalanceOf } from './queries';

const executor = new FlowScriptExecutor();
const owner = '0x1234567890abcdef';
const evmContractAddress = '0xa1b2c3d4e5f6';

queryEvmERC20BalanceOf(executor, owner, evmContractAddress)
    .then(balance => {
        console.log(`Balance of ${owner}: ${balance}`);
    })
    .catch(err => {
        console.error('Error querying balance:', err);
    });
```

- Use Case 2: Querying account balance info
```typescript
import { queryAccountBalanceInfo } from './queries';

const executor = new FlowScriptExecutor();
const owner = '0x1234567890abcdef';
const evmContractAddress = '0xa1b2c3d4e5f6';

queryAccountBalanceInfo(executor, owner, evmContractAddress)
    .then(balanceInfo => {
        console.log('Account balance info:', balanceInfo);
    })
    .catch(err => {
        console.error('Error querying account balance info:', err);
    });
```

- Best Practice 1: Always provide appropriate error handling when using these query functions to handle any potential exceptions that may occur.
- Best Practice 2: Make sure to instantiate a `FlowScriptExecutor` object before calling any of the query functions to ensure proper execution.

## FAQ
### Q: Can the Action execute a blockchain transaction on Flow?
Yes, the plugin provides functionality to send transactions on the Flow blockchain, using the sendTransaction method of the FlowConnector class. You can specify Cadence code, required arguments, and authorizations for the transaction.

### Q: Can I use this plugin to get account information from the Flow blockchain?
Yes, the FlowConnector class provides a method called getAccountInformation that allows you to retrieve detailed account information for a given Flow address.

### Q: How can I ensure my action is triggered correctly within the agent?
It's important that the action’s name clearly reflects its purpose and includes a well-documented description. Make sure to specify conditions that should trigger the action in the agent's configuration to ensure it is called when needed.

### Q: How do I extend the plugin to support additional blockchain operations?
You can extend the existing interfaces such as IFlowScriptExecutor or create new classes that implement additional functionalities, thereby expanding the plugin's capabilities while adhering to existing patterns.

### Q: What is the role of a FlowConnectorProvider?
FlowConnectorProvider acts as a singleton pattern implementation to retrieve an instance of the FlowConnector. It ensures a single point of access for initializing and managing the Flow SDK integration within the agent runtime.

### Q: My action is registered, but the agent is not calling it.
Ensure that the action's name clearly aligns with the task and that you provide a detailed description of the conditions that should trigger the action.

## Development

### TODO Items
### Items
1.  TODO -- require once implemented in FCL
   - Context: transactionId?: string;
   - Type: enhancement

## Troubleshooting Guide
### Failed to retrieve account balance
- Cause: Incorrect Flow address or network configuration
- Solution: Verify that the address is correct and ensure that the network type (mainnet, testnet, emulator) and RPC endpoint are properly configured.

### Transaction not executed
- Cause: Incorrect Cadence script or missing authorizations
- Solution: Double-check the Cadence script code for errors and ensure all necessary authorizations are provided.

### Debugging Tips
- Enable logging in the Flow SDK to capture network requests and responses.
- Ensure that the Flow SDK is initialized before making any blockchain requests.
- Use testnet for development and testing to avoid issues with mainnet transactions.
