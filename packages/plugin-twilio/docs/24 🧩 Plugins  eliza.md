## Overview[](https://ai16z.github.io/eliza/docs/core/characterfile/#overview "Direct link to Overview")

Eliza's plugin system provides a modular way to extend the core functionality with additional features, actions, evaluators, and providers. Plugins are self-contained modules that can be easily added or removed to customize your agent's capabilities.

## Core Plugin Concepts[](https://ai16z.github.io/eliza/docs/core/characterfile/#core-plugin-concepts "Direct link to Core Plugin Concepts")

### Plugin Structure[](https://ai16z.github.io/eliza/docs/core/characterfile/#plugin-structure "Direct link to Plugin Structure")

Each plugin in Eliza must implement the `Plugin` interface with the following properties:

```
<span><span>interface</span><span> </span><span>Plugin</span><span> </span><span>{</span><span></span><br></span><span><span>    name</span><span>:</span><span> </span><span>string</span><span>;</span><span> </span><span>// Unique identifier for the plugin</span><span></span><br></span><span><span>    description</span><span>:</span><span> </span><span>string</span><span>;</span><span> </span><span>// Brief description of plugin functionality</span><span></span><br></span><span><span>    actions</span><span>?</span><span>:</span><span> Action</span><span>[</span><span>]</span><span>;</span><span> </span><span>// Custom actions provided by the plugin</span><span></span><br></span><span><span>    evaluators</span><span>?</span><span>:</span><span> Evaluator</span><span>[</span><span>]</span><span>;</span><span> </span><span>// Custom evaluators for behavior assessment</span><span></span><br></span><span><span>    providers</span><span>?</span><span>:</span><span> Provider</span><span>[</span><span>]</span><span>;</span><span> </span><span>// Context providers for message generation</span><span></span><br></span><span><span>    services</span><span>?</span><span>:</span><span> Service</span><span>[</span><span>]</span><span>;</span><span> </span><span>// Additional services (optional)</span><span></span><br></span><span><span></span><span>}</span><br></span>
```

## Using Plugins[](https://ai16z.github.io/eliza/docs/core/characterfile/#using-plugins "Direct link to Using Plugins")

### Installation[](https://ai16z.github.io/eliza/docs/core/characterfile/#installation "Direct link to Installation")

1.  Install the desired plugin package:

```
<span><span>pnpm add @ai16z/plugin-[name]</span><br></span>
```

2.  Import and register the plugin in your character configuration:

```
<span><span>import</span><span> </span><span>{</span><span> bootstrapPlugin </span><span>}</span><span> </span><span>from</span><span> </span><span>"@eliza/plugin-bootstrap"</span><span>;</span><span></span><br></span><span><span></span><span>import</span><span> </span><span>{</span><span> imageGenerationPlugin </span><span>}</span><span> </span><span>from</span><span> </span><span>"@eliza/plugin-image-generation"</span><span>;</span><span></span><br></span><span><span></span><span>import</span><span> </span><span>{</span><span> buttplugPlugin </span><span>}</span><span> </span><span>from</span><span> </span><span>"@eliza/plugin-buttplug"</span><span>;</span><span></span><br></span><span><span></span><span>const</span><span> character </span><span>=</span><span> </span><span>{</span><span></span><br></span><span><span>    </span><span>// ... other character config</span><span></span><br></span><span><span>    plugins</span><span>:</span><span> </span><span>[</span><span>bootstrapPlugin</span><span>,</span><span> imageGenerationPlugin</span><span>,</span><span> buttplugPlugin</span><span>]</span><span>,</span><span></span><br></span><span><span></span><span>}</span><span>;</span><br></span>
```

___

### Available Plugins[](https://ai16z.github.io/eliza/docs/core/characterfile/#available-plugins "Direct link to Available Plugins")

#### 1\. Bootstrap Plugin (`@eliza/plugin-bootstrap`)[](https://ai16z.github.io/eliza/docs/core/characterfile/#1-bootstrap-plugin-elizaplugin-bootstrap "Direct link to 1-bootstrap-plugin-elizaplugin-bootstrap")

The bootstrap plugin provides essential baseline functionality:

**Actions:**

-   `continue` - Continue the current conversation flow
-   `followRoom` - Follow a room for updates
-   `unfollowRoom` - Unfollow a room
-   `ignore` - Ignore specific messages
-   `muteRoom` - Mute notifications from a room
-   `unmuteRoom` - Unmute notifications from a room

**Evaluators:**

-   `fact` - Evaluate factual accuracy
-   `goal` - Assess goal completion

**Providers:**

-   `boredom` - Manages engagement levels
-   `time` - Provides temporal context
-   `facts` - Supplies factual information

#### 2\. Image Generation Plugin (`@eliza/plugin-image-generation`)[](https://ai16z.github.io/eliza/docs/core/characterfile/#2-image-generation-plugin-elizaplugin-image-generation "Direct link to 2-image-generation-plugin-elizaplugin-image-generation")

Enables AI image generation capabilities:

**Actions:**

-   `GENERATE_IMAGE` - Create images based on text descriptions
-   Supports multiple image generation services (Anthropic, Together)
-   Auto-generates captions for created images

#### 3\. Node Plugin (`@eliza/plugin-node`)[](https://ai16z.github.io/eliza/docs/core/characterfile/#3-node-plugin-elizaplugin-node "Direct link to 3-node-plugin-elizaplugin-node")

Provides core Node.js-based services:

**Services:**

-   `BrowserService` - Web browsing capabilities
-   `ImageDescriptionService` - Image analysis
-   `LlamaService` - LLM integration
-   `PdfService` - PDF processing
-   `SpeechService` - Text-to-speech
-   `TranscriptionService` - Speech-to-text
-   `VideoService` - Video processing

#### 4\. Solana Plugin (`@eliza/plugin-solana`)[](https://ai16z.github.io/eliza/docs/core/characterfile/#4-solana-plugin-elizaplugin-solana "Direct link to 4-solana-plugin-elizaplugin-solana")

Integrates Solana blockchain functionality:

**Evaluators:**

-   `trustEvaluator` - Assess transaction trust scores

**Providers:**

-   `walletProvider` - Wallet management
-   `trustScoreProvider` - Transaction trust metrics

##### Charity Contributions[](https://ai16z.github.io/eliza/docs/core/characterfile/#charity-contributions "Direct link to Charity Contributions")

All Coinbase trades and transfers automatically donate 1% of the transaction amount to charity. Currently, the charity addresses are hardcoded based on the network used for the transaction, with the current charity being supported as X.

The charity addresses for each network are as follows:

-   **Base**: `0x1234567890123456789012345678901234567890`
-   **Solana**: `pWvDXKu6CpbKKvKQkZvDA66hgsTB6X2AgFxksYogHLV`
-   **Ethereum**: `0x750EF1D7a0b4Ab1c97B7A623D7917CcEb5ea779C`
-   **Arbitrum**: `0x1234567890123456789012345678901234567890`
-   **Polygon**: `0x1234567890123456789012345678901234567890`

In the future, we aim to integrate with The Giving Block API to allow for dynamic and configurable donations, enabling support for a wider range of charitable organizations.

#### 5\. Coinbase Commerce Plugin (`@eliza/plugin-coinbase`)[](https://ai16z.github.io/eliza/docs/core/characterfile/#5-coinbase-commerce-plugin-elizaplugin-coinbase "Direct link to 5-coinbase-commerce-plugin-elizaplugin-coinbase")

Integrates Coinbase Commerce for payment and transaction management:

**Actions:**

-   `CREATE_CHARGE` - Create a payment charge using Coinbase Commerce
-   `GET_ALL_CHARGES` - Fetch all payment charges
-   `GET_CHARGE_DETAILS` - Retrieve details for a specific charge

**Description:** This plugin enables Eliza to interact with the Coinbase Commerce API to create and manage payment charges, providing seamless integration with cryptocurrency-based payment systems.

___

##### Coinbase Wallet Management[](https://ai16z.github.io/eliza/docs/core/characterfile/#coinbase-wallet-management "Direct link to Coinbase Wallet Management")

The plugin automatically handles wallet creation or uses an existing wallet if the required details are provided during the first run.

1.  **Wallet Generation on First Run** If no wallet information is provided (`COINBASE_GENERATED_WALLET_HEX_SEED` and `COINBASE_GENERATED_WALLET_ID`), the plugin will:
    
    -   **Generate a new wallet** using the Coinbase SDK.
    -   Automatically **export the wallet details** (`seed` and `walletId`) and securely store them in `runtime.character.settings.secrets` or other configured storage.
    -   Log the wallet’s default address for reference.
    -   If the character file does not exist, the wallet details are saved to a characters/charactername-seed.txt file in the characters directory with a note indicating that the user must manually add these details to settings.secrets or the .env file.
2.  **Using an Existing Wallet** If wallet information is available during the first run:
    
    -   Provide `COINBASE_GENERATED_WALLET_HEX_SEED` and `COINBASE_GENERATED_WALLET_ID` via `runtime.character.settings.secrets` or environment variables.
    -   The plugin will **import the wallet** and use it for processing mass payouts.

___

#### 6\. Coinbase MassPayments Plugin (`@eliza/plugin-coinbase`)[](https://ai16z.github.io/eliza/docs/core/characterfile/#6-coinbase-masspayments-plugin-elizaplugin-coinbase "Direct link to 6-coinbase-masspayments-plugin-elizaplugin-coinbase")

This plugin facilitates the processing of cryptocurrency mass payouts using the Coinbase SDK. It enables the creation and management of mass payouts to multiple wallet addresses, logging all transaction details to a CSV file for further analysis.

**Actions:**

-   `SEND_MASS_PAYOUT` Sends cryptocurrency mass payouts to multiple wallet addresses.
    -   **Inputs**:
        -   `receivingAddresses` (array of strings): Wallet addresses to receive funds.
        -   `transferAmount` (number): Amount to send to each address (in smallest currency unit, e.g., Wei for ETH).
        -   `assetId` (string): Cryptocurrency asset ID (e.g., `ETH`, `BTC`).
        -   `network` (string): Blockchain network (e.g., `base`, `sol`, `eth`, `arb`, `pol`).
    -   **Outputs**: Logs transaction results (success/failure) in a CSV file.
    -   **Example**:
        
        ```
        <span><span>{</span><br></span><span><span>    "receivingAddresses": [</span><br></span><span><span>        "0xA0ba2ACB5846A54834173fB0DD9444F756810f06",</span><br></span><span><span>        "0xF14F2c49aa90BaFA223EE074C1C33b59891826bF"</span><br></span><span><span>    ],</span><br></span><span><span>    "transferAmount": 5000000000000000,</span><br></span><span><span>    "assetId": "ETH",</span><br></span><span><span>    "network": "eth"</span><br></span><span><span>}</span><br></span>
        ```
        

**Providers:**

-   `massPayoutProvider` Retrieves details of past transactions from the generated CSV file.
    -   **Outputs**: A list of transaction records including the following fields:
        -   `address`: Recipient wallet address.
        -   `amount`: Amount sent.
        -   `status`: Transaction status (`Success` or `Failed`).
        -   `errorCode`: Error code (if any).
        -   `transactionUrl`: URL for transaction details (if available).

**Description:**

The Coinbase MassPayments plugin streamlines cryptocurrency distribution, ensuring efficient and scalable payouts to multiple recipients on supported blockchain networks.

Supported networks:

-   `base` (Base blockchain)
-   `sol` (Solana)
-   `eth` (Ethereum)
-   `arb` (Arbitrum)
-   `pol` (Polygon)

**Setup and Configuration:**

1.  **Configure the Plugin** Add the plugin to your character's configuration:
    
    ```
    <span><span>import</span><span> </span><span>{</span><span> coinbaseMassPaymentsPlugin </span><span>}</span><span> </span><span>from</span><span> </span><span>"@eliza/plugin-coinbase-masspayments"</span><span>;</span><span></span><br></span><span><span></span><br></span><span><span></span><span>const</span><span> character </span><span>=</span><span> </span><span>{</span><span></span><br></span><span><span>    plugins</span><span>:</span><span> </span><span>[</span><span>coinbaseMassPaymentsPlugin</span><span>]</span><span>,</span><span></span><br></span><span><span></span><span>}</span><span>;</span><br></span>
    ```
    
2.  **Required Configurations** Set the following environment variables or runtime settings:
    
    -   `COINBASE_API_KEY`: API key for Coinbase SDK
    -   `COINBASE_PRIVATE_KEY`: Private key for secure transactions
    -   `COINBASE_GENERATED_WALLET_HEX_SEED`: Hexadecimal seed of the wallet (if using existing wallet)
    -   `COINBASE_GENERATED_WALLET_ID`: Unique wallet ID (if using existing wallet)

**Wallet Management:**

The plugin handles wallet creation and management in two ways:

1.  **Automatic Wallet Creation** When no wallet details are provided, the plugin will:
    
    -   Generate a new wallet using the Coinbase SDK
    -   Export and store the wallet details in `runtime.character.settings.secrets`
    -   Save details to `characters/charactername-seed.txt` if character file doesn't exist
    -   Log the wallet's default address
2.  **Using Existing Wallet** When wallet information is available:
    
    -   Provide the required wallet details via settings or environment variables
    -   The plugin will import and use the existing wallet

**Example Configuration:**

```
<span><span>// For automatic wallet generation</span><span></span><br></span><span><span>runtime</span><span>.</span><span>character</span><span>.</span><span>settings</span><span>.</span><span>secrets </span><span>=</span><span> </span><span>{</span><span></span><br></span><span><span>    </span><span>// Empty settings for first run</span><span></span><br></span><span><span></span><span>}</span><span>;</span><span></span><br></span><span><span></span><br></span><span><span></span><span>// For using existing wallet</span><span></span><br></span><span><span>runtime</span><span>.</span><span>character</span><span>.</span><span>settings</span><span>.</span><span>secrets </span><span>=</span><span> </span><span>{</span><span></span><br></span><span><span>    </span><span>COINBASE_GENERATED_WALLET_HEX_SEED</span><span>:</span><span></span><br></span><span><span>        </span><span>"0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"</span><span>,</span><span></span><br></span><span><span>    </span><span>COINBASE_GENERATED_WALLET_ID</span><span>:</span><span> </span><span>"wallet-id-123"</span><span>,</span><span></span><br></span><span><span></span><span>}</span><span>;</span><br></span>
```

**Example Call**

```
<span><span>const</span><span> response </span><span>=</span><span> </span><span>await</span><span> runtime</span><span>.</span><span>triggerAction</span><span>(</span><span>"SEND_MASS_PAYOUT"</span><span>,</span><span> </span><span>{</span><span></span><br></span><span><span>    receivingAddresses</span><span>:</span><span> </span><span>[</span><span></span><br></span><span><span>        </span><span>"0xA0ba2ACB5846A54834173fB0DD9444F756810f06"</span><span>,</span><span></span><br></span><span><span>        </span><span>"0xF14F2c49aa90BaFA223EE074C1C33b59891826bF"</span><span>,</span><span></span><br></span><span><span>    </span><span>]</span><span>,</span><span></span><br></span><span><span>    transferAmount</span><span>:</span><span> </span><span>5000000000000000</span><span>,</span><span> </span><span>// 0.005 ETH</span><span></span><br></span><span><span>    assetId</span><span>:</span><span> </span><span>"ETH"</span><span>,</span><span></span><br></span><span><span>    network</span><span>:</span><span> </span><span>"eth"</span><span>,</span><span></span><br></span><span><span></span><span>}</span><span>)</span><span>;</span><span></span><br></span><span><span></span><span>console</span><span>.</span><span>log</span><span>(</span><span>"Mass payout response:"</span><span>,</span><span> response</span><span>)</span><span>;</span><br></span>
```

**Transaction Logging**

All transactions (successful and failed) are logged to a `transactions.csv` file in the plugin’s working directory:

```
<span><span>Address,Amount,Status,Error Code,Transaction URL</span><br></span><span><span>0xA0ba2ACB5846A54834173fB0DD9444F756810f06,5000000000000000,Success,,https://etherscan.io/tx/0x...</span><br></span>
```

**Example Output:**

When successful, a response similar to the following will be returned:

```
<span><span>{</span><br></span><span><span>    "text": "Mass payouts completed successfully.\n- Successful Transactions: 2\n- Failed Transactions: 0\nCheck the CSV file for more details."</span><br></span><span><span>}</span><br></span>
```

**Best Practices:**

-   **Secure Secrets Storage**: Ensure `COINBASE_API_KEY` and `COINBASE_PRIVATE_KEY` are stored securely in `runtime.character.settings.secrets` or environment variables. Either add `COINBASE_GENERATED_WALLET_HEX_SEED`, and `COINBASE_GENERATED_WALLET_ID` from a previous run, or it will be dynamically created
-   **Validation**: Always validate input parameters, especially `receivingAddresses` and `network`, to ensure compliance with expected formats and supported networks.
-   **Error Handling**: Monitor logs for failed transactions or errors in the payout process and adjust retry logic as needed.

___

#### 7\. Coinbase Token Contract Plugin (`@eliza/plugin-coinbase`)[](https://ai16z.github.io/eliza/docs/core/characterfile/#7-coinbase-token-contract-plugin-elizaplugin-coinbase "Direct link to 7-coinbase-token-contract-plugin-elizaplugin-coinbase")

This plugin enables the deployment and interaction with various token contracts (ERC20, ERC721, ERC1155) using the Coinbase SDK. It provides functionality for both deploying new token contracts and interacting with existing ones.

**Actions:**

1.  `DEPLOY_TOKEN_CONTRACT` Deploys a new token contract (ERC20, ERC721, or ERC1155).
    
    -   **Inputs**:
        -   `contractType` (string): Type of contract to deploy (`ERC20`, `ERC721`, or `ERC1155`)
        -   `name` (string): Name of the token
        -   `symbol` (string): Symbol of the token
        -   `network` (string): Blockchain network to deploy on
        -   `baseURI` (string, optional): Base URI for token metadata (required for ERC721 and ERC1155)
        -   `totalSupply` (number, optional): Total supply of tokens (only for ERC20)
    -   **Example**:
        
        ```
        <span><span>{</span><br></span><span><span>    "contractType": "ERC20",</span><br></span><span><span>    "name": "MyToken",</span><br></span><span><span>    "symbol": "MTK",</span><br></span><span><span>    "network": "base",</span><br></span><span><span>    "totalSupply": 1000000</span><br></span><span><span>}</span><br></span>
        ```
        
2.  `INVOKE_CONTRACT` Invokes a method on a deployed smart contract.
    
    -   **Inputs**:
        -   `contractAddress` (string): Address of the contract to invoke
        -   `method` (string): Method name to invoke
        -   `abi` (array): Contract ABI
        -   `args` (object, optional): Arguments for the method
        -   `amount` (number, optional): Amount of asset to send (for payable methods)
        -   `assetId` (string, optional): Asset ID to send
        -   `network` (string): Blockchain network to use
    -   **Example**:
        
        ```
        <span><span>{</span><br></span><span><span>  "contractAddress": "0x123...",</span><br></span><span><span>  "method": "transfer",</span><br></span><span><span>  "abi": [...],</span><br></span><span><span>  "args": {</span><br></span><span><span>    "to": "0x456...",</span><br></span><span><span>    "amount": "1000000000000000000"</span><br></span><span><span>  },</span><br></span><span><span>  "network": "base"</span><br></span><span><span>}</span><br></span>
        ```
        

**Description:**

The Coinbase Token Contract plugin simplifies the process of deploying and interacting with various token contracts on supported blockchain networks. It supports:

-   ERC20 token deployment with customizable supply
-   ERC721 (NFT) deployment with metadata URI support
-   ERC1155 (Multi-token) deployment with metadata URI support
-   Contract method invocation for deployed contracts

All contract deployments and interactions are logged to a CSV file for record-keeping and auditing purposes.

**Usage Instructions:**

1.  **Configure the Plugin** Add the plugin to your character's configuration:
    
    ```
    <span><span>import</span><span> </span><span>{</span><span> tokenContractPlugin </span><span>}</span><span> </span><span>from</span><span> </span><span>"@eliza/plugin-coinbase"</span><span>;</span><span></span><br></span><span><span></span><br></span><span><span></span><span>const</span><span> character </span><span>=</span><span> </span><span>{</span><span></span><br></span><span><span>    plugins</span><span>:</span><span> </span><span>[</span><span>tokenContractPlugin</span><span>]</span><span>,</span><span></span><br></span><span><span></span><span>}</span><span>;</span><br></span>
    ```
    
2.  **Required Configurations** Ensure the following environment variables or runtime settings are configured:
    
    -   `COINBASE_API_KEY`: API key for Coinbase SDK
    -   `COINBASE_PRIVATE_KEY`: Private key for secure transactions
    -   Wallet configuration (same as MassPayments plugin)

**Example Deployments:**

1.  **ERC20 Token**
    
    ```
    <span><span>const</span><span> response </span><span>=</span><span> </span><span>await</span><span> runtime</span><span>.</span><span>triggerAction</span><span>(</span><span>"DEPLOY_TOKEN_CONTRACT"</span><span>,</span><span> </span><span>{</span><span></span><br></span><span><span>    contractType</span><span>:</span><span> </span><span>"ERC20"</span><span>,</span><span></span><br></span><span><span>    name</span><span>:</span><span> </span><span>"MyToken"</span><span>,</span><span></span><br></span><span><span>    </span><span>symbol</span><span>:</span><span> </span><span>"MTK"</span><span>,</span><span></span><br></span><span><span>    network</span><span>:</span><span> </span><span>"base"</span><span>,</span><span></span><br></span><span><span>    totalSupply</span><span>:</span><span> </span><span>1000000</span><span>,</span><span></span><br></span><span><span></span><span>}</span><span>)</span><span>;</span><br></span>
    ```
    
2.  **NFT Collection**
    
    ```
    <span><span>const</span><span> response </span><span>=</span><span> </span><span>await</span><span> runtime</span><span>.</span><span>triggerAction</span><span>(</span><span>"DEPLOY_TOKEN_CONTRACT"</span><span>,</span><span> </span><span>{</span><span></span><br></span><span><span>    contractType</span><span>:</span><span> </span><span>"ERC721"</span><span>,</span><span></span><br></span><span><span>    name</span><span>:</span><span> </span><span>"MyNFT"</span><span>,</span><span></span><br></span><span><span>    </span><span>symbol</span><span>:</span><span> </span><span>"MNFT"</span><span>,</span><span></span><br></span><span><span>    network</span><span>:</span><span> </span><span>"eth"</span><span>,</span><span></span><br></span><span><span>    baseURI</span><span>:</span><span> </span><span>"https://api.mynft.com/metadata/"</span><span>,</span><span></span><br></span><span><span></span><span>}</span><span>)</span><span>;</span><br></span>
    ```
    
3.  **Multi-token Collection**
    
    ```
    <span><span>const</span><span> response </span><span>=</span><span> </span><span>await</span><span> runtime</span><span>.</span><span>triggerAction</span><span>(</span><span>"DEPLOY_TOKEN_CONTRACT"</span><span>,</span><span> </span><span>{</span><span></span><br></span><span><span>    contractType</span><span>:</span><span> </span><span>"ERC1155"</span><span>,</span><span></span><br></span><span><span>    name</span><span>:</span><span> </span><span>"MyMultiToken"</span><span>,</span><span></span><br></span><span><span>    </span><span>symbol</span><span>:</span><span> </span><span>"MMT"</span><span>,</span><span></span><br></span><span><span>    network</span><span>:</span><span> </span><span>"pol"</span><span>,</span><span></span><br></span><span><span>    baseURI</span><span>:</span><span> </span><span>"https://api.mymultitoken.com/metadata/"</span><span>,</span><span></span><br></span><span><span></span><span>}</span><span>)</span><span>;</span><br></span>
    ```
    

**Contract Interaction Example:**

```
<span><span>const</span><span> response </span><span>=</span><span> </span><span>await</span><span> runtime</span><span>.</span><span>triggerAction</span><span>(</span><span>"INVOKE_CONTRACT"</span><span>,</span><span> </span><span>{</span><span></span><br></span><span><span>  contractAddress</span><span>:</span><span> </span><span>"0x123..."</span><span>,</span><span></span><br></span><span><span>  method</span><span>:</span><span> </span><span>"transfer"</span><span>,</span><span></span><br></span><span><span>  abi</span><span>:</span><span> </span><span>[</span><span>...</span><span>]</span><span>,</span><span></span><br></span><span><span>  args</span><span>:</span><span> </span><span>{</span><span></span><br></span><span><span>    to</span><span>:</span><span> </span><span>"0x456..."</span><span>,</span><span></span><br></span><span><span>    amount</span><span>:</span><span> </span><span>"1000000000000000000"</span><span></span><br></span><span><span>  </span><span>}</span><span>,</span><span></span><br></span><span><span>  network</span><span>:</span><span> </span><span>"base"</span><span></span><br></span><span><span></span><span>}</span><span>)</span><span>;</span><br></span>
```

**Best Practices:**

-   Always verify contract parameters before deployment
-   Store contract addresses and deployment details securely
-   Test contract interactions on testnets before mainnet deployment
-   Keep track of deployed contracts using the generated CSV logs
-   Ensure proper error handling for failed deployments or interactions

___

#### 8\. TEE Plugin (`@ai16z/plugin-tee`)[](https://ai16z.github.io/eliza/docs/core/characterfile/#8-tee-plugin-ai16zplugin-tee "Direct link to 8-tee-plugin-ai16zplugin-tee")

Integrates [Dstack SDK](https://github.com/Dstack-TEE/dstack) to enable TEE (Trusted Execution Environment) functionality and deploy secure & privacy-enhanced Eliza Agents:

**Providers:**

-   `deriveKeyProvider` - Allows for secure key derivation within a TEE environment. It supports deriving keys for both Solana (Ed25519) and Ethereum (ECDSA) chains.
-   `remoteAttestationProvider` - Generate a Remote Attestation Quote based on `report_data`.

**DeriveKeyProvider Usage**

```
<span><span>import</span><span> </span><span>{</span><span> DeriveKeyProvider </span><span>}</span><span> </span><span>from</span><span> </span><span>"@ai16z/plugin-tee"</span><span>;</span><span></span><br></span><span><span></span><br></span><span><span></span><span>// Initialize the provider</span><span></span><br></span><span><span></span><span>const</span><span> provider </span><span>=</span><span> </span><span>new</span><span> </span><span>DeriveKeyProvider</span><span>(</span><span>)</span><span>;</span><span></span><br></span><span><span></span><br></span><span><span></span><span>// Derive a raw key</span><span></span><br></span><span><span></span><span>try</span><span> </span><span>{</span><span></span><br></span><span><span>    </span><span>const</span><span> rawKey </span><span>=</span><span> </span><span>await</span><span> provider</span><span>.</span><span>rawDeriveKey</span><span>(</span><span></span><br></span><span><span>        </span><span>"/path/to/derive"</span><span>,</span><span></span><br></span><span><span>        </span><span>"subject-identifier"</span><span>,</span><span></span><br></span><span><span>    </span><span>)</span><span>;</span><span></span><br></span><span><span>    </span><span>// rawKey is a DeriveKeyResponse that can be used for further processing</span><span></span><br></span><span><span>    </span><span>// to get the uint8Array do the following</span><span></span><br></span><span><span>    </span><span>const</span><span> rawKeyArray </span><span>=</span><span> rawKey</span><span>.</span><span>asUint8Array</span><span>(</span><span>)</span><span>;</span><span></span><br></span><span><span></span><span>}</span><span> </span><span>catch</span><span> </span><span>(</span><span>error</span><span>)</span><span> </span><span>{</span><span></span><br></span><span><span>    </span><span>console</span><span>.</span><span>error</span><span>(</span><span>"Raw key derivation failed:"</span><span>,</span><span> error</span><span>)</span><span>;</span><span></span><br></span><span><span></span><span>}</span><span></span><br></span><span><span></span><br></span><span><span></span><span>// Derive a Solana keypair (Ed25519)</span><span></span><br></span><span><span></span><span>try</span><span> </span><span>{</span><span></span><br></span><span><span>    </span><span>const</span><span> solanaKeypair </span><span>=</span><span> </span><span>await</span><span> provider</span><span>.</span><span>deriveEd25519Keypair</span><span>(</span><span></span><br></span><span><span>        </span><span>"/path/to/derive"</span><span>,</span><span></span><br></span><span><span>        </span><span>"subject-identifier"</span><span>,</span><span></span><br></span><span><span>    </span><span>)</span><span>;</span><span></span><br></span><span><span>    </span><span>// solanaKeypair can now be used for Solana operations</span><span></span><br></span><span><span></span><span>}</span><span> </span><span>catch</span><span> </span><span>(</span><span>error</span><span>)</span><span> </span><span>{</span><span></span><br></span><span><span>    </span><span>console</span><span>.</span><span>error</span><span>(</span><span>"Solana key derivation failed:"</span><span>,</span><span> error</span><span>)</span><span>;</span><span></span><br></span><span><span></span><span>}</span><span></span><br></span><span><span></span><br></span><span><span></span><span>// Derive an Ethereum keypair (ECDSA)</span><span></span><br></span><span><span></span><span>try</span><span> </span><span>{</span><span></span><br></span><span><span>    </span><span>const</span><span> evmKeypair </span><span>=</span><span> </span><span>await</span><span> provider</span><span>.</span><span>deriveEcdsaKeypair</span><span>(</span><span></span><br></span><span><span>        </span><span>"/path/to/derive"</span><span>,</span><span></span><br></span><span><span>        </span><span>"subject-identifier"</span><span>,</span><span></span><br></span><span><span>    </span><span>)</span><span>;</span><span></span><br></span><span><span>    </span><span>// evmKeypair can now be used for Ethereum operations</span><span></span><br></span><span><span></span><span>}</span><span> </span><span>catch</span><span> </span><span>(</span><span>error</span><span>)</span><span> </span><span>{</span><span></span><br></span><span><span>    </span><span>console</span><span>.</span><span>error</span><span>(</span><span>"EVM key derivation failed:"</span><span>,</span><span> error</span><span>)</span><span>;</span><span></span><br></span><span><span></span><span>}</span><br></span>
```

**RemoteAttestationProvider Usage**

```
<span><span>import</span><span> </span><span>{</span><span> RemoteAttestationProvider </span><span>}</span><span> </span><span>from</span><span> </span><span>"@ai16z/plugin-tee"</span><span>;</span><span></span><br></span><span><span></span><span>// Initialize the provider</span><span></span><br></span><span><span></span><span>const</span><span> provider </span><span>=</span><span> </span><span>new</span><span> </span><span>RemoteAttestationProvider</span><span>(</span><span>)</span><span>;</span><span></span><br></span><span><span></span><span>// Generate Remote Attestation</span><span></span><br></span><span><span></span><span>try</span><span> </span><span>{</span><span></span><br></span><span><span>    </span><span>const</span><span> attestation </span><span>=</span><span> </span><span>await</span><span> provider</span><span>.</span><span>generateAttestation</span><span>(</span><span>"your-report-data"</span><span>)</span><span>;</span><span></span><br></span><span><span>    </span><span>console</span><span>.</span><span>log</span><span>(</span><span>"Attestation:"</span><span>,</span><span> attestation</span><span>)</span><span>;</span><span></span><br></span><span><span></span><span>}</span><span> </span><span>catch</span><span> </span><span>(</span><span>error</span><span>)</span><span> </span><span>{</span><span></span><br></span><span><span>    </span><span>console</span><span>.</span><span>error</span><span>(</span><span>"Failed to generate attestation:"</span><span>,</span><span> error</span><span>)</span><span>;</span><span></span><br></span><span><span></span><span>}</span><br></span>
```

**Configuration**

To get a TEE simulator for local testing, use the following commands:

```
<span><span>docker pull phalanetwork/tappd-simulator:latest</span><br></span><span><span># by default the simulator is available in localhost:8090</span><br></span><span><span>docker run --rm -p 8090:8090 phalanetwork/tappd-simulator:latest</span><br></span>
```

When using the provider through the runtime environment, ensure the following settings are configured:

```
<span><span> # Optional, for simulator purposes if testing on mac or windows. Leave empty for Linux x86 machines.</span><br></span><span><span>DSTACK_SIMULATOR_ENDPOINT="http://host.docker.internal:8090"</span><br></span><span><span>WALLET_SECRET_SALT=your-secret-salt // Required to single agent deployments</span><br></span>
```

___

#### 9\. Webhook Plugin (`@eliza/plugin-coinbase-webhooks`)[](https://ai16z.github.io/eliza/docs/core/characterfile/#9-webhook-plugin-elizaplugin-coinbase-webhooks "Direct link to 9-webhook-plugin-elizaplugin-coinbase-webhooks")

Manages webhooks using the Coinbase SDK, allowing for the creation and management of webhooks to listen for specific events on the Coinbase platform.

**Actions:**

-   `CREATE_WEBHOOK` - Create a new webhook to listen for specific events.
    -   **Inputs**:
        -   `networkId` (string): The network ID where the webhook should listen for events.
        -   `eventType` (string): The type of event to listen for (e.g., transfers).
        -   `eventFilters` (object, optional): Additional filters for the event.
        -   `eventTypeFilter` (string, optional): Specific event type filter.
    -   **Outputs**: Confirmation message with webhook details.
    -   **Example**:
        
        ```
        <span><span>{</span><br></span><span><span>  "networkId": "base",</span><br></span><span><span>  "eventType": "transfers",</span><br></span><span><span>  "notificationUri": "https://your-notification-uri.com"</span><br></span><span><span>}</span><br></span>
        ```
        

**Providers:**

-   `webhookProvider` - Retrieves a list of all configured webhooks.
    -   **Outputs**: A list of webhooks with details such as ID, URL, event type, and status.

**Description:**

The Webhook Plugin enables Eliza to interact with the Coinbase SDK to create and manage webhooks. This allows for real-time event handling and notifications based on specific criteria set by the user.

**Usage Instructions:**

1.  **Configure the Plugin** Add the plugin to your character’s configuration:
    
    ```
    <span><span>import</span><span> </span><span>{</span><span> webhookPlugin </span><span>}</span><span> </span><span>from</span><span> </span><span>"@eliza/plugin-coinbase-webhooks"</span><span>;</span><span></span><br></span><span><span></span><br></span><span><span></span><span>const</span><span> character </span><span>=</span><span> </span><span>{</span><span></span><br></span><span><span>  plugins</span><span>:</span><span> </span><span>[</span><span>webhookPlugin</span><span>]</span><span>,</span><span></span><br></span><span><span></span><span>}</span><span>;</span><br></span>
    ```
    
2.  **Ensure Secure Configuration** Set the following environment variables or runtime settings to ensure the plugin functions securely:
    
    -   `COINBASE_API_KEY`: API key for Coinbase SDK.
    -   `COINBASE_PRIVATE_KEY`: Private key for secure transactions.
    -   `COINBASE_NOTIFICATION_URI`: URI where notifications should be sent.

**Example Call**

To create a webhook:

```
<span><span>const</span><span> response </span><span>=</span><span> </span><span>await</span><span> runtime</span><span>.</span><span>triggerAction</span><span>(</span><span>"CREATE_WEBHOOK"</span><span>,</span><span> </span><span>{</span><span></span><br></span><span><span>  networkId</span><span>:</span><span> </span><span>"base"</span><span>,</span><span></span><br></span><span><span>  eventType</span><span>:</span><span> </span><span>"transfers"</span><span>,</span><span></span><br></span><span><span>  notificationUri</span><span>:</span><span> </span><span>"https://your-notification-uri.com"</span><span></span><br></span><span><span></span><span>}</span><span>)</span><span>;</span><span></span><br></span><span><span></span><span>console</span><span>.</span><span>log</span><span>(</span><span>"Webhook creation response:"</span><span>,</span><span> response</span><span>)</span><span>;</span><br></span>
```

**Best Practices:**

-   **Secure Secrets Storage**: Ensure `COINBASE_API_KEY`, `COINBASE_PRIVATE_KEY`, and `COINBASE_NOTIFICATION_URI` are stored securely in `runtime.character.settings.secrets` or environment variables.
-   **Validation**: Always validate input parameters to ensure compliance with expected formats and supported networks.
-   **Error Handling**: Monitor logs for errors during webhook creation and adjust retry logic as needed.

### Writing Custom Plugins[](https://ai16z.github.io/eliza/docs/core/characterfile/#writing-custom-plugins "Direct link to Writing Custom Plugins")

Create a new plugin by implementing the Plugin interface:

```
<span><span>import</span><span> </span><span>{</span><span> Plugin</span><span>,</span><span> Action</span><span>,</span><span> Evaluator</span><span>,</span><span> Provider </span><span>}</span><span> </span><span>from</span><span> </span><span>"@ai16z/eliza"</span><span>;</span><span></span><br></span><span><span></span><br></span><span><span></span><span>const</span><span> myCustomPlugin</span><span>:</span><span> Plugin </span><span>=</span><span> </span><span>{</span><span></span><br></span><span><span>    name</span><span>:</span><span> </span><span>"my-custom-plugin"</span><span>,</span><span></span><br></span><span><span>    description</span><span>:</span><span> </span><span>"Adds custom functionality"</span><span>,</span><span></span><br></span><span><span>    actions</span><span>:</span><span> </span><span>[</span><span></span><br></span><span><span>        </span><span>/* custom actions */</span><span></span><br></span><span><span>    </span><span>]</span><span>,</span><span></span><br></span><span><span>    evaluators</span><span>:</span><span> </span><span>[</span><span></span><br></span><span><span>        </span><span>/* custom evaluators */</span><span></span><br></span><span><span>    </span><span>]</span><span>,</span><span></span><br></span><span><span>    providers</span><span>:</span><span> </span><span>[</span><span></span><br></span><span><span>        </span><span>/* custom providers */</span><span></span><br></span><span><span>    </span><span>]</span><span>,</span><span></span><br></span><span><span>    services</span><span>:</span><span> </span><span>[</span><span></span><br></span><span><span>        </span><span>/* custom services */</span><span></span><br></span><span><span>    </span><span>]</span><span>,</span><span></span><br></span><span><span></span><span>}</span><span>;</span><br></span>
```

## Best Practices[](https://ai16z.github.io/eliza/docs/core/characterfile/#best-practices "Direct link to Best Practices")

1.  **Modularity**: Keep plugins focused on specific functionality
2.  **Dependencies**: Clearly document any external dependencies
3.  **Error Handling**: Implement robust error handling
4.  **Documentation**: Provide clear documentation for actions and evaluators
5.  **Testing**: Include tests for plugin functionality

## Plugin Development Guidelines[](https://ai16z.github.io/eliza/docs/core/characterfile/#plugin-development-guidelines "Direct link to Plugin Development Guidelines")

### Action Development[](https://ai16z.github.io/eliza/docs/core/characterfile/#action-development "Direct link to Action Development")

-   Implement the `Action` interface
-   Provide clear validation logic
-   Include usage examples
-   Handle errors gracefully

### Evaluator Development[](https://ai16z.github.io/eliza/docs/core/characterfile/#evaluator-development "Direct link to Evaluator Development")

-   Implement the `Evaluator` interface
-   Define clear evaluation criteria
-   Include validation logic
-   Document evaluation metrics

### Provider Development[](https://ai16z.github.io/eliza/docs/core/characterfile/#provider-development "Direct link to Provider Development")

-   Implement the `Provider` interface
-   Define context generation logic
-   Handle state management
-   Document provider capabilities

## Common Issues & Solutions[](https://ai16z.github.io/eliza/docs/core/characterfile/#common-issues--solutions "Direct link to Common Issues & Solutions")

### Plugin Loading Issues[](https://ai16z.github.io/eliza/docs/core/characterfile/#plugin-loading-issues "Direct link to Plugin Loading Issues")

```
<span><span>// Check if plugins are loaded correctly</span><span></span><br></span><span><span></span><span>if</span><span> </span><span>(</span><span>character</span><span>.</span><span>plugins</span><span>)</span><span> </span><span>{</span><span></span><br></span><span><span>    </span><span>console</span><span>.</span><span>log</span><span>(</span><span>"Plugins are: "</span><span>,</span><span> character</span><span>.</span><span>plugins</span><span>)</span><span>;</span><span></span><br></span><span><span>    </span><span>const</span><span> importedPlugins </span><span>=</span><span> </span><span>await</span><span> </span><span>Promise</span><span>.</span><span>all</span><span>(</span><span></span><br></span><span><span>        character</span><span>.</span><span>plugins</span><span>.</span><span>map</span><span>(</span><span>async</span><span> </span><span>(</span><span>plugin</span><span>)</span><span> </span><span>=&gt;</span><span> </span><span>{</span><span></span><br></span><span><span>            </span><span>const</span><span> importedPlugin </span><span>=</span><span> </span><span>await</span><span> </span><span>import</span><span>(</span><span>plugin</span><span>)</span><span>;</span><span></span><br></span><span><span>            </span><span>return</span><span> importedPlugin</span><span>;</span><span></span><br></span><span><span>        </span><span>}</span><span>)</span><span>,</span><span></span><br></span><span><span>    </span><span>)</span><span>;</span><span></span><br></span><span><span>    character</span><span>.</span><span>plugins </span><span>=</span><span> importedPlugins</span><span>;</span><span></span><br></span><span><span></span><span>}</span><br></span>
```

### Service Registration[](https://ai16z.github.io/eliza/docs/core/characterfile/#service-registration "Direct link to Service Registration")

```
<span><span>// Proper service registration</span><span></span><br></span><span><span></span><span>registerService</span><span>(</span><span>service</span><span>:</span><span> Service</span><span>)</span><span>:</span><span> </span><span>void</span><span> </span><span>{</span><span></span><br></span><span><span>    </span><span>const</span><span> serviceType </span><span>=</span><span> </span><span>(</span><span>service </span><span>as</span><span> </span><span>typeof</span><span> Service</span><span>)</span><span>.</span><span>serviceType</span><span>;</span><span></span><br></span><span><span>    </span><span>if</span><span> </span><span>(</span><span>this</span><span>.</span><span>services</span><span>.</span><span>has</span><span>(</span><span>serviceType</span><span>)</span><span>)</span><span> </span><span>{</span><span></span><br></span><span><span>        </span><span>console</span><span>.</span><span>warn</span><span>(</span><span>`</span><span>Service </span><span>${</span><span>serviceType</span><span>}</span><span> is already registered</span><span>`</span><span>)</span><span>;</span><span></span><br></span><span><span>        </span><span>return</span><span>;</span><span></span><br></span><span><span>    </span><span>}</span><span></span><br></span><span><span>    </span><span>this</span><span>.</span><span>services</span><span>.</span><span>set</span><span>(</span><span>serviceType</span><span>,</span><span> service</span><span>)</span><span>;</span><span></span><br></span><span><span></span><span>}</span><br></span>
```

## Future Extensions[](https://ai16z.github.io/eliza/docs/core/characterfile/#future-extensions "Direct link to Future Extensions")

The plugin system is designed to be extensible. Future additions may include:

-   Database adapters
-   Authentication providers
-   Custom model providers
-   External API integrations
-   Workflow automation
-   Custom UI components

## Contributing[](https://ai16z.github.io/eliza/docs/core/characterfile/#contributing "Direct link to Contributing")

To contribute a new plugin:

1.  Follow the plugin structure guidelines
2.  Include comprehensive documentation
3.  Add tests for all functionality
4.  Submit a pull request
5.  Update the plugin registry

For detailed API documentation and examples, see the [API Reference](https://ai16z.github.io/eliza/api/).