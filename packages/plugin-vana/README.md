# @elizaos/plugin-vana


---

## Configuration

**Security Note:** Your private key grants full access to your associated funds. Store it securely and never share it with anyone. Do not commit or upload your `.env` file to version control systems like Git.

```env
Vana_PRIVATE_KEY=your-private-key-here
Vana_PUBLIC_KEY=your-public-key-here
```

### Custom RPC URLs

The RPC URL is inferred from the `chains`. To use custom RPC URLs, add the following to your `.env` file:

```env
Vana_PROVIDER_URL=https://rpc.islander.vana.org
Vana_PROVIDER_URL=https://rpc.moksha.vana.org  #testnet
```

## Provider

The **Wallet Provider** initializes with Vana as the default. It:

- Provides the **context** of the currently connected address and its balance.
- Creates **Public** and **Wallet clients** to interact with the supported chains.

---

## Actions


### Transfer

Transfer tokens from one address to another on Vana. Just specify the:

- **Chain**
- **Token**
- **Amount**
- **Recipient Address**
- **Data**(Optional)

**Example usage:**

```bash
Transfer 1 VANA to 0x on Vana.
```


