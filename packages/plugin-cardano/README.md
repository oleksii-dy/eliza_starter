# `@elizaos/plugin-cardano`

This plugin enables interaction with the Cardano Chain ecosystem, providing support for Cardano Mainnet, Cardano Preprod networks.

---

## Configuration

### Default Setup

By default, **plugin-cardano** is not enabled. To use it, simply add your private key and/or public key to the `.env` file. If private key is not provided, some actions will be disabled.

**Security Note:** Your private key grants full access to your associated funds. Store it securely and never share it with anyone. Do not commit or upload your `.env` file to version control systems like Git.

```env
CARDANO_SEED_PHRASE=your-seed-phrase-here
CARDANO_BLOCKFROST_ID_PREPROD=your-blockfrost-id-preprod-here
CARDANO_BLOCKFROST_ID_MAINNET=your-blockfrost-id-mainnet-here
```

## Provider

The **Wallet Provider** initializes with Cardano as the default. It:

- Provides the **context** of the currently connected address and its balance.
- Creates **Public** and **Wallet clients** to interact with the supported chains.

---

## Actions

### Get Balance

Get the balance of an address on Cardano. Just specify the:

- **Chain**
- **Address**
- **Token**

**Example usage:**

```bash
Get the USDC balance of 0x1234567890 on Cardano.
Get the ADA balance of 0x1234567890 on Cardano Preprod.
```

### Transfer

Transfer tokens from one address to another on Cardano Mainnet/Preprod. Just specify the:

- **Chain**
- **Token**
- **Amount**
- **Recipient Address**
- **Data**(Optional)

**Example usage:**

```bash
Transfer 1 ADA to 0xRecipient on Cardano.
Transfer 1 USDC to 0xRecipient on Cardano.
```

---

## Contribution

The plugin contains tests. Whether you're using **TDD** or not, please make sure to run the tests before submitting a PR.

### Running Tests

Navigate to the `plugin-cardano` directory and run:

```bash
pnpm test
```
