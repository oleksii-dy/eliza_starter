# @elizaos/plugin-nft-generation Documentation

## Overview
### Purpose
The @elizaos/plugin-nft-generation is designed to facilitate the creation, minting, and management of Non-Fungible Tokens (NFTs) on the Solana blockchain. It serves as a comprehensive solution for generating NFT collections, minting individual NFTs, and managing contract deployments necessary for working with NFTs in a decentralized environment.

### Key Features
Creation and management of Solana wallets,Minting NFTs with specialized content,Creation of NFT and collection metadata,Functionality to verify NFTs within a collection,Tools for generating, compiling, and deploying smart contracts,Capability to handle collection metadata in AWS S3,Integration with agent runtime for automated tasks

## Installation
## Installation Instructions

### 1. Adding the Plugin to Your ElizaOS Project:

First, add the following to your `agent/package.json` dependencies:

```json
{
  "dependencies": {
    "@elizaos/plugin-nft-generation": "workspace:*"
  }
}
```

Then, follow these steps:
1. cd into the `agent/` directory
2. Run `pnpm install` to install the new dependency
3. Run `pnpm build` to build the project with the new plugin

### 2. Importing and Using the Plugin:

Import the plugin using:
```typescript
import { nftGenerationPlugin } from "@elizaos/plugin-nft-generation";
```

Add it to the `AgentRuntime` plugins array:
```typescript
return new AgentRuntime({
    // other configuration...
    plugins: [
        nftGenerationPlugin,
        // other plugins...
    ],
});
```

### 3. Integration Example:

```typescript
import { nftGenerationPlugin } from "@elizaos/plugin-nft-generation";

return new AgentRuntime({
    // other configuration...
    plugins: [
        nftGenerationPlugin,
        // other plugins...
    ],
});
```

### 4. Verification Steps:

Ensure successful integration by checking for `["✓ Registering action: <plugin actions>"]` in the console.

## Configuration
# Configuration Documentation

## Required Environment Variables

1. **AWS_ACCESS_KEY_ID**
   - Purpose: Used for authentication with AWS services.

2. **AWS_SECRET_ACCESS_KEY**
   - Purpose: Used for authentication with AWS services.

3. **AWS_REGION**
   - Purpose: Specifies the AWS region to be used.

4. **AWS_S3_BUCKET**
   - Purpose: Specifies the AWS S3 bucket to be used.

5. **SOLANA_ADMIN_PRIVATE_KEY**
   - Purpose: Specifies the private key for the Solana admin.

6. **SOLANA_ADMIN_PUBLIC_KEY**
   - Purpose: Specifies the public key for the Solana admin.

7. **SOLANA_PUBLIC_KEY**
   - Purpose: Specifies the public key for Solana.

8. **SOLANA_PRIVATE_KEY**
   - Purpose: Specifies the private key for Solana.

9. **WALLET_PRIVATE_KEY**
   - Purpose: Specifies the private key for the wallet.

10. **SOLANA_VERIFY_TOKEN**
   - Purpose: Specifies the verification token for Solana.

## Example .env File
```plaintext
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=your_aws_region
AWS_S3_BUCKET=your_aws_s3_bucket
SOLANA_ADMIN_PRIVATE_KEY=your_solana_admin_private_key
SOLANA_ADMIN_PUBLIC_KEY=your_solana_admin_public_key
SOLANA_PUBLIC_KEY=your_solana_public_key
SOLANA_PRIVATE_KEY=your_solana_private_key
WALLET_PRIVATE_KEY=your_wallet_private_key
SOLANA_VERIFY_TOKEN=your_solana_verify_token
```

**Note:** Ensure that the `.env` file is set in the `.gitignore` file to prevent it from being committed to the repository.

## Features

### Actions

### MINT_NFT
Mint NFTs for a specified collection on Solana or other supported chains.

#### Properties
- Name: MINT_NFT
- Similes: NFT_MINTING, NFT_CREATION, CREATE_NFT, GENERATE_NFT, MINT_TOKEN, CREATE_TOKEN, MAKE_NFT, TOKEN_GENERATION

#### Handler
The handler function validates AWS and blockchain credentials before minting NFTs. For Solana chains, it uses the Solana wallet to fetch collection info and create NFTs with metadata. For other supported chains, it uses Viem to interact with EVM-compatible chains to mint NFTs through smart contracts. The function verifies collection validity, handles minting process, and provides transaction feedback including NFT addresses and links.

#### Examples
- User 1: "mint nft for collection: D8j4ubQ3MKwmAqiJw83qT7KQNKjhsuoC7zJJdJa5BkvS on Solana"
- Agent: "I've minted a new NFT in your specified collection on Solana."
- Agent: "Congratulations! Collection Address: D8j4...BkvS, NFT Address: [address], NFT Link: [link]"

### GENERATE_COLLECTION
Generate an NFT collection on Solana or other supported chains.

#### Properties
- Name: GENERATE_COLLECTION
- Similes: COLLECTION_GENERATION, COLLECTION_GEN, CREATE_COLLECTION, MAKE_COLLECTION, GENERATE_COLLECTION

#### Handler
The handler function creates NFT collections across different blockchain networks. For Solana, it creates collection metadata and uses a Solana wallet to establish the collection. For EVM chains, it deploys an ERC721 contract with specified parameters like name, symbol, max supply, and royalty settings. The function handles contract deployment, verification, and provides collection addresses and explorer links.

#### Examples
- User 1: "Generate a collection on Solana"
- Agent: "Here's the collection you requested."
- Agent: "Congratulations! Collection Link: [explorer_link], Address: [contract_address]"
- User 1: "Create a collection using [agentName] on Solana"
- Agent: "We've successfully created a collection on Solana."

### Providers
### Solana Wallet Provider
The Solana Wallet Provider is a class that facilitates interaction with the Solana blockchain network, specifically for NFT-related operations and wallet functionality.

#### Constructor
Creates a new WalletSolana instance with:
- Wallet public key
- Wallet private key
- Optional connection parameter
- Initializes a 5-minute TTL cache
- Sets up Umi instance with token metadata program

#### Methods
`fetchDigitalAsset(address: string)`
- Fetches digital asset information for a given address using Umi

`getBalance()`
- Retrieves the wallet's SOL balance
- Returns both raw value and formatted string (e.g., "1.5 SOL")

`createCollection(params)`
- Creates a new NFT collection on Solana
- Parameters:
  - name: Collection name
  - symbol: Collection symbol
  - adminPublicKey: Admin's public key
  - uri: Metadata URI
  - fee: Seller fee basis points
- Returns:
  - success: Boolean indicating success
  - link: Explorer link
  - address: Collection address
  - error: Error message if failed

`mintNFT(params)`
- Mints a new NFT in a specified collection
- Parameters:
  - collectionAddress: Address of parent collection
  - adminPublicKey: Admin's public key
  - name: NFT name
  - symbol: NFT symbol
  - uri: Metadata URI
  - fee: Seller fee basis points
- Returns:
  - success: Boolean indicating success
  - link: Explorer link
  - address: NFT address
  - error: Error message if failed

`verifyNft(params)`
- Verifies an NFT as part of a collection
- Parameters:
  - collectionAddress: Collection address
  - nftAddress: NFT address to verify
- Returns:
  - isVerified: Boolean indicating verification status
  - error: Error message if verification failed

### Evaluators
No evaluators documentation available.

## Usage Examples
### provider/wallet/walletSolana.ts

### Common Use Cases
1. Creating and managing Solana wallets:
```typescript
const wallet = new WalletSolana(walletPublicKey, walletPrivateKey, connection);
```

2. Minting NFTs and verifying their ownership:
```typescript
const mintedNft = await wallet.mintNFT({
  collectionAddress: collectionAddress,
  adminPublicKey: adminPublicKey,
  name: "My NFT",
  symbol: "NFT",
  uri: "https://example.com/nft",
  fee: 0.01
});

const verificationResult = await wallet.verifyNft({
  collectionAddress: collectionAddress,
  nftAddress: mintedNft.address
});
```

### Best Practices
- Ensure to securely store and handle the private key of the Solana wallet to prevent unauthorized access.
- Use appropriate error handling mechanisms when interacting with the Solana blockchain to handle potential network or contract errors effectively.

### types.ts

### Common Use Cases
1. Creating a new NFT with specific content:
```typescript
import { MintNFTContent } from 'types';

const newNFTContent: MintNFTContent = {
  collectionAddress: '0x1234567890',
  chainName: 'Ethereum'
};

// Use the newNFTContent object to mint a new NFT with the specified content
```

2. Updating existing NFT content:
```typescript
import { MintNFTContent } from 'types';

const updatedNFTContent: MintNFTContent = {
  collectionAddress: '0x0987654321',
  chainName: 'Polygon'
};

// Use the updatedNFTContent object to update the content of an existing NFT
```

### Best Practices
- Always ensure that the properties of the MintNFTContent interface are valid and accurate before using them to mint or update NFT content.
- Use TypeScript's type checking capabilities to prevent any runtime errors related to incorrect property types or missing properties in objects that implement the MintNFTContent interface.

### actions/mintNFTAction.ts

### Common Use Cases
1. Checking if a given content is of type MintNFTContent:
```typescript
import { isMintNFTContent, MintNFTContent } from '../actions/mintNFTAction';

const content: any = {
    title: 'Example NFT',
    description: 'This is an example NFT.'
};

if (isMintNFTContent(content)) {
    const mintNFTContent: MintNFTContent = content;
    console.log('Content is of type MintNFTContent.');
} else {
    console.log('Content is not of type MintNFTContent.');
}
```

2. Utilizing the MintNFTContent type in other parts of the code:
```typescript
import { MintNFTContent } from '../actions/mintNFTAction';

const nftContent: MintNFTContent = {
    title: 'Example NFT',
    description: 'This is an example NFT.'
};

// Use nftContent in other parts of the code
```

### Best Practices
- Ensure to import the necessary functions and types from 'mintNFTAction' to properly utilize them in the code.
- Use TypeScript's type checking to ensure that the content being passed to `isMintNFTContent` function is compatible with the MintNFTContent type.

### api.ts

### Common Use Cases
1. Creating an Express router for NFT API routes.
```javascript
const agents = new Map();
const nftRouter = createNFTApiRouter(agents);
app.use('/nft', nftRouter);
```

2. Adding NFT API routes to an existing Express app.
```javascript
const agents = new Map();
const nftRouter = createNFTApiRouter(agents);
app.use('/api', nftRouter);
```

### Best Practices
- When using the `createNFTApiRouter` function, ensure that the `agents` parameter is passed as a valid map of agent runtimes.
- Use specific route paths for NFT API routes to avoid conflicts with other API routes in the application.

### handlers/createNFT.ts

### Common Use Cases
1. Creating a new NFT collection:
```typescript
const params = {
  runtime: agentRuntime,
  collectionName: "MyNFTCollection",
  collectionAddress: "0xabc123",
  collectionAdminPublicKey: "0xdef456",
  collectionFee: 0.05,
  tokenId: 1
};

const newNFT = createNFT(params);
console.log(newNFT);
```

2. Generating NFT metadata:
```typescript
const metadataParams = {
  runtime: agentRuntime,
  collectionName: "MyNFTCollection",
  collectionAdminPublicKey: "0xdef456",
  collectionFee: 0.05,
  tokenId: 1
};

const metadata = createNFTMetadata(metadataParams);
console.log(metadata);
```

### Best Practices
- Ensure to provide all required parameters when calling the `createNFT` and `createNFTMetadata` functions.
- Validate the output of the functions to confirm the successful creation of NFTs and metadata.

### handlers/createSolanaCollection.ts

### Common Use Cases
1. Creating a Solana collection with a specified name and fee using the `createSolanaCollection` function.

```typescript
import { createSolanaCollection } from './handlers/createSolanaCollection';

const options = {
  runtime: agentRuntimeInstance,
  collectionName: 'MyCollection',
  fee: 10
};

createSolanaCollection(options)
  .then((collectionInfo) => {
    console.log(collectionInfo);
  })
  .catch((error) => {
    console.error(error);
  });
```

2. Creating collection metadata in AWS S3 for a given collection name and fee using the `createCollectionMetadata` function.

```typescript
import { createCollectionMetadata } from './handlers/createSolanaCollection';

const params = {
  runtime: agentRuntimeInstance,
  collectionName: 'MyCollection',
  fee: 10
};

const collectionMetadata = createCollectionMetadata(params);

if (collectionMetadata) {
  console.log(collectionMetadata);
} else {
  console.log('Failed to create collection metadata.');
}
```

### Best Practices
- Ensure to handle errors properly by using `try-catch` or `.catch()` when calling these functions to handle any asynchronous errors gracefully.
- Before using these functions, make sure to provide valid and necessary parameters as described in the function documentation to avoid unexpected behavior.

### handlers/verifyNFT.ts

### Common Use Cases
1. *Verify ownership of an NFT within a Solana collection:*
```typescript
import { verifyNFT } from './handlers/verifyNFT';

const options = {
  runtime: agentRuntime,
  collectionAddress: 'SOLANA_COLLECTION_ADDRESS',
  NFTAddress: 'NFT_ADDRESS'
};

const verificationResult = verifyNFT(options);
console.log(verificationResult);
```

2. *Integrate NFT verification into a Solana blockchain application:*
```typescript
import { verifyNFT } from './handlers/verifyNFT';

// Code to interact with Solana blockchain to retrieve NFT details

const options = {
  runtime: agentRuntime,
  collectionAddress: 'SOLANA_COLLECTION_ADDRESS',
  NFTAddress: 'NFT_ADDRESS'
};

const verificationResult = verifyNFT(options);
// Use verification result in the application logic
```

### Best Practices
- *Ensure the correct Solana collection and NFT addresses are provided in the options for accurate verification.*
- *Handle any errors or exceptions that may occur during the verification process to maintain application stability.*

### index.ts

### Common Use Cases
1. Delaying execution of a function by a certain amount of time.
```typescript
import { sleep } from './index';

async function delayedFunction() {
    console.log('Before sleeping');
    await sleep(2000); // Sleep for 2 seconds
    console.log('After sleeping');
}

delayedFunction();
```

2. Implementing a loading screen in a web application.
```typescript
import { sleep } from './index';

async function showLoadingScreen() {
    showLoader(); // Show loading spinner
    await sleep(3000); // Sleep for 3 seconds
    hideLoader(); // Hide loading spinner
}

showLoadingScreen();
```

### Best Practices
- **Best practice 1:** Always handle the promise returned by the sleep function to avoid any unhandled promise rejections.
- **Best practice 2:** Use appropriate time intervals when calling the sleep function to ensure a smooth user experience.

### utils/deployEVMContract.ts

### Common Use Cases

1. **Compile and Deploy an ERC721 Contract:**

```typescript
import { generateERC721ContractCode, compileContract, deployContract, mintNFT } from './utils/deployEVMContract';

// Generate ERC721 contract code
const NFTContractName = 'MyNFT';
const erc721Code = generateERC721ContractCode(NFTContractName);

// Compile the ERC721 contract
const compiledContract = compileContract(NFTContractName, erc721Code);

// Deploy the compiled contract
const contractAddress = deployContract({
    walletClient: myWalletClient,
    publicClient: myPublicClient,
    abi: compiledContract.abi,
    bytecode: compiledContract.bytecode,
    args: []
});

// Mint an NFT
const receipt = mintNFT({
    contractAddress,
    abi: compiledContract.abi,
    recipient: '0x1234567890',
    walletClient: myWalletClient,
    publicClient: myPublicClient
});
```

2. **Encode Constructor Arguments for a Smart Contract:**

```typescript
import { encodeConstructorArguments } from './utils/deployEVMContract';

const abi = [
    {
        inputs: [
            {
                internalType: 'string',
                name: 'name',
                type: 'string',
            },
            {
                internalType: 'string',
                name: 'symbol',
                type: 'string',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'constructor',
    },
];

const args = ['MyToken', 'MT'];

const encodedArgs = encodeConstructorArguments(abi, args);
console.log(encodedArgs.toString('hex'));
```

### Best Practices

- **Use Proper Error Handling:** Ensure that error handling mechanisms are in place when calling these functions to handle potential exceptions.
- **Verify Contract Deployment:** Always verify the successful deployment of the contract by checking the transaction receipt after calling `deployContract`.

### utils/generateERC721ContractCode.ts

### Common Use Cases
1. To load a specific contract file from the OpenZeppelin node_modules directory:
```typescript
const contractPath = "@openzeppelin/contracts/token/ERC721/ERC721.sol";
const contractCode = loadOpenZeppelinFile(contractPath);
console.log(contractCode);
```

2. To compile a Solidity contract with imports:
```typescript
const contractName = "MyERC721Token";
const sourceCode = `
    // import statements
    contract MyERC721Token is ERC721 {
        // contract implementation
    }
`;
const compiledContract = compileWithImports(contractName, sourceCode);
console.log(compiledContract);
```

### Best Practices
- Make sure to handle any potential errors or edge cases when using the functions in the code.
- Use consistent naming conventions and follow coding standards to keep the code clean and maintainable.

### utils/verifyEVMContract.ts

### Common Use Cases
1. Verify an EVM contract on a specified API endpoint.

```typescript
import { verifyEVMContract } from './utils/verifyEVMContract';

const params = {
  contractAddress: "0x123abc...",
  sourceCode: "contract MyContract {}",
  metadata: { compiler: "solc", version: "0.8.0" },
  apiEndpoint: "https://api.etherscan.io/api"
};

verifyEVMContract(params)
  .then((verificationStatus) => {
    console.log("Contract verification status:", verificationStatus);
  })
  .catch((error) => {
    console.error("Error verifying contract:", error);
  });
```

2. Retrieve sources based on provided metadata and source code.

```typescript
import { getSources } from './utils/verifyEVMContract';

const metadata = { compiler: "solc", version: "0.8.0" };
const sourceCode = "contract MyContract {}";

const sources = getSources(metadata, sourceCode);
console.log("Source files:", sources);
```

### Best Practices
- Ensure that the contract address, source code, metadata, and API endpoint are correctly provided in the parameters for contract verification.
- Handle promise rejections appropriately when using the `verifyEVMContract` function to verify the contract.

### actions/nftCollectionGeneration.ts

### Common Use Cases
1. Generating unique NFT collections for different artists or creators:
    ```typescript
    import { generateNFTCollection } from './actions/nftCollectionGeneration';

    const artistCollection = generateNFTCollection('Artist1', 10);
    const creatorCollection = generateNFTCollection('Creator1', 20);
    ```

2. Creating limited edition NFT collections for special events or collaborations:
    ```typescript
    import { generateNFTCollection } from './actions/nftCollectionGeneration';

    const eventCollection = generateNFTCollection('Event1', 50);
    const collaborationCollection = generateNFTCollection('Collaboration1', 30);
    ```

### Best Practices
- Validate input parameters to ensure that the generated NFT collection meets the desired specifications.
- Handle errors gracefully and provide meaningful error messages to aid in debugging.

## FAQ
### Q: How can I mint an NFT using this plugin?
To mint an NFT, you will use the 'mintNFT' function, which requires parameters like the contract address, contract ABI, recipient information, and the clients involved in executing the contract. An example usage would be providing the correct recipient address and ensuring your wallet client is properly set up.

### Q: Can the plugin create custom ERC721 contracts?
Yes, the plugin can create custom ERC721 contracts using the 'generateERC721ContractCode' function. This function allows you to specify a custom contract name which is replaced in the generated contract code.

### Q: How can I verify ownership of an NFT?
You can verify ownership by using the 'verifyNFT' function. This function checks the ownership of an NFT within a given collection on the Solana blockchain. You need to provide the collection address and the NFT address for verification.

### Q: What is needed to deploy a smart contract using this plugin?
Deploying a smart contract involves using the 'deployContract' function, which requires a wallet client, public client, ABI, bytecode, and constructor arguments. Ensure your environment is ready to interact with the blockchain network for successful deployment.

### Q: My action is registered, but the agent is not calling it
Ensure that action's name clearly aligns with the task, and ensure you give a detailed description of the conditions that should trigger the action.

### Q: How can I integrate this plugin with an existing runtime environment?
Integration is facilitated by using the provider modules, which inject dynamic context and data into agent interactions. You'll need to correctly configure the runtime settings to access wallet and NFT data required by the plugin functions.

## Development

### TODO Items
No TODO items found.

## Troubleshooting Guide
### Error while minting NFTs
- Cause: Invalid contract address or missing ABI information
- Solution: Verify all parameters, especially the contract address and ABI, to ensure they are correctly set. Double-check the connection status with the blockchain network.

### Smart contract fails to compile
- Cause: Syntax errors or missing imports in source code
- Solution: Check the smart contract code for syntax errors and correct import paths. Use functions like 'loadOpenZeppelinFile' to resolve library imports needed for contract compilation.

### Debugging Tips
- Use console logs extensively within your runtime to monitor variable states and function outputs.
- Verify network connectivity and configurations when experiencing issues with blockchain interactions.
- Ensure all external dependencies and library imports are properly configured by referencing the import paths.
