# @elizaos/plugin-story Documentation

## Overview
### Purpose
The @elizaos/plugin-story is designed to streamline the process of attaching license terms to intellectual properties (IPs) and managing IP assets on a blockchain environment. It serves as an integration plugin to facilitate the licensing and registration of assets, enabling users to easily handle IP metadata, license terms, and commercial use conditions in a systematic manner. By leveraging blockchain functionalities through a WalletProvider, the plugin provides robust mechanisms for IP management within decentralized environments.

### Key Features
Attach terms to licenses for IP assets with the AttachTermsAction class.,Retrieve available licenses through GetAvailableLicensesAction.,Fetch detailed information about intellectual property assets with GetIPDetailsAction.,Register new IP assets using the RegisterIPAction class.,Interact with blockchain wallet providers via the WalletProvider class.,Define and manage IP and asset metadata with various structured interfaces such as IPMetadata and AssetMetadata.

## Installation
## Installation Instructions

### 1. Adding the plugin to your ElizaOS project:
- Add the following to your agent/package.json dependencies:
  ```json
  {
    "dependencies": {
      "@elizaos/plugin-story": "workspace:*"
    }
  }
  ```
- cd into the agent/ directory
- Run `pnpm install` to install the new dependency
- Run `pnpm build` to build the project with the new plugin

### 2. Importing and using the plugin:
- Import the plugin using: `import { storyPlugin } from "@elizaos/plugin-story";`
- Add the plugin to the AgentRuntime plugins array

### 3. Integration Example
```typescript
import { storyPlugin } from "@elizaos/plugin-story";

return new AgentRuntime({
    // other configuration...
    plugins: [
        storyPlugin,
        // other plugins...
    ],
});
```

### 4. Verification Steps
Ensure successful integration by checking for the following console message:
```plaintext
✓ Registering action: GET_IP_DETAILS
```

Make sure to follow these installation and integration instructions to effectively utilize the @elizaos/plugin-story plugin in your ElizaOS project.

## Configuration
# Configuration Documentation

## Required Environment Variables:
1. STORY_PRIVATE_KEY: This variable is used to store the private key for the story.
2. PINATA_JWT: This variable is used to store the JWT for Pinata API authentication.
3. STORY_API_BASE_URL: This variable is used to store the base URL for the Story API.
4. STORY_API_KEY: This variable is used to store the API key for the Story API.

## .env Example File:
```plaintext
STORY_PRIVATE_KEY=your_private_key_here
PINATA_JWT=your_pinata_jwt_here
STORY_API_BASE_URL=your_api_base_url_here
STORY_API_KEY=your_api_key_here
```

Please ensure that the .env file is used for configuration, and remember to add it to the .gitignore file to prevent it from being committed to the repository.

## Features

### Actions

### ATTACH_TERMS
Attach license terms to an IP Asset on Story Protocol.

#### Properties
- Name: ATTACH_TERMS
- Similes: ATTACH_TERMS_TO_IP
- Description: Attach license terms to an IP Asset on Story Protocol blockchain

#### Handler
The handler function manages the process of attaching license terms to IP assets. It first validates or updates the conversation state, then generates the necessary parameters using a template context. It uses a WalletProvider to interact with the blockchain and an AttachTermsAction instance to execute the transaction. The handler supports both initial license term attachment and handles cases where terms are already attached. It provides transaction confirmation with explorer links for successful operations.

#### Validation
- Requires a valid Story Protocol private key starting with "0x"
- Validates wallet connection and transaction parameters before execution

#### Examples
- User 1: "I would like to attach license terms to my IP."
- Agent: "Sure! What is the ipId? You should also tell me if you want to add a minting fee, or if you want to enable commercial use of your IP. If so, you can add a revenue share as well."
- User 1: "Attach commercial, 10% rev share license terms to IP Asset 0x2265F2b8e47F98b3Bdf7a1937EAc27282954A4Db"
- Agent: "Successfully attached license terms: [licenseTermsId]. Transaction Hash: [txHash]. View it on the block explorer: [explorer_link]"

### GET_AVAILABLE_LICENSES
Retrieve available licenses for an IP Asset on Story Protocol.

#### Properties
- Name: GET_AVAILABLE_LICENSES
- Similes: AVAILABLE_LICENSES, AVAILABLE_LICENSES_FOR_IP, AVAILABLE_LICENSES_FOR_ASSET
- Description: Get available licenses for an IP Asset on Story Protocol

#### Handler
The handler function retrieves and formats available license information for specified IP assets. It generates parameters from the conversation context, queries the Story Protocol API through a GetAvailableLicensesAction instance, and formats the response for user readability. The handler includes error handling and provides structured feedback about available licenses.

#### Examples
- User 1: "Get available licenses for an IP Asset 0x2265F2b8e47F98b3Bdf7a1937EAc27282954A4Db"
- Agent: [Returns formatted list of available licenses with their terms and conditions]

#### Response Format
The response includes:
- License terms ID
- Commercial use status
- Revenue share percentages
- Minting fees
- Additional terms and conditions
- Source attribution to Story Protocol API

### GET_IP_DETAILS
Retrieve detailed information about an IP Asset on Story Protocol.

#### Properties
- Name: GET_IP_DETAILS 
- Similes: IP_DETAILS, IP_DETAILS_FOR_ASSET, IP_DETAILS_FOR_IP
- Description: Get comprehensive details for an IP Asset registered on Story Protocol

#### Handler
The handler retrieves detailed information about specified IP assets from Story Protocol. It processes the conversation state, queries the Story Protocol API through a GetIPDetailsAction instance, and returns formatted IP details including metadata, ownership information, and registration status. Includes error handling and structured response formatting.

#### Examples
- User 1: "Get details for an IP Asset 0x2265F2b8e47F98b3Bdf7a1937EAc27282954A4Db"
- Agent: [Returns formatted IP details including metadata, ownership, and registration information]

### LICENSE_IP
License an existing IP Asset on Story Protocol.

#### Properties
- Name: LICENSE_IP
- Similes: LICENSE, LICENSE_IP, LICENSE_IP_ASSET
- Description: Obtain a license for an IP Asset on Story Protocol

#### Handler
The handler manages the IP licensing process. It uses a WalletProvider to interact with the blockchain and processes license requests through a LicenseIPAction instance. The handler validates wallet connection, processes the license request, and mints license tokens upon successful transaction. Provides transaction confirmation with explorer links.

#### Validation
- Requires a valid Story Protocol private key starting with "0x"
- Validates wallet connection and license parameters

#### Examples
- User 1: "I would like to license an IP."
- Agent: "Sure! Please provide the ipId of the IP you want to license and the license terms id you want to attach."
- User 1: "License an IP Asset 0x2265F2b8e47F98b3Bdf7a1937EAc27282954A4Db with license terms 1"
- Agent: "Successfully minted license tokens: [tokenIds]. Transaction Hash: [txHash]. View it on the block explorer: [explorer_link]"

### REGISTER_IP
Register an NFT as a new IP Asset on Story Protocol.

#### Properties
- Name: REGISTER_IP
- Similes: REGISTER_IP, REGISTER_NFT
- Description: Register an NFT as an IP Asset on Story Protocol blockchain

#### Handler
The handler facilitates the registration of new IP assets. It utilizes a WalletProvider for blockchain interaction and processes registrations through a RegisterIPAction instance. Handles the complete registration process including metadata submission and blockchain transaction. Provides registration confirmation with explorer links.

#### Validation
- Requires a valid Story Protocol private key starting with "0x"
- Validates wallet connection and registration parameters

#### Examples
- User 1: "I would like to register my IP."
- Agent: "Sure! Please provide the title and description of your IP."
- User 1: "Register my IP titled 'My IP' with the description 'This is my IP'"
- Agent: "Successfully registered IP ID: [ipId]. Transaction Hash: [txHash]. View it on the explorer: [explorer_link]"

#### Response Format
All actions provide structured responses including:
- Success/failure status
- Transaction hashes where applicable
- Explorer links for verification
- Detailed error messages in case of failures
- Attribution to Story Protocol API when relevant



### Providers
### WalletProvider
This provider allows interaction with the Story Wallet, including retrieving the wallet address and balance.

#### Methods
The `getAddress()` method returns the wallet address associated with the provider.

The `getWalletBalance()` method asynchronously fetches the wallet balance and returns it as a string formatted with 18 decimals.

The `connect()` method returns the private key associated with the Story Wallet.

The `getPublicClient()` method returns the public client associated with the provider.

The `getWalletClient()` method returns the wallet client associated with the provider after checking if it has been connected.

The `getStoryClient()` method returns the Story client associated with the provider.

The `get()` method retrieves the wallet address and balance information, returning it as a formatted string or `null` if the wallet private key is not configured.



### Evaluators
No evaluators documentation available.

## Usage Examples
### actions/attachTerms.ts

### Common Use Cases
1. Attaching terms to a license for intellectual property.
```typescript
const attachTermsAction = new AttachTermsAction(walletProvider);
const params = {
  commercialUse: "yes",
  mintingFee: 100,
  ipId: "123456",
  commercialRevShare: "50%"
};
attachTermsAction.attachTerms(params)
  .then((response) => {
    console.log(response);
  })
  .catch((error) => {
    console.error(error);
  });
```

2. Updating terms for an existing license.
```typescript
const attachTermsAction = new AttachTermsAction(walletProvider);
const updatedParams = {
  commercialUse: "no",
  mintingFee: 200,
  ipId: "123456",
  commercialRevShare: "60%"
};
attachTermsAction.attachTerms(updatedParams)
  .then((response) => {
    console.log(response);
  })
  .catch((error) => {
    console.error(error);
  });
```

### Best Practices
- Ensure to provide all required parameters when attaching terms to a license.
- Handle promise rejections properly to manage errors when attaching terms.

### actions/getAvailableLicenses.ts

### Common Use Cases
1. Fetching available licenses for an IP asset from Story Protocol:
```
const action = new GetAvailableLicensesAction();
const params = { ipAssetId: '123' };
const response = action.getAvailableLicenses(params);
console.log(response);
```

2. Updating the available licenses for an IP asset:
```
const action = new GetAvailableLicensesAction();
const params = { ipAssetId: '456' };
const response = action.getAvailableLicenses(params);
console.log(response);
```

### Best Practices
- Ensure to provide the correct IP asset ID when calling the `getAvailableLicenses` method to fetch the available licenses for that specific asset.
- Handle the response object appropriately, as it contains an array of license details that may need to be processed further.

### actions/getIPDetails.ts

### Common Use Cases
1. Retrieving details of an IP address:
```typescript
const action = new GetIPDetailsAction();
const params = {
  ipId: "192.168.1.1"
};
action.getIPDetails(params)
  .then((response) => {
    console.log(response.data);
  })
  .catch((error) => {
    console.error(error);
  });
```

2. Handling IP details for multiple IP addresses:
```typescript
const action = new GetIPDetailsAction();
const ipAddresses = ["192.168.1.1", "10.0.0.1", "172.16.0.1"];
ipAddresses.forEach(ip => {
  const params = {
    ipId: ip
  };
  action.getIPDetails(params)
    .then((response) => {
      console.log(response.data);
    })
    .catch((error) => {
      console.error(`Error fetching details for IP ${ip}: ${error}`);
    });
});
```

### Best Practices
- Use proper error handling to catch any exceptions thrown during the IP details retrieval process.
- Ensure that the IP addresses provided in the parameters are valid and well-formatted before making the request.

### actions/licenseIP.ts

### Common Use Cases
1. Licensing an IP asset by minting license tokens:
```typescript
const licenseParams: LicenseIPParams = {
    assetId: '1234',
    licenseeAddress: '0x9876',
    quantity: 1,
    duration: 30
};

const licenseResponse = await LicenseIPAction.licenseIP(licenseParams);
console.log(licenseResponse);
```

2. Renewing an existing license for an IP asset:
```typescript
const renewalParams: LicenseIPParams = {
    assetId: '5678',
    licenseeAddress: '0x5432',
    quantity: 2,
    duration: 15
};

const renewalResponse = await LicenseIPAction.licenseIP(renewalParams);
console.log(renewalResponse);
```

### Best Practices
- Ensure that the `licenseIP` method is called with appropriate parameters to accurately license the IP asset.
- Handle errors and exceptions gracefully in case of failures during the licensing process.

### actions/registerIP.ts

### Common Use Cases
1. Registering an IP asset using the RegisterIPAction class.

```typescript
import { RegisterIPAction } from './actions/registerIP';

const registerAction = new RegisterIPAction(walletProvider);
const params = {
  ip: '127.0.0.1',
  port: 8080,
  protocol: 'http'
};
const runtime = {}; // Add actual runtime object
registerAction.registerIP(params, runtime).then(response => {
  console.log(response);
}).catch(err => {
  console.error(err);
});
```

2. Creating multiple instances of RegisterIPAction with different wallet providers.

```typescript
import { RegisterIPAction } from './actions/registerIP';

const walletProvider1 = new WalletProvider('provider1');
const walletProvider2 = new WalletProvider('provider2');

const registerAction1 = new RegisterIPAction(walletProvider1);
const registerAction2 = new RegisterIPAction(walletProvider2);

// Use registerAction1 and registerAction2 separately for different IP asset registrations
```

### Best Practices
- Ensure to handle errors using try-catch or .catch() method to catch any exceptions that might occur during the IP asset registration process.
- Use the constructor to inject the required WalletProvider object into the RegisterIPAction class for proper initialization.

### providers/wallet.ts

### Common Use Cases
1. Creating a new wallet provider instance and connecting to it:
```typescript
import { WalletProvider } from './providers/wallet';

const walletProvider = new WalletProvider(runtime);
walletProvider.connect().then(privateKey => {
    console.log(`Connected to wallet provider with private key: ${privateKey}`);
});
```

2. Getting the wallet balance of the connected wallet provider:
```typescript
import { WalletProvider } from './providers/wallet';

const walletProvider = new WalletProvider(runtime);
walletProvider.getWalletBalance().then(balance => {
    console.log(`Wallet balance: ${balance}`);
});
```

### Best Practices
- Ensure proper error handling for Promise rejections in asynchronous methods.
- Use the getAddress method to retrieve the address of the wallet provider before performing any transactions or operations.

### types/api.ts

### Common Use Cases
1. Creating and using an IPMetadata object:
```typescript
import { IPMetadata } from './types/api';

const metadata: IPMetadata = {
    title: 'Sample IP',
    description: 'This is a sample intellectual property.',
    author: 'John Doe'
};

console.log(metadata.title); // Output: Sample IP
```

2. Defining a RoyaltyHolder object:
```typescript
import { RoyaltyHolder } from './types/api';

const holder: RoyaltyHolder = {
    id: '12345',
    ownership: 'full'
};

console.log(holder.id); // Output: 12345
```

### Best Practices
- Always ensure that you are consistent with the properties and types defined in the interfaces.
- Use the provided interfaces to maintain a consistent data structure throughout your codebase.

### types/index.ts

### Common Use Cases
1. Creating a transaction object:
```typescript
const transaction: Transaction = {
    hash: '0xabc123',
    from: '0x123456',
    to: '0x789abc',
    value: BigInt(100),
    data: '0xabcdef',
    chainId: 1
};
```

2. Representing a token with balance information:
```typescript
const tokenWithBalance: TokenWithBalance = {
    token: {symbol: 'ABC', decimals: 18, address: '0xdef789', name: 'TokenABC', chainId: 1},
    balance: BigInt(500),
    formattedBalance: '500.00',
    priceUSD: '100.00',
    valueUSD: '50000.00'
};
```

### Best Practices
- When using the `TokenData` interface, ensure that all required properties such as `symbol`, `decimals`, `address`, `name`, and `chainId` are provided.
- Handle errors by utilizing the `ProviderError` interface for consistent error handling across the application.

### lib/api.ts

### Common Use Cases
1. **Fetching a Resource from the API**:
```typescript
const resourceName = ResourceType.Story;
const resourceId = "123";
const options = { includeComments: true };
const resource = await getResource(resourceName, resourceId, options);
console.log(resource);
```

2. **Listing Resources from the API**:
```typescript
const resourceName = ResourceType.Story;
const options = { sortBy: "created_at", orderDirection: "desc" };
const resources = await listResource(resourceName, options);
console.log(resources);
```

### Best Practices
- **Ensure Proper Query Options**:
Always provide the correct query options when making API calls to fetch or list resources to ensure accurate and efficient results.
- **Handle Promise Rejections**:
Handle promise rejections appropriately while using the functions to fetch or list resources from the API, to prevent unhandled promise rejections.

### queries.ts

### Common Use Cases
1. **Checking if an IP has attached license terms:**
```typescript
import { PublicClient } from 'some-library';
import { LicenseRegistryHasIpAttachedLicenseTermsRequest, hasIpAttachedLicenseTerms } from './queries';

const publicClient = new PublicClient();
const request: LicenseRegistryHasIpAttachedLicenseTermsRequest = {
  ipId: '0x123abc',
  licenseTemplate: '0x456def',
  licenseTermsId: 1
};

hasIpAttachedLicenseTerms(publicClient, request)
  .then(hasAttached => {
    if (hasAttached) {
      console.log('IP has attached license terms');
    } else {
      console.log('IP does not have attached license terms');
    }
  });
```

2. **Another use case:**
```typescript
// Another example of how to use this code
```

### Best Practices
- **Ensure proper error handling**: Always handle any errors that may occur during the execution of the `hasIpAttachedLicenseTerms` function to provide a good user experience.
- **Use type checking**: Make sure to pass the correct data types to the `hasIpAttachedLicenseTerms` function to avoid any runtime errors.

### functions/uploadJSONToIPFS.ts

### Common Use Cases
1. **Uploading JSON metadata to IPFS**: You can use the `uploadJSONToIPFS` function to upload a JSON object to IPFS using a Pinata client.

```typescript
import { PinataClient } from 'pinata-sdk';
import { uploadJSONToIPFS } from 'functions/uploadJSONToIPFS';

const pinata = new PinataClient();
const jsonMetadata = {
    title: 'Sample Title',
    description: 'Sample Description'
};

uploadJSONToIPFS(pinata, jsonMetadata).then((ipfsHash) => {
    console.log('JSON object uploaded to IPFS with hash:', ipfsHash);
});
```

2. **Integrating with a backend service**: This function can be used in conjunction with a backend service to store metadata on IPFS for decentralized access.

```typescript
// Backend service code
app.post('/upload-to-ipfs', (req, res) => {
    const pinata = new PinataClient();
    
    // Assuming req.body contains the JSON metadata
    const jsonMetadata = req.body;

    uploadJSONToIPFS(pinata, jsonMetadata).then((ipfsHash) => {
        console.log('JSON object uploaded to IPFS with hash:', ipfsHash);
        res.json({ ipfsHash });
    });
});
```

### Best Practices
- **Handle errors**: Make sure to handle any errors that might occur during the IPFS upload process to provide a better user experience.
- **Encryption**: Consider encrypting sensitive JSON metadata before uploading it to IPFS to ensure data security and privacy.

### lib/utils.ts

### Common Use Cases
1. Converting a snake_case string to camelCase:
```typescript
import { camelize } from './lib/utils';

const snakeCaseStr = 'hello_world';
const camelCaseStr = camelize(snakeCaseStr);
console.log(camelCaseStr); // Output: helloWorld
```

2. Improving the readability of code by camelizing variable names:
```typescript
import { camelize } from './lib/utils';

const first_name = 'John';
const last_name = 'Doe';

const firstName = camelize(first_name);
const lastName = camelize(last_name);

console.log(firstName, lastName); // Output: John Doe
```

### Best Practices
- Use the `camelize` function to standardize variable naming conventions in your codebase for better consistency.
- Be mindful of the input string format when using the `camelize` function to ensure the desired camel case output.

### index.ts

### Common Use Cases
1. Displaying a simple greeting message to the user.
```typescript
import { Greeting } from './components/Greeting';

const greeting = new Greeting('Hello');
greeting.displayGreeting();
```

2. Logging error messages to the console.
```typescript
import { Logger } from './components/Logger';

const logger = new Logger();
logger.logError('An error occurred');
```

### Best Practices
- Encapsulate reusable code and functionality in separate components or classes.
- Use error handling mechanisms such as logging to improve code robustness and maintainability.

## FAQ
### Q: My action is registered, but the agent is not calling it.
Ensure that action's name clearly aligns with the task, and ensure you give a detailed description of the conditions that should trigger the action.

### Q: Can the plugin handle licensing for commercial use?
Yes, the AttachTermsAction class allows you to specify terms for commercial use by setting parameters like commercialUse and commercialRevShare when attaching terms to a license.

### Q: How can I retrieve detailed information about an IP using this plugin?
To retrieve IP details, you can utilize the GetIPDetailsAction class, which will provide comprehensive information defined by the IPMetadata structure, including titles, descriptions, and creator details.

### Q: Is it possible to integrate additional blockchain networks with the plugin?
Integration with multiple blockchain networks can be achieved by customizing the SupportedChain configuration and integrating additional network metadata using ChainMetadata and ChainConfig interfaces.

### Q: How do I register and license an IP asset programmatically?
You can register an IP using the RegisterIPAction, passing necessary parameters like title, description, and IP type to the register function. Licensing can be handled by LicenseIPAction, which utilizes similar structured inputs.

### Q: How can I ensure secure interaction with blockchain using this plugin?
The interaction security is maintained by the WalletProvider class, which manages the connection, wallet balance retrieval, and client interaction securely through configured RPC URLs and secrets such as EVM_PRIVATE_KEY.

## Development

### TODO Items
No TODO items found.

## Troubleshooting Guide
### Terms not attaching correctly to a license.
- Cause: Possible incorrect parameters or network issue.
- Solution: Ensure all required AttachTermsParams are correct and double-check blockchain connections. Confirm IP and parameter compatibility.

### Debugging Tips
- Validate the parameters and network settings before executing actions involving blockchain.
- Use console logging to trace data flow through handlers and providers for debug information.
- Ensure wallet connections are active and not returning null values when retrieving balance or addresses.
- Regularly update dependencies to maintain compatibility with blockchain network changes.
