# @elizaos/plugin-multiversx Documentation

## Overview
### Purpose
The @elizaos/plugin-multiversx is designed to facilitate seamless interactions with the MultiversX blockchain by providing essential functionalities for token management and transaction handling. It aims to enhance the capabilities of agents by integrating core modules such as providers and actions, which allow the dynamic injection of context, integration with external systems, and execution of blockchain-related operations.

### Key Features
WalletProvider for managing private key and network configurations,Interfaces for creating and transferring tokens,Schema validation for token creation,Configurations for different blockchain environments like mainnet, devnet, and testnet,Utility functions for content validation and configuration setup

## Installation
## Installation and Integration Instructions for @elizaos/plugin-multiversx

### 1. Adding the plugin to your ElizaOS project:
1. Add the following to your agent/package.json dependencies:
   ```json
   {
     "dependencies": {
       "@elizaos/plugin-multiversx": "workspace:*"
     }
   }
   ```
2. Navigate to the agent/ directory in your project.
3. Run `pnpm install` to install the new dependency.
4. Run `pnpm build` to build the project with the new plugin.

### 2. Importing and Using the Plugin:
- Import the plugin using: `import { multiversxPlugin } from "@elizaos/plugin-multiversx";`
- Add the plugin to the AgentRuntime plugins array.

### 3. Integration Example:
```typescript
import { multiversxPlugin } from "@elizaos/plugin-multiversx";

return new AgentRuntime({
    // other configuration...
    plugins: [
        multiversxPlugin,
        // other plugins...
    ],
});
```

### 4. Verification Steps:
- Ensure you see ["✓ Registering action: SEND_TOKEN"] in the console to verify successful integration.

## Configuration
# Configuration Documentation

## Required Environment Variables and their Purpose:

1. `MVX_PRIVATE_KEY`: Used to store the private key for MVX.
2. `MVX_NETWORK`: Used to specify the network for MVX.

## Example .env file:
```plaintext
MVX_PRIVATE_KEY=myPrivateKey123
MVX_NETWORK=testnet
```

**Please ensure that the .env file is set in the .gitignore file to prevent it from being committed to the repository.**

## Features

### Actions
### SEND_TOKEN
Transfer tokens from the agent wallet to another address

#### Properties
- Name: SEND_TOKEN
- Similes: TRANSFER_TOKEN, TRANSFER_TOKENS, SEND_TOKENS, SEND_EGLD, PAY

#### Handler
The handler for this action validates the configuration for the user, composes the transfer context, generates transfer content, validates the transfer content, and then sends tokens to the specified address.

#### Examples
- User 1: "Send 1 EGLD to erd12r22hx2q4jjt8e0gukxt5shxqjp9ys5nwdtz0gpds25zf8qwtjdqyzfgzm"
- Agent: "I'll send 1 EGLD tokens now..." (Action: SEND_TOKEN)

- User 1: "Send 1 TST-a8b23d to erd12r22hx2q4jjt8e0gukxt5shxqjp9ys5nwdtz0gpds25zf8qwtjdqyzfgzm"
- Agent: "I'll send 1 TST-a8b23d tokens now..." (Action: SEND_TOKEN)

### CREATE_TOKEN
Create a new token.

#### Properties
- Name: CREATE_TOKEN
- Similes: DEPLOY_TOKEN

#### Handler
The handler for the CREATE_TOKEN action initializes or updates the state, composes a transfer context, generates transfer content for creating a token, validates the content, and then attempts to create the token using the provided information.

#### Examples
- User1: "Create a token XTREME with ticker XTR and supply of 10000"
- Agent: "Successfully created token."

- User1: "Create a token TEST with ticker TST, 18 decimals and supply of 10000"
- Agent: "Successfully created token."



### Providers
No providers documentation available.

### Evaluators
No evaluators documentation available.

## Usage Examples
### providers/wallet.ts

### Common Use Cases

1. Get the address associated with a private key:
```typescript
const wallet = new WalletProvider(privateKey, 'mainnet');
const address = wallet.getAddress();
console.log(address);
```

2. Send EGLD from one wallet to another:
```typescript
const wallet = new WalletProvider(privateKey, 'testnet');
const transaction = wallet.sendEGLD(receiverAddress, amount);
console.log(transaction);
```

### Best Practices

- Always handle errors by catching any potential exceptions thrown by the methods.
- Use the appropriate network configuration (mainnet, testnet, devnet) for the specific use case.

### actions/createToken.ts

### Common Use Cases
1. Creating a new token:
```typescript
const content: CreateTokenContent = {
  tokenName: 'MyToken',
  tokenTicker: 'MT',
  decimals: '18',
  amount: '1000000'
};

if (isCreateTokenContent(runtime, content)) {
  // Perform token creation logic
} else {
  console.log('Invalid token content');
}
```

2. Validating token creation content:
```typescript
const invalidContent: CreateTokenContent = {
  tokenName: 'MyToken',
  decimals: '18',
  amount: '1000000'
};

if (isCreateTokenContent(runtime, invalidContent)) {
  console.log('Valid token content');
} else {
  console.log('Invalid token content');
}
```

### Best Practices
- Ensure all required properties are included in the `CreateTokenContent` interface.
- Always validate token creation content using the `isCreateTokenContent` function before proceeding with token creation logic.

### actions/transfer.ts

### Common Use Cases
1. Transferring a specific amount of token with token information:
```typescript
const transferData: TransferContent = {
  tokenAddress: '0x123abc',
  amount: '100',
  tokenIdentifier: 'USDT'
};

const isValidTransfer = isTransferContent(runtime, transferData);

if (isValidTransfer) {
  // Perform transfer operation
} else {
  console.log('Invalid transfer content');
}
```

2. Validating transfer content before initiating a transfer:
```typescript
const transferData: TransferContent = {
  tokenAddress: '0x456def',
  amount: '50',
  tokenIdentifier: 'DAI'
};

const isValidTransfer = isTransferContent(runtime, transferData);

if (isValidTransfer) {
  // Proceed with transfer operation
} else {
  console.log('Invalid transfer content');
}
```

### Best Practices
- Always validate the transfer content using `isTransferContent` function before initiating any transfer operations to ensure the data integrity.
- Make sure to provide accurate token information in the `TransferContent` interface to avoid any errors during the transfer process.

### enviroment.ts

### Common Use Cases
1. **First use case with code example**
   This code can be used to validate a Multiversx configuration based on the runtime settings and environment variables. For example:
   ```typescript
   import { validateMultiversxConfig } from 'environment';
   import { getAgentRuntime } from 'runtime';

   const runtime = getAgentRuntime();
   validateMultiversxConfig(runtime)
     .then((config) => {
       console.log('Validated Multiversx configuration:', config);
     })
     .catch((error) => {
       console.error('Error validating Multiversx configuration:', error);
     });
   ```

2. **Second use case with code example**
   Another use case for this code is to customize the Multiversx configuration before validation. For example:
   ```typescript
   import { validateMultiversxConfig } from 'environment';
   import { getAgentRuntime } from 'runtime';

   const runtime = getAgentRuntime();
   const customConfig = {
     // Custom configuration settings
   };
   validateMultiversxConfig(runtime, customConfig)
     .then((config) => {
       console.log('Validated Multiversx configuration:', config);
     })
     .catch((error) => {
       console.error('Error validating Multiversx configuration:', error);
     });
   ```

### Best Practices
- **Best practice 1:**
  It is recommended to use this code in a controlled and secure environment to prevent any unauthorized access to sensitive configuration settings.
  
- **Best practice 2:**
  Ensure that the `runtime` object passed to `validateMultiversxConfig` contains all the necessary settings and variables required for validation, to avoid any validation errors or unexpected behaviors.

### utils/amount.ts

### Common Use Cases
1. Calculating a formatted amount:
```typescript
import { calculateFormattedAmount } from 'utils/amount';

const payload = {
  amount: '10000',
  decimals: 2
};

const formattedAmount = calculateFormattedAmount(payload);
console.log(formattedAmount); // Output: 100.00
```

2. Checking if the amount is valid:
```typescript
import { isValidAmount } from 'utils/amount';

const payload = {
  amount: 'abc',
  decimals: 2
};

const isValid = isValidAmount(payload);
console.log(isValid); // Output: false
```

### Best Practices
- Ensure the payload object contains the correct properties when using the provided functions.
- Handle edge cases such as non-numeric values or negative decimals gracefully to avoid errors.

### utils/schemas.ts

### Common Use Cases
1. First use case: Defining reusable data schemas for different data structures
```typescript
// utils/schemas.ts
export const userSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string' },
    age: { type: 'number' }
  },
  required: ['id', 'name', 'email']
};

// In another file
import { userSchema } from './utils/schemas';

const userData = {
  id: '123',
  name: 'John Doe',
  email: 'johndoe@example.com',
  age: 30
};

// Validate user data against the schema
const isValid = validate(userData, userSchema);
```

2. Second use case: Defining validation schemas for form inputs
```typescript
// utils/schemas.ts
export const loginSchema = {
  type: 'object',
  properties: {
    username: { type: 'string' },
    password: { type: 'string' }
  },
  required: ['username', 'password']
};

// In another file
import { loginSchema } from './utils/schemas';

const formData = {
  username: 'user123',
  password: 'password123'
};

// Validate form data against the schema
const isValid = validate(formData, loginSchema);
```

### Best Practices
- Ensure to keep schemas simple and understandable for easier maintenance.
- Reuse schemas wherever possible to maintain consistency and reduce duplication.

## FAQ
### Q: What is the primary function of the WalletProvider class?
The WalletProvider class is responsible for initializing wallet functionalities using a user's private key and network configuration. It facilitates signing transactions and interacting with the blockchain.

### Q: Can the plugin handle token creation and transfers?
Yes, the plugin supports token creation and transfer functionalities through interfaces like CreateTokenContent and TransferContent, which define structures for handling specific token-related operations.

### Q: How can I validate token creation content in the plugin?
You can use the isCreateTokenContent function to check if the content provided meets the necessary requirements for token creation. This function analyzes the content structure against predefined criteria.

### Q: How do I configure different blockchain environments?
The plugin provides an MVX_NETWORK_CONFIG variable that includes configurations for mainnet, devnet, and testnet. You can select and modify settings as necessary to match your deployment needs.

### Q: How does the plugin integrate with agent runtime systems?
Providers within this plugin inject real-time information and context into agent interactions, enabling more meaningful exchanges. They allow access to data such as market trends or sentiment analysis, supporting diverse use cases.

### Q: My action is registered, but the agent is not calling it.
Ensure that the action's name clearly aligns with the task, and provide a detailed description of the conditions that should trigger the action. This helps the agent recognize and execute the action appropriately.

## Development

### TODO Items
No TODO items found.

## Troubleshooting Guide
### Unable to initialize WalletProvider
- Cause: Incorrect private key or network configuration
- Solution: Verify that the private key is correctly formatted and the network configuration matches the intended blockchain environment.

### Token creation validation fails
- Cause: Malformed CreateTokenContent structure
- Solution: Ensure that all properties (tokenName, tokenTicker, decimals, amount) are correctly provided according to the CreateTokenContent interface specifications.

### Invalid token transfer data
- Cause: Incorrect token address or amount
- Solution: Double-check the TransferContent properties to ensure the tokenAddress and amount fields are accurately filled.

### Debugging Tips
- Log detailed transaction attempts and errors for analysis.
- Utilize schema validations to preemptively catch data entry errors.
- Cross-check environment configurations for network-related issues.
