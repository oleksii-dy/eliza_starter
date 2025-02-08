# `@ai16z/plugin-etherguild-onchain`

This plugin enables interaction with the Etherguild dapp, providing support for EVM Smart Chains. (Base, Arbitrum, Polygon, Optimism, BSC, Ethereum, Sepolia, etc)

---

## Configuration

### Default Setup

By default, **plugin-etherguild-onchain** is not enabled. To use it, simply add your private key and/or public key to the `.env` file. If private key is not provided, some actions will be disabled.
This plugin is inpired from [plugin-bnb] so wallet config is the same as BNB.

**Security Note:** Your private key grants full access to your associated funds. Store it securely and never share it with anyone. Do not commit or upload your `.env` file to version control systems like Git.


### Custom RPC URLs

By default, the RPC URL is inferred from the `viem/chains` config. To use custom RPC URLs, add the following to your `.env` file:

```env
BSC_PROVIDER_URL=https://your-custom-bsc-rpc-url
OPBNB_PROVIDER_URL=https://your-custom-opbnb-rpc-url
```

## Provider

The **Wallet Provider** initializes with BSC as the default. It:

- Provides the **context** of the currently connected address and its balance.
- Creates **Public** and **Wallet clients** to interact with the supported chains.

---

## Actions

### Get Balance

Get the balance of an address on BSC. Just specify the:

- **Chain**
- **Address**
- **Token**

**Example usage:**

```bash
Get the USDC balance of 0x1234567890 on BSC.
```

### Transfer

Transfer tokens from one address to another on Base. Just specify the:

- **Chain**
- **Token**
- **Amount**
- **Recipient Address**
- **Data**(Optional)

**Example usage:**

```bash
Transfer 1 ETH to 0xRecipient on Base.
```

### Swap

Swap tokens from one address to another on Ethereum Mainnet. Just specify the:

- **Chain**(Only BSC is supported for now)
- **Input Token**
- **Output Token**
- **Amount**
- **Slippage**(Optional)

**Example usage:**

```bash
Swap 5 USDT to USDC on Arbitrum.
```

<!-- Will only use GetBalance, Transfer and Swap for EVM chains -->

<!-- ### Bridge

Bridge tokens from one chain to another on BSC/opBNB. Just specify the:

- **From Chain**
- **To Chain**
- **From Token**
- **To Token**
- **Amount**
- **Recipient Address**(Optional)

**Example usage:**

```bash
Bridge 1 BNB from BSC to opBNB.
```

### Stake

Perform staking operations on BSC through [Lista Dao](https://lista.org/liquid-staking/BNB). User will receive sliBNB(0xB0b84D294e0C75A6abe60171b70edEb2EFd14A1B) as staking credit. Just specify the:

- **Chain**(Only BSC is supported for now)
- **Action**
- **Amount**

**Example usage:**

```bash
Deposit 1 BNB to Lista Dao.
```

### Faucet

Request testnet tokens from the faucet. You could request any of the supported tokens(BNB, BTC, BUSD, DAI, ETH, USDC). Just specify the:

- **Token**(Optional)
- **Recipient Address**

The faucet is rate-limited. One claim is allowed per IP address within a 24-hour period. And the recipient address must maintain a minimum balance of 0.002 BNB on BSC Mainnet to qualify.

**Example usage:**

```bash
Get some testnet USDC from the faucet.
```

--- -->

## Contribution

The plugin contains tests. Whether you're using **TDD** or not, please make sure to run the tests before submitting a PR.

### Running Tests

Navigate to the `plugin-etherguild-onchain` directory and run:

```bash
pnpm test
```
