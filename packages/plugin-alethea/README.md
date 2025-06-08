# Alethea AI Plugin for ElizaOS

This plugin enables interaction with the Alethea AI ecosystem, including creating ALI Agents from NFTs/iNFTs and trading keys.

## Features

- **Convert NFT to ALI Agent**: Transform an ERC-721 NFT into an intelligent ALI Agent (Base Network)
- **Convert iNFT to ALI Agent**: Transform an iNFT into an ALI Agent (Ethereum Mainnet)
- **Keys Trading**: Buy and sell keys for ALI Agents
- **Pod Operations**: Fuse pods with ALI Agents
- **Hive Operations**: Create liquidity pools and distribute tokens
- **Token Operations**: Deploy and airdrop ALI Agent or Hive utility tokens

## Core Workflow

The main Alethea AI workflow is:
1. **Start with existing NFT/iNFT** (user owns)
2. **Convert to ALI Agent** using Keys Factory contract
3. **Trade keys** for the ALI Agent
4. **Additional operations** like pods, hives, etc.

**No custom token deployment needed** - ALI Agents are created from existing NFTs!

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file with the following variables:

```env
ALETHEA_RPC_URL=https://base-mainnet.infura.io/v3/your-project-id  # For Base Network NFTs
PRIVATE_KEY=your-wallet-private-key
ALETHEA_API_KEY=your-alethea-api-key  # Optional
```

**Required for Airdrop Operations:**
- `ALETHEA_RPC_URL`: Base Network RPC endpoint
- `PRIVATE_KEY`: Wallet private key with tokens to distribute

## Usage

### Convert NFT to ALI Agent (Base Network)

```typescript
"Convert my NFT at address 0x123... token ID 42 to an ALI Agent using ETH implementation"
```

### Convert iNFT to ALI Agent (Ethereum Mainnet)

```typescript
"Convert my iNFT at address 0x456... token ID 123 to an ALI Agent"
```

### Trade Keys

```typescript
"Buy 5 keys for ALI Agent 0x789..."
"Sell 3 keys for ALI Agent 0x789..."
"What's the price to buy 10 keys for agent 0x789...?"
```

### Execute Token Airdrop

```typescript
"Airdrop 1000 tokens to 0x123...abc, 2000 to 0x456...def using token 0x789...ghi"
"Execute airdrop of ALI tokens at 0xABC...DEF to 5 addresses with different amounts"
"Send 500 tokens each to 0x111...222, 0x333...444, 0x555...666 from token contract 0x777...888"
```

## Contract Addresses

- **Keys Factory (Base)**: `0x80f5bcc38b18c0f0a18af3c6fba515c890689342`
- **Keys Factory (Ethereum)**: `0xABA615044d5640bd151A1B0bdac1C04806AF1AD5`
- **ALI Token**: `0x6B0b3a982b4634aC68dD83a4DBF02311cE324181`

## How It Works

1. **NFT Ownership**: User must own an ERC-721 NFT or iNFT
2. **Keys Factory**: Smart contract that converts NFTs to ALI Agents
3. **ALI Agent Creation**: `deploySharesContract()` creates a shares contract for the NFT
4. **Keys Trading**: Users can buy/sell keys (shares) of the ALI Agent
5. **Implementation Types**: 
   - `0` = ETH-based keys
   - `1` = ALI token-based keys

## Network Support

- **Base Network**: For converting regular NFTs to ALI Agents
- **Ethereum Mainnet**: For converting iNFTs to ALI Agents

## Development

```bash
# Build
npm run build

# Test
npm test

# Lint
npm run lint
```

## Security Notes

- Keep private keys secure
- Verify NFT ownership before conversion
- Test on testnets first
- Understand keys trading mechanics

## License

MIT
