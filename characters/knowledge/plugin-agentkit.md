Project Path: plugin-agentkit

Source Tree:

```
plugin-agentkit
├── tsup.config.ts
├── package.json
├── vitest.config.ts
├── README.md
├── __tests__
│   └── provider.test.ts
├── tsconfig.json
└── src
    ├── actions.ts
    ├── provider.ts
    └── index.ts

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-agentkit/tsup.config.ts`:

```ts
import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "dist",
    sourcemap: true,
    clean: true,
    format: ["esm"], // Ensure you're targeting CommonJS
    external: [
        "dotenv", // Externalize dotenv to prevent bundling
        "fs", // Externalize fs to use Node.js built-in module
        "path", // Externalize other built-ins if necessary
        "@reflink/reflink",
        "@node-llama-cpp",
        "https",
        "http",
        "agentkeepalive",
        "viem",
        "@lifi/sdk",
    ],
});

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-agentkit/package.json`:

```json
{
    "name": "@elizaos/plugin-agentkit",
    "version": "0.1.9",
    "main": "dist/index.js",
    "type": "module",
    "types": "dist/index.d.ts",
    "dependencies": {
        "@elizaos/core": "workspace:*",
        "@coinbase/cdp-agentkit-core": "^0.0.10",
        "@coinbase/cdp-langchain": "^0.0.11",
        "@langchain/core": "^0.3.27",
        "tsup": "8.3.5"
    },
    "devDependencies": {
        "vitest": "^1.0.0"
    },
    "scripts": {
        "build": "tsup --format esm --dts",
        "dev": "tsup --format esm --dts --watch",
        "test": "vitest run",
        "test:watch": "vitest watch",
        "test:coverage": "vitest run --coverage"
    }
}

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-agentkit/vitest.config.ts`:

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        coverage: {
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.ts'],
            exclude: ['**/*.test.ts', '**/*.d.ts']
        }
    }
});

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-agentkit/README.md`:

```md
# @elizaos/plugin-agentkit

AgentKit plugin for Eliza that enables interaction with CDP AgentKit tools for NFT and token management.

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Configure environment variables:

```env
CDP_API_KEY_NAME=your_key_name
CDP_API_KEY_PRIVATE_KEY=your_private_key
CDP_AGENT_KIT_NETWORK=base-sepolia # Optional: Defaults to base-sepolia
```

3. Add the plugin to your character configuration:

```json
{
    "plugins": ["@elizaos/plugin-agentkit"],
    "settings": {
        "secrets": {
            "CDP_API_KEY_NAME": "your_key_name",
            "CDP_API_KEY_PRIVATE_KEY": "your_private_key"
        }
    }
}
```

## Available Tools

The plugin provides access to the following CDP AgentKit tools:

-   `GET_WALLET_DETAILS`: Get wallet information
-   `DEPLOY_NFT`: Deploy a new NFT collection
-   `DEPLOY_TOKEN`: Deploy a new token
-   `GET_BALANCE`: Check token or NFT balance
-   `MINT_NFT`: Mint NFTs from a collection
-   `REGISTER_BASENAME`: Register a basename for NFTs
-   `REQUEST_FAUCET_FUNDS`: Request testnet funds
-   `TRADE`: Execute trades
-   `TRANSFER`: Transfer tokens or NFTs
-   `WOW_BUY_TOKEN`: Buy WOW tokens
-   `WOW_SELL_TOKEN`: Sell WOW tokens
-   `WOW_CREATE_TOKEN`: Create new WOW tokens

## Usage Examples

1. Get wallet details:

```
Can you show me my wallet details?
```

2. Deploy an NFT collection:

```
Deploy a new NFT collection called "Music NFTs" with symbol "MUSIC"
```

3. Create a token:

```
Create a new WOW token called "Artist Token" with symbol "ART"
```

4. Check balance:

```
What's my current balance?
```

## Development

1. Build the plugin:

```bash
pnpm build
```

2. Run in development mode:

```bash
pnpm dev
```

## Dependencies

-   @elizaos/core
-   @coinbase/cdp-agentkit-core
-   @coinbase/cdp-langchain
-   @langchain/core

## Network Support

The plugin supports the following networks:

-   Base Sepolia (default)
-   Base Mainnet

Configure the network using the `CDP_AGENT_KIT_NETWORK` environment variable.

## Troubleshooting

1. If tools are not being triggered:

    - Verify CDP API key configuration
    - Check network settings
    - Ensure character configuration includes the plugin

2. Common errors:
    - "Cannot find package": Make sure dependencies are installed
    - "API key not found": Check environment variables
    - "Network error": Verify network configuration

## License

MIT

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-agentkit/__tests__/provider.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getClient, walletProvider } from '../src/provider';
import { CdpAgentkit } from '@coinbase/cdp-agentkit-core';
import * as fs from 'fs';

// Mock dependencies
vi.mock('@coinbase/cdp-agentkit-core', () => ({
    CdpAgentkit: {
        configureWithWallet: vi.fn().mockImplementation(async (config) => ({
            exportWallet: vi.fn().mockResolvedValue('mocked-wallet-data'),
            wallet: {
                addresses: [{ id: '0x123...abc' }]
            }
        }))
    }
}));

vi.mock('fs', () => ({
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn()
}));

describe('AgentKit Provider', () => {
    const mockRuntime = {
        name: 'test-runtime',
        memory: new Map(),
        getMemory: vi.fn(),
        setMemory: vi.fn(),
        clearMemory: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.CDP_AGENT_KIT_NETWORK = 'base-sepolia';
    });

    afterEach(() => {
        delete process.env.CDP_AGENT_KIT_NETWORK;
    });

    describe('getClient', () => {
        it('should create new wallet when no existing wallet data', async () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);

            const client = await getClient();
            
            expect(CdpAgentkit.configureWithWallet).toHaveBeenCalledWith({
                networkId: 'base-sepolia'
            });
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                'wallet_data.txt',
                'mocked-wallet-data'
            );
            expect(client).toBeDefined();
        });

        it('should use existing wallet data when available', async () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue('existing-wallet-data');

            const client = await getClient();
            
            expect(CdpAgentkit.configureWithWallet).toHaveBeenCalledWith({
                cdpWalletData: 'existing-wallet-data',
                networkId: 'base-sepolia'
            });
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                'wallet_data.txt',
                'mocked-wallet-data'
            );
            expect(client).toBeDefined();
        });

        it('should handle file read errors gracefully', async () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockImplementation(() => {
                throw new Error('File read error');
            });

            const client = await getClient();
            
            expect(CdpAgentkit.configureWithWallet).toHaveBeenCalledWith({
                networkId: 'base-sepolia'
            });
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                'wallet_data.txt',
                'mocked-wallet-data'
            );
            expect(client).toBeDefined();
        });

        it('should use custom network from environment variable', async () => {
            process.env.CDP_AGENT_KIT_NETWORK = 'custom-network';
            vi.mocked(fs.existsSync).mockReturnValue(false);

            await getClient();
            
            expect(CdpAgentkit.configureWithWallet).toHaveBeenCalledWith({
                networkId: 'custom-network'
            });
        });
    });

    describe('walletProvider', () => {
        it('should return wallet address', async () => {
            const result = await walletProvider.get(mockRuntime);
            expect(result).toBe('AgentKit Wallet Address: 0x123...abc');
        });

        it('should handle errors and return null', async () => {
            vi.mocked(CdpAgentkit.configureWithWallet).mockRejectedValueOnce(
                new Error('Configuration failed')
            );

            const result = await walletProvider.get(mockRuntime);
            expect(result).toBeNull();
        });
    });
});

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-agentkit/tsconfig.json`:

```json
{
    "extends": "../core/tsconfig.json",
    "compilerOptions": {
        "outDir": "dist",
        "rootDir": "./src",
        "declaration": true
    },
    "include": ["src"]
}

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-agentkit/src/actions.ts`:

```ts
import {
    type Action,
    generateText,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    ModelClass,
    type State,
    composeContext,
    generateObject,
} from "@elizaos/core";
import type { CdpAgentkit } from "@coinbase/cdp-agentkit-core";
import { CdpToolkit, type Tool } from "@coinbase/cdp-langchain";

type GetAgentKitActionsParams = {
    getClient: () => Promise<CdpAgentkit>;
    config?: {
        networkId?: string;
    };
};

/**
 * Get all AgentKit actions
 */
export async function getAgentKitActions({
    getClient,
}: GetAgentKitActionsParams): Promise<Action[]> {
    const agentkit = await getClient();
    const cdpToolkit = new CdpToolkit(agentkit);
    const tools = cdpToolkit.getTools();
    const actions = tools.map((tool: Tool) => ({
        name: tool.name.toUpperCase(),
        description: tool.description,
        similes: [],
        validate: async () => true,
        handler: async (
            runtime: IAgentRuntime,
            message: Memory,
            state: State | undefined,
            options?: Record<string, unknown>,
            callback?: HandlerCallback
        ): Promise<boolean> => {
            try {
                const client = await getClient();
                let currentState =
                    state ?? (await runtime.composeState(message));
                currentState = await runtime.updateRecentMessageState(
                    currentState
                );

                const parameterContext = composeParameterContext(
                    tool,
                    currentState
                );
                const parameters = await generateParameters(
                    runtime,
                    parameterContext,
                    tool
                );

                const result = await executeToolAction(
                    tool,
                    parameters,
                    client
                );

                const responseContext = composeResponseContext(
                    tool,
                    result,
                    currentState
                );
                const response = await generateResponse(
                    runtime,
                    responseContext
                );

                callback?.({ text: response, content: result });
                return true;
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                callback?.({
                    text: `Error executing action ${tool.name}: ${errorMessage}`,
                    content: { error: errorMessage },
                });
                return false;
            }
        },
        examples: [],
    }));
    return actions;
}

async function executeToolAction(
    tool: Tool,
    parameters: any,
    client: CdpAgentkit
): Promise<unknown> {
    const toolkit = new CdpToolkit(client);
    const tools = toolkit.getTools();
    const selectedTool = tools.find((t) => t.name === tool.name);

    if (!selectedTool) {
        throw new Error(`Tool ${tool.name} not found`);
    }

    return await selectedTool.call(parameters);
}

function composeParameterContext(tool: any, state: State): string {
    const contextTemplate = `{{recentMessages}}

Given the recent messages, extract the following information for the action "${tool.name}":
${tool.description}
`;
    return composeContext({ state, template: contextTemplate });
}

async function generateParameters(
    runtime: IAgentRuntime,
    context: string,
    tool: Tool
): Promise<unknown> {
    const { object } = await generateObject({
        runtime,
        context,
        modelClass: ModelClass.LARGE,
        schema: tool.schema,
    });

    return object;
}

function composeResponseContext(
    tool: Tool,
    result: unknown,
    state: State
): string {
    const responseTemplate = `
# Action Examples
{{actionExamples}}

# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

The action "${tool.name}" was executed successfully.
Here is the result:
${JSON.stringify(result)}

{{actions}}

Respond to the message knowing that the action was successful and these were the previous messages:
{{recentMessages}}
`;
    return composeContext({ state, template: responseTemplate });
}

async function generateResponse(
    runtime: IAgentRuntime,
    context: string
): Promise<string> {
    return generateText({
        runtime,
        context,
        modelClass: ModelClass.LARGE,
    });
}

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-agentkit/src/provider.ts`:

```ts
import type { Provider, IAgentRuntime } from "@elizaos/core";
import { CdpAgentkit } from "@coinbase/cdp-agentkit-core";
import * as fs from "fs";

const WALLET_DATA_FILE = "wallet_data.txt";

export async function getClient(): Promise<CdpAgentkit> {
    // Validate required environment variables first
    const apiKeyName = process.env.CDP_API_KEY_NAME;
    const apiKeyPrivateKey = process.env.CDP_API_KEY_PRIVATE_KEY;

    if (!apiKeyName || !apiKeyPrivateKey) {
        throw new Error("Missing required CDP API credentials. Please set CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY environment variables.");
    }

    let walletDataStr: string | null = null;

    // Read existing wallet data if available
    if (fs.existsSync(WALLET_DATA_FILE)) {
        try {
            walletDataStr = fs.readFileSync(WALLET_DATA_FILE, "utf8");
        } catch (error) {
            console.error("Error reading wallet data:", error);
            // Continue without wallet data
        }
    }

    // Configure CDP AgentKit
    const config = {
        cdpWalletData: walletDataStr || undefined,
        networkId: process.env.CDP_AGENT_KIT_NETWORK || "base-sepolia",
        apiKeyName: apiKeyName,
        apiKeyPrivateKey: apiKeyPrivateKey
    };

    try {
        const agentkit = await CdpAgentkit.configureWithWallet(config);
        // Save wallet data
        const exportedWallet = await agentkit.exportWallet();
        fs.writeFileSync(WALLET_DATA_FILE, exportedWallet);
        return agentkit;
    } catch (error) {
        console.error("Failed to initialize CDP AgentKit:", error);
        throw new Error(`Failed to initialize CDP AgentKit: ${error.message || 'Unknown error'}`);
    }
}

export const walletProvider: Provider = {
    async get(runtime: IAgentRuntime): Promise<string | null> {
        try {
            const client = await getClient();
            const address = (await (client as any).wallet.addresses)[0].id;
            return `AgentKit Wallet Address: ${address}`;
        } catch (error) {
            console.error("Error in AgentKit provider:", error);
            return `Error initializing AgentKit wallet: ${error.message}`;
        }
    },
};

```

`/home/ygg/Workspace/Eliza/GAIAv0.1.9/packages/plugin-agentkit/src/index.ts`:

```ts
import type { Plugin } from "@elizaos/core";
import { walletProvider, getClient } from "./provider";
import { getAgentKitActions } from "./actions";

// Initial banner
console.log("\n┌════════════════════════════════════════┐");
console.log("│          AGENTKIT PLUGIN               │");
console.log("├────────────────────────────────────────┤");
console.log("│  Initializing AgentKit Plugin...       │");
console.log("│  Version: 0.0.1                        │");
console.log("└════════════════════════════════════════┘");

const initializeActions = async () => {
    try {
        // Validate environment variables
        const apiKeyName = process.env.CDP_API_KEY_NAME;
        const apiKeyPrivateKey = process.env.CDP_API_KEY_PRIVATE_KEY;

        if (!apiKeyName || !apiKeyPrivateKey) {
            console.warn("⚠️ Missing CDP API credentials - AgentKit actions will not be available");
            return [];
        }

        const actions = await getAgentKitActions({
            getClient,
        });
        console.log("✔ AgentKit actions initialized successfully.");
        return actions;
    } catch (error) {
        console.error("❌ Failed to initialize AgentKit actions:", error);
        return []; // Return empty array instead of failing
    }
};

export const agentKitPlugin: Plugin = {
    name: "[AgentKit] Integration",
    description: "AgentKit integration plugin",
    providers: [walletProvider],
    evaluators: [],
    services: [],
    actions: await initializeActions(),
};

export default agentKitPlugin;

```
