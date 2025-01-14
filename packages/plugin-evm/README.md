# @elizaos/plugin-evm

Plugin for EVM chain interactions in Eliza agents.

## Quick Start demo

1. Add required environment variables to both `.env` files:

Root & client-twitter `.env`:
```env
# Required
EVM_PRIVATE_KEY=your-private-key
EVM_PUBLIC_KEY=your-public-key
WALLET_PUBLIC_KEY=your-wallet-public-key
EVM_PROVIDER_URL=https://mainnet.base.org

# Twitter Config
TWITTER_USERNAME=your_twitter_username
TWITTER_PASSWORD=your_twitter_password
TWITTER_EMAIL=your_email
TWITTER_2FA_SECRET=your_2fa_secret
TWITTER_TARGET_USERS=0x_Sero
ENABLE_ACTION_PROCESSING=true
ACTION_INTERVAL=1
TWITTER_DRY_RUN=false

# Model Provider
ANTHROPIC_API_KEY=your-anthropic-key
```

packages/client-twitter/.env:
```env
TWITTER_USERNAME=your_twitter_username
TWITTER_PASSWORD=your_twitter_password
TWITTER_EMAIL=your_email
TWITTER_2FA_SECRET=your_2fa_secret
TWITTER_TARGET_USERS=0x_Sero
ENABLE_ACTION_PROCESSING=true
ACTION_INTERVAL=1
TWITTER_DRY_RUN=false
```

2. Configure your character file (e.g. characters/esther.character.json):

```json
{
    "name": "Esther.Exe",
    "plugins": ["@elizaos/plugin-evm"],
    "clients": ["twitter"],
    "modelProvider": "anthropic",
    "settings": {
        "chains": {
            "evm": ["base"]
        },
        "plugins": {
            "evm": {
                "enabled": true,
                "defaultChain": "base"
            }
        }
    },
    "messageExamples": [
      [
        {
            "user": "{{user1}}",
            "content": {
            "text": "Transfer 0.001 ETH to 0xc0163E58648b247c143023CFB26C2BAA42C9d9A9",
            "action": "transfer"
            }
        },
        {
            "user": "Eliza",
            "content": {
            "text": "initiating transfer of 0.001 ETH to 0xc0163E58648b247c143023CFB26C2BAA42C9d9A9",
            "action": "transfer"
            }
        },
      ]
    ],
    "templates": { "shouldRespondTemplate": "# About {{agentName}}:\n{{bio}}\n\n# RESPONSE EXAMPLES\n{{user1}}: Transfer 1 ETH to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e\nResult: [RESPOND]\n\n{{user1}}: can you send some eth\nResult: [RESPOND]\n\nIMPORTANT: {{agentName}} should ALWAYS respond to transfer, bridge, or swap requests with [RESPOND].\n\n{{recentMessages}}\n\n# INSTRUCTIONS: Choose the option that best describes {{agentName}}'s response to the last message." }

}
```

3. Run the agent:

```bash
pnpm start --character="characters/esther.character.json"
```

4. The transfer action can be triggered as follows: ```transfer [amount] [token] to [receiver] on [network]

5. Tag Esther on twitter, and if the account which you tag from is in your allowlist: TWITTER_TARGET_USERS=0x_Sero transfers will be made

## Features

- Native token transfers
- Cross-chain bridging (via LiFi)
- Token swaps
- Balance tracking
- Multi-chain support

## Supported Chains

Default chain is Base. To add more chains, specify them in your character config:

```json
"settings": {
    "chains": {
        "evm": ["base"]
    }
}
```

## Custom RPC URLs

To use custom RPC endpoints:

```env
EVM_PROVIDER_URL=https://your-base-rpc-url
ETHEREUM_PROVIDER_ARBITRUM=https://your-arbitrum-rpc-url
```

### 4. Propose

Propose a proposal to a governor on a specific chain.

- **Proposal**
    - **Targets**
    - **Values**
    - **Calldatas**
    - **Description**
- **Chain**
- **Governor**

**Example usage:**

```bash
Propose a proposal to the 0xdeadbeef00000000000000000000000000000000 governor on Ethereum to transfer 1 ETH to 0xRecipient.
```

### 5. Vote

Vote on a proposal to a governor on a specific chain.

- **Proposal ID**
- **Support**
- **Chain**
- **Governor**

**Example usage:**

```bash
Vote on the proposal with ID 1 to support the proposal on the 0xdeadbeef00000000000000000000000000000000 governor on Ethereum.
```

### 6. Queue

Queue a proposal to a governor on a specific chain.

- **Proposal**
    - **Targets**
    - **Values**
    - **Calldatas**
    - **Description**
- **Chain**
- **Governor**

**Example usage:**

```bash
Queue the proposal to the 0xdeadbeef00000000000000000000000000000000 governor on Ethereum.
```

### 7. Execute

Execute a proposal to a governor on a specific chain.

- **Proposal ID**
- **Chain**
- **Governor**

**Example usage:**

```bash
Execute the proposal with ID 1 on the 0xdeadbeef00000000000000000000000000000000 governor on Ethereum.
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Test
pnpm test
```
