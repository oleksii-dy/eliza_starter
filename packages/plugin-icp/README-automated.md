# @elizaos/plugin-icp Documentation

## Overview
### Purpose
The @elizaos/plugin-icp is designed to facilitate the seamless integration of Internet Computer Protocol (ICP) functionalities within ElizaOS, enabling users to create, manage, and interact with tokens, transactions, and blockchain inquiries. The plugin provides a comprehensive suite of interfaces and operations for managing cryptocurrency tasks, uploading files to Web3 storage, and conducting financial transactions, thus equipping developers with robust tools for building decentralized applications.

### Key Features
Token management and creation through structured interfaces,Integration with Web3 storage for file uploads,Detailed transaction and account management functionalities,Support for dynamic contextual information through Providers,Building blocks for agent interactions with Actions,Advanced evaluation and data extraction through Evaluators

## Installation
# Installation and Integration Instructions for @elizaos/plugin-icp

## 1. Adding the plugin to your ElizaOS project:

- Add the following to your agent/package.json dependencies:
```json
{
  "dependencies": {
    "@elizaos/plugin-icp": "workspace:*"
  }
}
```
- cd into the agent/ directory
- Run `pnpm install` to install the new dependency
- Run `pnpm build` to build the project with the new plugin

## 2. Importing and using the plugin:

- Import the plugin using: `import { icpPlugin } from "@elizaos/plugin-icp";`
- Add it to the AgentRuntime plugins array like below:
```typescript
return new AgentRuntime({
    // other configuration...
    plugins: [
        icpPlugin,
        // other plugins...
    ],
});
```

## 3. Integration example showing the complete setup:

```typescript
import { icpPlugin } from "@elizaos/plugin-icp";

return new AgentRuntime({
    // other configuration...
    plugins: [
        icpPlugin,
        // other plugins...
    ],
});
```

## 4. Verification steps to ensure successful integration:
- Ensure you see ["✓ Registering action: CREATE_TOKEN"] in the console

Remember to follow the steps carefully to successfully integrate the @elizaos/plugin-icp plugin into your ElizaOS project.

## Configuration
# Configuration Documentation

## Required Environment Variables

### 1. `DATABASE_URL`
   - Purpose: Specifies the database connection URL.

### 2. `API_KEY`
   - Purpose: Provides access to the API.

### 3. `PORT`
   - Purpose: Defines the port number for the application to run on.

## Example .env File

```plaintext
INTERNET_COMPUTER_PRIVATE_KEY=<your-ed25519-private-key>
```

Please ensure that the configuration is done in the .env file and that the .env file is added to the .gitignore to prevent it from being committed to the repository.

## Features

### Actions
### CREATE_TOKEN
Create a new meme token on PickPump platform (Internet Computer). This action helps users create and launch tokens specifically on the PickPump platform.

#### Properties
- Name: CREATE_TOKEN
- Similes: CREATE_PICKPUMP_TOKEN, MINT_PICKPUMP, PICKPUMP_TOKEN, PP_TOKEN, PICKPUMP发币, PP发币, 在PICKPUMP上发币, PICKPUMP代币

#### Handler
The handler for this action creates a new meme token on the PickPump platform. It generates a token logo, uploads it to Web3Storage, and then creates the token transaction using the provided name, symbol, description, and logo.

#### Examples
- User 1: "I want to create a space cat token on PickPump"
  User 2: "Creating space cat token on PickPump..."
  User 2: "✨ Token created successfully!"

- User 1: "Help me create a pizza-themed funny token on PP"
  User 2: "Creating pizza token on PickPump..."



### Providers
### WalletProvider
The WalletProvider class is responsible for managing ICP identity, creating HTTP agent, and creating actor instances to interact with Internet Computer canisters.

#### Methods
The `createAgent` method creates and returns an HTTP agent for the given identity and host.

The `getIdentity` method returns the Ed25519KeyIdentity associated with the WalletProvider instance.

The `getPrincipal` method returns the Principal associated with the identity of the WalletProvider instance.

The `createActor` method asynchronously creates an actor instance with the given interface factory, canister ID, and optional flag to fetch the root key.

The `icpWalletProvider` function is a utility function that retrieves the private key from the runtime settings, creates a WalletProvider instance with the private key, and returns the wallet information along with its identity and principal. If an error occurs, it returns an error message instead.

The `createAnonymousActor` utility function creates an actor instance anonymously using the given interface factory, canister ID, host, and an optional flag to fetch the root key.



### Evaluators
No evaluators documentation available.

## Usage Examples
### apis/uploadFile.ts

### Common Use Cases
1. Uploading an image to Web3 Storage:
```typescript
const base64Data = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0..."; // Base64 encoded image data
const fileName = "my_image.png";

uploadFileToWeb3Storage(base64Data, fileName)
  .then(response => {
    console.log(response);
  })
  .catch(error => {
    console.error(error);
  });
```

2. Uploading a PDF file to Web3 Storage:
```typescript
const base64Data = "data:application/pdf;base64,JVBERi0xLjQKJf////8KOCAwIG9iago8..."; // Base64 encoded PDF data
const fileName = "my_document.pdf";

uploadFileToWeb3Storage(base64Data, fileName)
  .then(response => {
    console.log(response);
  })
  .catch(error => {
    console.error(error);
  });
```

### Best Practices
- Ensure that the base64 data provided is valid and correctly formatted before calling the `uploadFileToWeb3Storage` function.
- Handle the promise rejection by catching any errors that may occur during the file upload process.

### canisters/pick-pump/index.did.d.ts

### Common Use Cases
1. Creating a new Meme Token:
```typescript
import { CreateMemeTokenArg } from './canisters/pick-pump/index.did';

const newToken: CreateMemeTokenArg = {
  twitter: ['@example'],
  logo: 'https://example.com/logo.png',
  name: 'Example Token',
  description: 'This is an example token',
  website: ['https://example.com'],
  telegram: ['@example'],
  symbol: 'EXM'
};
```

2. Initializing arguments for the service:
```typescript
import { InitArg } from './canisters/pick-pump/index.did';

const initArgs: InitArg = {
  fee_receiver: 'dfgsdfg-sdfgsdfg-sdfg',
  create_token_fee: 10n,
  icp_canister_id: 'fsdgsdfg-sdfgsdfg-sdfgsd',
  maintenance: false,
  fee_percentage: 0.1
};
```

### Best Practices
- Use the specified interface types for consistent data structures throughout the application.
- Follow the JSDoc comments for better understanding of the purpose and structure of each interface.

### canisters/token-icrc1/index.did.d.ts

### Common Use Cases
1. Creating a new token-icrc1 account:
```typescript
const newAccount: Account = {
    ow: "principal-id-here"
};
```

2. Performing a transfer operation with specified parameters:
```typescript
const transferOperation: CandidOperation = {
    Transfer: {
        amount: 100n,
        to: [1, 2, 3, 4]  // Example account identifier
    }
};
```

### Best Practices
- When defining a new account, always ensure the `ow` property is assigned with the correct Principal value.
- When performing transfer operations, double-check the amount and recipient before executing the operation.

### types.ts

### Common Use Cases
1. Define a CP Config using the ICPConfig interface:
```typescript
const config: ICPConfig = {
    privateKey: "myPrivateKey",
    network: "mainnet"
};
```

2. Create a new meme token using the CreateMemeTokenArg type:
```typescript
const memeToken: CreateMemeTokenArg = {
    name: "Sample Token",
    symbol: "ST",
    description: "This is a sample meme token",
    logo: "https://samplelogo.com"
};
```

### Best Practices
- Ensure to provide all the required properties when using interfaces to avoid any errors during compilation.
- Use types to define the structure of arguments or variables for better code readability and maintainability.

### utils/common/types/results.ts

Common Use Cases

1. Check if a result is successful or contains an error:
```typescript
import { MotokoResult } from 'utils/common/types/results';

const result: MotokoResult<number, string> = { success: true, value: 42, error: undefined };
if (result.success) {
    console.log(`Success: ${result.value}`);
} else {
    console.error(`Error: ${result.error}`);
}
```

2. Handling RustResult types in JavaScript code:
```typescript
import { RustResult } from 'utils/common/types/results';

const result: RustResult<number, string> = { Ok: 42, Err: undefined };
if (result.Ok !== undefined) {
    console.log(`Ok: ${result.Ok}`);
} else {
    console.error(`Err: ${result.Err}`);
}
```

Best Practices

- Always handle both success and error cases when using MotokoResult or RustResult types.
- Ensure that the success value is checked properly before accessing it to avoid runtime errors.

### utils/number.ts

### Common Use Cases
1. Abbreviate a large number to a more readable format:
```typescript
import { abbreviateNumber } from './utils/number';

const largeNumber = 10000;
const abbreviatedNumber = abbreviateNumber(largeNumber, 1);
console.log(abbreviatedNumber); // Output: 10.0K
```

2. Convert a number to a string with a specific precision:
```typescript
import { toPrecision } from './utils/number';

const number = 3.14159;
const precision = 2;
const formattedNumber = toPrecision(number, precision);
console.log(formattedNumber); // Output: 3.14
```

### Best Practices
- Ensure to specify the precision value when using the `abbreviateNumber` and `toPrecision` functions to get the desired output.
- Use the functions to optimize the presentation of numbers in user interfaces.

### actions/createToken.ts

### Common Use Cases
1. Creating a new token transaction:
```typescript
const creator: ActorCreator = { name: "Alice", address: "0x1234567890" };
const tokenInfo: CreateMemeTokenArg = { name: "MEME", symbol: "MEME", supply: 1000000 };
const tokenCreationResult = await createTokenTransaction(creator, tokenInfo);
```

2. Generating a logo for a cryptocurrency token:
```typescript
const description = "A fun meme token for crypto enthusiasts";
const runtime: IAgentRuntime = { platform: "web", version: "1.0.0" };
const logoURL = await generateTokenLogo(description, runtime);
```

### Best Practices
- Ensure to provide accurate information when creating a new token transaction.
- Check the generated logo URL for validity before using it in your project.

### actions/prompts/token.ts

### Common Use Cases
1. Use the token prompt code to display a prompt for users to enter a token for verification purposes.
```typescript
const tokenPrompt = new TokenPrompt();
const token = await tokenPrompt.promptUser();
console.log(`Entered token: ${token}`);
```

2. Utilize the token prompt in a multi-factor authentication system where users are required to enter a token in addition to their password for verification.
```typescript
const mfaTokenPrompt = new TokenPrompt("Enter your MFA token:");
const mfaToken = await mfaTokenPrompt.promptUser();
console.log(`Entered MFA token: ${mfaToken}`);
```

### Best Practices
- Ensure to provide clear instructions to the user when using the token prompt to avoid any confusion.
- Validate the entered token to ensure it meets the required format or criteria before proceeding with further actions.

### canisters/pick-pump/index.did.ts

### Common Use Cases
1. The provided code can be used to implement a simple "pick and pump" feature in a virtual reality (VR) or augmented reality (AR) application, where users can select an item and then pump it up or down using hand gestures or touch controls.
   
   ```typescript
   import { useState } from "react";
   
   function PickPump() {
     const [selectedItem, setSelectedItem] = useState(null);
     const [pumpLevel, setPumpLevel] = useState(0);
     
     // Add logic for picking an item and adjusting pump level
     // ...
   }
   ```
   
2. The code can also be used in a gamified workout app, where users can pick different weight levels for their exercises and pump them up or down based on their strength and stamina levels.

### Best Practices
- Make sure to provide clear visual feedback to the user when an item is selected and when the pump level changes.
- Implement smooth transitions and animations to make the picking and pumping interactions more engaging for users.

### canisters/token-icrc1/index.did.ts

### Common Use Cases
1. **Create a new token:** This code can be used to create a new token with a specific name, symbol, and initial supply.
   ```typescript
   const newToken = new Token("MyToken", "MTK", 100000);
   ```

2. **Mint additional tokens:** This code can be used to mint additional tokens to an existing token account.
   ```typescript
   newToken.mint(5000);
   ```

### Best Practices
- **Error handling:** Make sure to add error handling for cases such as exceeding the maximum token supply or trying to transfer more tokens than available in the account.
- **Consistent naming conventions:** Use consistent naming conventions for variables and functions to improve code readability and maintainability.

### utils/common/data/json.ts

### Common Use Cases
1. Use the code to parse JSON data from a file and manipulate it in your application.
```typescript
import { readJSON, writeJSON } from './utils/common/data/json';

const data = readJSON('data.json');
console.log(data);

data.newKey = 'newValue';
writeJSON('data.json', data);
```

2. Use the code to validate JSON data before saving it to a file.
```typescript
import { validateJSON } from './utils/common/data/json';

const newData = { name: 'John Doe', age: 25 };
if(validateJSON(newData)){
  writeJSON('newData.json', newData);
}
```

### Best Practices
- Ensure to handle any exceptions that may occur during file operations using try-catch blocks.
- Validate the JSON data before attempting to parse or write it to ensure data integrity.

### utils/ic/index.ts

### Common Use Cases
1. The code in utils/ic/index.ts can be used to generate an initial character of a given string. This can be useful for creating avatars or displaying user initials in a UI component.

```typescript
import { getInitials } from utils/ic/index.ts;

const userName = "John Doe";
const initials = getInitials(userName); // Output: "JD"
```

2. Another use case for the code in utils/ic/index.ts is to format phone numbers by adding parentheses and dashes for better readability.

```typescript
import { formatPhoneNumber } from utils/ic/index.ts;

const phoneNumber = "1234567890";
const formattedNumber = formatPhoneNumber(phoneNumber); // Output: "(123) 456-7890"
```

### Best Practices
- Ensure that the input data for the utils functions are properly validated to prevent unexpected behavior.
- Consider using the functions in a reusable and modular way to promote code maintainability and reusability.

## FAQ
### Q: Can I create a meme token using this plugin?
Yes, you can create a meme token using the createTokenTransaction function. This function takes information such as the token name, symbol, and description to create a new token.

### Q: How do providers integrate with external systems?
Providers serve as a bridge between the agent and various external systems, enabling access to market data, wallet information, and other context. They inject dynamic context into agent interactions, thus allowing the agent to supply updated and relevant information.

### Q: Can actions in this plugin modify the agent's behavior?
Yes, actions are core features in ElizaOS that enable agents to interact with external systems and modify their behavior. They define how agents respond to messages, allowing them to perform tasks beyond simple responses.

### Q: How can I upload a file to Web3 storage with this plugin?
You can upload a file using the uploadFileToWeb3Storage function, which converts base64 data to a Blob and sends it via a POST request to the Web3 storage platform.

### Q: My action is registered, but the agent is not calling it.
Ensure that the action's name clearly aligns with the task, and provide a detailed description of the conditions that should trigger the action for it to function correctly.

### Q: How do evaluators maintain contextual awareness?
Evaluators extract facts and insights from conversations and integrate with the AgentRuntime's evaluation system. This enables them to build long-term memory, track goals, and maintain contextual awareness.

## Development

### TODO Items
No TODO items found.

## Troubleshooting Guide
### Upload to Web3 storage fails
- Cause: Incorrect base64 data format or network issues
- Solution: Verify that the base64 data is correctly formatted and ensure a stable internet connection.

### Token creation fails
- Cause: Missing or invalid token information
- Solution: Ensure that all required fields such as name, symbol, and description are properly populated with valid data before attempting to create the token.

### Debugging Tips
- Check network connectivity if uploads or data retrievals fail.
- Ensure all required token fields are correctly formatted and provided.
- Review the action and provider configuration in the system for any discrepancies.
- Utilize console logs or debugging tools to inspect data handling and processing flows.
