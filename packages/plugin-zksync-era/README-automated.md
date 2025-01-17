# @elizaos/plugin-zksync-era Documentation

## Overview
### Purpose
The '@elizaos/plugin-zksync-era' is designed to facilitate seamless interaction with the ZKSync Era layer-2 scaling solution for Ethereum. It focuses on enabling agents to efficiently manage token transfers by validating transfer contexts and configurations. By integrating with the runtime environment, this plugin helps in managing decentralized financial operations, thus making the process of sending tokens more streamlined and secure.

### Key Features
Validates TransferContent objects to ensure correct data structure and field content.,Provides a schema for ZKSync environment variables, ensuring proper configuration.,Integrates with the agent runtime to enable dynamic access to ZKSync configurations.,Facilitates token transfer operations via defined TransferActions.,Supports validation of configuration and runtime environments for reliable execution.

## Installation
## Installation and Integration Instructions for @elizaos/plugin-zksync-era

### 1. Add the plugin to your ElizaOS project:
- Add the following to your `agent/package.json` dependencies:
```json
{
  "dependencies": {
    "@elizaos/plugin-zksync-era": "workspace:*"
  }
}
```
- CD into the `agent/` directory
- Run `pnpm install` to install the new dependency
- Run `pnpm build` to build the project with the new plugin

### 2. Import and Use the Plugin:
- Import the plugin using:
```typescript
import { zksyncEraPlugin } from "@elizaos/plugin-zksync-era";
```
- Add the plugin to the AgentRuntime plugins array

### 3. Integration Example:
```typescript
import { zksyncEraPlugin } from "@elizaos/plugin-zksync-era";

return new AgentRuntime({
    // other configuration...
    plugins: [
        zksyncEraPlugin,
        // other plugins...
    ],
});
```

### 4. Verification Steps:
- Ensure you see ["✓ Registering action: SEND_TOKEN"] in the console

Make sure to follow these steps carefully to successfully integrate the @elizaos/plugin-zksync-era plugin into your ElizaOS project.

## Configuration
# Configuration Documentation

## Required Environment Variables and Purpose:
1. **ZKSYNC_ADDRESS**  
   - Description: Used to specify the ZKSync address for the application to interact with.
  
2. **ZKSYNC_PRIVATE_KEY**  
   - Description: Stores the private key required for ZKSync transactions.

## Example .env File:
```plaintext
ZKSYNC_ADDRESS=address_here
ZKSYNC_PRIVATE_KEY=private_key_here
```

**Note:** Configuration is done in the .env file. Ensure the .env file is set in the .gitignore to avoid committing sensitive information to the repository.

## Features

### Actions

### SEND_TOKEN
Transfer tokens from the agent's wallet to another address on zkSync Era network.

#### Properties
- Name: SEND_TOKEN
- Similes: TRANSFER_TOKEN_ON_ZKSYNC, TRANSFER_TOKEN_ON_ERA, TRANSFER_TOKENS_ON_ZKSYNC, TRANSFER_TOKENS_ON_ERA, SEND_TOKENS_ON_ZKSYNC, SEND_TOKENS_ON_ERA, SEND_ETH_ON_ZKSYNC, SEND_ETH_ON_ERA, PAY_ON_ZKSYNC, PAY_ON_ERA
- Description: Transfer tokens from the agent's wallet to another address on zkSync Era network

#### Handler
The handler manages token transfers on zkSync Era. Key functionality includes:
- ENS name resolution for recipient addresses
- Support for both native ETH and ERC20 token transfers
- Automatic decimal handling for different tokens
- Transaction validation and error handling

#### Validation
- Validates zkSync configuration settings
- Verifies recipient address format (ETH address or ENS)
- Validates token contract addresses
- Checks token balance and allowance

#### Token Support
- Native ETH transfers
- ERC20 token transfers with configurable decimals
- Special handling for common tokens like USDC
- ENS domain resolution support

#### Examples
- Native ETH Transfer:

### Providers
No providers documentation available.

### Evaluators
No evaluators documentation available.

## Usage Examples
### utils/validateContext.ts

### Common Use Cases
1. Validating a TransferContent object before processing a transfer:
```typescript
import { ValidateContext } from './utils/validateContext';

const transferData = {
    sender: 'Alice',
    receiver: 'Bob',
    amount: 100
};

const isValidTransfer = ValidateContext.transferAction(transferData);
if(isValidTransfer) {
    // Process the transfer
} else {
    console.log('Invalid transfer data');
}
```

2. Performing additional validation on a TransferContent object in a different part of the application:
```typescript
import { ValidateContext } from './utils/validateContext';

const transferData = {
    sender: 'Charlie',
    receiver: 'David',
    amount: 'invalid' // Amount should be a number, validate before processing
};

const isValidTransfer = ValidateContext.transferAction(transferData);
if(isValidTransfer) {
    // Process the transfer
} else {
    console.log('Invalid transfer data');
}
```

### Best Practices
- It is recommended to always validate input data before processing it to ensure data integrity and prevent errors.
- Reusing the validation logic provided by the `ValidateContext` class can help maintain consistency in validating TransferContent objects throughout the application.

### actions/transferAction.ts

### Common Use Cases
1. **Transfer Token**: This code is commonly used to transfer tokens from one address to another in a blockchain application. Below is an example of transferring tokens using the code:
```typescript
import { TransferContent } from 'transferAction';

const transferData: TransferContent = {
  tokenAddress: '0x123abc',
  recipient: '0x456def',
  amount: '100'
};

// Call transfer function with transferData
transfer(transferData);
```

2. **Content Transfer**: The code can also be used for transferring general content, not limited to tokens. Below is an example of transferring content using the code:
```typescript
import { TransferContent } from 'transferAction';

const contentData: TransferContent = {
  tokenAddress: '',
  recipient: 'example@gmail.com',
  amount: 'Some content'
};

// Call transfer function with contentData
transfer(contentData);
```

### Best Practices
- **Input Validation**: It is a best practice to validate the input data before executing the transfer action to ensure that the data is in the correct format and meets the required criteria.
- **Error Handling**: Implement proper error handling mechanisms to catch any errors that may occur during the transfer process and provide meaningful feedback to the user.

### enviroment.ts

### Common Use Cases
1. **Setting up ZKsync configuration based on runtime settings:**
   
```typescript
import { validateZKsyncConfig } from 'environment';

// Assuming `runtime` provides access to settings
const runtime = getRuntime();
const zksyncConfig = await validateZKsyncConfig(runtime);

console.log(zksyncConfig);
```

2. **Using the inferred ZKsyncConfig type for type checking:**

```typescript
import { ZKsyncConfig } from 'environment';

const zksyncConfig: ZKsyncConfig = {
  network: 'mainnet',
  apiBaseUrl: 'https://api.zksync.io',
  contractAddress: '0x1234567890',
  publicKeyHash: '0xAABBCCDDEEFF'
};

// Type checking will ensure that all properties are correctly assigned
```

### Best Practices
- **Ensure runtime is properly configured before calling `validateZKsyncConfig` to prevent errors.**
- **Use the inferred `ZKsyncConfig` type for type safety and avoiding potential runtime errors.**

## FAQ
### Q: My action is registered, but the agent is not calling it
Ensure that action's name clearly aligns with the task, and ensure you give a detailed description of the conditions that should trigger the action.

### Q: Can the plugin handle token transfers automatically?
Yes, through the use of the TransferAction, the plugin can manage and execute automated token transfers on the ZKSync network once the appropriate data is validated and configured.

### Q: How do I validate a ZKSync configuration?
Use the 'validateZKsyncConfig' function by providing the IAgentRuntime object. This will return a promise that resolves with a validated ZKSync configuration.

### Q: How can I extend the plugin for additional cryptocurrencies?
The plugin uses TransferContent for defining the structure of a transfer. You can extend this by adding more token addresses to the transferTemplate and updating the logic in ValidateContext and TransferAction as needed.

### Q: How can I ensure the TransferContent is valid before proceeding?
Use the ValidateContext class's method by passing the TransferContent object. It will return true if the content is valid, indicating that the action can proceed safely.

### Q: What are similes in a TransferAction?
Similes are alternative names or variations for the action. For example, 'TRANSFER_TOKEN_ON_ZKSYNC' ensures that the action is recognized even if it is referred to by different names in the code.

## Development

### TODO Items
No TODO items found.

## Troubleshooting Guide
### Invalid token address error during transfer
- Cause: The token address provided in TransferContent might not be correct or is not supported.
- Solution: Verify the token address against known supported addresses and ensure it's correctly entered in the TransferContent.

### Failure in validating ZKSync configuration
- Cause: Incorrect or missing environment variables in the ZKSync configuration schema.
- Solution: Check the zksyncEnvSchema and ensure all required variables are correctly set and formatted.

### Debugging Tips
- Always validate TransferContent objects before attempting a transfer operation.
- Check the runtime environment and ensure all ZKSync environment variables are correctly configured.
- Log configuration validation results to identify potential misconfigurations early.
- Ensure that action names and descriptions are clearly defined and match the intended operation.
