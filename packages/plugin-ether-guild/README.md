# @elizaos/plugin-ethereum-guild

This plugin enables interaction with the Etherguild dapp to create quests which can receive funding.
It also provides support to interact with EVM Smart Chains. (Base, Arbitrum, Polygon, Optimism, BSC, Ethereum, Sepolia, etc)

Facilitated by [Ethereum Guild](https://www.etherguild.xyz/).

## Installation

```bash
pnpm install @elizaos/plugin-ether-guild
```

---

## Configuration

### Default Setup

By default, **plugin-ether-guild** is not enabled. To use it, simply add your private key and/or public key to the `.env` file. If private key is not provided, some actions will be disabled.
This plugin is inpired from [plugin-bnb] so wallet config is the same as BNB.

```env
BNB_PRIVATE_KEY=0xabcd
BNB_PUBLIC_KEY=0x1234
```

**Security Note:** Your private key grants full access to your associated funds. Store it securely and never share it with anyone. Do not commit or upload your `.env` file to version control systems like Git.

### Custom RPC URLs

By default, the RPC URL is inferred from the `viem/chains` config. To use custom RPC URLs, add the following to your `.env` file:

```env
BSC_PROVIDER_URL=https://your-custom-bsc-rpc-url
OPBNB_PROVIDER_URL=https://your-custom-opbnb-rpc-url
```

### Using Etherguild Plugin

Add `etherguildPlugin` to your plugins array in the `mainCharacter.ts` file.

Config chains in `settings`

```
settings: {
        chains: {
            evm: ["sepolia", "base", "arbitrum" ]
        }
    },
```

## Provider

The **Wallet Provider** initializes with BSC as the default, but specify the chains in chat to use. It:

-   Provides the **context** of the currently connected address and its balance.
-   Creates **Public** and **Wallet clients** to interact with the supported chains.

---

## Actions

### Get Balance

Get the balance of an address on BSC. Just specify the:

-   **Chain**
-   **Address**
-   **Token**

**Example usage:**

```bash
Get the USDC balance of 0x1234567890 on BSC.
```

### Transfer

Transfer tokens from one address to another on Base. Just specify the:

-   **Chain**
-   **Token**
-   **Amount**
-   **Recipient Address**
-   **Data**(Optional)

**Example usage:**

```bash
Transfer 1 ETH to 0xRecipient on Base.
```

### Swap

Swap tokens from one address to another on Ethereum Mainnet. Just specify the:

-   **Chain**(Only BSC is supported for now)
-   **Input Token**
-   **Output Token**
-   **Amount**
-   **Slippage**(Optional)

**Example usage:**

```bash
Swap 5 USDT to USDC on Arbitrum.
```

<!-- Will only use GetBalance, Transfer and Swap for EVM chains -->

## Contribution

The plugin contains tests. Whether you're using **TDD** or not, please make sure to run the tests before submitting a PR.

### Running Tests

Navigate to the `plugin-ether-guild` directory and run:

```bash
pnpm test
```
