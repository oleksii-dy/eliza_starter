# `@ai16z/plugin-bnb`

This plugin enables interaction with the BNB Chain ecosystem, providing support for BNB Smart Chain, opBNB, and BNB Greenfield networks.

---

## Configuration

### Default Setup

By default, **plugin-bnb** is not enabled. To use it, simply add your private key and public key to the `.env` file:

```env
BNB_PRIVATE_KEY=your-private-key-here
BNB_PUBLIC_KEY=your-public-key-here
```

### Custom RPC URLs

By default, the RPC URL is inferred from the `viem/chains` config. To use custom RPC URLs, add the following to your `.env` file:

```env
BSC_PROVIDER_URL=https://your-custom-bsc-rpc-url
BSC_TESTNET_PROVIDER_URL=https://your-custom-bsc-testnet-rpc-url
OPBNB_PROVIDER_URL=https://your-custom-opbnb-rpc-url
OPBNB_TESTNET_PROVIDER_URL=https://your-custom-opbnb-testnet-rpc-url
```

## Provider

The **Wallet Provider** initializes with bsc as the default. It:

- Provides the **context** of the currently connected address and its balance.
- Creates **Public** and **Wallet clients** to interact with the supported chains.
- Allows adding chains dynamically at runtime.

---

## Actions

### Get Balance

Get the balance of an address on bsc. Just specify the:

- **Chain**
- **Address**
- **Token**

**Example usage:**

```bash
Get the USDC balance of 0x1234567890 on bsc.
```

### Transfer

Transfer tokens from one address to another on bsc/opBNB. Just specify the:

- **Chain**
- **Token**
- **Amount**
- **Recipient Address**
- **Data**(Optional)

**Example usage:**

```bash
Transfer 1 BNB to 0xRecipient on bsc.
```

### Swap

Swap tokens from one address to another on bsc. Just specify the:

- **Input Token**
- **Output Token**
- **Amount**
- **Chain**
- **Slippage**(Optional)

**Example usage:**

```bash
Swap 1 BNB to USDC on bsc.
```

### Bridge

Bridge tokens from one chain to another on bsc/opBNB. Just specify the:

- **From Chain**
- **To Chain**
- **From Token**
- **To Token**
- **Amount**
- **Recipient Address**(Optional)

**Example usage:**

```bash
Bridge 1 BNB from bsc to opBNB.
```

### Faucet

Get testnet tokens for bsc. Just specify the:

- **Chain**
- **Address**

**Example usage:**

```bash
Get some testnet tokens for bsc.
```

### Stake

Perform staking operations on bsc. Just specify the:

- **Action**
- **Amount**
- **From Validator Address**
- **To Validator Address**
- **Delegate Vote Power**(Optional)

**Example usage:**

```bash
Stake 1 BNB to validator 0x1234567890.
```

---

## Contribution

The plugin contains tests. Whether you're using **TDD** or not, please make sure to run the tests before submitting a PR.

### Running Tests

Navigate to the `plugin-bnb` directory and run:

```bash
pnpm test
```
