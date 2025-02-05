

# Lit Protocol Plugin Code2Prompt

Project Path: plugin-lit

Source Tree:

```
plugin-lit
├── tsup.config.ts
├── pkp-setup.md
├── package.json
├── README.md
├── tsconfig.json
├── eslint.config.mjs
└── src
    ├── templates
    │   └── index.ts
    ├── actions
    │   ├── sendUSDC.ts
    │   ├── tools
    │   │   ├── ecdsaSign
    │   │   │   ├── lit-actions
    │   │   │   │   ├── utils
    │   │   │   │   │   └── sign-message.ts
    │   │   │   │   ├── tool.ts
    │   │   │   │   └── policy.ts
    │   │   │   ├── toolCall.ts
    │   │   │   ├── tool.ts
    │   │   │   ├── ipfs.ts
    │   │   │   └── policy.ts
    │   │   ├── erc20transfer
    │   │   │   ├── lit-actions
    │   │   │   │   ├── utils
    │   │   │   │   │   ├── get-erc20-info.ts
    │   │   │   │   │   ├── estimate-gas-limit.ts
    │   │   │   │   │   ├── get-gas-data.ts
    │   │   │   │   │   ├── broadcast-tx.ts
    │   │   │   │   │   └── create-and-sign-tx.ts
    │   │   │   │   ├── tool.ts
    │   │   │   │   └── policy.ts
    │   │   │   ├── toolCall.ts
    │   │   │   ├── tool.ts
    │   │   │   ├── ipfs.ts
    │   │   │   └── policy.ts
    │   │   └── uniswapSwap
    │   │       ├── lit-actions
    │   │       │   ├── utils
    │   │       │   │   ├── get-token-info.ts
    │   │       │   │   ├── create-tx.ts
    │   │       │   │   ├── estimate-gas-limit.ts
    │   │       │   │   ├── sign-tx.ts
    │   │       │   │   ├── get-gas-data.ts
    │   │       │   │   ├── get-best-quote.ts
    │   │       │   │   ├── get-uniswap-quotor-router.ts
    │   │       │   │   ├── broadcast-tx.ts
    │   │       │   │   └── index.ts
    │   │       │   ├── tool.ts
    │   │       │   └── policy.ts
    │   │       ├── toolCall.ts
    │   │       ├── tool.ts
    │   │       ├── ipfs.ts
    │   │       └── policy.ts
    │   ├── helloLit
    │   │   ├── helloLitAction.ts
    │   │   └── helloLit.ts
    │   ├── sendEth.ts
    │   ├── sendSol.ts
    │   └── index.ts
    ├── types
    │   └── index.ts
    ├── providers
    │   ├── pkpPermissionsProvider.ts
    │   ├── litProvider.ts
    │   └── index.ts
    ├── index.ts
    └── config
        └── configManager.ts

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/tsup.config.ts`:

```ts
import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "dist",
    sourcemap: true,
    clean: true,
    format: ["esm"],
    external: [
        // Core dependencies
        "@elizaos/core",
        
        // Lit Protocol dependencies
        "@lit-protocol/lit-node-client",
        "@lit-protocol/contracts-sdk",
        "@lit-protocol/lit-auth-client",
        "@lit-protocol/pkp-ethers",
        
        // Built-in Node.js modules
        "dotenv",
        "fs",
        "path",
        "https",
        "http",
        "events",
        
        // Third-party dependencies
        "@reflink/reflink",
        "@node-llama-cpp",
        "agentkeepalive",
        "viem",
        "@lifi/sdk",
        "node-cache",
        "zod"
    ],
    dts: {
        resolve: true,
        entry: {
            index: "src/index.ts"
        }
    },
    treeshake: true,
    splitting: false,
    bundle: true
});
```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/pkp-setup.md`:

```md
# PKP Setup Guide for @plugin-lit

## Overview
This guide explains the Programmable Key Pair (PKP) setup process for @plugin-lit and the configuration file structure.

## Automatic PKP Creation

The PKP creation in @plugin-lit is automatic. The process is handled by the `litProvider` during initialization, which:

1. Checks for existing configuration
2. If no PKP exists, automatically:
   - Creates a new EVM wallet
   - Generates a Solana wallet
   - Mints a new PKP
   - Mints a capacity credit NFT
   - Saves all configurations to `lit-config.json`

## Configuration File Structure

The `lit-config.json` file is automatically created with the following structure:

```json
{
"pkp": {
"tokenId": "0xca60...", // The PKP token ID
"publicKey": "04b756...", // The PKP public key
"ethAddress": "0xB2D4...", // The Ethereum address
"solanaAddress": "HzunQ..." // The Solana address
},
"network": "Chain ID 175188", // The network identifier
"timestamp": 1735839217558, // Creation timestamp
"evmWalletPrivateKey": "0x710...", // EVM wallet private key
"solanaWalletPrivateKey": "Wz0...", // Solana wallet private key (base64)
"capacityCredit": {
"tokenId": "87622" // Capacity credit NFT token ID
},
"wrappedKeyId": "0b410..." // Wrapped key identifier
}
```


### Configuration Fields Explained

#### PKP Section
- `tokenId`: Unique identifier for the PKP NFT
- `publicKey`: PKP's public key
- `ethAddress`: Generated Ethereum address
- `solanaAddress`: Generated Solana address

#### Other Fields
- `network`: Identifies the blockchain network
- `timestamp`: Creation timestamp
- `evmWalletPrivateKey`: Private key for EVM transactions
- `solanaWalletPrivateKey`: Private key for Solana transactions (base64 encoded)
- `capacityCredit.tokenId`: Used for rate limiting and usage tracking
- `wrappedKeyId`: Used for secure key management with Lit Protocol

## Security Considerations

The `lit-config.json` file contains sensitive information. Important security measures:

1. Add to `.gitignore`
2. Never share or expose the file
3. Maintain secure backups
4. Store in a safe location

## Required Environment Variables

Set these environment variables for proper PKP creation:

```env
FUNDING_PRIVATE_KEY= # Private key for funding operations
RPC_URL= # RPC endpoint for blockchain interactions
```


## Optional Manual Configuration

There are two ways to use an existing PKP instead of automatic creation:

1. Set the environment variable:
```env
LIT_PKP_PUBLIC_KEY=   # Your existing PKP public key
```

2. Copy an existing `lit-config.json` file:
   - Simply copy your existing `lit-config.json` file into your project's root directory
   - The plugin will detect and use this configuration instead of creating a new one
   - Ensure the copied configuration file contains all required fields
   - This is useful for maintaining the same PKP across multiple environments or projects

> Note: When copying an existing configuration, make sure to maintain proper security practices and never commit the file to version control.


## Verification Steps

Verify your setup by checking:

1. `lit-config.json` exists in your project
2. PKP configuration is valid
3. Capacity credit NFT is allocated

The plugin handles ongoing PKP rotation and management automatically based on the configuration.

## Support

For additional support or questions:
- Visit the [Lit Protocol Documentation](https://developer.litprotocol.com/)
- Join the [Lit Protocol Discord](https://discord.com/invite/lit)
```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/package.json`:

```json
{
    "name": "@elizaos/plugin-lit",
    "version": "0.1.9",
    "type": "module",
    "main": "dist/index.js",
    "module": "dist/index.js",
    "types": "dist/index.d.ts",
    "exports": {
        "./package.json": "./package.json",
        ".": {
            "import": {
                "@elizaos/source": "./src/index.ts",
                "types": "./dist/index.d.ts",
                "default": "./dist/index.js"
            }
        }
    },
    "files": [
        "dist"
    ],
    "dependencies": {
        "@elizaos/core": "workspace:*",
        "@elizaos/plugin-tee": "workspace:*",
        "@lifi/data-types": "5.15.5",
        "@lifi/sdk": "3.4.1",
        "@lifi/types": "16.3.0",
        "tsup": "8.3.5",
        "@lit-protocol/lit-node-client": "^7.0.4",
        "@lit-protocol/constants": "^7.0.4",
        "@lit-protocol/auth-helpers": "^7.0.4",
        "@lit-protocol/aw-tool": "*",
        "@ethersproject/abstract-provider": "^5.0.0",
        "@lit-protocol/contracts-sdk": "^7.0.2",
        "@lit-protocol/lit-auth-client": "^7.0.2",
        "@lit-protocol/pkp-client": "6.11.3",
        "@lit-protocol/pkp-ethers": "^7.0.2",
        "@lit-protocol/types": "^6.11.3",
        "@lit-protocol/wrapped-keys": "^7.0.2",
        "@solana/web3.js": "^1.95.8",
        "ethers": "^5.7.2",
        "siwe": "^2.0.0",
        "zod": "3.22.4"
    },
    "devDependencies": {
        "@types/node": "^20.0.0",
        "typescript": "^5.0.0"
    },
    "scripts": {
        "build": "tsup --format esm --dts",
        "dev": "tsup --format esm --dts --watch",
        "test": "vitest run",
        "start": "node dist/index.js --isRoot --character=characters/trump.character.json",
        "lint": "eslint --fix  --cache .",
        "clean": "rm -rf dist",
        "typecheck": "tsc --noEmit"
    },
    "peerDependencies": {
        "whatwg-url": "7.1.0"
    }
}

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/README.md`:

```md
# @elizaos/plugin-lit

A plugin that integrates Lit Protocol functionality into the elizaOS runtime environment, enabling secure and decentralized access control and cryptographic operations.

## Features

- Deploy and manage Lit Actions for programmable cryptography
- Interact with Lit Agent Wallet for secure transaction signing
- Built-in tools for common blockchain operations:
  - ECDSA signing
  - ERC20 token transfers
  - Uniswap interactions

## Installation

A comprehensive blockchain interaction plugin for the Eliza Agent Stack, powered by Lit Protocol's Programmable Key Pairs (PKPs). This plugin enables autonomous agents to perform secure cross-chain transactions through decentralized key management and threshold cryptography.

## Overview

The Lit Protocol plugin provides:
- Dual-chain wallet management (EVM + Solana)
- Secure transaction signing and execution
- Capacity credit management
- Automated PKP lifecycle management
- Security evaluations for transactions

## Features

- **Wallet Management**
  - Automated PKP creation and management
  - Dual-chain support (EVM + Solana)
  - Secure key storage and rotation
  - Capacity credit allocation

- **Transaction Support**
  - ETH transfers
  - USDC transfers
  - SOL transfers
  - Transaction security validation

- **Security Features**
  - Transaction amount limits
  - Security evaluations
  - PKP validation
  - Session management
  - Capacity credit monitoring

## Installation
```bash
npm install @elizaos/plugin-lit
```

## Setup

There are two ways to register the plugin:

1. Add to your agent's plugins in `agent/src/index.ts`:

```typescript
import { LitPlugin } from '@elizaos/plugin-lit';

export default {
  plugins: [
    // ... other plugins
    litPlugin,
  ],
  // ... rest of your agent configuration
};
```

2. Or add it in your character configuration:

```typescript
{
  name: "YourCharacter",
  plugins: [
    // ... other plugins
    "@elizaos/plugin-lit"
  ]
}
```

## Quick Start

1. After registration, initialize Lit Protocol:

```javascript
await elizaOS.lit.initialize({
  // Your configuration options
});
```

## Core Components

### Lit Actions

Located in `src/actions/helloLit`, this module provides the foundation for deploying and managing Lit Actions. Lit Actions are JavaScript functions that run in a decentralized manner across the Lit Network.

Example usage:

```javascript
const litAction = await elizaOS.lit.deployAction({
  code: `
    (async () => {
      // Your Lit Action code here
    })();
  `
});
```

### Tools

The `src/actions/helloLit/tools` directory contains pre-built tools for common blockchain operations:

#### ECDSA Signing
```javascript
const signature = await elizaOS.lit.tools.ecdsaSign({
  message: "Message to sign",
  // Additional parameters
});
```

#### ERC20 Token Transfer
```javascript
const transfer = await elizaOS.lit.tools.erc20Transfer({
  tokenAddress: "0x...",
  recipient: "0x...",
  amount: "1000000000000000000" // 1 token with 18 decimals
});
```

#### Uniswap Integration
```javascript
const swap = await elizaOS.lit.tools.uniswapSwap({
  tokenIn: "0x...",
  tokenOut: "0x...",
  amountIn: "1000000000000000000"
});
```

## Agent Wallet Integration

This plugin integrates with the [Lit Protocol Agent Wallet](https://github.com/LIT-Protocol/agent-wallet) for secure key management and transaction signing. The Agent Wallet provides:

- Secure key generation and storage
- Transaction signing capabilities
- Integration with Lit Actions for programmable authorization

## Documentation

For more detailed information about Lit Protocol and its capabilities, visit:
- [Lit Protocol Documentation](https://developer.litprotocol.com/)
- [Agent Wallet Documentation](https://github.com/LIT-Protocol/agent-wallet)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License

Copyright (c) 2024 elizaOS

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
=======
## Configuration

Required environment variables:
```env
FUNDING_PRIVATE_KEY=   # Private key for funding operations
EVM_RPC_URL=           # RPC endpoint for blockchain interactions
LIT_PKP_PUBLIC_KEY=    # (Optional) Existing PKP public key
```

## Important: Wallet Funding

Before executing any transactions, you must fund the generated Lit wallet address with the necessary assets (ETH, SOL, or USDC). The plugin will create a new PKP wallet address if one isn't provided, and this address will need to hold sufficient funds to:
1. Cover the amount being transferred
2. Pay for transaction fees (gas fees on EVM chains, transaction fees on Solana)

You can view your PKP wallet address after initializing the plugin using the configuration file (`lit-config.json`).

## Usage

### Basic Setup
```typescript
import { litPlugin } from '@elizaos/plugin-lit';

// Register the plugin
runtime.registerPlugin(litPlugin);
```

### Sending ETH
```typescript
// Send ETH transaction
await runtime.executeAction('SEND_ETH', {
  text: "Send 0.01 ETH to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
});
```

### Sending SOL
```typescript
// Send SOL transaction
await runtime.executeAction('SEND_SOL', {
  text: "Send 0.1 SOL to 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
});
```

### Sending USDC
```typescript
// Send USDC transaction
await runtime.executeAction('SEND_USDC', {
  text: "Send 10 USDC to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
});
```

## Security

The plugin implements multiple security layers:
- Transaction amount limits
- Automated security evaluations
- PKP validation checks
- Session-based authentication
- Capacity credit management
- Automatic key rotation

## Architecture

The plugin consists of several key components:

- **Providers**
  - `litProvider`: Manages PKP creation and Lit Protocol integration
  - `pkpPermissionsProvider`: Handles PKP permissions and auth methods

- **Actions**
  - `sendEth`: ETH transfer functionality
  - `sendSol`: SOL transfer functionality
  - `sendUSDC`: USDC transfer functionality

## Configuration Management

The plugin uses a local configuration file (`lit-config.json`) to store:
- PKP details
- Network configuration
- Wallet information
- Capacity credits
- Session data

## Contributing

Contributions are welcome! Please see our [Contributing Guide](../CONTRIBUTING.md) for details.

## License

MIT

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/tsconfig.json`:

```json
{
    "extends": "../core/tsconfig.json",
    "compilerOptions": {
        "outDir": "dist",
        "rootDir": "./src",
        "typeRoots": ["./node_modules/@types", "./src/types"],
        "declaration": true
    },
    "include": ["src"]
}

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/eslint.config.mjs`:

```mjs
import eslintGlobalConfig from "../../eslint.config.mjs";

export default [...eslintGlobalConfig];

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/templates/index.ts`:

```ts
export const litWalletTransferTemplate = `
You are an AI assistant specialized in processing Lit Protocol wallet transfer requests. Your task is to extract specific information from user messages and format it into a structured JSON response.

First, review the recent messages from the conversation:

<recent_messages>
{{recentMessages}}
</recent_messages>

Your goal is to extract the following information about the requested transfer:
1. PKP Ethereum Address (must be a valid Ethereum address)
2. RPC URL (must be a valid URL)
3. Chain ID (must be a valid chain ID)
4. Token Address (must be a valid Ethereum address or null for native token)
5. Recipient Address (must be a valid Ethereum address)
6. Amount to transfer (in tokens, without the symbol)

Before providing the final JSON output, show your reasoning process inside <analysis> tags. Follow these steps:

1. Identify the relevant information from the user's message:
   - Quote the part of the message mentioning the PKP Ethereum Address.
   - Quote the part mentioning the RPC URL.
   - Quote the part mentioning the Chain ID.
   - Quote the part mentioning the Token Address.
   - Quote the part mentioning the Recipient Address.
   - Quote the part mentioning the Amount.

2. Validate each piece of information:
   - PKP Ethereum Address: Check that it starts with "0x" and count the number of characters (should be 42).
   - RPC URL: Ensure it is a valid URL.
   - Chain ID: Ensure it is a valid number.
   - Token Address: Check that it starts with "0x" and count the number of characters (should be 42) or set to null for native token.
   - Recipient Address: Check that it starts with "0x" and count the number of characters (should be 42).
   - Amount: Attempt to convert the amount to a number to verify it's valid.

3. If any information is missing or invalid, prepare an appropriate error message.

4. If all information is valid, summarize your findings.

5. Prepare the JSON structure based on your analysis.

After your analysis, provide the final output in a JSON markdown block. All fields are required. The JSON should have this structure:

\`\`\`json
{
    "pkpEthAddress": string,
    "rpcUrl": string,
    "chainId": number,
    "tokenIn": string | null,
    "recipientAddress": string,
    "amountIn": string
}
\`\`\`

Now, process the user's request and provide your response.
`;

export const uniswapSwapTemplate = `
You are an AI assistant specialized in processing Uniswap swap requests using the Lit Protocol. Your task is to extract specific information from user messages and format it into a structured JSON response.

First, review the recent messages from the conversation:

<recent_messages>
{{recentMessages}}
</recent_messages>

Your goal is to extract the following information about the requested swap:
1. PKP Ethereum Address (must be a valid Ethereum address)
2. RPC URL (must be a valid URL)
3. Chain ID (must be a valid chain ID)
4. Token In Address (must be a valid Ethereum address)
5. Token Out Address (must be a valid Ethereum address)
6. Amount In (in tokens, without the symbol)

Before providing the final JSON output, show your reasoning process inside <analysis> tags. Follow these steps:

1. Identify the relevant information from the user's message:
   - Quote the part of the message mentioning the PKP Ethereum Address.
   - Quote the part mentioning the RPC URL.
   - Quote the part mentioning the Chain ID.
   - Quote the part mentioning the Token In Address.
   - Quote the part mentioning the Token Out Address.
   - Quote the part mentioning the Amount In.

2. Validate each piece of information:
   - PKP Ethereum Address: Check that it starts with "0x" and count the number of characters (should be 42).
   - RPC URL: Ensure it is a valid URL.
   - Chain ID: Ensure it is a valid number.
   - Token In Address: Check that it starts with "0x" and count the number of characters (should be 42).
   - Token Out Address: Check that it starts with "0x" and count the number of characters (should be 42).
   - Amount In: Attempt to convert the amount to a number to verify it's valid.

3. If any information is missing or invalid, prepare an appropriate error message.

4. If all information is valid, summarize your findings.

5. Prepare the JSON structure based on your analysis.

After your analysis, provide the final output in a JSON markdown block. All fields are required. The JSON should have this structure:

\`\`\`json
{
    "pkpEthAddress": string,
    "rpcUrl": string,
    "chainId": number,
    "tokenIn": string,
    "tokenOut": string,
    "amountIn": string
}
\`\`\`

Now, process the user's request and provide your response.
`;

export const ecdsaSignTemplate = `
You are an AI assistant specialized in processing ECDSA signing requests using the Lit Protocol. Your task is to extract specific information from user messages and format it into a structured JSON response.

First, review the recent messages from the conversation:

<recent_messages>
{{recentMessages}}
</recent_messages>

Your goal is to extract the following information about the requested signing:
1. PKP Ethereum Address (must be a valid Ethereum address)
2. Message (must be a valid string)

Before providing the final JSON output, show your reasoning process inside <analysis> tags. Follow these steps:

1. Identify the relevant information from the user's message:
   - Quote the part of the message mentioning the PKP Ethereum Address.
   - Quote the part mentioning the Message.

2. Validate each piece of information:
   - PKP Ethereum Address: Check that it starts with "0x" and count the number of characters (should be 42).
   - Message: Ensure it is a non-empty string.

3. If any information is missing or invalid, prepare an appropriate error message.

4. If all information is valid, summarize your findings.

5. Prepare the JSON structure based on your analysis.

After your analysis, provide the final output in a JSON markdown block. All fields are required. The JSON should have this structure:

\`\`\`json
{
    "pkpEthAddress": string,
    "message": string
}
\`\`\`

Now, process the user's request and provide your response.
`;

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/sendUSDC.ts`:

```ts
import { Action, HandlerCallback, IAgentRuntime, Memory, State } from "@elizaos/core";
import { ethers } from "ethers";
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LIT_RPC, LIT_ABILITY } from "@lit-protocol/constants";
import { LitPKPResource, createSiweMessageWithRecaps, generateAuthSig, LitActionResource } from "@lit-protocol/auth-helpers";
import { z } from "zod";
import { ModelClass, composeContext, generateObject, Content } from "@elizaos/core";

const USDC_CONTRACT_ADDRESS = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8"; // Sepolia USDC (AAVE)
const USDC_ABI = ["function transfer(address to, uint256 amount) returns (bool)"];

interface LitState {
  nodeClient: LitNodeClient;
  evmWallet?: ethers.Wallet;
  pkp?: {
    publicKey: string;
    ethAddress: string;
  };
  capacityCredit?: {
    tokenId: string;
  };
}

// Add template for content extraction
const sendUsdcTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "amount": "10",
    "to": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the USDC transfer:
- amount (the amount of USDC to send)
- to (the destination address)

Respond with a JSON markdown block containing only the extracted values.`;

// Define the schema type
export const sendUsdcSchema = z.object({
    amount: z.string().nullable(),
    to: z.string().nullable()
});

// Add type guard function
function isSendUsdcContent(content: Content): content is SendUsdcContent {
    return (
        (typeof content.amount === "string" || content.amount === null) &&
        (typeof content.to === "string" || content.to === null)
    );
}

interface SendUsdcContent extends Content {
    amount: string | null;
    to: string | null;
}

export const sendUSDC: Action = {
  name: "SEND_USDC",
  description: "Sends USDC to an address on Sepolia using PKP wallet",
  similes: ["send usdc", "send * usdc to *", "transfer * usdc to *"],
  validate: async (_runtime: IAgentRuntime) => true,
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<boolean> => {
    try {
      // Initialize or update state
      let currentState: State;
      if (!state) {
          currentState = (await runtime.composeState(message)) as State;
      } else {
          currentState = await runtime.updateRecentMessageState(state);
      }

      // Compose context and generate content
      const sendUsdcContext = composeContext({
        state: currentState,
        template: sendUsdcTemplate,
      });

      // Generate content with the schema
      const content = await generateObject({
        runtime,
        context: sendUsdcContext,
        schema: sendUsdcSchema as any,
        modelClass: ModelClass.LARGE,
      });

      const sendUsdcContent = content.object as SendUsdcContent;

      // Validate content
      if (!isSendUsdcContent(sendUsdcContent)) {
        console.error("Invalid content for SEND_USDC action.");
        callback?.({
          text: "Unable to process USDC transfer request. Invalid content provided.",
          content: { error: "Invalid send USDC content" }
        });
        return false;
      }

      if (!sendUsdcContent.amount) {
        console.log("Amount is not provided, skipping transfer");
        callback?.({ text: "The amount must be provided" });
        return false;
      }

      if (!sendUsdcContent.to) {
        console.log("Destination address is not provided, skipping transfer");
        callback?.({ text: "The destination address must be provided" });
        return false;
      }

      const amount = sendUsdcContent.amount;
      const to = sendUsdcContent.to;
      const litState = (state.lit || {}) as LitState;
      if (!litState.nodeClient || !litState.pkp || !litState.evmWallet || !litState.capacityCredit?.tokenId) {
        throw new Error("Lit environment not fully initialized");
      }

      const provider = new ethers.providers.JsonRpcProvider(runtime.getSetting("EVM_RPC_URL"));
      const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, USDC_ABI, provider);
      const decimals = 6; // USDC has 6 decimals
      const value = ethers.utils.parseUnits(amount, decimals);

      const unsignedTx = await usdcContract.populateTransaction.transfer(to, value);
      unsignedTx.nonce = await provider.getTransactionCount(litState.pkp.ethAddress);
      unsignedTx.gasPrice = await provider.getGasPrice();
      unsignedTx.gasLimit = ethers.BigNumber.from(100000);
      unsignedTx.chainId = 11155111; // Sepolia

      const fundingWallet = new ethers.Wallet(
        runtime.getSetting("FUNDING_PRIVATE_KEY"),
        new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
      );

      const { capacityDelegationAuthSig } = await litState.nodeClient.createCapacityDelegationAuthSig({
        dAppOwnerWallet: fundingWallet,
        capacityTokenId: litState.capacityCredit.tokenId,
        delegateeAddresses: [litState.pkp.ethAddress],
        uses: "1",
        expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(),
      });

      const sessionSigs = await litState.nodeClient.getSessionSigs({
        pkpPublicKey: litState.pkp.publicKey,
        chain: "sepolia",
        capabilityAuthSigs: [capacityDelegationAuthSig],
        expiration: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        resourceAbilityRequests: [
          { resource: new LitPKPResource("*"), ability: LIT_ABILITY.PKPSigning },
          { resource: new LitActionResource("*"), ability: LIT_ABILITY.LitActionExecution },
        ],
        authNeededCallback: async ({ resourceAbilityRequests, expiration, uri }) => {
          if (!uri || !expiration || !resourceAbilityRequests) {
            throw new Error("Missing required parameters for auth callback");
          }
          const toSign = await createSiweMessageWithRecaps({
            uri,
            expiration,
            resources: resourceAbilityRequests,
            walletAddress: litState.evmWallet.address,
            nonce: await litState.nodeClient.getLatestBlockhash(),
            litNodeClient: litState.nodeClient,
          });
          return await generateAuthSig({ signer: litState.evmWallet, toSign });
        },
      });

      const sig = await litState.nodeClient.pkpSign({
        pubKey: litState.pkp.publicKey,
        toSign: ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.serializeTransaction(unsignedTx))),
        sessionSigs,
      });

      const signature = { r: `0x${sig.r}`, s: `0x${sig.s}`, v: sig.recid === 0 ? 27 : 28 };
      const signedTx = ethers.utils.serializeTransaction(unsignedTx, signature);
      const sentTx = await provider.sendTransaction(signedTx);
      await sentTx.wait();

      callback?.({
        text: `Successfully sent ${amount} USDC to ${to}. Transaction hash: ${sentTx.hash}`,
        content: { success: true, hash: sentTx.hash, amount, to },
      });
      return true;

    } catch (error) {
      console.error("Error in sendUSDC:", error);
      callback?.({
        text: `Failed to send USDC: ${error instanceof Error ? error.message : "Unknown error"}`,
        content: { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      });
      return false;
    }
  },
  examples: [[
    { user: "{{user1}}", content: { text: "Send 10 USDC to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e" }},
    { user: "{{user2}}", content: { text: "Successfully sent USDC" }}
  ]],
};
```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/ecdsaSign/lit-actions/utils/sign-message.ts`:

```ts
/**
 * Signs the message using the PKP's public key.
 * @param pkpPublicKey - The PKP's public key.
 * @param message - The message to sign.
 * @returns The signature of the message.
 */
export const signMessage = async (pkpPublicKey: string, message: string) => {
  const pkForLit = pkpPublicKey.startsWith('0x')
    ? pkpPublicKey.slice(2)
    : pkpPublicKey;

  const sig = await Lit.Actions.signEcdsa({
    toSign: ethers.utils.arrayify(
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes(message))
    ),
    publicKey: pkForLit,
    sigName: 'sig',
  });

  return sig;
};

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/ecdsaSign/lit-actions/tool.ts`:

```ts
import {
  fetchToolPolicyFromRegistry,
  getPkpInfo,
  getPkpToolRegistryContract,
  NETWORK_CONFIG,
} from '@lit-protocol/aw-tool';
import { signMessage } from './utils/sign-message';

declare global {
  // Required Inputs
  const params: {
    pkpEthAddress: string;
    message: string;
  };
}

(async () => {
  try {
    console.log(`Using Lit Network: ${LIT_NETWORK}`);
    console.log(
      `Using PKP Tool Registry Address: ${PKP_TOOL_REGISTRY_ADDRESS}`
    );
    console.log(
      `Using Pubkey Router Address: ${
        NETWORK_CONFIG[LIT_NETWORK as keyof typeof NETWORK_CONFIG]
          .pubkeyRouterAddress
      }`
    );

    const delegateeAddress = ethers.utils.getAddress(LitAuth.authSigAddress);
    const toolIpfsCid = LitAuth.actionIpfsIds[0];
    const pkpToolRegistryContract = await getPkpToolRegistryContract(
      PKP_TOOL_REGISTRY_ADDRESS
    );
    const pkp = await getPkpInfo(params.pkpEthAddress);

    const toolPolicy = await fetchToolPolicyFromRegistry(
      pkpToolRegistryContract,
      pkp.tokenId,
      delegateeAddress,
      toolIpfsCid
    );

    if (
      toolPolicy.enabled &&
      toolPolicy.policyIpfsCid !== undefined &&
      toolPolicy.policyIpfsCid !== '0x' &&
      toolPolicy.policyIpfsCid !== ''
    ) {
      console.log(`Executing policy ${toolPolicy.policyIpfsCid}`);

      await Lit.Actions.call({
        ipfsId: toolPolicy.policyIpfsCid,
        params: {
          parentToolIpfsCid: toolIpfsCid,
          pkpToolRegistryContractAddress: PKP_TOOL_REGISTRY_ADDRESS,
          pkpTokenId: pkp.tokenId,
          delegateeAddress,
          toolParameters: {
            message: params.message,
          },
        },
      });
    } else {
      console.log(
        `No policy found for tool ${toolIpfsCid} on PKP ${pkp.tokenId} for delegatee ${delegateeAddress}`
      );
    }

    await signMessage(pkp.publicKey, params.message);

    // Return the signature
    Lit.Actions.setResponse({
      response: JSON.stringify({
        response: 'Signed message!',
        status: 'success',
      }),
    });
  } catch (err: any) {
    console.error('Error:', err);
    Lit.Actions.setResponse({
      response: JSON.stringify({
        status: 'error',
        error: err.message || String(err),
      }),
    });
  }
})();

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/ecdsaSign/lit-actions/policy.ts`:

```ts
import {
  checkLitAuthAddressIsDelegatee,
  getPkpToolRegistryContract,
  getPolicyParameters,
} from '@lit-protocol/aw-tool';

declare global {
  // Required Inputs
  const parentToolIpfsCid: string;
  const pkpToolRegistryContractAddress: string;
  const pkpTokenId: string;
  const delegateeAddress: string;
  const toolParameters: {
    message: string;
  };
}

(async () => {
  const pkpToolRegistryContract = await getPkpToolRegistryContract(
    pkpToolRegistryContractAddress
  );

  const isDelegatee = await checkLitAuthAddressIsDelegatee(
    pkpToolRegistryContract,
    pkpTokenId
  );
  if (!isDelegatee) {
    throw new Error(
      `Session signer ${ethers.utils.getAddress(
        LitAuth.authSigAddress
      )} is not a delegatee for PKP ${pkpTokenId}`
    );
  }

  // Get allowed prefixes from policy parameters
  const policyParameters = await getPolicyParameters(
    pkpToolRegistryContract,
    pkpTokenId,
    parentToolIpfsCid,
    delegateeAddress,
    ['allowedPrefixes']
  );

  // Extract and parse allowedPrefixes
  const allowedPrefixesParam = policyParameters.find(
    (p: { name: string; value: Uint8Array }) => p.name === 'allowedPrefixes'
  );
  if (!allowedPrefixesParam) {
    throw new Error('No allowedPrefixes parameter found in policy');
  }

  const allowedPrefixes: string[] = JSON.parse(
    ethers.utils.toUtf8String(allowedPrefixesParam.value)
  );
  if (!allowedPrefixes.length) {
    throw new Error('No allowed prefixes defined in policy');
  }

  // Check if message starts with any allowed prefix
  const messageHasAllowedPrefix = allowedPrefixes.some((prefix) =>
    toolParameters.message.startsWith(prefix)
  );

  if (!messageHasAllowedPrefix) {
    throw new Error(
      `Message must start with one of these prefixes: ${allowedPrefixes.join(
        ', '
      )}`
    );
  }

  console.log('Message prefix validated successfully');
})();

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/ecdsaSign/toolCall.ts`:

```ts
import { ethers } from 'ethers';
import {
  Action,
  composeContext,
  generateObjectDeprecated,
  HandlerCallback,
  ModelClass,
  type IAgentRuntime,
  type Memory,
  type State,
} from "@elizaos/core";
import { LIT_NETWORK, LIT_ABILITY } from '@lit-protocol/constants';
import { SignEcdsa, SignEcdsaLitActionParameters } from "./tool"; // Import the SignEcdsa tool
import { ecdsaSignTemplate } from "../../../templates"; // Assuming you have a template for ECDSA signing
import { SignEcdsaPolicy } from './policy';
import { IPFS_CIDS } from './ipfs';
import LitJsSdk from '@lit-protocol/lit-node-client';
import {
  LitActionResource,
  createSiweMessage,
  generateAuthSig,
} from "@lit-protocol/auth-helpers";

/**
 * Builds the details required for an ECDSA signing Lit Action.
 * @param {State} state - The current state of the agent.
 * @param {IAgentRuntime} runtime - The runtime instance of the agent.
 * @returns {Promise<SignEcdsaLitActionParameters>} - The parameters for the ECDSA signing.
 */
const buildEcdsaSignDetails = async (
  state: State,
  runtime: IAgentRuntime
): Promise<SignEcdsaLitActionParameters> => {
  const context = composeContext({
    state,
    template: ecdsaSignTemplate, // Use the ECDSA signing template
  });

  const signDetails = (await generateObjectDeprecated({
    runtime,
    context,
    modelClass: ModelClass.SMALL,
  })) as SignEcdsaLitActionParameters;

  return signDetails;
};

/**
 * Action for executing an ECDSA signing using the Lit Protocol.
 */
export const ECDSA_SIGN_LIT_ACTION: Action = {
  name: "ecdsa-sign",
  similes: ["ECDSA Sign", "Sign Message", "Execute ECDSA Sign"],
  description: "This interacts with Lit Protocol to sign a message using the SignEcdsa tool.",
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const privateKey = runtime.getSetting("EVM_PRIVATE_KEY");
    return typeof privateKey === "string" && privateKey.startsWith("0x");
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options?: any,
    callback?: HandlerCallback
  ) => {
    try {
      const signDetails = await buildEcdsaSignDetails(state, runtime);

      // Get the appropriate tool for the network
      const tool = SignEcdsa[LIT_NETWORK.DatilDev]; // Assuming you're using the DatilDev network

      // Validate the parameters
      const validationResult = tool.parameters.validate(signDetails);
      if (validationResult !== true) {
        const errors = validationResult.map(err => `${err.param}: ${err.error}`).join(', ');
        throw new Error(`Invalid parameters: ${errors}`);
      }

      // Create and validate policy
      const policy = {
        type: "SignEcdsa" as const,
        version: SignEcdsaPolicy.version,
        allowedMessages: [signDetails.message], // Allow only the specific message to be signed
      };

      // Validate policy against schema
      SignEcdsaPolicy.schema.parse(policy);

      // Encode policy for execution
      const encodedPolicy = SignEcdsaPolicy.encode(policy);

      // Get IPFS CID for the network
      const ipfsCid = IPFS_CIDS['datil-dev'].tool;

      // Initialize Lit client
      const litNodeClient = new LitJsSdk.LitNodeClient({
        alertWhenUnauthorized: false,
        litNetwork: LIT_NETWORK.DatilDev,
        debug: false,
      });
      await litNodeClient.connect();

      // Get wallet from private key
      const wallet = new ethers.Wallet(runtime.getSetting("EVM_PRIVATE_KEY"));

      // Get session signatures
      const sessionSigs = await litNodeClient.getSessionSigs({
        chain: "ethereum",
        expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes
        resourceAbilityRequests: [
          {
            resource: new LitActionResource("*"),
            ability: LIT_ABILITY.LitActionExecution,
          },
        ],
        authNeededCallback: async ({ uri, expiration, resourceAbilityRequests }) => {
          const toSign = await createSiweMessage({
            uri,
            expiration,
            resources: resourceAbilityRequests,
            walletAddress: wallet.address,
            nonce: await litNodeClient.getLatestBlockhash(),
            litNodeClient,
          });

          return await generateAuthSig({
            signer: wallet,
            toSign,
          });
        },
      });

      // Execute the Lit Action
      const response = await litNodeClient.executeJs({
        sessionSigs,
        ipfsId: ipfsCid,
        jsParams: {
          params: {
            ...signDetails,
            encodedPolicy,
          },
        },
      });

      console.log("ECDSA Sign Response:", response);

      if (callback) {
        callback({
          text: `Message signed successfully. Response: ${JSON.stringify(response)}`,
          content: {
            success: true,
            response: response,
          },
        });
      }

      return true;

    } catch (error) {
      console.error("Error in ECDSA Sign handler:", error);

      if (callback) {
        callback({
          text: `Error signing message: ${error.message}`,
          content: {
            error: error.message,
          },
        });
      }

      throw error;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "please sign the message 'Hello, world!' with PKP address 0xc8BB61FB32cbfDc0534136798099709d779086b4" },
      },
      {
        user: "{{user2}}",
        content: { text: "Executing ECDSA sign", action: "ECDSA_SIGN_LIT_ACTION" },
      },
    ],
  ],
};

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/ecdsaSign/tool.ts`:

```ts
import { z } from 'zod';
import {
  type AwTool,
  type SupportedLitNetwork,
  NETWORK_CONFIGS,
  NetworkConfig,
} from '@lit-protocol/aw-tool';

import { SignEcdsaPolicy, type SignEcdsaPolicyType } from './policy';
import { IPFS_CIDS } from './ipfs';

/**
 * Parameters required for the Signing ECDSA Lit Action.
 * @property {string} pkpEthAddress - The Ethereum address of the PKP.
 * @property message - The message to sign.
 */
export interface SignEcdsaLitActionParameters {
  pkpEthAddress: string;
  message: string;
}

/**
 * Zod schema for validating `SignEcdsaLitActionParameters`.
 * Ensures that the message is a valid string.
 */
const SignEcdsaLitActionSchema = z.object({
  pkpEthAddress: z
    .string()
    .regex(
      /^0x[a-fA-F0-9]{40}$/,
      'Must be a valid Ethereum address (0x followed by 40 hexadecimal characters)'
    ),
  message: z.string(),
});

/**
 * Descriptions of each parameter for the Signing ECDSA Lit Action.
 * These descriptions are designed to be consumed by LLMs (Language Learning Models) to understand the required parameters.
 */
const SignEcdsaLitActionParameterDescriptions = {
  pkpEthAddress:
    'The Ethereum address of the PKP that will be used to sign the message.',
  message: 'The message you want to sign.',
} as const;

/**
 * Validates the parameters for the Signing ECDSA Lit Action.
 * @param params - The parameters to validate.
 * @returns `true` if the parameters are valid, or an array of errors if invalid.
 */
const validateSignEcdsaParameters = (
  params: unknown
): true | Array<{ param: string; error: string }> => {
  const result = SignEcdsaLitActionSchema.safeParse(params);
  if (result.success) {
    return true;
  }

  // Map validation errors to a more user-friendly format
  return result.error.issues.map((issue) => ({
    param: issue.path[0] as string,
    error: issue.message,
  }));
};

/**
 * Creates a network-specific SignEcdsa tool.
 * @param network - The supported Lit network (e.g., `datil-dev`, `datil-test`, `datil`).
 * @param config - The network configuration.
 * @returns A configured `AwTool` instance for the Signing ECDSA Lit Action.
 */
const createNetworkTool = (
  network: SupportedLitNetwork,
  config: NetworkConfig
): AwTool<SignEcdsaLitActionParameters, SignEcdsaPolicyType> => ({
  name: 'SignEcdsa',
  description: `A Lit Action that signs a message with an allowlist of message prefixes.`,
  ipfsCid: IPFS_CIDS[network].tool,
  defaultPolicyIpfsCid: IPFS_CIDS[network].defaultPolicy,
  parameters: {
    type: {} as SignEcdsaLitActionParameters,
    schema: SignEcdsaLitActionSchema,
    descriptions: SignEcdsaLitActionParameterDescriptions,
    validate: validateSignEcdsaParameters,
  },
  policy: SignEcdsaPolicy,
});

/**
 * Exports network-specific SignEcdsa tools.
 * Each tool is configured for a specific Lit network (e.g., `datil-dev`, `datil-test`, `datil`).
 */
export const SignEcdsa = Object.entries(NETWORK_CONFIGS).reduce(
  (acc, [network, config]) => ({
    ...acc,
    [network]: createNetworkTool(network as SupportedLitNetwork, config),
  }),
  {} as Record<
    SupportedLitNetwork,
    AwTool<SignEcdsaLitActionParameters, SignEcdsaPolicyType>
  >
);

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/ecdsaSign/ipfs.ts`:

```ts
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

// Define __dirname using import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Default development CIDs for different environments.
 * @type {Object.<string, NetworkCids>}
 * @property {NetworkCids} datil-dev - CIDs for the development environment.
 * @property {NetworkCids} datil-test - CIDs for the test environment.
 * @property {NetworkCids} datil - CIDs for the production environment.
 */
const DEFAULT_CIDS = {
  'datil-dev': {
    tool: 'QmZJovPgBBBmuLKRtdVwdV47opNSmLiV2AZCNTtWzeog1Q',
    defaultPolicy: 'QmPaViiSPUVViC2VkTn3PiRWpkqxnh44BxNY8TcHsuTpJi',
  },
  'datil-test': {
    tool: 'QmZbVUwomfUfCa38ia69LrSfH1k8JNK3BHeSUKm5tGMWgv',
    defaultPolicy: 'QmPaViiSPUVViC2VkTn3PiRWpkqxnh44BxNY8TcHsuTpJi',
  },
  datil: {
    tool: 'QmPjxnXWSPYGYR2gZyiZHpRE7dMAeb7K181R4Cfvkw5KM8',
    defaultPolicy: 'QmPaViiSPUVViC2VkTn3PiRWpkqxnh44BxNY8TcHsuTpJi',
  },
} as const;

/**
 * Tries to read the IPFS CIDs from the build output.
 * Falls back to default development CIDs if the file is not found or cannot be read.
 * @type {Record<keyof typeof DEFAULT_CIDS, NetworkCids>}
 */
let deployedCids = DEFAULT_CIDS;

const ipfsPath = join(__dirname, '../../../dist/ipfs.json');
if (existsSync(ipfsPath)) {
  try {
    // Use dynamic import to load the JSON file
    const ipfsModule = await import(ipfsPath, {
      assert: { type: 'json' }
    });
    deployedCids = ipfsModule.default;
  } catch (error) {
    console.warn('Failed to load ipfs.json, using default CIDs:', error);
  }
} else {
  console.warn(
    'ipfs.json not found. Using default CIDs. You should run `npx nx deploy:lit-action` to update the ipfs.json files.'
  );
}

/**
 * IPFS CIDs for each network's Lit Action.
 * @type {Record<keyof typeof DEFAULT_CIDS, NetworkCids>}
 */
export const IPFS_CIDS = deployedCids;

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/ecdsaSign/policy.ts`:

```ts
import { z } from 'zod';
import { ethers } from 'ethers';

/**
 * Schema for validating a SignEcdsa policy.
 * Ensures the policy has the correct structure and valid values.
 */
const policySchema = z.object({
  /** The type of policy, must be `SignEcdsa`. */
  type: z.literal('SignEcdsa'),

  /** The version of the policy. */
  version: z.string(),

  /** An array of allowed message prefixes. */
  allowedPrefixes: z.array(z.string()),
});

/**
 * Encodes a SignEcdsa policy into a format suitable for on-chain storage.
 * @param policy - The SignEcdsa policy to encode.
 * @returns The encoded policy as a hex string.
 * @throws If the policy does not conform to the schema.
 */
function encodePolicy(policy: SignEcdsaPolicyType): string {
  // Validate the policy against the schema
  policySchema.parse(policy);

  // Encode the policy using ABI encoding
  return ethers.utils.defaultAbiCoder.encode(
    ['tuple(string[] allowedPrefixes)'],
    [
      {
        allowedPrefixes: policy.allowedPrefixes,
      },
    ]
  );
}

/**
 * Decodes a SignEcdsa policy from its on-chain encoded format.
 * @param encodedPolicy - The encoded policy as a hex string.
 * @returns The decoded SignEcdsa policy.
 * @throws If the encoded policy is invalid or does not conform to the schema.
 */
function decodePolicy(encodedPolicy: string): SignEcdsaPolicyType {
  // Decode the policy using ABI decoding
  const decoded = ethers.utils.defaultAbiCoder.decode(
    ['tuple(string[] allowedPrefixes)'],
    encodedPolicy
  )[0];

  // Construct the policy object
  const policy: SignEcdsaPolicyType = {
    type: 'SignEcdsa',
    version: '1.0.0',
    allowedPrefixes: decoded.allowedPrefixes,
  };

  // Validate the decoded policy against the schema
  return policySchema.parse(policy);
}

/**
 * Represents the type of a SignEcdsa policy, inferred from the schema.
 */
export type SignEcdsaPolicyType = z.infer<typeof policySchema>;

/**
 * Utility object for working with SignEcdsa policies.
 * Includes the schema, encoding, and decoding functions.
 */
export const SignEcdsaPolicy = {
  /** The type of the policy. */
  type: {} as SignEcdsaPolicyType,

  /** The version of the policy. */
  version: '1.0.0',

  /** The schema for validating SignEcdsa policies. */
  schema: policySchema,

  /** Encodes a SignEcdsa policy into a format suitable for on-chain storage. */
  encode: encodePolicy,

  /** Decodes a SignEcdsa policy from its on-chain encoded format. */
  decode: decodePolicy,
};

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/erc20transfer/lit-actions/utils/get-erc20-info.ts`:

```ts
/**
 * Retrieves token information (decimals, balance, and parsed amount).
 * @param {any} provider - The Ethereum provider.
 * @returns {Promise<{ decimals: BigNumber, balance: BigNumber, amount: BigNumber }>} Token information.
 */
export async function getTokenInfo(
  provider: any,
  tokenIn: string,
  pkpEthAddress: string
) {
  console.log('Getting token info for:', tokenIn);

  // Validate token address
  try {
    console.log('Validating token address...');
    ethers.utils.getAddress(params.tokenIn);
  } catch (error) {
    throw new Error(`Invalid token address: ${params.tokenIn}`);
  }

  // Check if contract exists
  console.log('Checking if contract exists...');
  const code = await provider.getCode(tokenIn);
  if (code === '0x') {
    throw new Error(`No contract found at address: ${tokenIn}`);
  }

  const tokenInterface = new ethers.utils.Interface([
    'function decimals() view returns (uint8)',
    'function balanceOf(address account) view returns (uint256)',
    'function transfer(address to, uint256 amount) external returns (bool)',
  ]);

  console.log('Creating token contract instance...');
  const tokenContract = new ethers.Contract(
    params.tokenIn,
    tokenInterface,
    provider
  );

  console.log('Fetching token decimals and balance...');
  try {
    const decimals = await tokenContract.decimals();
    console.log('Token decimals:', decimals);

    const amount = ethers.utils.parseUnits(params.amountIn, decimals);
    console.log('Amount to send:', amount.toString());

    const pkpBalance = await tokenContract.balanceOf(pkpEthAddress);
    console.log('PKP balance:', pkpBalance.toString());

    if (amount.gt(pkpBalance)) {
      throw new Error(
        `Insufficient balance. PKP balance: ${ethers.utils.formatUnits(
          pkpBalance,
          decimals
        )}. Required: ${ethers.utils.formatUnits(amount, decimals)}`
      );
    }

    return { decimals, pkpBalance, amount };
  } catch (error) {
    console.error('Error getting token info:', error);
    throw new Error(
      `Failed to interact with token contract at ${params.tokenIn}. Make sure this is a valid ERC20 token contract.`
    );
  }
}

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/erc20transfer/lit-actions/utils/estimate-gas-limit.ts`:

```ts
/**
 * Estimates the gas limit for the transaction.
 * @param {any} provider - The Ethereum provider.
 * @param {any} amount - The amount to transfer.
 * @returns {Promise<any>} Estimated gas limit.
 */
export const estimateGasLimit = async (
  provider: any,
  amount: any,
  pkpEthAddress: string
) => {
  console.log(`Estimating gas limit...`);

  const tokenInterface = new ethers.utils.Interface([
    'function transfer(address to, uint256 amount) external returns (bool)',
  ]);

  const tokenContract = new ethers.Contract(
    params.tokenIn,
    tokenInterface,
    provider
  );

  try {
    const estimatedGas = await tokenContract.estimateGas.transfer(
      params.recipientAddress,
      amount,
      { from: pkpEthAddress }
    );
    console.log('Estimated gas limit:', estimatedGas.toString());
    return estimatedGas.mul(120).div(100);
  } catch (error) {
    console.error(
      'Could not estimate gas. Using fallback gas limit of 100000.',
      error
    );
    return ethers.BigNumber.from('100000');
  }
};

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/erc20transfer/lit-actions/utils/get-gas-data.ts`:

```ts
/**
 * Retrieves gas data (maxFeePerGas, maxPriorityFeePerGas, and nonce).
 * @returns {Promise<{ maxFeePerGas: string, maxPriorityFeePerGas: string, nonce: number }>} Gas data.
 */
export const getGasData = async (provider: any, pkpEthAddress: string) => {
  console.log(`Getting gas data...`);

  const gasData = await Lit.Actions.runOnce(
    { waitForResponse: true, name: 'gasPriceGetter' },
    async () => {
      const baseFeeHistory = await provider.send('eth_feeHistory', [
        '0x1',
        'latest',
        [],
      ]);
      const baseFee = ethers.BigNumber.from(baseFeeHistory.baseFeePerGas[0]);
      const nonce = await provider.getTransactionCount(pkpEthAddress);

      const priorityFee = baseFee.div(4);
      const maxFee = baseFee.mul(2);

      return JSON.stringify({
        maxFeePerGas: maxFee.toHexString(),
        maxPriorityFeePerGas: priorityFee.toHexString(),
        nonce,
      });
    }
  );

  console.log(`Gas data: ${gasData}`);
  return JSON.parse(gasData);
};

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/erc20transfer/lit-actions/utils/broadcast-tx.ts`:

```ts
/**
 * Broadcasts the signed transaction to the network.
 * @param {string} signedTx - The signed transaction.
 * @returns {Promise<string>} The transaction hash.
 */
export const broadcastTransaction = async (provider: any, signedTx: string) => {
  console.log('Broadcasting transfer...');
  return await Lit.Actions.runOnce(
    { waitForResponse: true, name: 'txnSender' },
    async () => {
      try {
        const tx = await provider.sendTransaction(signedTx);
        console.log('Transaction sent:', tx.hash);

        const receipt = await tx.wait(1);
        console.log('Transaction mined:', receipt.transactionHash);

        return receipt.transactionHash;
      } catch (err: any) {
        // Log the full error object for debugging
        console.error('Full error object:', JSON.stringify(err, null, 2));

        // Extract detailed error information
        const errorDetails = {
          message: err.message,
          code: err.code,
          reason: err.reason,
          error: err.error,
          ...(err.transaction && { transaction: err.transaction }),
          ...(err.receipt && { receipt: err.receipt }),
        };

        console.error('Error details:', JSON.stringify(errorDetails, null, 2));

        // Return stringified error response
        return JSON.stringify({
          error: true,
          message: err.reason || err.message || 'Transaction failed',
          details: errorDetails,
        });
      }
    }
  );
};

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/erc20transfer/lit-actions/utils/create-and-sign-tx.ts`:

```ts
/**
 * Creates and signs the transaction.
 * @param {any} gasLimit - The gas limit for the transaction.
 * @param {any} amount - The amount to transfer.
 * @param {any} gasData - Gas data (maxFeePerGas, maxPriorityFeePerGas, nonce).
 * @returns {Promise<string>} The signed transaction.
 */
export const createAndSignTransaction = async (
  tokenIn: string,
  recipientAddress: string,
  amount: any,
  gasLimit: any,
  gasData: any,
  chainId: string,
  pkpPublicKey: string
) => {
  console.log(`Creating and signing transaction...`);

  const tokenInterface = new ethers.utils.Interface([
    'function transfer(address to, uint256 amount) external returns (bool)',
  ]);

  const transferTx = {
    to: tokenIn,
    data: tokenInterface.encodeFunctionData('transfer', [
      recipientAddress,
      amount,
    ]),
    value: '0x0',
    gasLimit: gasLimit.toHexString(),
    maxFeePerGas: gasData.maxFeePerGas,
    maxPriorityFeePerGas: gasData.maxPriorityFeePerGas,
    nonce: gasData.nonce,
    chainId: chainId,
    type: 2,
  };

  console.log(`Signing transfer with PKP public key: ${pkpPublicKey}...`);
  const transferSig = await Lit.Actions.signAndCombineEcdsa({
    toSign: ethers.utils.arrayify(
      ethers.utils.keccak256(ethers.utils.serializeTransaction(transferTx))
    ),
    publicKey: pkpPublicKey.startsWith('0x')
      ? pkpPublicKey.slice(2)
      : pkpPublicKey,
    sigName: 'erc20TransferSig',
  });

  console.log(`Transaction signed`);

  return ethers.utils.serializeTransaction(
    transferTx,
    ethers.utils.joinSignature({
      r: '0x' + JSON.parse(transferSig).r.substring(2),
      s: '0x' + JSON.parse(transferSig).s,
      v: JSON.parse(transferSig).v,
    })
  );
};

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/erc20transfer/lit-actions/tool.ts`:

```ts
import {
  fetchToolPolicyFromRegistry,
  getPkpInfo,
  getPkpToolRegistryContract,
  NETWORK_CONFIG,
} from '@lit-protocol/aw-tool';

import { getTokenInfo } from './utils/get-erc20-info';
import { getGasData } from './utils/get-gas-data';
import { estimateGasLimit } from './utils/estimate-gas-limit';
import { createAndSignTransaction } from './utils/create-and-sign-tx';
import { broadcastTransaction } from './utils/broadcast-tx';

declare global {
  // Required Inputs
  const params: {
    pkpEthAddress: string;
    rpcUrl: string;
    chainId: string;
    tokenIn: string;
    recipientAddress: string;
    amountIn: string;
  };
}

(async () => {
  try {
    console.log(`Using Lit Network: ${LIT_NETWORK}`);
    console.log(
      `Using PKP Tool Registry Address: ${PKP_TOOL_REGISTRY_ADDRESS}`
    );
    console.log(
      `Using Pubkey Router Address: ${
        NETWORK_CONFIG[LIT_NETWORK as keyof typeof NETWORK_CONFIG]
          .pubkeyRouterAddress
      }`
    );

    const delegateeAddress = ethers.utils.getAddress(LitAuth.authSigAddress);
    const toolIpfsCid = LitAuth.actionIpfsIds[0];
    const provider = new ethers.providers.JsonRpcProvider(params.rpcUrl);
    const pkpToolRegistryContract = await getPkpToolRegistryContract(
      PKP_TOOL_REGISTRY_ADDRESS
    );
    const pkp = await getPkpInfo(params.pkpEthAddress);
    const tokenInfo = await getTokenInfo(
      provider,
      params.tokenIn,
      pkp.ethAddress
    );

    console.log(`Token info: ${JSON.stringify(tokenInfo)}`);

    const toolPolicy = await fetchToolPolicyFromRegistry(
      pkpToolRegistryContract,
      pkp.tokenId,
      delegateeAddress,
      toolIpfsCid
    );
    if (
      toolPolicy.enabled &&
      toolPolicy.policyIpfsCid !== undefined &&
      toolPolicy.policyIpfsCid !== '0x' &&
      toolPolicy.policyIpfsCid !== ''
    ) {
      console.log(`Executing policy ${toolPolicy.policyIpfsCid}`);

      const policyParams = {
        parentToolIpfsCid: toolIpfsCid,
        pkpToolRegistryContractAddress: PKP_TOOL_REGISTRY_ADDRESS,
        pkpTokenId: pkp.tokenId,
        delegateeAddress,
        tokenInfo: {
          amount: tokenInfo.amount.toString(),
          tokenAddress: params.tokenIn,
          recipientAddress: params.recipientAddress,
        },
      };

      console.log(
        `Calling policy Lit Action with params: ${JSON.stringify(policyParams)}`
      );

      await Lit.Actions.call({
        ipfsId: toolPolicy.policyIpfsCid,
        params: policyParams,
      });
    } else {
      console.log(
        `No policy found for tool ${toolIpfsCid} on PKP ${pkp.tokenId} for delegatee ${delegateeAddress}`
      );
    }

    const gasData = await getGasData(provider, pkp.ethAddress);
    const gasLimit = await estimateGasLimit(
      provider,
      tokenInfo.amount,
      pkp.ethAddress
    );
    const signedTx = await createAndSignTransaction(
      params.tokenIn,
      params.recipientAddress,
      tokenInfo.amount,
      gasLimit,
      gasData,
      params.chainId,
      pkp.publicKey
    );

    const result = await broadcastTransaction(provider, signedTx);
    // Try to parse the result
    let parsedResult;
    try {
      parsedResult = JSON.parse(result);
    } catch {
      // If it's not JSON, assume it's a transaction hash
      parsedResult = result;
    }

    // Check if result is an error object
    if (typeof parsedResult === 'object' && parsedResult.error) {
      throw new Error(parsedResult.message);
    }

    // At this point, result should be a transaction hash
    if (!parsedResult) {
      throw new Error('Transaction failed: No transaction hash returned');
    }

    if (!ethers.utils.isHexString(parsedResult)) {
      throw new Error(
        `Transaction failed: Invalid transaction hash format. Received: ${JSON.stringify(
          parsedResult
        )}`
      );
    }

    Lit.Actions.setResponse({
      response: JSON.stringify({
        status: 'success',
        transferHash: parsedResult,
      }),
    });
  } catch (err: any) {
    console.error('Error:', err);

    // Extract detailed error information
    const errorDetails = {
      message: err.message,
      code: err.code,
      reason: err.reason,
      error: err.error,
      ...(err.transaction && { transaction: err.transaction }),
      ...(err.receipt && { receipt: err.receipt }),
    };

    // Construct a detailed error message
    const errorMessage = err.message || String(err);

    Lit.Actions.setResponse({
      response: JSON.stringify({
        status: 'error',
        error: errorMessage,
        details: errorDetails,
      }),
    });
  }
})();

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/erc20transfer/lit-actions/policy.ts`:

```ts
import {
  checkLitAuthAddressIsDelegatee,
  getPolicyParameters,
  getPkpToolRegistryContract,
} from '@lit-protocol/aw-tool';

declare global {
  // Required Inputs
  const parentToolIpfsCid: string;
  const pkpToolRegistryContractAddress: string;
  const pkpTokenId: string;
  const delegateeAddress: string;
  const tokenInfo: {
    amount: string;
    tokenAddress: string;
    recipientAddress: string;
  };
}

(async () => {
  const pkpToolRegistryContract = await getPkpToolRegistryContract(
    pkpToolRegistryContractAddress
  );

  const isDelegatee = await checkLitAuthAddressIsDelegatee(
    pkpToolRegistryContract,
    pkpTokenId
  );
  if (!isDelegatee) {
    throw new Error(
      `Session signer ${ethers.utils.getAddress(
        LitAuth.authSigAddress
      )} is not a delegatee for PKP ${pkpTokenId}`
    );
  }

  const policyParameters = await getPolicyParameters(
    pkpToolRegistryContract,
    pkpTokenId,
    parentToolIpfsCid,
    delegateeAddress,
    ['maxAmount', 'allowedTokens', 'allowedRecipients']
  );

  let maxAmount: any;
  let allowedTokens: string[] = [];
  let allowedRecipients: string[] = [];

  console.log(
    `Retrieved policy parameters: ${JSON.stringify(policyParameters)}`
  );

  for (const parameter of policyParameters) {
    const value = ethers.utils.toUtf8String(parameter.value);

    switch (parameter.name) {
      case 'maxAmount':
        maxAmount = ethers.BigNumber.from(value);
        console.log(`Formatted maxAmount: ${maxAmount.toString()}`);
        break;
      case 'allowedTokens':
        allowedTokens = JSON.parse(value);
        allowedTokens = allowedTokens.map((addr: string) =>
          ethers.utils.getAddress(addr)
        );
        console.log(`Formatted allowedTokens: ${allowedTokens.join(', ')}`);
        break;
      case 'allowedRecipients':
        allowedRecipients = JSON.parse(value);
        allowedRecipients = allowedRecipients.map((addr: string) =>
          ethers.utils.getAddress(addr)
        );
        console.log(
          `Formatted allowedRecipients: ${allowedRecipients.join(', ')}`
        );
        break;
    }
  }

  // Convert string amount to BigNumber and compare
  const amountBN = ethers.BigNumber.from(tokenInfo.amount);
  console.log(
    `Checking if amount ${amountBN.toString()} exceeds maxAmount ${maxAmount.toString()}...`
  );

  if (amountBN.gt(maxAmount)) {
    throw new Error(
      `Amount ${ethers.utils.formatUnits(
        amountBN
      )} exceeds the maximum amount ${ethers.utils.formatUnits(maxAmount)}`
    );
  }

  if (allowedTokens.length > 0) {
    console.log(`Checking if ${tokenInfo.tokenAddress} is an allowed token...`);

    if (
      !allowedTokens.includes(ethers.utils.getAddress(tokenInfo.tokenAddress))
    ) {
      throw new Error(
        `Token ${
          tokenInfo.tokenAddress
        } not allowed. Allowed tokens: ${allowedTokens.join(', ')}`
      );
    }
  }

  if (allowedRecipients.length > 0) {
    console.log(
      `Checking if ${tokenInfo.recipientAddress} is an allowed recipient...`
    );

    if (
      !allowedRecipients.includes(
        ethers.utils.getAddress(tokenInfo.recipientAddress)
      )
    ) {
      throw new Error(
        `Recipient ${
          tokenInfo.recipientAddress
        } not allowed. Allowed recipients: ${allowedRecipients.join(', ')}`
      );
    }
  }

  console.log('Policy parameters validated');
})();

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/erc20transfer/toolCall.ts`:

```ts
import { ethers } from 'ethers';
import {
    Action,
    composeContext,
    generateObjectDeprecated,
    HandlerCallback,
    ModelClass,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";
import { LIT_NETWORK, LIT_ABILITY } from '@lit-protocol/constants';
import { ERC20Transfer } from "./tool";
import { litWalletTransferTemplate } from "../../../templates";
import { ERC20TransferPolicy } from './policy';
import { IPFS_CIDS } from './ipfs';
import LitJsSdk from '@lit-protocol/lit-node-client';
import {
    LitActionResource,
    createSiweMessage,
    generateAuthSig,
} from "@lit-protocol/auth-helpers";

const buildLitWalletTransferDetails = async (
    state: State,
    runtime: IAgentRuntime
): Promise<{
    pkpEthAddress: string;
    rpcUrl: string;
    chainId: string;
    tokenIn: string;
    recipientAddress: string;
    amountIn: string;
}> => {
    const context = composeContext({
        state,
        template: litWalletTransferTemplate,
    });

    const transferDetails = (await generateObjectDeprecated({
        runtime,
        context,
        modelClass: ModelClass.SMALL,
    })) as {
        pkpEthAddress: string;
        rpcUrl: string;
        chainId: number;
        tokenIn: string;
        recipientAddress: string;
        amountIn: string;
    };

    return {
        ...transferDetails,
        chainId: transferDetails.chainId.toString()
    };
};

export const WALLET_TRANSFER_LIT_ACTION: Action = {
    name: "lit-wallet-transfer",
    similes: ["Lit Wallet Transfer", "Lit Protocol Transfer", "Transfer tokens"],
    description: "This interacts with Lit Protocol to execute a wallet transfer using the ERC20Transfer tool",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const privateKey = runtime.getSetting("EVM_PRIVATE_KEY");
        return typeof privateKey === "string" && privateKey.startsWith("0x");
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options?: any,
        callback?: HandlerCallback
    ) => {
        try {
            const transferDetails = await buildLitWalletTransferDetails(state, runtime);
            
            // Get the appropriate tool for the network
            const tool = ERC20Transfer[LIT_NETWORK.DatilDev];
            
            // Validate the parameters
            const validationResult = tool.parameters.validate(transferDetails);
            if (validationResult !== true) {
                const errors = validationResult.map(err => `${err.param}: ${err.error}`).join(', ');
                throw new Error(`Invalid parameters: ${errors}`);
            }

            // Create and validate policy
            const policy = {
                type: "ERC20Transfer" as const,
                version: ERC20TransferPolicy.version,
                erc20Decimals: "18",
                maxAmount: transferDetails.amountIn,
                allowedTokens: [transferDetails.tokenIn],
                allowedRecipients: [transferDetails.recipientAddress]
            };

            // Validate policy against schema
            ERC20TransferPolicy.schema.parse(policy);

            // Encode policy for execution
            const encodedPolicy = ERC20TransferPolicy.encode(policy);

            // Get IPFS CID for the network
            const ipfsCid = IPFS_CIDS['datil-dev'].tool;

            // Initialize Lit client
            const litNodeClient = new LitJsSdk.LitNodeClient({
                alertWhenUnauthorized: false,
                litNetwork: LIT_NETWORK.DatilDev,
                debug: false,
            });
            await litNodeClient.connect();

            // Get wallet from private key
            const wallet = new ethers.Wallet(runtime.getSetting("EVM_PRIVATE_KEY"));

            // Get session signatures
            const sessionSigs = await litNodeClient.getSessionSigs({
                chain: "ethereum",
                expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes
                resourceAbilityRequests: [
                    {
                        resource: new LitActionResource("*"),
                        ability: LIT_ABILITY.LitActionExecution,
                    },
                ],
                authNeededCallback: async ({ uri, expiration, resourceAbilityRequests }) => {
                    const toSign = await createSiweMessage({
                        uri,
                        expiration,
                        resources: resourceAbilityRequests,
                        walletAddress: wallet.address,
                        nonce: await litNodeClient.getLatestBlockhash(),
                        litNodeClient,
                    });

                    return await generateAuthSig({
                        signer: wallet,
                        toSign,
                    });
                },
            });
            
            // Execute the Lit Action
            const response = await litNodeClient.executeJs({
                sessionSigs,
                ipfsId: ipfsCid,
                jsParams: {
                    params: {
                        ...transferDetails,
                        encodedPolicy
                    }
                },
            });

            console.log("ERC20Transfer Response:", response);

            if (callback) {
                callback({
                    text: `Token transfer executed successfully. Response: ${JSON.stringify(response)}`,
                    content: {
                        success: true,
                        response: response,
                    },
                });
            }

            return true;

        } catch (error) {
            console.error("Error in ERC20Transfer handler:", error);

            if (callback) {
                callback({
                    text: `Error executing token transfer: ${error.message}`,
                    content: {
                        error: error.message,
                    },
                });
            }

            throw error;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "please attempt a lit wallet transfer pkp addy: 0xc8BB61FB32cbfDc0534136798099709d779086b4 rpc: https://base-sepolia-rpc.publicnode.com chain ID 84532 token address 0x00cdfea7e11187BEB4a0CE835fea1745b124B26e sending 1 token to 0xDFdC570ec0586D5c00735a2277c21Dcc254B3917" },
            },
            {
                user: "{{user2}}",
                content: { text: "Executing ERC20 token transfer", action: "WALLET_TRANSFER_LIT_ACTION" },
            },
        ],
    ],
};

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/erc20transfer/tool.ts`:

```ts
import { z } from 'zod';
import {
  type AwTool,
  type SupportedLitNetwork,
  NETWORK_CONFIGS,
  NetworkConfig,
} from '@lit-protocol/aw-tool';

import { ERC20TransferPolicy, type ERC20TransferPolicyType } from './policy';
import { IPFS_CIDS } from './ipfs';

/**
 * Parameters required for the ERC20 Send Lit Action.
 * @property {string} pkpEthAddress - The Ethereum address of the PKP.
 * @property {string} tokenIn - The ERC20 token contract address to send.
 * @property {string} recipientAddress - The Ethereum address to receive the tokens.
 * @property {string} amountIn - The amount of tokens to send as a string (will be parsed based on token decimals).
 * @property {string} chainId - The ID of the blockchain network.
 * @property {string} rpcUrl - The RPC URL of the blockchain network.
 */
interface ERC20TransferLitActionParameters {
  pkpEthAddress: string;
  tokenIn: string;
  recipientAddress: string;
  amountIn: string;
  chainId: string;
  rpcUrl: string;
}

/**
 * Zod schema for validating ERC20TransferLitActionParameters.
 * @type {z.ZodObject}
 */
const ERC20TransferLitActionSchema = z.object({
  pkpEthAddress: z
    .string()
    .regex(
      /^0x[a-fA-F0-9]{40}$/,
      'Must be a valid Ethereum address (0x followed by 40 hexadecimal characters)'
    ),
  tokenIn: z
    .string()
    .regex(
      /^0x[a-fA-F0-9]{40}$/,
      'Must be a valid Ethereum contract address (0x followed by 40 hexadecimal characters)'
    ),
  recipientAddress: z
    .string()
    .regex(
      /^0x[a-fA-F0-9]{40}$/,
      'Must be a valid Ethereum address (0x followed by 40 hexadecimal characters)'
    ),
  amountIn: z
    .string()
    .regex(
      /^\d*\.?\d+$/,
      'Must be a valid decimal number as a string (e.g. "1.5" or "100")'
    ),
  chainId: z
    .string()
    .regex(/^\d+$/, 'Must be a valid chain ID number as a string'),
  rpcUrl: z
    .string()
    .url()
    .startsWith(
      'https://',
      'Must be a valid HTTPS URL for the blockchain RPC endpoint'
    ),
});

/**
 * Descriptions of each parameter for the ERC20 Send Lit Action.
 * These descriptions are designed to be consumed by LLMs to understand the required parameters.
 * @type {Record<string, string>}
 */
const ERC20TransferLitActionParameterDescriptions = {
  pkpEthAddress:
    'The Ethereum address of the PKP that will be used to sign and send the transaction.',
  tokenIn:
    'The Ethereum contract address of the ERC20 token you want to send. Must be a valid Ethereum address starting with 0x.',
  recipientAddress:
    'The Ethereum wallet address of the recipient who will receive the tokens. Must be a valid Ethereum address starting with 0x.',
  amountIn:
    'The amount of tokens to send, specified as a string. This should be a decimal number (e.g. "1.5" or "100"). The amount will be automatically adjusted based on the token\'s decimals.',
  chainId:
    'The ID of the blockchain network to send the tokens on (e.g. 1 for Ethereum mainnet, 84532 for Base Sepolia).',
  rpcUrl:
    'The RPC URL of the blockchain network to connect to (e.g. "https://base-sepolia-rpc.publicnode.com").',
} as const;

/**
 * Validates the provided parameters against the ERC20TransferLitActionSchema.
 * @param {unknown} params - The parameters to validate.
 * @returns {true | Array<{ param: string; error: string }>} - Returns `true` if valid, otherwise an array of errors.
 */
const validateERC20TransferParameters = (
  params: unknown
): true | Array<{ param: string; error: string }> => {
  const result = ERC20TransferLitActionSchema.safeParse(params);
  if (result.success) {
    return true;
  }

  return result.error.issues.map((issue) => ({
    param: issue.path[0] as string,
    error: issue.message,
  }));
};

/**
 * Creates a network-specific ERC20Transfer tool.
 * @param {SupportedLitNetwork} network - The Lit network to use.
 * @param {NetworkConfig} config - The configuration for the network.
 * @returns {AwTool<ERC20TransferLitActionParameters, ERC20TransferPolicyType>} - The configured AwTool instance.
 */
const createNetworkTool = (
  network: SupportedLitNetwork,
  config: NetworkConfig
): AwTool<ERC20TransferLitActionParameters, ERC20TransferPolicyType> => ({
  name: 'ERC20Transfer',
  description: `A Lit Action that sends ERC-20 tokens.`,
  ipfsCid: IPFS_CIDS[network].tool,
  defaultPolicyIpfsCid: IPFS_CIDS[network].defaultPolicy,
  parameters: {
    type: {} as ERC20TransferLitActionParameters,
    schema: ERC20TransferLitActionSchema,
    descriptions: ERC20TransferLitActionParameterDescriptions,
    validate: validateERC20TransferParameters,
  },
  policy: ERC20TransferPolicy,
});

/**
 * A collection of network-specific ERC20Transfer tools.
 * @type {Record<SupportedLitNetwork, AwTool<ERC20TransferLitActionParameters, ERC20TransferPolicyType>>}
 */
export const ERC20Transfer = Object.entries(NETWORK_CONFIGS).reduce(
  (acc, [network, config]) => ({
    ...acc,
    [network]: createNetworkTool(network as SupportedLitNetwork, config),
  }),
  {} as Record<
    SupportedLitNetwork,
    AwTool<ERC20TransferLitActionParameters, ERC20TransferPolicyType>
  >
);

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/erc20transfer/ipfs.ts`:

```ts
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Default IPFS CIDs for different environments.
 * These are the actual deployed CIDs from the Lit Action deployments.
 */
const DEFAULT_CIDS = {
  'datil-dev': {
    tool: 'QmUPnnuz8E3wKYG7bCxqnjjhV9anE9uMxHXY4fTv7Z5Y6A',
    defaultPolicy: 'QmVHC5cTWE1nzBSzEASULdwfHo1QiYMEr5Ht83anxe6uWB',
  },
  'datil-test': {
    tool: 'QmRcwjz5EpUaABPMwhgYwsDsy1noYNYkhr6nC8JqWUPEoy',
    defaultPolicy: 'QmVHC5cTWE1nzBSzEASULdwfHo1QiYMEr5Ht83anxe6uWB',
  },
  datil: {
    tool: 'QmQ1k3ZzmoPDukAphQ353WJ73XaNFnhmztr1v2hfTprW3V',
    defaultPolicy: 'QmVHC5cTWE1nzBSzEASULdwfHo1QiYMEr5Ht83anxe6uWB',
  },
} as const;

let deployedCids = DEFAULT_CIDS;

const ipfsPath = join(__dirname, '../../../dist/ipfs.json');

if (existsSync(ipfsPath)) {
  try {
    const ipfsModule = await import(ipfsPath, {
      assert: { type: 'json' }
    });
    deployedCids = ipfsModule.default;
  } catch (error) {
    console.warn('Failed to load ipfs.json, using default CIDs:', error);
  }
} else {
  console.warn(
    'ipfs.json not found. Using default deployed CIDs.'
  );
}

export const IPFS_CIDS = deployedCids;

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/erc20transfer/policy.ts`:

```ts
import { BaseEthereumAddressSchema } from '@lit-protocol/aw-tool';
import { z } from 'zod';
import { ethers } from 'ethers';

/**
 * Schema for validating an ERC20 transfer policy.
 * @type {z.ZodObject}
 */
const policySchema = z.object({
  type: z.literal('ERC20Transfer'), // Policy type must be 'ERC20Transfer'
  version: z.string(), // Version of the policy
  erc20Decimals: z.string().refine(
    (val) => {
      try {
        const bn = ethers.BigNumber.from(val);
        return !bn.isNegative() && bn.lte(255); // Ensure the amount is non-negative and does not exceed uint8
      } catch {
        return false; // Invalid format
      }
    },
    {
      message:
        'Invalid amount format. Must be a non-negative integer and not exceed 255.',
    }
  ), // Number of decimals for the ERC20 token
  maxAmount: z.string().refine(
    (val) => {
      try {
        const bn = ethers.BigNumber.from(val);
        return !bn.isNegative(); // Ensure the amount is non-negative
      } catch {
        return false; // Invalid format
      }
    },
    { message: 'Invalid amount format. Must be a non-negative integer.' }
  ),
  allowedTokens: z.array(BaseEthereumAddressSchema), // Array of allowed token addresses
  allowedRecipients: z.array(BaseEthereumAddressSchema), // Array of allowed recipient addresses
});

/**
 * Encodes an ERC20 transfer policy into a packed ABI-encoded string.
 * @param {ERC20TransferPolicyType} policy - The policy to encode.
 * @returns {string} ABI-encoded string representing the policy.
 * @throws {z.ZodError} If the policy does not match the schema.
 */
function encodePolicy(policy: ERC20TransferPolicyType): string {
  // Validate the policy against the schema
  policySchema.parse(policy);

  // Encode the policy using ABI encoding
  return ethers.utils.defaultAbiCoder.encode(
    [
      'tuple(uint8 erc20Decimals, uint256 maxAmount, address[] allowedTokens, address[] allowedRecipients)',
    ],
    [
      {
        erc20Decimals: policy.erc20Decimals,
        maxAmount: ethers.utils
          .parseUnits(policy.maxAmount, policy.erc20Decimals)
          .toString(),
        allowedTokens: policy.allowedTokens,
        allowedRecipients: policy.allowedRecipients,
      },
    ]
  );
}

/**
 * Decodes an ABI-encoded string into an ERC20 transfer policy.
 * @param {string} encodedPolicy - The ABI-encoded policy string.
 * @returns {ERC20TransferPolicyType} The decoded policy object.
 * @throws {z.ZodError} If the decoded policy does not match the schema.
 */
function decodePolicy(encodedPolicy: string): ERC20TransferPolicyType {
  // Decode the ABI-encoded string
  const decoded = ethers.utils.defaultAbiCoder.decode(
    [
      'tuple(uint8 erc20Decimals, uint256 maxAmount, address[] allowedTokens, address[] allowedRecipients)',
    ],
    encodedPolicy
  )[0];

  // Construct the policy object
  const policy: ERC20TransferPolicyType = {
    type: 'ERC20Transfer',
    version: '1.0.0',
    erc20Decimals: decoded.erc20Decimals.toString(),
    maxAmount: decoded.maxAmount.toString(),
    allowedTokens: decoded.allowedTokens,
    allowedRecipients: decoded.allowedRecipients,
  };

  // Validate the decoded policy against the schema
  return policySchema.parse(policy);
}

/**
 * Type representing an ERC20 transfer policy.
 * @typedef {z.infer<typeof policySchema>} ERC20TransferPolicyType
 */
export type ERC20TransferPolicyType = z.infer<typeof policySchema>;

/**
 * Utility object for working with ERC20 transfer policies.
 * @type {object}
 * @property {ERC20TransferPolicyType} type - Type placeholder for the policy.
 * @property {string} version - Version of the policy schema.
 * @property {z.ZodObject} schema - Zod schema for validating policies.
 * @property {function} encode - Function to encode a policy into an ABI-encoded string.
 * @property {function} decode - Function to decode an ABI-encoded string into a policy.
 */
export const ERC20TransferPolicy = {
  type: {} as ERC20TransferPolicyType, // Placeholder for the policy type
  version: '1.0.0', // Version of the policy schema
  schema: policySchema, // Zod schema for validation
  encode: encodePolicy, // Function to encode a policy
  decode: decodePolicy, // Function to decode a policy
};

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/uniswapSwap/lit-actions/utils/get-token-info.ts`:

```ts
/**
 * Retrieves token information (decimals, balance, and parsed amount).
 * @param {JsonRpcProvider} provider - The Ethereum provider.
 * @returns {Promise<{ tokenIn: { decimals: number, balance: any, amount: any, contract: any }, tokenOut: { decimals: number, balance: any, contract: any } }>} Token information.
 */
export async function getTokenInfo(
  provider: any,
  tokenIn: string,
  amountIn: any,
  tokenOut: string,
  pkp: any
) {
  console.log('Gathering token info...');
  ethers.utils.getAddress(tokenIn);
  ethers.utils.getAddress(tokenOut);

  // Check code
  const codeIn = await provider.getCode(params.tokenIn);
  if (codeIn === '0x') {
    throw new Error(`No contract found at ${params.tokenIn}`);
  }
  const codeOut = await provider.getCode(params.tokenOut);
  if (codeOut === '0x') {
    throw new Error(`No contract found at ${params.tokenOut}`);
  }

  const tokenInterface = new ethers.utils.Interface([
    'function decimals() view returns (uint8)',
    'function balanceOf(address) view returns (uint256)',
    'function approve(address,uint256) external returns (bool)',
  ]);
  const tokenInContract = new ethers.Contract(
    params.tokenIn,
    tokenInterface,
    provider
  );
  const tokenOutContract = new ethers.Contract(
    params.tokenOut,
    tokenInterface,
    provider
  );

  // Parallel calls
  const [decimalsIn, decimalsOut] = await Promise.all([
    tokenInContract.decimals(),
    tokenOutContract.decimals(),
  ]);
  console.log('Token decimals:', decimalsIn, decimalsOut);

  const [balanceIn, balanceOut] = await Promise.all([
    tokenInContract.balanceOf(pkp.ethAddress),
    tokenOutContract.balanceOf(pkp.ethAddress),
  ]);
  console.log(
    'Token balances (in/out):',
    balanceIn.toString(),
    balanceOut.toString()
  );

  const _amountIn = ethers.utils.parseUnits(amountIn, decimalsIn);
  if (_amountIn.gt(balanceIn)) {
    throw new Error('Insufficient tokenIn balance');
  }
  return {
    tokenIn: {
      decimals: decimalsIn,
      balance: balanceIn,
      amount: _amountIn,
      contract: tokenInContract,
    },
    tokenOut: {
      decimals: decimalsOut,
      balance: balanceOut,
      contract: tokenOutContract,
    },
  };
}

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/uniswapSwap/lit-actions/utils/create-tx.ts`:

```ts
/**
 * Creates a transaction for approval or swap.
 * @param {any} gasLimit - The gas limit for the transaction.
 * @param {any} amount - The amount of tokens to swap.
 * @param {any} gasData - Gas data (maxFeePerGas, maxPriorityFeePerGas, nonce).
 * @param {boolean} isApproval - Whether the transaction is an approval or a swap.
 * @param {Object} [swapParams] - Swap parameters (fee and amountOutMin).
 * @returns {any} The transaction object.
 */
export const createTransaction = async (
  uniswapV3Router: any,
  pkpEthAddress: string,
  gasLimit: any,
  amount: any,
  gasData: any,
  isApproval: boolean,
  swapParams?: {
    fee: number;
    amountOutMin: any;
  }
) => {
  console.log(`Creating transaction...`);

  let txData;
  if (isApproval) {
    const tokenInterface = new ethers.utils.Interface([
      'function approve(address spender, uint256 amount) external returns (bool)',
    ]);
    txData = tokenInterface.encodeFunctionData('approve', [
      uniswapV3Router,
      amount,
    ]);
  } else if (swapParams) {
    const routerInterface = new ethers.utils.Interface([
      'function exactInputSingle((address,address,uint24,address,uint256,uint256,uint160)) external payable returns (uint256)',
    ]);
    txData = routerInterface.encodeFunctionData('exactInputSingle', [
      [
        params.tokenIn,
        params.tokenOut,
        swapParams.fee,
        pkpEthAddress,
        amount,
        swapParams.amountOutMin,
        0,
      ],
    ]);
  } else {
    throw new Error('Missing swap parameters for transaction creation');
  }

  return {
    to: isApproval ? params.tokenIn : uniswapV3Router,
    data: txData,
    value: '0x0',
    gasLimit: gasLimit.toHexString(),
    maxFeePerGas: gasData.maxFeePerGas,
    maxPriorityFeePerGas: gasData.maxPriorityFeePerGas,
    nonce: gasData.nonce,
    chainId: params.chainId,
    type: 2,
  };
};

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/uniswapSwap/lit-actions/utils/estimate-gas-limit.ts`:

```ts
/**
 * Estimates the gas limit for a transaction.
 * @param {JsonRpcProvider} provider - The Ethereum provider.
 * @param {any} tokenInContract - The token contract instance.
 * @param {any} amount - The amount of tokens to swap.
 * @param {boolean} isApproval - Whether the transaction is an approval or a swap.
 * @param {Object} [swapParams] - Swap parameters (fee and amountOutMin).
 * @returns {Promise<any>} The estimated gas limit.
 */
export const estimateGasLimit = async (
  provider: any,
  pkpEthAddress: string,
  uniswapV3Router: any,
  tokenInContract: any,
  amount: any,
  isApproval: boolean,
  swapParams?: {
    fee: number;
    amountOutMin: any;
  }
) => {
  console.log(`Estimating gas limit...`);

  try {
    let estimatedGas;
    if (isApproval) {
      estimatedGas = await tokenInContract.estimateGas.approve(
        uniswapV3Router,
        amount,
        { from: pkpEthAddress }
      );
    } else if (swapParams) {
      const routerInterface = new ethers.utils.Interface([
        'function exactInputSingle((address,address,uint24,address,uint256,uint256,uint160)) external payable returns (uint256)',
      ]);

      const routerContract = new ethers.Contract(
        uniswapV3Router,
        routerInterface,
        provider
      );

      estimatedGas = await routerContract.estimateGas.exactInputSingle(
        [
          params.tokenIn,
          params.tokenOut,
          swapParams.fee,
          pkpEthAddress,
          amount,
          swapParams.amountOutMin,
          0,
        ],
        { from: pkpEthAddress }
      );
    } else {
      throw new Error('Missing swap parameters for gas estimation');
    }

    // Add 20% buffer
    const gasLimit = estimatedGas.mul(120).div(100);
    console.log(`Estimated gas limit: ${gasLimit.toString()}`);
    return gasLimit;
  } catch (error) {
    console.error('Error estimating gas:', error);
    // Use fallback gas limits
    const fallbackGas = isApproval ? '300000' : '500000';
    console.log(`Using fallback gas limit: ${fallbackGas}`);
    return ethers.BigNumber.from(fallbackGas);
  }
};

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/uniswapSwap/lit-actions/utils/sign-tx.ts`:

```ts
/**
 * Signs a transaction using the PKP's public key.
 * @param {any} tx - The transaction to sign.
 * @param {string} sigName - The name of the signature.
 * @returns {Promise<string>} The signed transaction.
 */
export const signTx = async (
  pkpPublicKey: string,
  tx: any,
  sigName: string
) => {
  console.log(`Signing TX: ${sigName}`);
  const pkForLit = pkpPublicKey.startsWith('0x')
    ? pkpPublicKey.slice(2)
    : pkpPublicKey;

  const sig = await Lit.Actions.signAndCombineEcdsa({
    toSign: ethers.utils.arrayify(
      ethers.utils.keccak256(ethers.utils.serializeTransaction(tx))
    ),
    publicKey: pkForLit,
    sigName,
  });

  return ethers.utils.serializeTransaction(
    tx,
    ethers.utils.joinSignature({
      r: '0x' + JSON.parse(sig).r.substring(2),
      s: '0x' + JSON.parse(sig).s,
      v: JSON.parse(sig).v,
    })
  );
};

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/uniswapSwap/lit-actions/utils/get-gas-data.ts`:

```ts
/**
 * Retrieves gas data (maxFeePerGas, maxPriorityFeePerGas, and nonce).
 * @param {JsonRpcProvider} provider - The Ethereum provider.
 * @returns {Promise<{ maxFeePerGas: string, maxPriorityFeePerGas: string, nonce: number }>} Gas data.
 */
export const getGasData = async (provider: any, pkpEthAddress: string) => {
  console.log(`Getting gas data...`);

  const gasData = await Lit.Actions.runOnce(
    { waitForResponse: true, name: 'gasPriceGetter' },
    async () => {
      const baseFeeHistory = await provider.send('eth_feeHistory', [
        '0x1',
        'latest',
        [],
      ]);
      const baseFee = ethers.BigNumber.from(baseFeeHistory.baseFeePerGas[0]);
      const nonce = await provider.getTransactionCount(pkpEthAddress);

      const priorityFee = baseFee.div(4);
      const maxFee = baseFee.mul(2);

      return JSON.stringify({
        maxFeePerGas: maxFee.toHexString(),
        maxPriorityFeePerGas: priorityFee.toHexString(),
        nonce,
      });
    }
  );

  console.log(`Gas data: ${gasData}`);

  return JSON.parse(gasData);
};

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/uniswapSwap/lit-actions/utils/get-best-quote.ts`:

```ts
/**
 * Retrieves the best quote for a Uniswap V3 swap.
 * @param {JsonRpcProvider} provider - The Ethereum provider.
 * @param {any} amount - The amount of tokens to swap.
 * @param {number} decimalsOut - The decimals of the output token.
 * @returns {Promise<{ bestQuote: any, bestFee: number, amountOutMin: any }>} The best quote and fee tier.
 */
export const getBestQuote = async (
  provider: any,
  uniswapV3Quoter: any,
  amount: any,
  decimalsOut: number
) => {
  console.log('Getting best quote for swap...');
  const quoterInterface = new ethers.utils.Interface([
    'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
  ]);

  const FEE_TIERS = [3000, 500]; // Supported fee tiers (0.3% and 0.05%)
  let bestQuote = null;
  let bestFee = null;

  for (const fee of FEE_TIERS) {
    try {
      const quoteParams = {
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amountIn: amount,
        fee: fee,
        sqrtPriceLimitX96: 0,
      };

      console.log(`Trying fee tier ${fee / 10000}%...`);
      const quote = await provider.call({
        to: uniswapV3Quoter,
        data: quoterInterface.encodeFunctionData('quoteExactInputSingle', [
          quoteParams,
        ]),
      });

      const [amountOut] = quoterInterface.decodeFunctionResult(
        'quoteExactInputSingle',
        quote
      );
      const currentQuote = ethers.BigNumber.from(amountOut);

      if (!bestQuote || currentQuote.gt(bestQuote)) {
        bestQuote = currentQuote;
        bestFee = fee;
        console.log(
          `New best quote found with fee tier ${
            fee / 10000
          }%: ${ethers.utils.formatUnits(currentQuote, decimalsOut)}`
        );
      }
    } catch (error) {
      if ((error as { reason?: string }).reason === 'Unexpected error') {
        console.log(`No pool found for fee tier ${fee / 10000}%`);
      } else {
        console.error('Debug: Quoter call failed for fee tier:', fee, error);
      }
      continue;
    }
  }

  if (!bestQuote || !bestFee) {
    throw new Error(
      'Failed to get quote from Uniswap V3. No valid pool found for this token pair.'
    );
  }

  // Calculate minimum output with 0.5% slippage tolerance
  const slippageTolerance = 0.005;
  const amountOutMin = bestQuote.mul(1000 - slippageTolerance * 1000).div(1000);
  console.log(
    'Minimum output:',
    ethers.utils.formatUnits(amountOutMin, decimalsOut)
  );

  return { bestQuote, bestFee, amountOutMin };
};

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/uniswapSwap/lit-actions/utils/get-uniswap-quotor-router.ts`:

```ts
export const getUniswapQuoterRouter = (chainId: string) => {
  let UNISWAP_V3_QUOTER: string;
  let UNISWAP_V3_ROUTER: string;

  // Set Uniswap V3 contract addresses based on the chain ID
  switch (chainId) {
    case '8453': // Base Mainnet
      UNISWAP_V3_QUOTER = '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a';
      UNISWAP_V3_ROUTER = '0x2626664c2603336E57B271c5C0b26F421741e481';
      break;
    case '1': // Ethereum Mainnet
    case '42161': // Arbitrum
      UNISWAP_V3_QUOTER = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e';
      UNISWAP_V3_ROUTER = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45';
      break;
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  console.log(`Using Uniswap V3 Quoter: ${UNISWAP_V3_QUOTER}`);
  console.log(`Using Uniswap V3 Router: ${UNISWAP_V3_ROUTER}`);

  return {
    UNISWAP_V3_QUOTER,
    UNISWAP_V3_ROUTER,
  };
};

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/uniswapSwap/lit-actions/utils/broadcast-tx.ts`:

```ts
/**
 * Broadcasts a signed transaction to the network.
 * @param {string} signedTx - The signed transaction.
 * @returns {Promise<string>} The transaction hash.
 */
export const broadcastTransaction = async (provider: any, signedTx: string) => {
  console.log('Broadcasting transaction...');
  const txHash = await Lit.Actions.runOnce(
    { waitForResponse: true, name: 'txnSender' },
    async () => {
      try {
        const receipt = await provider.sendTransaction(signedTx);
        console.log('Transaction sent:', receipt.hash);
        return receipt.hash;
      } catch (error) {
        console.error('Error broadcasting transaction:', error);
        throw error;
      }
    }
  );

  if (!ethers.utils.isHexString(txHash)) {
    throw new Error(`Invalid transaction hash: ${txHash}`);
  }

  return txHash;
};

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/uniswapSwap/lit-actions/utils/index.ts`:

```ts
export * from './get-token-info';
export * from './get-uniswap-quotor-router';
export * from './get-best-quote';
export * from './get-gas-data';
export * from './estimate-gas-limit';
export * from './create-tx';
export * from './sign-tx';
export * from './broadcast-tx';

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/uniswapSwap/lit-actions/tool.ts`:

```ts
import {
  fetchToolPolicyFromRegistry,
  getPkpInfo,
  getPkpToolRegistryContract,
  NETWORK_CONFIG,
} from '@lit-protocol/aw-tool';

import {
  getUniswapQuoterRouter,
  getTokenInfo,
  getBestQuote,
  getGasData,
  estimateGasLimit,
  createTransaction,
  signTx,
  broadcastTransaction,
} from './utils';

declare global {
  // Required Inputs
  const params: {
    pkpEthAddress: string;
    rpcUrl: string;
    chainId: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
  };
}

(async () => {
  try {
    console.log(`Using Lit Network: ${LIT_NETWORK}`);
    console.log(
      `Using PKP Tool Registry Address: ${PKP_TOOL_REGISTRY_ADDRESS}`
    );
    console.log(
      `Using Pubkey Router Address: ${
        NETWORK_CONFIG[LIT_NETWORK as keyof typeof NETWORK_CONFIG]
          .pubkeyRouterAddress
      }`
    );

    const { UNISWAP_V3_QUOTER, UNISWAP_V3_ROUTER } = getUniswapQuoterRouter(
      params.chainId
    );

    const delegateeAddress = ethers.utils.getAddress(LitAuth.authSigAddress);
    const toolIpfsCid = LitAuth.actionIpfsIds[0];
    const provider = new ethers.providers.JsonRpcProvider(params.rpcUrl);
    const pkpToolRegistryContract = await getPkpToolRegistryContract(
      PKP_TOOL_REGISTRY_ADDRESS
    );
    const pkp = await getPkpInfo(params.pkpEthAddress);
    const tokenInfo = await getTokenInfo(
      provider,
      params.tokenIn,
      params.amountIn,
      params.tokenOut,
      pkp
    );

    const toolPolicy = await fetchToolPolicyFromRegistry(
      pkpToolRegistryContract,
      pkp.tokenId,
      delegateeAddress,
      toolIpfsCid
    );

    if (
      toolPolicy.enabled &&
      toolPolicy.policyIpfsCid !== undefined &&
      toolPolicy.policyIpfsCid !== '0x' &&
      toolPolicy.policyIpfsCid !== ''
    ) {
      console.log(`Executing policy ${toolPolicy.policyIpfsCid}`);

      await Lit.Actions.call({
        ipfsId: toolPolicy.policyIpfsCid,
        params: {
          parentToolIpfsCid: toolIpfsCid,
          pkpToolRegistryContractAddress: PKP_TOOL_REGISTRY_ADDRESS,
          pkpTokenId: pkp.tokenId,
          delegateeAddress,
          toolParameters: {
            amountIn: tokenInfo.tokenIn.amount.toString(),
            tokenIn: params.tokenIn,
            tokenOut: params.tokenOut,
          },
        },
      });
    } else {
      console.log(
        `No policy found for tool ${toolIpfsCid} on PKP ${pkp.tokenId} for delegatee ${delegateeAddress}`
      );
    }

    // Get best quote and calculate minimum output
    const { bestFee, amountOutMin } = await getBestQuote(
      provider,
      UNISWAP_V3_QUOTER,
      tokenInfo.tokenIn.amount,
      tokenInfo.tokenOut.decimals
    );

    // Get gas data for transactions
    const gasData = await getGasData(provider, pkp.ethAddress);

    // Approval Transaction
    const approvalGasLimit = await estimateGasLimit(
      provider,
      pkp.ethAddress,
      UNISWAP_V3_ROUTER,
      tokenInfo.tokenIn.contract,
      tokenInfo.tokenIn.amount,
      true
    );

    const approvalTx = await createTransaction(
      UNISWAP_V3_ROUTER,
      pkp.ethAddress,
      approvalGasLimit,
      tokenInfo.tokenIn.amount,
      gasData,
      true
    );

    const signedApprovalTx = await signTx(
      pkp.publicKey,
      approvalTx,
      'erc20ApprovalSig'
    );
    const approvalHash = await broadcastTransaction(provider, signedApprovalTx);
    console.log('Approval transaction hash:', approvalHash);

    // Wait for approval confirmation
    console.log('Waiting for approval confirmation...');
    const approvalConfirmation = await provider.waitForTransaction(
      approvalHash,
      1
    );
    if (approvalConfirmation.status === 0) {
      throw new Error('Approval transaction failed');
    }

    // Swap Transaction
    const swapGasLimit = await estimateGasLimit(
      provider,
      UNISWAP_V3_ROUTER,
      pkp.ethAddress,
      tokenInfo.tokenIn.contract,
      tokenInfo.tokenIn.amount,
      false,
      { fee: bestFee, amountOutMin }
    );

    const swapTx = await createTransaction(
      UNISWAP_V3_ROUTER,
      pkp.ethAddress,
      swapGasLimit,
      tokenInfo.tokenIn.amount,
      { ...gasData, nonce: gasData.nonce + 1 },
      false,
      { fee: bestFee, amountOutMin }
    );

    const signedSwapTx = await signTx(pkp.publicKey, swapTx, 'erc20SwapSig');
    const swapHash = await broadcastTransaction(provider, signedSwapTx);
    console.log('Swap transaction hash:', swapHash);

    Lit.Actions.setResponse({
      response: JSON.stringify({
        status: 'success',
        approvalHash,
        swapHash,
      }),
    });
  } catch (err: any) {
    console.error('Error:', err);

    // Extract detailed error information
    const errorDetails = {
      message: err.message,
      code: err.code,
      reason: err.reason,
      error: err.error,
      ...(err.transaction && { transaction: err.transaction }),
      ...(err.receipt && { receipt: err.receipt }),
    };

    Lit.Actions.setResponse({
      response: JSON.stringify({
        status: 'error',
        error: err.message || String(err),
        details: errorDetails,
      }),
    });
  }
})();

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/uniswapSwap/lit-actions/policy.ts`:

```ts
import {
  checkLitAuthAddressIsDelegatee,
  getPkpToolRegistryContract,
  getPolicyParameters,
} from '@lit-protocol/aw-tool';

declare global {
  // Required Inputs
  const parentToolIpfsCid: string;
  const pkpToolRegistryContractAddress: string;
  const pkpTokenId: string;
  const delegateeAddress: string;
  const toolParameters: {
    amountIn: string;
    tokenIn: string;
    tokenOut: string;
  };
}

(async () => {
  const pkpToolRegistryContract = await getPkpToolRegistryContract(
    pkpToolRegistryContractAddress
  );

  const isDelegatee = await checkLitAuthAddressIsDelegatee(
    pkpToolRegistryContract,
    pkpTokenId
  );
  if (!isDelegatee) {
    throw new Error(
      `Session signer ${ethers.utils.getAddress(
        LitAuth.authSigAddress
      )} is not a delegatee for PKP ${pkpTokenId}`
    );
  }

  const policyParameters = await getPolicyParameters(
    pkpToolRegistryContract,
    pkpTokenId,
    parentToolIpfsCid,
    delegateeAddress,
    ['maxAmount', 'allowedTokens']
  );

  let maxAmount: any;
  let allowedTokens: string[] = [];

  console.log(
    `Retrieved policy parameters: ${JSON.stringify(policyParameters)}`
  );

  for (const parameter of policyParameters) {
    const value = ethers.utils.toUtf8String(parameter.value);

    switch (parameter.name) {
      case 'maxAmount':
        maxAmount = ethers.BigNumber.from(value);
        console.log(`Formatted maxAmount: ${maxAmount.toString()}`);
        break;
      case 'allowedTokens':
        allowedTokens = JSON.parse(value);
        allowedTokens = allowedTokens.map((addr: string) =>
          ethers.utils.getAddress(addr)
        );
        console.log(`Formatted allowedTokens: ${allowedTokens.join(', ')}`);
        break;
    }
  }

  // Convert string amount to BigNumber and compare
  const amountBN = ethers.BigNumber.from(toolParameters.amountIn);
  console.log(
    `Checking if amount ${amountBN.toString()} exceeds maxAmount ${maxAmount.toString()}...`
  );

  if (amountBN.gt(maxAmount)) {
    throw new Error(
      `Amount ${ethers.utils.formatUnits(
        amountBN
      )} exceeds the maximum amount ${ethers.utils.formatUnits(maxAmount)}`
    );
  }

  if (allowedTokens.length > 0) {
    console.log(`Checking if ${toolParameters.tokenIn} is an allowed token...`);
    if (
      !allowedTokens.includes(ethers.utils.getAddress(toolParameters.tokenIn))
    ) {
      throw new Error(
        `Token ${
          toolParameters.tokenIn
        } not allowed. Allowed tokens: ${allowedTokens.join(', ')}`
      );
    }

    console.log(
      `Checking if ${toolParameters.tokenOut} is an allowed token...`
    );
    if (
      !allowedTokens.includes(ethers.utils.getAddress(toolParameters.tokenOut))
    ) {
      throw new Error(
        `Token ${
          toolParameters.tokenOut
        } not allowed. Allowed tokens: ${allowedTokens.join(', ')}`
      );
    }
  }

  console.log('Policy parameters validated');
})();

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/uniswapSwap/toolCall.ts`:

```ts
import { ethers } from 'ethers';
import {
  Action,
  composeContext,
  generateObjectDeprecated,
  HandlerCallback,
  ModelClass,
  type IAgentRuntime,
  type Memory,
  type State,
} from "@elizaos/core";
import { LIT_NETWORK, LIT_ABILITY } from '@lit-protocol/constants';
import { UniswapSwap, UniswapSwapLitActionParameters } from "./tool"; // Import the UniswapSwap tool
import { uniswapSwapTemplate } from "../../../templates"; // Assuming you have a template for Uniswap swaps
import { UniswapSwapPolicy } from './policy';
import { IPFS_CIDS } from './ipfs';
import LitJsSdk from '@lit-protocol/lit-node-client';
import {
  LitActionResource,
  createSiweMessage,
  generateAuthSig,
} from "@lit-protocol/auth-helpers";

/**
 * Builds the details required for a Uniswap swap Lit Action.
 * @param {State} state - The current state of the agent.
 * @param {IAgentRuntime} runtime - The runtime instance of the agent.
 * @returns {Promise<UniswapSwapLitActionParameters>} - The parameters for the Uniswap swap.
 */
const buildUniswapSwapDetails = async (
  state: State,
  runtime: IAgentRuntime
): Promise<UniswapSwapLitActionParameters> => {
  const context = composeContext({
    state,
    template: uniswapSwapTemplate, // Use the Uniswap swap template
  });

  const swapDetails = (await generateObjectDeprecated({
    runtime,
    context,
    modelClass: ModelClass.SMALL,
  })) as UniswapSwapLitActionParameters;

  return swapDetails;
};

/**
 * Action for executing a Uniswap swap using the Lit Protocol.
 */
export const UNISWAP_SWAP_LIT_ACTION: Action = {
  name: "uniswap-swap",
  similes: ["Uniswap Swap", "Swap Tokens", "Execute Uniswap Swap"],
  description: "This interacts with Lit Protocol to execute a Uniswap swap using the UniswapSwap tool.",
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const privateKey = runtime.getSetting("EVM_PRIVATE_KEY");
    return typeof privateKey === "string" && privateKey.startsWith("0x");
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options?: any,
    callback?: HandlerCallback
  ) => {
    try {
      const swapDetails = await buildUniswapSwapDetails(state, runtime);

      // Get the appropriate tool for the network
      const tool = UniswapSwap[LIT_NETWORK.DatilDev]; // Assuming you're using the DatilDev network

      // Validate the parameters
      const validationResult = tool.parameters.validate(swapDetails);
      if (validationResult !== true) {
        const errors = validationResult.map(err => `${err.param}: ${err.error}`).join(', ');
        throw new Error(`Invalid parameters: ${errors}`);
      }

      // Create and validate policy
      const policy = {
        type: "UniswapSwap" as const,
        version: UniswapSwapPolicy.version,
        tokenIn: swapDetails.tokenIn,
        tokenOut: swapDetails.tokenOut,
        amountIn: swapDetails.amountIn,
        maxSlippage: "0.5", // Example slippage tolerance (0.5%)
      };

      // Validate policy against schema
      UniswapSwapPolicy.schema.parse(policy);

      // Encode policy for execution
      const encodedPolicy = UniswapSwapPolicy.encode(policy);

      // Get IPFS CID for the network
      const ipfsCid = IPFS_CIDS['datil-dev'].tool;

      // Initialize Lit client
      const litNodeClient = new LitJsSdk.LitNodeClient({
        alertWhenUnauthorized: false,
        litNetwork: LIT_NETWORK.DatilDev,
        debug: false,
      });
      await litNodeClient.connect();

      // Get wallet from private key
      const wallet = new ethers.Wallet(runtime.getSetting("EVM_PRIVATE_KEY"));

      // Get session signatures
      const sessionSigs = await litNodeClient.getSessionSigs({
        chain: "ethereum",
        expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes
        resourceAbilityRequests: [
          {
            resource: new LitActionResource("*"),
            ability: LIT_ABILITY.LitActionExecution,
          },
        ],
        authNeededCallback: async ({ uri, expiration, resourceAbilityRequests }) => {
          const toSign = await createSiweMessage({
            uri,
            expiration,
            resources: resourceAbilityRequests,
            walletAddress: wallet.address,
            nonce: await litNodeClient.getLatestBlockhash(),
            litNodeClient,
          });

          return await generateAuthSig({
            signer: wallet,
            toSign,
          });
        },
      });

      // Execute the Lit Action
      const response = await litNodeClient.executeJs({
        sessionSigs,
        ipfsId: ipfsCid,
        jsParams: {
          params: {
            ...swapDetails,
            encodedPolicy,
          },
        },
      });

      console.log("UniswapSwap Response:", response);

      if (callback) {
        callback({
          text: `Uniswap swap executed successfully. Response: ${JSON.stringify(response)}`,
          content: {
            success: true,
            response: response,
          },
        });
      }

      return true;

    } catch (error) {
      console.error("Error in UniswapSwap handler:", error);

      if (callback) {
        callback({
          text: `Error executing Uniswap swap: ${error.message}`,
          content: {
            error: error.message,
          },
        });
      }

      throw error;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "please attempt a Uniswap swap pkp addy: 0xc8BB61FB32cbfDc0534136798099709d779086b4 rpc: https://base-sepolia-rpc.publicnode.com chain ID 84532 tokenIn address 0x00cdfea7e11187BEB4a0CE835fea1745b124B26e tokenOut address 0xDFdC570ec0586D5c00735a2277c21Dcc254B3917 amountIn 1" },
      },
      {
        user: "{{user2}}",
        content: { text: "Executing Uniswap swap", action: "UNISWAP_SWAP_LIT_ACTION" },
      },
    ],
  ],
};

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/uniswapSwap/tool.ts`:

```ts
import { z } from 'zod';
import {
  type AwTool,
  type SupportedLitNetwork,
  NETWORK_CONFIGS,
  NetworkConfig,
} from '@lit-protocol/aw-tool';

import { UniswapSwapPolicy, type UniswapSwapPolicyType } from './policy';
import { IPFS_CIDS } from './ipfs';

/**
 * Parameters required for the Swap Uniswap Lit Action.
 * @property {string} tokenIn - The ERC20 token contract address to send.
 * @property {string} tokenOut - The ERC20 token contract address to receive.
 * @property {string} amountIn - The amount of tokens to send as a string (will be parsed based on token decimals).
 * @property {string} chainId - The ID of the blockchain network.
 * @property {string} rpcUrl - The RPC URL of the blockchain network.
 */
export interface UniswapSwapLitActionParameters {
  pkpEthAddress: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  chainId: string;
  rpcUrl: string;
}

/**
 * Zod schema for validating UniswapSwapLitActionParameters.
 * @type {z.ZodObject}
 */
const UniswapSwapLitActionSchema = z.object({
  pkpEthAddress: z
    .string()
    .regex(
      /^0x[a-fA-F0-9]{40}$/,
      'Must be a valid Ethereum address (0x followed by 40 hexadecimal characters)'
    ),
  tokenIn: z
    .string()
    .regex(
      /^0x[a-fA-F0-9]{40}$/,
      'Must be a valid Ethereum contract address (0x followed by 40 hexadecimal characters)'
    ),
  tokenOut: z
    .string()
    .regex(
      /^0x[a-fA-F0-9]{40}$/,
      'Must be a valid Ethereum contract address (0x followed by 40 hexadecimal characters)'
    ),
  amountIn: z
    .string()
    .regex(
      /^\d*\.?\d+$/,
      'Must be a valid decimal number as a string (e.g. "1.5" or "100")'
    ),
  chainId: z
    .string()
    .regex(/^\d+$/, 'Must be a valid chain ID number as a string'),
  rpcUrl: z
    .string()
    .url()
    .startsWith(
      'https://',
      'Must be a valid HTTPS URL for the blockchain RPC endpoint'
    ),
});

/**
 * Descriptions of each parameter for the Swap Uniswap Lit Action.
 * These descriptions are designed to be consumed by LLMs to understand the required parameters.
 * @type {Record<string, string>}
 */
const UniswapSwapLitActionParameterDescriptions = {
  pkpEthAddress:
    'The Ethereum address of the PKP that will be used to sign the transaction.',
  tokenIn:
    'The Ethereum contract address of the ERC20 token you want to send. Must be a valid Ethereum address starting with 0x.',
  tokenOut:
    'The Ethereum contract address of the ERC20 token you want to receive. Must be a valid Ethereum address starting with 0x.',
  amountIn:
    'The amount of tokens to send, specified as a string. This should be a decimal number (e.g. "1.5" or "100"). The amount will be automatically adjusted based on the token\'s decimals.',
  chainId:
    'The ID of the blockchain network to send the tokens on (e.g. 1 for Ethereum mainnet, 84532 for Base Sepolia).',
  rpcUrl:
    'The RPC URL of the blockchain network to connect to (e.g. "https://base-sepolia-rpc.publicnode.com").',
} as const;

/**
 * Validates the provided parameters against the UniswapSwapLitActionSchema.
 * @param {unknown} params - The parameters to validate.
 * @returns {true | Array<{ param: string; error: string }>} - Returns `true` if valid, otherwise an array of errors.
 */
const validateUniswapSwapParameters = (
  params: unknown
): true | Array<{ param: string; error: string }> => {
  const result = UniswapSwapLitActionSchema.safeParse(params);
  if (result.success) {
    return true;
  }

  return result.error.issues.map((issue) => ({
    param: issue.path[0] as string,
    error: issue.message,
  }));
};

/**
 * Creates a network-specific UniswapSwap tool.
 * @param {SupportedLitNetwork} network - The Lit network to use.
 * @param {NetworkConfig} config - The configuration for the network.
 * @returns {AwTool<UniswapSwapLitActionParameters, UniswapSwapPolicyType>} - The configured AwTool instance.
 */
const createNetworkTool = (
  network: SupportedLitNetwork,
  config: NetworkConfig
): AwTool<UniswapSwapLitActionParameters, UniswapSwapPolicyType> => ({
  name: 'UniswapSwap',
  description: `A Lit Action that swaps tokens on Uniswap.`,
  ipfsCid: IPFS_CIDS[network].tool,
  defaultPolicyIpfsCid: IPFS_CIDS[network].defaultPolicy,
  parameters: {
    type: {} as UniswapSwapLitActionParameters,
    schema: UniswapSwapLitActionSchema,
    descriptions: UniswapSwapLitActionParameterDescriptions,
    validate: validateUniswapSwapParameters,
  },
  policy: UniswapSwapPolicy,
});

/**
 * A collection of network-specific UniswapSwap tools.
 * @type {Record<SupportedLitNetwork, AwTool<UniswapSwapLitActionParameters, UniswapSwapPolicyType>>}
 */
export const UniswapSwap = Object.entries(NETWORK_CONFIGS).reduce(
  (acc, [network, config]) => ({
    ...acc,
    [network]: createNetworkTool(network as SupportedLitNetwork, config),
  }),
  {} as Record<
    SupportedLitNetwork,
    AwTool<UniswapSwapLitActionParameters, UniswapSwapPolicyType>
  >
);

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/uniswapSwap/ipfs.ts`:

```ts
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Default development CIDs for different environments.
 * @type {Object.<string, NetworkCids>}
 * @property {NetworkCids} datil-dev - CIDs for the development environment.
 * @property {NetworkCids} datil-test - CIDs for the test environment.
 * @property {NetworkCids} datil - CIDs for the production environment.
 */
const DEFAULT_CIDS = {
  'datil-dev': {
    tool: 'QmQPUjXmFiAe363TYAiv3DPciyTDSFLym2S9FR1d78ZRWs',
    defaultPolicy: 'Qmc6RAbV3WAqfNLvkAxp4hYjd4TDim4PwjWyhGbM9X7nbR',
  },
  'datil-test': {
    tool: 'QmaLAZCJEk5B4BW962pjENxCDHvwGtPptCamhckk9GJxJe',
    defaultPolicy: 'Qmc6RAbV3WAqfNLvkAxp4hYjd4TDim4PwjWyhGbM9X7nbR',
  },
  datil: {
    tool: 'QmStLtPzAvyUAQXbkUorZUJ7mgst6tU4xhJoFYHMZp9etH',
    defaultPolicy: 'Qmc6RAbV3WAqfNLvkAxp4hYjd4TDim4PwjWyhGbM9X7nbR',
  },
} as const;

/**
 * Tries to read the IPFS CIDs from the build output.
 * Falls back to default development CIDs if the file is not found or cannot be read.
 * @type {Record<keyof typeof DEFAULT_CIDS, NetworkCids>}
 */
let deployedCids = DEFAULT_CIDS;

const ipfsPath = join(__dirname, '../../../dist/ipfs.json');
if (existsSync(ipfsPath)) {
  try {
    const ipfsModule = await import(ipfsPath, {
      assert: { type: 'json' }
    });
    deployedCids = ipfsModule.default;
  } catch (error) {
    console.warn('Failed to load ipfs.json, using default CIDs:', error);
  }
} else {
  console.warn(
    'ipfs.json not found. Using default CIDs. You should run `npx nx deploy:lit-action` to update the ipfs.json files.'
  );
}

/**
 * IPFS CIDs for each network's Lit Action.
 * @type {Record<keyof typeof DEFAULT_CIDS, NetworkCids>}
 */
export const IPFS_CIDS = deployedCids;

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/tools/uniswapSwap/policy.ts`:

```ts
import { BaseEthereumAddressSchema } from '@lit-protocol/aw-tool';
import { z } from 'zod';
import { ethers } from 'ethers';

/**
 * Zod schema for validating a UniswapSwap policy.
 * @type {z.ZodObject}
 */
const policySchema = z.object({
  type: z.literal('UniswapSwap'), // Policy type must be 'UniswapSwap'
  version: z.string(), // Version of the policy
  maxAmount: z.string().refine(
    (val) => {
      try {
        const bn = ethers.BigNumber.from(val);
        return !bn.isNegative(); // Ensure the amount is non-negative
      } catch {
        return false; // Invalid format
      }
    },
    { message: 'Invalid amount format. Must be a non-negative integer.' }
  ),
  allowedTokens: z.array(BaseEthereumAddressSchema), // Array of allowed token addresses
});

/**
 * Encodes a UniswapSwap policy into a packed ABI-encoded string.
 * @param {UniswapSwapPolicyType} policy - The policy to encode.
 * @returns {string} ABI-encoded string representing the policy.
 * @throws {z.ZodError} If the policy does not match the schema.
 */
function encodePolicy(policy: UniswapSwapPolicyType): string {
  // Validate the policy against the schema
  policySchema.parse(policy);

  // Encode the policy using ABI encoding
  return ethers.utils.defaultAbiCoder.encode(
    ['tuple(uint256 maxAmount, address[] allowedTokens)'],
    [
      {
        maxAmount: policy.maxAmount,
        allowedTokens: policy.allowedTokens,
      },
    ]
  );
}

/**
 * Decodes an ABI-encoded string into a UniswapSwap policy.
 * @param {string} encodedPolicy - The ABI-encoded policy string.
 * @returns {UniswapSwapPolicyType} The decoded policy object.
 * @throws {z.ZodError} If the decoded policy does not match the schema.
 */
function decodePolicy(encodedPolicy: string): UniswapSwapPolicyType {
  // Decode the ABI-encoded string
  const decoded = ethers.utils.defaultAbiCoder.decode(
    ['tuple(uint256 maxAmount, address[] allowedTokens)'],
    encodedPolicy
  )[0];

  // Construct the policy object
  const policy: UniswapSwapPolicyType = {
    type: 'UniswapSwap',
    version: '1.0.0',
    maxAmount: decoded.maxAmount.toString(),
    allowedTokens: decoded.allowedTokens,
  };

  // Validate the decoded policy against the schema
  return policySchema.parse(policy);
}

/**
 * Type representing a UniswapSwap policy.
 * @typedef {z.infer<typeof policySchema>} UniswapSwapPolicyType
 */
export type UniswapSwapPolicyType = z.infer<typeof policySchema>;

/**
 * Utility object for working with UniswapSwap policies.
 * @type {object}
 * @property {UniswapSwapPolicyType} type - Type placeholder for the policy.
 * @property {string} version - Version of the policy schema.
 * @property {z.ZodObject} schema - Zod schema for validating policies.
 * @property {function} encode - Function to encode a policy into an ABI-encoded string.
 * @property {function} decode - Function to decode an ABI-encoded string into a policy.
 */
export const UniswapSwapPolicy = {
  type: {} as UniswapSwapPolicyType, // Placeholder for the policy type
  version: '1.0.0', // Version of the policy schema
  schema: policySchema, // Zod schema for validation
  encode: encodePolicy, // Function to encode a policy
  decode: decodePolicy, // Function to decode a policy
};

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/helloLit/helloLitAction.ts`:

```ts
const _litActionCode = async () => {
  console.log(magicNumber);
  try {
    LitActions.setResponse({ response: JSON.stringify({ message: "Hello from Lit Protocol!" }) });
  } catch (error) {
    LitActions.setResponse({ response: error.message });
  }
};

export const litActionCode = `(${_litActionCode.toString()})();`;

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/helloLit/helloLit.ts`:

```ts
import { ethers } from 'ethers'; // Import ethers
import {
    Action,
    type IAgentRuntime,
    type Memory,
    type State,
    HandlerCallback,
} from "@elizaos/core";
import LitJsSdk from '@lit-protocol/lit-node-client';
import { LIT_NETWORK, LIT_ABILITY } from '@lit-protocol/constants';
import {
  LitActionResource,
  createSiweMessage,
  generateAuthSig,
} from "@lit-protocol/auth-helpers";
import { litActionCode } from "./helloLitAction";

export const HELLO_LIT_ACTION: Action = {
    name: "hello",
    similes: ["Hello World", "Basic Lit Action"],
    description: "This interacts with Lit",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const privateKey = runtime.getSetting("EVM_PRIVATE_KEY");
        return typeof privateKey === "string" && privateKey.startsWith("0x");
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options?: any,
        callback?: HandlerCallback
    ) => {
        try {
            const litNodeClient = new LitJsSdk.LitNodeClient({
                alertWhenUnauthorized: false,
                litNetwork: LIT_NETWORK.DatilDev,
                debug: false,
            });

            await litNodeClient.connect();
            console.log("Connected to Lit Network");

            const privateKey = runtime.getSetting("EVM_PRIVATE_KEY");
            const ethersWallet = new ethers.Wallet(privateKey);
            console.log("Wallet Address:", ethersWallet.address);

            const sessionSignatures = await litNodeClient.getSessionSigs({
                chain: "ethereum",
                expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes
                resourceAbilityRequests: [
                    {
                        resource: new LitActionResource("*"),
                        ability: LIT_ABILITY.LitActionExecution,
                    },
                ],
                authNeededCallback: async ({
                    uri,
                    expiration,
                    resourceAbilityRequests,
                }) => {
                    const toSign = await createSiweMessage({
                        uri,
                        expiration,
                        resources: resourceAbilityRequests,
                        walletAddress: ethersWallet.address,
                        nonce: await litNodeClient.getLatestBlockhash(),
                        litNodeClient,
                    });
    
                    return await generateAuthSig({
                        signer: ethersWallet,
                        toSign,
                    });
                },
            });
            
            // Execute the Lit Action
            const response = await litNodeClient.executeJs({
                sessionSigs: sessionSignatures,
                code: litActionCode,
                jsParams: {
                    magicNumber: 43, // Example parameter
                },
            });

            console.log("Lit Action Response:", response);

            // Use the callback (if provided) to send the response to the chat UI
            if (callback) {
                callback({
                    text: `Lit Action executed successfully. Response: ${JSON.stringify(response)}`,
                    content: {
                        success: true,
                        response: response,
                    },
                });
            }

            return true;

        } catch (error) {
            console.error("Error in lit action handler:", error);

            // Use the callback (if provided) to send the error message to the chat UI
            if (callback) {
                callback({
                    text: `Error executing Lit Action: ${error.message}`,
                    content: {
                        error: error.message,
                    },
                });
            }

            throw error;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "I'd like to deploy a lit action" },
            },
            {
                user: "{{user2}}",
                content: { text: "Deploying a basic Lit Action", action: "HELLO_LIT_ACTION" },
            },
        ],
    ],
};

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/sendEth.ts`:

```ts
import {
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    ModelClass,
    composeContext,
    generateObject,
    Content
  } from "@elizaos/core";
import { ethers } from "ethers";
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LIT_RPC, LIT_ABILITY } from "@lit-protocol/constants";
  import {
    LitPKPResource,
    createSiweMessageWithRecaps,
    generateAuthSig,
    LitActionResource,
    AuthSig,
} from "@lit-protocol/auth-helpers";
import { z } from "zod";

interface LitState {
  nodeClient: LitNodeClient;
  evmWallet?: ethers.Wallet;
  pkp?: {
    publicKey: string;
    ethAddress: string;
  };
  capacityCredit?: {
    tokenId: string;
  };
}

// Add template for content extraction
const sendEthTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "amount": "0.01",
    "to": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the ETH transfer:
- amount (the amount of ETH to send)
- to (the destination address)

Respond with a JSON markdown block containing only the extracted values.`;

// Define the schema type
const sendEthSchema = z.object({
    amount: z.string().nullable(),
    to: z.string().nullable()
});

// Add type guard function
function isSendEthContent(content: Content): content is SendEthContent {
  return (
    (typeof content.amount === "string" || content.amount === null) &&
    (typeof content.to === "string" || content.to === null)
  );
}

interface SendEthContent extends Content {
    amount: string | null;
    to: string | null;
}

export const sendEth: Action = {
  name: "SEND_ETH",
  description: "Sends ETH to an address on Sepolia using PKP wallet",
  similes: [
    "send eth",
    "send * eth to *",
    "send ethereum",
    "send * ETH to *",
    "transfer * eth to *",
    "transfer * ETH to *",
  ],
  validate: async (_runtime: IAgentRuntime) => true,
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<boolean> => {
    console.log("SEND_ETH handler started");
    try {
      // Initialize or update state
      let currentState: State;
      if (!state) {
          currentState = (await runtime.composeState(message)) as State;
      } else {
          currentState = await runtime.updateRecentMessageState(state);
      }
      // Compose context and generate content
      const sendEthContext = composeContext({
        state: currentState,
        template: sendEthTemplate,
      });

      // Generate content with the schema
      const content = await generateObject({
        runtime,
        context: sendEthContext,
        schema: sendEthSchema as any,
        modelClass: ModelClass.LARGE,
      });

      const sendEthContent = content.object as SendEthContent;

      // Validate content
      if (!isSendEthContent(sendEthContent)) {
        console.error("Invalid content for SEND_ETH action.");
        callback?.({
          text: "Unable to process ETH transfer request. Invalid content provided.",
          content: { error: "Invalid send ETH content" }
        });
        return false;
      }

      if (!sendEthContent.amount) {
        console.log("Amount is not provided, skipping transfer");
        callback?.({ text: "The amount must be provided" });
        return false;
      }

      if (!sendEthContent.to) {
        console.log("Destination address is not provided, skipping transfer");
        callback?.({ text: "The destination address must be provided" });
        return false;
      }

      // Validate amount format
      const cleanedAmount = sendEthContent.amount.replace(/[^\d.]/g, '');
      const parsedAmount = Number.parseFloat(cleanedAmount);
      if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error(`Invalid amount value: ${sendEthContent.amount}`);
      }

      // Validate address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(sendEthContent.to)) {
        throw new Error(`Invalid Ethereum address: ${sendEthContent.to}`);
      }

      // Validate Lit environment
      const litState = (state.lit || {}) as LitState;
      if (
        !litState.nodeClient ||
        !litState.pkp ||
        !litState.evmWallet ||
        !litState.capacityCredit?.tokenId
      ) {
        throw new Error(
          "Lit environment not fully initialized - missing nodeClient, pkp, evmWallet, or capacityCredit"
        );
      }

      // Get RPC URL from runtime settings
      const rpcUrl = runtime.getSetting("EVM_RPC_URL");
      if (!rpcUrl) {
        throw new Error("No RPC URL provided");
      }

      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

      // Create transaction
      const nonce = await provider.getTransactionCount(litState.pkp.ethAddress);
      const gasPrice = await provider.getGasPrice();
      const gasLimit = 30000;

      const unsignedTx = {
        to: sendEthContent.to,
        value: ethers.utils.parseEther(sendEthContent.amount),
        chainId: 11155111, // Sepolia chainId
        nonce: nonce,
        gasPrice: gasPrice,
        gasLimit: gasLimit,
      };

      const fundingWallet = new ethers.Wallet(
        runtime.getSetting("FUNDING_PRIVATE_KEY"),
        new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
      );

      const { capacityDelegationAuthSig } =
        await litState.nodeClient.createCapacityDelegationAuthSig({
          dAppOwnerWallet: fundingWallet,
          capacityTokenId: litState.capacityCredit.tokenId,
          delegateeAddresses: [litState.pkp.ethAddress],
          uses: "1",
          expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes
        });

      // Get session signatures with capacity delegation
      console.log("Generating session signatures with capacity delegation...");
      const sessionSigs = await litState.nodeClient.getSessionSigs({
        pkpPublicKey: litState.pkp.publicKey,
        chain: "sepolia",
        capabilityAuthSigs: [capacityDelegationAuthSig],
        expiration: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24 hours
        resourceAbilityRequests: [
          {
            resource: new LitPKPResource("*"),
            ability: LIT_ABILITY.PKPSigning,
          },
          {
            resource: new LitActionResource("*"),
            ability: LIT_ABILITY.LitActionExecution,
          },
        ],
        authNeededCallback: async ({
          resourceAbilityRequests,
          expiration,
          uri,
        }) => {
          if (!uri || !expiration || !resourceAbilityRequests) {
            throw new Error("Missing required parameters for auth callback");
          }
          const toSign = await createSiweMessageWithRecaps({
            uri,
            expiration,
            resources: resourceAbilityRequests,
            walletAddress: litState.evmWallet.address,
            nonce: await litState.nodeClient.getLatestBlockhash(),
            litNodeClient: litState.nodeClient,
          });

          return await generateAuthSig({
            signer: litState.evmWallet,
            toSign,
          });
        },
      });
      console.log("Session signatures generated");

      console.log("Signing transaction...");
      const sig = await litState.nodeClient.pkpSign({
        pubKey: litState.pkp.publicKey,
        toSign: ethers.utils.arrayify(
          ethers.utils.keccak256(ethers.utils.serializeTransaction(unsignedTx))
        ),
        sessionSigs,
      });

      // Combine signature with transaction
      const signature = {
        r: `0x${sig.r}`,
        s: `0x${sig.s}`,
        v: sig.recid === 0 ? 27 : 28,
      };

      // Verify signature by recovering the address
      const msgHash = ethers.utils.keccak256(
        ethers.utils.serializeTransaction(unsignedTx)
      );
      const recoveredAddress = ethers.utils.recoverAddress(msgHash, signature);

      // If address doesn't match, try the other v value
      if (
        recoveredAddress.toLowerCase() !== litState.pkp.ethAddress.toLowerCase()
      ) {
        signature.v = signature.v === 27 ? 28 : 27; // Toggle between 27 and 28
        const altRecoveredAddress = ethers.utils.recoverAddress(
          msgHash,
          signature
        );

        if (
          altRecoveredAddress.toLowerCase() !==
          litState.pkp.ethAddress.toLowerCase()
        ) {
          throw new Error("Failed to recover correct address from signature");
        }
      }

      const signedTx = ethers.utils.serializeTransaction(unsignedTx, signature);

      // Send transaction
      console.log("Sending transaction...");
      const sentTx = await provider.sendTransaction(signedTx);
      await sentTx.wait();

      callback?.({
        text: `Successfully sent ${sendEthContent.amount} ETH to ${sendEthContent.to}. Transaction hash: ${sentTx.hash}`,
        content: {
          success: true,
          hash: sentTx.hash,
          amount: sendEthContent.amount,
          to: sendEthContent.to,
        },
      });

      return true;
    } catch (error) {
      console.error("Error in sendEth:", error);
      callback?.({
        text: `Failed to send ETH: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        content: {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Send 0.01 ETH to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "Successfully sent ETH",
        },
      },
    ],
  ],
};

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/sendSol.ts`:

```ts
import {
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    Content,
} from "@elizaos/core";
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LIT_ABILITY } from "@lit-protocol/constants";
import { LitActionResource } from "@lit-protocol/auth-helpers";
import { EthWalletProvider } from "@lit-protocol/lit-auth-client";
import { api } from "@lit-protocol/wrapped-keys";
import * as web3 from "@solana/web3.js";
import * as ethers from "ethers";
import { LitConfigManager } from "../config/configManager";
import { composeContext, generateObject, ModelClass } from "@elizaos/core";
import { z } from "zod";
import { sendUsdcSchema } from "./sendUSDC";

const { importPrivateKey, signTransactionWithEncryptedKey } = api;

interface LitState {
    nodeClient: LitNodeClient;
    evmWallet?: ethers.Wallet;
    pkp?: {
        publicKey: string;
        ethAddress: string;
        solanaAddress?: string;
    };
    capacityCredit?: {
        tokenId: string;
    };
    wrappedKeyId?: string;
}

// Add template for content extraction
const sendSolTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "amount": "0.1",
    "to": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the SOL transfer:
- amount (the amount of SOL to send)
- to (the destination address)

Respond with a JSON markdown block containing only the extracted values.`;

// Define the schema type
const sendSolSchema = z.object({
    amount: z.string().nullable(),
    to: z.string().nullable()
});

// Add type guard function
function isSendSolContent(content: Content): content is SendSolContent {
    return (
        (typeof content.amount === "string" || content.amount === null) &&
        (typeof content.to === "string" || content.to === null)
    );
}

interface SendSolContent extends Content {
    amount: string | null;
    to: string | null;
}

export const sendSol: Action = {
    name: "SEND_SOL",
    description: "Sends SOL to an address using Lit Wrapped Keys",
    similes: [
        "send sol",
        "send * sol to *",
        "send solana",
        "send * SOL to *",
        "transfer * sol to *",
        "transfer * SOL to *",
    ],
    validate: async (_runtime: IAgentRuntime) => true,
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: Record<string, unknown>,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        console.log("SEND_SOL handler started");
        try {
            // Initialize or update state
            let currentState: State;
            if (!state) {
                currentState = (await runtime.composeState(message)) as State;
            } else {
                currentState = await runtime.updateRecentMessageState(state);
            }

            // Compose context and generate content
            const sendSolContext = composeContext({
                state: currentState,
                template: sendSolTemplate,
            });

            // Generate content with the schema
            // Generate content with the schema
            const content = await generateObject({
                runtime,
                context: sendSolContext,
                schema: sendSolSchema as any,
                modelClass: ModelClass.LARGE,
            });

            const sendSolContent = content.object as SendSolContent;

            // Validate content
            if (!isSendSolContent(sendSolContent)) {
                console.error("Invalid content for SEND_SOL action.");
                callback?.({
                    text: "Unable to process SOL transfer request. Invalid content provided.",
                    content: { error: "Invalid send SOL content" }
                });
                return false;
            }

            if (!sendSolContent.amount) {
                console.log("Amount is not provided, skipping transfer");
                callback?.({ text: "The amount must be provided" });
                return false;
            }

            if (!sendSolContent.to) {
                console.log("Destination address is not provided, skipping transfer");
                callback?.({ text: "The destination address must be provided" });
                return false;
            }

            // Validate Lit environment
            const litState = (state.lit || {}) as LitState;
            if (!litState.nodeClient || !litState.pkp || !litState.evmWallet) {
                throw new Error("Lit environment not fully initialized");
            }

            // Initialize Solana connection
            const connection = new web3.Connection(
                web3.clusterApiUrl("mainnet-beta"),
                "confirmed"
            );

            // Get the private key from config
            const configManager = new LitConfigManager();
            const config = configManager.loadConfig();
            if (!config?.solanaWalletPrivateKey) {
                throw new Error("Solana wallet private key not found in config");
            }

            // Check for existing wrapped key ID in config
            if (config?.wrappedKeyId) {
                litState.wrappedKeyId = config.wrappedKeyId;
            } else {
                // Only create new wrapped key if one doesn't exist
                const ethersSigner = litState.evmWallet;

                console.log("Getting PKP Session Sigs for wrapped key creation...");
                const pkpSessionSigs = await litState.nodeClient.getPkpSessionSigs({
                    pkpPublicKey: litState.pkp.publicKey,
                    authMethods: [
                        await EthWalletProvider.authenticate({
                            signer: ethersSigner,
                            litNodeClient: litState.nodeClient,
                            expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(),
                        }),
                    ],
                    resourceAbilityRequests: [
                        {
                            resource: new LitActionResource("*"),
                            ability: LIT_ABILITY.LitActionExecution,
                        },
                    ],
                    expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(),
                });
                console.log("✅ Successfully created PKP Session Sigs:", !!pkpSessionSigs);

                // Decode and import the private key
                const privateKeyBytes = Buffer.from(config.solanaWalletPrivateKey, 'base64');
                const keypair = web3.Keypair.fromSecretKey(privateKeyBytes);

                console.log("Importing Solana private key as wrapped key...");
                const importResponse = await importPrivateKey({
                    pkpSessionSigs,
                    litNodeClient: litState.nodeClient,
                    privateKey: Buffer.from(keypair.secretKey).toString('hex'),
                    publicKey: keypair.publicKey.toBase58(),
                    keyType: "ed25519",
                    memo: "Solana PKP Wallet",
                });
                console.log("✅ Successfully imported Solana private key as wrapped key:", importResponse.id);

                // Save wrapped key ID to both state and config
                litState.wrappedKeyId = importResponse.id;
                configManager.saveConfig({
                    ...config,
                    wrappedKeyId: importResponse.id,
                });
            }

            // Fund the wallet with 2 devnet SOL if needed
            if (!litState.pkp.solanaAddress) {
                throw new Error("Solana address not found in PKP");
            }
            const fromPubkey = new web3.PublicKey(litState.pkp.solanaAddress);
            const toPubkey = new web3.PublicKey(sendSolContent.to);

            console.log("Sending from wallet address:", fromPubkey.toString());

            // Check current balance
            const balance = await connection.getBalance(fromPubkey);
            console.log("Current wallet balance:", balance / web3.LAMPORTS_PER_SOL, "SOL");

            /* DEVNET ONLY: Uncomment this block when using devnet
            if (balance === 0) {
                try {
                    console.log("Wallet empty, requesting 2 SOL airdrop...");
                    const airdropSignature = await connection.requestAirdrop(
                        fromPubkey,
                        2 * web3.LAMPORTS_PER_SOL
                    );
                    const latestBlockhash = await connection.getLatestBlockhash();
                    await connection.confirmTransaction({
                        signature: airdropSignature,
                        blockhash: latestBlockhash.blockhash,
                        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
                    });
                    console.log("Airdrop successful");
                } catch (error) {
                    console.error("Airdrop failed:", error);
                    throw new Error("Failed to fund wallet with devnet SOL");
                }
            } else {
                console.log("Wallet already has sufficient balance, skipping airdrop");
            }
            */

            // Mainnet balance check (comment this out if using devnet airdrop logic)
            if (balance === 0) {
                throw new Error("Wallet has insufficient balance");
            }

            const transaction = new web3.Transaction().add(
                web3.SystemProgram.transfer({
                    fromPubkey,
                    toPubkey,
                    lamports: web3.LAMPORTS_PER_SOL * Number.parseFloat(sendSolContent.amount),
                })
            );

            // Get recent blockhash
            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = fromPubkey;

            // Get session sigs for transaction signing
            const pkpSessionSigs = await litState.nodeClient.getPkpSessionSigs({
                pkpPublicKey: litState.pkp.publicKey,
                authMethods: [
                    await EthWalletProvider.authenticate({
                        signer: litState.evmWallet,
                        litNodeClient: litState.nodeClient,
                        expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(),
                    }),
                ],
                resourceAbilityRequests: [
                    {
                        resource: new LitActionResource("*"),
                        ability: LIT_ABILITY.LitActionExecution,
                    },
                ],
                expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(),
            });

            // Sign and send transaction
            // For devnet: change 'mainnet-beta' to 'devnet'
            if (!litState.wrappedKeyId) {
                throw new Error("Wrapped key ID not found");
            }
            const signedTx = await signTransactionWithEncryptedKey({
                pkpSessionSigs,
                network: "solana",
                id: litState.wrappedKeyId,
                unsignedTransaction: {
                    chain: 'mainnet-beta',
                    serializedTransaction: transaction.serialize({
                        requireAllSignatures: false,
                    }).toString('base64')
                },
                broadcast: true,
                litNodeClient: litState.nodeClient,
            });

            callback?.({
                text: `Successfully sent ${sendSolContent.amount} SOL to ${sendSolContent.to}. Transaction signature: ${signedTx}`,
                content: {
                    success: true,
                    signature: signedTx,
                    amount: sendSolContent.amount,
                    to: sendSolContent.to,
                },
            });

            return true;
        } catch (error) {
            console.error("Error in sendSol:", error);
            callback?.({
                text: `Failed to send SOL: ${error instanceof Error ? error.message : "Unknown error"
                    }`,
                content: {
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                },
            });
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Send 0.1 SOL to 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully sent SOL",
                },
            },
        ],
    ],
};
```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/actions/index.ts`:

```ts
// export { swapTokens } from "./swapTokens";
export { sendEth } from "./sendEth";
export { sendUSDC } from "./sendUSDC";
export { sendSol } from "./sendSol";

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/types/index.ts`:

```ts
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { PKPEthersWallet } from "@lit-protocol/pkp-ethers";

export interface PKPWallet {
    ethWallet: PKPEthersWallet;
    // solWallet?: any; // TODO: Add Solana wallet type
    tokenId: string;
    publicKey: string;
    ethAddress: string;
}

export interface LitConfig {
    network: "cayenne" | "datilDev" | "datilTest" | "datil";
    debug?: boolean;
    minNodeCount?: number;
}

export interface AuthMethod {
    authMethodType: number;
    accessToken: string;
}

export interface AuthSig {
    sig: string;
    derivedVia: string;
    signedMessage: string;
    address: string;
}

export interface SessionSigs {
    [key: string]: AuthSig;
}

export interface LitClientContext {
    litNodeClient: LitNodeClient;
    sessionSigs?: SessionSigs;
    chain: "ethereum" | "solana";
}

export interface PKPWalletResponse {
    publicKey: string;
    ethAddress: string;
}

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/providers/pkpPermissionsProvider.ts`:

```ts
import { IAgentRuntime, Memory, State } from "@elizaos/core";
import { AUTH_METHOD_SCOPE } from "@lit-protocol/constants";
import { BigNumber, utils } from "ethers";
import { LitContracts } from "@lit-protocol/contracts-sdk";
import { LitNodeClient } from "@lit-protocol/lit-node-client";

interface LitState {
  contractClient: LitContracts;
  nodeClient: LitNodeClient;
  authSig: {
    sig: string;
    derivedVia: string;
    signedMessage: string;
    address: string;
  };
}

export const pkpPermissionsProvider = {
  addPermissions: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    state: State,
    tokenId: string,
    authMethod: {
      authMethodType: number;
      id: string;
      userPubkey: string;
    },
    scopes: (typeof AUTH_METHOD_SCOPE)[]
  ) => {
    const { contractClient } = (state.lit || {}) as LitState;
    if (!contractClient) {
      throw new Error("Lit contracts client not available");
    }

    const tx =
      await contractClient.pkpPermissionsContract.write.addPermittedAuthMethod(
        tokenId,
        authMethod,
        scopes.map((s) => BigNumber.from(s)),
        { gasPrice: utils.parseUnits("1", "gwei"), gasLimit: 400000 }
      );
    await tx.wait();
    return `Permissions added to PKP ${tokenId}`;
  },
};

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/providers/litProvider.ts`:

```ts
import { Provider, Memory, State, IAgentRuntime } from "@elizaos/core";
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LitContracts } from "@lit-protocol/contracts-sdk";
import { LIT_RPC, LIT_NETWORK } from "@lit-protocol/constants";
import { AuthSig } from "@lit-protocol/auth-helpers";
import { PKPEthersWallet } from "@lit-protocol/pkp-ethers";
import * as ethers from "ethers";
import { LitConfigManager, LitConfig } from "../config/configManager.ts";
import * as solanaWeb3 from "@solana/web3.js";

export interface LitState {
  nodeClient: LitNodeClient;
  contractClient: LitContracts;
  authSig?: AuthSig;
  network?: string;
  evmWallet?: ethers.Wallet;
  pkp?: {
    tokenId: string;
    publicKey: string;
    ethAddress: string;
    solanaAddress?: string;
  };
  capacityCredit?: {
    tokenId: string;
  };
}

let executionCount = 0;

// Add a flag to track if the function is already running
let isExecutionInProgress = false;

export const litProvider: Provider = {
  get: async (
    runtime: IAgentRuntime,
    _message: Memory,
    state?: State & { lit?: LitState }
  ) => {
    // Guard against re-execution
    if (isExecutionInProgress) {
      console.log("Execution already in progress, skipping...");
      return;
    }

    try {
      isExecutionInProgress = true;

      // Initialize config manager
      const configManager = new LitConfigManager();

      // Try to load existing config
      const savedConfig = configManager.loadConfig();

      const provider = new ethers.providers.StaticJsonRpcProvider({
        url: LIT_RPC.CHRONICLE_YELLOWSTONE,
        skipFetchSetup: true,
      });

      // If we have saved config and no current state, initialize state from config
      if (savedConfig && !state?.lit?.pkp) {
        if (!state!.lit) {
          state!.lit = {} as LitState;
        }
        state!.lit.pkp = savedConfig.pkp;
        state!.lit.network = savedConfig.network;
        state!.lit.capacityCredit = savedConfig.capacityCredit;

        // Initialize wallet from saved private key
        if (savedConfig.evmWalletPrivateKey) {
          state!.lit.evmWallet = new ethers.Wallet(
            savedConfig.evmWalletPrivateKey,
            provider
          );
        }

        // Verify the saved config is still valid
        const isValid = await configManager.verifyConfig(savedConfig);
        if (!isValid) {
          console.log("Saved config is invalid, will create new PKP");
          state!.lit.pkp = undefined;
          state!.lit.evmWallet = undefined;
        }
      }

      // Strengthen the check for existing initialization
      if (state?.lit?.nodeClient && state?.lit?.contractClient) {
        console.log("📝 Reusing existing Lit environment", {
          network: state.lit.network,
          pkpAddress: state?.lit?.pkp?.ethAddress,
        });
        return `Reusing existing Lit environment on network ${state.lit.network}`;
      }

      // Only proceed with initialization if we don't have all required components

      // Initialize basic Lit client if not exists
      const litNodeClient =
        state?.lit?.nodeClient ||
        new LitNodeClient({
          litNetwork: LIT_NETWORK.DatilTest,
          debug: false,
        });

      if (!state?.lit?.nodeClient) {
        await litNodeClient.connect();
        console.log("✅ Connected to the Lit network");
      }

      const thisExecution = ++executionCount;
      console.log(`Starting execution #${thisExecution}`, {
        hasExistingClient: !!state?.lit?.nodeClient,
        messageId: _message?.id, // If messages have IDs
      });

      const network = await provider.getNetwork();
      const networkName =
        network.name !== "unknown"
          ? network.name
          : `Chain ID ${network.chainId}`;

      // Create funding wallet with provider
      const fundingWallet = new ethers.Wallet(
        runtime.getSetting("FUNDING_PRIVATE_KEY"),
        provider
      );

      // Initialize evmWallet first
      let evmWallet =
        state!.lit?.evmWallet || ethers.Wallet.createRandom().connect(provider);
      state!.lit =
        state!.lit ||
        ({
          nodeClient: litNodeClient,
          contractClient: {} as LitContracts,
          wallet: {} as PKPEthersWallet,
          evmWallet: evmWallet,
        } as LitState);

      // Initialize contract client with evmWallet as signer
      const contractClient = new LitContracts({
        network: LIT_NETWORK.DatilTest,
        signer: evmWallet,
      });
      await contractClient.connect();
      console.log("✅ Connected LitContracts client to network");

      let pkpPublicKey =
        runtime.getSetting("LIT_PKP_PUBLIC_KEY") || state?.lit?.pkp?.publicKey;

      // If no PKP exists, mint a new one
      if (!pkpPublicKey) {
        console.log("🔄 No PKP found. Creating new dual wallet...");

        if (!state!.lit) {
          state!.lit = {} as LitState;
        }
        let evmWallet =
          state!.lit.evmWallet ||
          ethers.Wallet.createRandom().connect(provider);

        // Make sure to store the wallet in the state
        state!.lit.evmWallet = evmWallet;

        // Generate Solana Wallet
        const svmWallet = solanaWeb3.Keypair.generate();

        // Check the balance of the funding wallet
        const balance = await provider.getBalance(fundingWallet.address);
        console.log(
          `Funding wallet balance: ${ethers.utils.formatEther(balance)} tstLPX`
        );

        // Fund the EVM wallet first
        try {
          console.log("Funding new EVM wallet with gas...");

          const tx = await fundingWallet.sendTransaction({
            to: evmWallet.address,
            value: ethers.utils.parseEther("0.006"),
            gasLimit: 21000,
          });

          console.log(`Funding transaction sent. Hash: ${tx.hash}`);
          const receipt = await tx.wait();
          console.log("💰 EVM Wallet funded successfully", {
            gasUsed: receipt.gasUsed.toString(),
            fundedAmount: "0.006",
          });

          const mintResult =
            await contractClient.pkpNftContractUtils.write.mint();

          console.log("✅ Dual PKP minted:", {
            tokenId: mintResult.pkp.tokenId,
            publicKey: mintResult.pkp.publicKey,
            ethAddress: mintResult.pkp.ethAddress,
            solanaAddress: svmWallet.publicKey.toString(),
          });

          pkpPublicKey = mintResult.pkp.publicKey;

          if (!state!.lit) {
            state!.lit = {} as LitState;
          }

          state!.lit.pkp = {
            tokenId: mintResult.pkp.tokenId,
            publicKey: mintResult.pkp.publicKey,
            ethAddress: mintResult.pkp.ethAddress,
            solanaAddress: svmWallet.publicKey.toString(),
          };

          const newConfig: LitConfig = {
            pkp: {
              tokenId: mintResult.pkp.tokenId,
              publicKey: mintResult.pkp.publicKey,
              ethAddress: mintResult.pkp.ethAddress,
              solanaAddress: svmWallet.publicKey.toString(),
            },
            network: networkName,
            timestamp: Date.now(),
            evmWalletPrivateKey: evmWallet.privateKey,
            solanaWalletPrivateKey: Buffer.from(svmWallet.secretKey).toString('base64'),
          };

          configManager.saveConfig(newConfig);
        } catch (error) {
          console.error("Failed to mint dual PKP:", error);
          throw error;
        }
      }

      // Mint capacity credit if not exists
      if (!state!.lit?.capacityCredit?.tokenId) {
        const capacityCreditClient = new LitContracts({
          network: LIT_NETWORK.DatilTest,
          signer: fundingWallet,
        });
        await capacityCreditClient.connect();
        console.log("🔄 Minting Capacity Credit NFT...");
        const capacityCreditInfo =
          await capacityCreditClient.mintCapacityCreditsNFT({
            requestsPerKilosecond: 80,
            daysUntilUTCMidnightExpiration: 1,
          });

        // Store the capacity credit token ID
        state!.lit!.capacityCredit = {
          tokenId: capacityCreditInfo.capacityTokenIdStr, // This is your resource ID
        };
        console.log(
          `✅ Minted Capacity Credit with ID: ${capacityCreditInfo.capacityTokenIdStr}`
        );

        // Save the updated config with capacity credit
        const currentConfig = configManager.loadConfig();
        const updatedConfig: LitConfig = {
          ...currentConfig,
          capacityCredit: {
            tokenId: capacityCreditInfo.capacityTokenIdStr,
          },
          timestamp: Date.now(),
        };
        configManager.saveConfig(updatedConfig);
      }

      // Update state with the initialized wallet and other components
      state!.lit = {
        nodeClient: litNodeClient,
        contractClient,
        network: networkName,
        evmWallet: evmWallet,
        pkp: state!.lit?.pkp || {
          tokenId: state!.lit?.pkp?.tokenId,
          publicKey: pkpPublicKey,
          ethAddress: state!.lit?.pkp?.ethAddress,
          solanaAddress: state!.lit?.pkp?.solanaAddress,
        },
        capacityCredit: state!.lit?.capacityCredit,
      };

      return `Lit environment initialized with network ${networkName}`;
    } finally {
      isExecutionInProgress = false;
    }
  },
};

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/providers/index.ts`:

```ts
export * from "./litProvider";
export * from "./pkpPermissionsProvider";

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/index.ts`:

```ts
export * from "./actions/helloLit/helloLit";
export * from "./actions/tools/erc20transfer/toolCall";
export * from "./actions/tools/ecdsaSign/toolCall";
export * from "./actions/tools/uniswapSwap/toolCall";

import type { Plugin } from "@elizaos/core";
import { HELLO_LIT_ACTION } from "./actions/helloLit/helloLit";
import { WALLET_TRANSFER_LIT_ACTION } from "./actions/tools/erc20transfer/toolCall";
import { ECDSA_SIGN_LIT_ACTION } from "./actions/tools/ecdsaSign/toolCall";
import { UNISWAP_SWAP_LIT_ACTION } from "./actions/tools/uniswapSwap/toolCall";

export const litPlugin: Plugin = {
    name: "lit",
    description: "Lit Protocol integration plugin",
    providers: [],
    evaluators: [],
    services: [],
    actions: [WALLET_TRANSFER_LIT_ACTION, HELLO_LIT_ACTION, 
              ECDSA_SIGN_LIT_ACTION, UNISWAP_SWAP_LIT_ACTION],
};

export default litPlugin;

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-lit/src/config/configManager.ts`:

```ts
import fs from "node:fs";
import path from "node:path";

export interface LitConfig {
  pkp: {
    tokenId: string;
    publicKey: string;
    ethAddress: string;
    solanaAddress?: string;
  };
  network: string;
  timestamp: number;
  evmWalletPrivateKey: string;
  solanaWalletPrivateKey?: string;
  wrappedKeyId?: string;
  capacityCredit?: {
    tokenId: string;
  };
}

export class LitConfigManager {
  private configPath: string;

  constructor() {
    this.configPath = path.join(process.cwd(), "lit-config.json");
    console.log("LitConfigManager initialized with path:", this.configPath);
  }

  loadConfig(): LitConfig | null {
    try {
      if (fs.existsSync(this.configPath)) {
        const config = JSON.parse(fs.readFileSync(this.configPath, "utf8"));
        return config;
      }
    } catch (error) {
      console.error("Error loading config:", error);
    }
    return null;
  }

  saveConfig(config: LitConfig): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error("Error saving config:", error);
    }
  }

  async verifyConfig(_config: LitConfig): Promise<boolean> {
    // Add verification logic here
    // For example, check if the PKP is still valid
    // Return false if verification fails
    return true;
  }
}

```
