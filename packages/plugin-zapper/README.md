# @elizaos/plugin-zapper

A plugin for Eliza that allows users to fetch portfolio data using the Zapper API.

## Features


## Configuration

1. Get your API key from [Zapper](https://protocol.zapper.xyz/)

2. Set up your environment variables:

```bash
ZAPPER_API_KEY=your_api_key
```

3. Register the plugin in your Eliza configuration:

```typescript
import { zapperPlugin } from "@elizaos/plugin-zapper";

// In your Eliza configuration
plugins: [
    zapperPlugin,
    // ... other plugins
];
```

## Usage

The plugin responds to natural language queries about wallet data. Here are some examples:

```plaintext
"Show me the holdings of @vitalik.eth"
"Show me the portfolio of these wallets 0xd8da6bf26964af9d7eed9e03e53415d37aa96045, 0xadd746be46ff36f10c81d6e3ba282537f4c68077"
"Get wallet holdings for HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH"
```

### Available Actions

#### portfolio



```typescript
// Example response format
portfolio: {
      tokenBalances: Array<{
        address: string;
        network: string;
        token: {
          balance: number;
          balanceUSD: number;
          baseToken: {
            name: string;
            symbol: string;
          };
        };
      }>;
      nftBalances: Array<{
        network: string;
        balanceUSD: number;
      }>;
      totals: {
        total: number;
        totalWithNFT: number;
        totalByNetwork: Array<{
          network: string;
          total: number;
        }>;
        holdings: Array<{
          label: string;
          balanceUSD: number;
          pct: number;
        }>;
      };
    };
```

#### farcasterPortfoio


```typescript
// Example response format
  farcasterProfile: {
    username: string;
    fid: number;
    metadata: {
      displayName: string;
      description: string;
      imageUrl: string;
      warpcast: string;
    };
    connectedAddresses: string[];
    custodyAddress: string;
  };
```
