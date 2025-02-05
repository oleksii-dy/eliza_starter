Project Path: plugin-zerion

Source Tree:

```
plugin-zerion
├── tsup.config.ts
├── package.json
├── README.md
├── tsconfig.json
├── eslint.config.mjs
└── src
    ├── utils.ts
    ├── constants.ts
    ├── types.ts
    ├── actions
    │   ├── getWalletPortfolio
    │   │   ├── examples.ts
    │   │   └── index.ts
    │   └── getWalletPositions
    │       ├── examples.ts
    │       └── index.ts
    ├── providers
    │   └── index.ts
    └── index.ts

```

`/home/ygg/Workspace/Eliza/GAIA-Agentic-Hackathon/packages/plugin-zerion/tsup.config.ts`:

```ts
import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "dist",
    sourcemap: true,
    clean: true,
    dts: true,
    format: ["esm"],
    external: [
        "dotenv",
        "fs",
        "path",
        "@reflink/reflink",
        "@node-llama-cpp",
        "https",
        "http",
        "agentkeepalive",
    ],
});

```

`/home/ygg/Workspace/Eliza/GAIA-Agentic-Hackathon/packages/plugin-zerion/package.json`:

```json
{
    "name": "@elizaos/plugin-zerion",
    "version": "0.1.9",
    "main": "dist/index.js",
    "type": "module",
    "types": "dist/index.d.ts",
    "dependencies": {
        "@elizaos/core": "workspace:*"
    },
    "devDependencies": {
        "tsup": "^8.3.5"
    },
    "scripts": {
        "build": "tsup --format esm --dts",
        "dev": "tsup --format esm --dts --watch",
        "lint": "eslint --fix  --cache ."
    }
}

```

`/home/ygg/Workspace/Eliza/GAIA-Agentic-Hackathon/packages/plugin-zerion/README.md`:

```md
# @elizaos/plugin-zerion

A plugin for Eliza that enables fetching wallet portfolio and position data using the Zerion API.

## Features

- Real-time wallet portfolio data
- Detailed token positions and balances
- Chain distribution analysis
- Portfolio value changes tracking
- Support for all EVM-compatible chains
- Natural language processing for wallet queries

## Installation

```bash
npm install @elizaos/plugin-zerion
```

## Configuration

1. Get your API key from [Zerion](https://developers.zerion.io)

2. Set up your environment variables:

```bash
ZERION_API_KEY=your_api_key
```

3. Register the plugin in your Eliza configuration:

```typescript
import { zerionPlugin } from "@elizaos/plugin-zerion";

// In your Eliza configuration
plugins: [
    zerionPlugin,
    // ... other plugins
];
```

## Usage

The plugin responds to natural language queries about wallet data. Here are some examples:

```plaintext
"Show me the portfolio for 0x123...abc"
"What are the token positions in 0x456...def?"
"Get wallet holdings for 0x789...ghi"
```

### Available Actions

#### getWallet_portfolio

Fetches comprehensive portfolio data for a wallet address, including:
- Total portfolio value
- Chain distribution
- Position type distribution
- 24h value changes

```typescript
// Example response format
{
  totalValue: number;
  chainDistribution: Record<string, number>;
  positionTypes: Record<string, number>;
  changes: {
    absolute_1d: number;
    percent_1d: number;
  };
}
```

#### getWallet_positions

Fetches detailed information about all token positions in a wallet:
- Token name and symbol
- Quantity and current value
- Price and 24h change
- Chain information
- Verification status

```typescript
// Example response format
{
  positions: Array<{
    name: string;
    symbol: string;
    quantity: number;
    value: number;
    price: number;
    chain: string;
    change24h: number | null;
    verified: boolean;
  }>;
  totalValue: number;
}
```

## API Reference

### Environment Variables

| Variable       | Description          | Required |
| ------------- | -------------------- | -------- |
| ZERION_API_KEY | Your Zerion API key  | Yes      |

## Error Handling

## Support

For support, please open an issue in the repository or reach out to the maintainers.
telegram: @singhal_pranav

## Links

- [Zerion API Documentation](https://developers.zerion.io/reference/intro)
- [GitHub Repository](https://github.com/elizaos/eliza/tree/main/packages/plugin-zerion) 
```

`/home/ygg/Workspace/Eliza/GAIA-Agentic-Hackathon/packages/plugin-zerion/tsconfig.json`:

```json
{
    "extends": "../core/tsconfig.json",
    "compilerOptions": {
        "outDir": "dist",
        "rootDir": "src"
    },
    "include": [
        "src/**/*.ts"
    ]
}
```

`/home/ygg/Workspace/Eliza/GAIA-Agentic-Hackathon/packages/plugin-zerion/eslint.config.mjs`:

```mjs
import eslintGlobalConfig from "../../eslint.config.mjs";

export default [...eslintGlobalConfig];

```

`/home/ygg/Workspace/Eliza/GAIA-Agentic-Hackathon/packages/plugin-zerion/src/utils.ts`:

```ts
import { PortfolioData, PositionData } from "./types";

export const formatPortfolioData = (data: PortfolioData) => {
    return `Total Value of the portfolio is $${data.totalValue.toFixed(2)}. In 24 hours the portfolio has changed by (${data.changes.percent_1d}%).`;
}

export const formatPositionsData = (data: PositionData) => {
    let response = `Total Portfolio Value: $${data.totalValue.toFixed(2)}\n\nToken Positions:\n`;

    // Sort positions by value (descending), putting null values at the end
    const sortedPositions = [...data.positions].sort((a, b) => {
        if (a.value === null && b.value === null) return 0;
        if (a.value === null) return 1;
        if (b.value === null) return -1;
        return b.value - a.value;
    });

    for (const position of sortedPositions) {
        const valueStr = position.value !== null ? `$${position.value.toFixed(2)}` : 'N/A';
        const change24hStr = position.change24h !== null ? `${position.change24h.toFixed(2)}%` : 'N/A';

        response += `${position.name} Value: ${valueStr} 24h Change: ${change24hStr}\n`;
    }

    return response;
}
```

`/home/ygg/Workspace/Eliza/GAIA-Agentic-Hackathon/packages/plugin-zerion/src/constants.ts`:

```ts
export const ZERION_V1_BASE_URL = "https://api.zerion.io/v1";
```

`/home/ygg/Workspace/Eliza/GAIA-Agentic-Hackathon/packages/plugin-zerion/src/types.ts`:

```ts
export type ZerionPortfolioResponse = {
    data: {
        type: string;
        id: string;
        attributes: {
            positions_distribution_by_type: {
                wallet: number;
                deposited: number;
                borrowed: number;
                locked: number;
                staked: number;
            };
            positions_distribution_by_chain: {
                [key: string]: number;
            };
            total: {
                positions: number;
            };
            changes: {
                absolute_1d: number;
                percent_1d: number;
            };
        };
    };
}

export type ZerionPositionResponse = {
    data: Array<{
        type: string;
        id: string;
        attributes: {
            parent: any;
            protocol: any;
            name: string;
            position_type: string;
            quantity: {
                int: string;
                decimals: number;
                float: number;
                numeric: string;
            };
            value: number | null;
            price: number | null;
            changes: {
                absolute_1d: number | null;
                percent_1d: number | null;
            } | null;
            fungible_info: {
                name: string;
                symbol: string;
                icon: {
                    url: string;
                } | null;
                flags: {
                    verified: boolean;
                };
            };
            flags: {
                displayable: boolean;
                is_trash: boolean;
            };
        };
        relationships: {
            chain: {
                data: {
                    type: string;
                    id: string;
                };
            };
        };
    }>;
}

export type PortfolioData = {
    totalValue: number;
    chainDistribution: { [key: string]: number };
    positionTypes: {
        wallet: number;
        deposited: number;
        borrowed: number;
        locked: number;
        staked: number;
    };
    changes: {
        absolute_1d: number;
        percent_1d: number;
    };
}

export type PositionData = {
    positions: Array<{
        name: string;
        symbol: string;
        quantity: number;
        value: number | null;
        price: number | null;
        chain: string;
        change24h: number | null;
        verified: boolean;
    }>;
    totalValue: number;
}

export type ZerionProviderResponse = {
    success: boolean;
    data?: PortfolioData | PositionData;
    error?: string;
}
```

`/home/ygg/Workspace/Eliza/GAIA-Agentic-Hackathon/packages/plugin-zerion/src/actions/getWalletPortfolio/examples.ts`:

```ts
export default [
    [
        {
            user: "{{user1}}",
            content: {
                text: "check the wallet balance of: {{address}}",
            },
        },
        {
            user: "{{agentName}}",
            content: {
                text: "Total Value of the portfolio is $5000",
                action: "getwallet_portfolio",
            },
        },
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "what's the balance for {{address}}",
            },
        },
        {
            user: "{{agentName}}",
            content: {
                text: "I will fetch the portfolio for {{address}}",
                action: "getwallet_portfolio",
            },
        },
        {
            user: "{{agentName}}",
            content: {
                text: "Total Value of the portfolio is $40248.64",
            },
        },
    ],
];
```

`/home/ygg/Workspace/Eliza/GAIA-Agentic-Hackathon/packages/plugin-zerion/src/actions/getWalletPortfolio/index.ts`:

```ts
import { Action, HandlerCallback, IAgentRuntime, Memory, State } from "@elizaos/core";
import { zerionProvider } from "../../providers/index.ts";
import { formatPortfolioData } from "../../utils.ts";
import { PortfolioData, PositionData } from "../../types.ts";
import examples from "./examples.ts";



export const getWalletPortfolio: Action = {
    name: "getwallet_portfolio",
    description: "Fetch a wallet's portfolio data from Zerion for an address",
    similes: [
        "getwallet_portfolio",
        "displayportfolio",
        "getwallet_holdings",
        "getwallet_balance",
        "getwallet_value",
        "get_portfolio_value",
        "get wallet portfolio",
        "get wallet holdings",
        "get wallet balance",
        "get wallet value",
    ],
    examples: examples,
    validate: async (_runtime: IAgentRuntime, message: Memory) => {

        const addressRegex = /0x[a-fA-F0-9]{40}/;
        return addressRegex.test(message.content.text);
    },
    handler: async (runtime: IAgentRuntime, message: Memory, _state?: State, _options?: { [key: string]: unknown; }, callback?: HandlerCallback): Promise<boolean> => {
        console.log("inside handler of zerion");
        const response = await zerionProvider.get(runtime, message);
        console.log("ZERION portfolioAPI response: ", response);
        if (!response.success || !response.data) {
            return false;
        }

        console.log("ZERION API response: ", response);

        // Add type guard to ensure we have PortfolioData
        if (!isPortfolioData(response.data)) {
            return false;
        }

        // format response into a message string;
        const formattedResponse = formatPortfolioData(response.data);

        if (callback) {
            console.log("sending response to callback");
            callback({
                text: formattedResponse,
                content: {
                    ...response.data
                }
            })
        }
        return true;
    }
}

// Add type guard function
function isPortfolioData(data: PortfolioData | PositionData): data is PortfolioData {
    return (
        'chainDistribution' in data &&
        'positionTypes' in data &&
        'changes' in data
    );
}
```

`/home/ygg/Workspace/Eliza/GAIA-Agentic-Hackathon/packages/plugin-zerion/src/actions/getWalletPositions/examples.ts`:

```ts
export default [
    [
        {
            user: "{{user1}}",
            content: {
                text: "Show me the tokens in wallet 0x687fb7a442973c53674ac65bfcaf287860ba6db3",
            },
        },
        {
            user: "{{agentName}}",
            content: {
                text: "I'll fetch the token positions for wallet 0x687fb7a442973c53674ac65bfcaf287860ba6db3",
                action: "getwallet_positions",
            },
        },
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "What tokens does 0x687fb7a442973c53674ac65bfcaf287860ba6db3 hold?",
            },
        },
        {
            user: "{{agentName}}",
            content: {
                text: "I'll check what tokens are held in wallet 0x687fb7a442973c53674ac65bfcaf287860ba6db3",
                action: "getwallet_positions",
            },
        },
        {
            user: "{{agentName}}",
            content: {
                text: "Total Portfolio Value: $40248.64\n\nToken Positions:\n",
            },
        },
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "List the positions for 0x687fb7a442973c53674ac65bfcaf287860ba6db3",
            },
        },
        {
            user: "{{agentName}}",
            content: {
                text: "I'll get all token positions for wallet 0x687fb7a442973c53674ac65bfcaf287860ba6db3",
                action: "getwallet_positions",
            },
        },
    ],
]; 
```

`/home/ygg/Workspace/Eliza/GAIA-Agentic-Hackathon/packages/plugin-zerion/src/actions/getWalletPositions/index.ts`:

```ts
import { Action, HandlerCallback, IAgentRuntime, Memory, State } from "@elizaos/core";
import { zerionProvider } from "../../providers/index.ts";
import { PositionData } from "../../types.ts";
import { formatPositionsData } from "../../utils.ts";
import examples from "./examples.ts";

export const getWalletPositions: Action = {
    name: "getwallet_positions",
    description: "Fetch a wallet's token positions from Zerion for an address",
    examples,
    similes: [
        "getwallet_positions",
        "displaypositions",
        "getwallet_tokens",
        "get_token_positions",
        "get wallet positions",
        "get wallet tokens",
        "get token positions",
        "list tokens",
    ],
    validate: async (_runtime: IAgentRuntime, message: Memory) => {
        const addressRegex = /0x[a-fA-F0-9]{40}/;
        return addressRegex.test(message.content.text);
    },
    handler: async (runtime: IAgentRuntime, message: Memory, _state?: State, _options?: { [key: string]: unknown; }, callback?: HandlerCallback): Promise<boolean> => {

        const response = await zerionProvider.getPositions(runtime, message);
        console.log("ZERION positions API response: ", response);
        if (!response.success || !response.data) {
            return false;
        }

        console.log("ZERION API response: ", response);

        // format response into a message string;
        const formattedResponse = formatPositionsData(response.data as PositionData);

        if (callback) {
            console.log("sending response to callback");
            callback({
                text: formattedResponse,
                content: {
                    ...response.data
                }
            })
        }
        return true;
    }
}
```

`/home/ygg/Workspace/Eliza/GAIA-Agentic-Hackathon/packages/plugin-zerion/src/providers/index.ts`:

```ts
import { IAgentRuntime, Memory, Provider, State } from "@elizaos/core";
import { ZERION_V1_BASE_URL } from "../constants.ts";
import { PortfolioData, PositionData, ZerionPortfolioResponse, ZerionPositionResponse, ZerionProviderResponse } from "../types.ts";

interface ZerionProvider extends Provider {
    getPositions(runtime: IAgentRuntime, message: Memory): Promise<ZerionProviderResponse>;
    get(runtime: IAgentRuntime, message: Memory, state?: State): Promise<ZerionProviderResponse>;
}

export const zerionProvider: ZerionProvider = {
    get: async (_runtime: IAgentRuntime, message: Memory, _state?: State): Promise<ZerionProviderResponse> => {
        try {
            if (!process.env.ZERION_API_KEY) {
                throw new Error("Zerion API key not found in environment variables. Make sure to set the ZERION_API_KEY environment variable.");
            }
            const content = message.content as { text: string };
            const addressMatch = content.text.match(/0x[a-fA-F0-9]{40}/);
            if (!addressMatch) {
                throw new Error("Valid ethereum address not found in message");
            }
            const address = addressMatch[0];
            const baseUrl = ZERION_V1_BASE_URL;

            const response = await fetch(`${baseUrl}/wallets/${address}/portfolio`, {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Basic ${process.env.ZERION_API_KEY}`
                }
            });


            if (!response.ok) {
                throw new Error(`Failed to fetch portfolio: ${response.statusText}`);
            }

            const apiResponse: ZerionPortfolioResponse = await response.json();
            const { attributes } = apiResponse.data;

            const portfolioData: PortfolioData = {
                totalValue: attributes.total.positions,
                chainDistribution: attributes.positions_distribution_by_chain,
                positionTypes: attributes.positions_distribution_by_type,
                changes: {
                    absolute_1d: attributes.changes.absolute_1d,
                    percent_1d: attributes.changes.percent_1d
                }
            };

            return { success: true, data: portfolioData };

        } catch (error) {
            console.log("error fetching portfolio", error);
            return { success: false, error: error instanceof Error ? error.message : "Failed to fetch portfolio data from zerion" };
        }

    },

    getPositions: async (_runtime: IAgentRuntime, message: Memory): Promise<ZerionProviderResponse> => {
        const addressMatch = message.content.text.match(/0x[a-fA-F0-9]{40}/);
        if (!addressMatch) {
            return {
                success: false,
                error: "No valid address found in message"
            };
        }

        const address = addressMatch[0];
        const response = await fetch(`https://api.zerion.io/v1/wallets/${address}/positions?filter[positions]=only_simple&currency=usd&filter[trash]=only_non_trash&sort=value`, {
            headers: {
                "Accept": "application/json",
                "Authorization": `Basic ${process.env.ZERION_API_KEY}`
            }
        });
        const data = await response.json() as ZerionPositionResponse;

        let totalValue = 0;
        const positions = data.data.map(position => {
            const value = position.attributes.value || 0;
            totalValue += value;

            return {
                name: position.attributes.fungible_info.name,
                symbol: position.attributes.fungible_info.symbol,
                quantity: position.attributes.quantity.float,
                value: position.attributes.value,
                price: position.attributes.price,
                chain: position.relationships.chain.data.id,
                change24h: position.attributes.changes?.percent_1d || null,
                verified: position.attributes.fungible_info.flags.verified
            };
        });

        return {
            success: true,
            data: {
                positions,
                totalValue
            } as PositionData
        };
    }
}
```

`/home/ygg/Workspace/Eliza/GAIA-Agentic-Hackathon/packages/plugin-zerion/src/index.ts`:

```ts
import { Plugin } from "@elizaos/core";
import { getWalletPortfolio } from "./actions/getWalletPortfolio/index.ts";
import { getWalletPositions } from "./actions/getWalletPositions/index.ts";
const zerionPlugin: Plugin = {
    name: "zerion",
    description: "Plugin for interacting with zerion API to fetch wallet portfolio data",
    actions: [getWalletPortfolio, getWalletPositions] // implement actions and use them here

};

export { zerionPlugin };


```
