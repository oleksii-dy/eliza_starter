# @elizaos/plugin-icp

A plugin for interacting with the Internet Computer Protocol (ICP) blockchain, specifically for creating tokens on PickPump platform.

## Implementation Details

For complete source code and implementation details, please check:
👉 [GitHub Repository](https://github.com/asDNSk/eliza/tree/nekone)

## Features

- 🎨 AI-Generated Meme Token Creation
- 🖼️ Custom Token Logo Generation
- 📝 Smart Description Generation

## Configuration

Add the following variable to your `.env` file:

```env
INTERNET_COMPUTER_PRIVATE_KEY=<your-ed25519-private-key>
```

### Exporting Private Key from dfx

To get your ED25519 private key from dfx identity, follow these steps:

1. Export your identity to PEM format:

```bash
dfx identity export pick-pump-agent > identity.pem
```

2. Extract the private key:

```bash
# Linux/MacOS
openssl ec -in identity.pem -text -noout | grep priv -A 3 | tail -n +2 | tr -d '\n[:space:]:' | xxd -r -p | xxd -p

# Windows (PowerShell)
Get-Content identity.pem | Select-String -Pattern 'priv' -Context 0,3 | ForEach-Object { $_.Context.PostContext -join '' } | ForEach-Object { $_ -replace '[:\s]','' } | xxd -r -p | xxd -p
```

3. Add the extracted key to your `.env` file:

```env
INTERNET_COMPUTER_PRIVATE_KEY=<extracted-key>
```

> ⚠️ **Security Note**: Keep your private key secure and never share it. Make sure your .env file is included in .gitignore and not committed to version control.

## Usage

### Basic Setup

In your agent/index.ts file, add the plugin to your agent's configuration

```typescript
import { icpPlugin } from "@elizaos/plugin-icp";

// Initialize the plugin
getSecret(character, "INTERNET_COMPUTER_PRIVATE_KEY")
    ? icpPlugin
    : null,
```

### Example Bot: @realnekoneget_Bot

For a quick start, you can try our example Telegram bot [@realnekoneget_Bot](https://t.me/realnekoneget_Bot). This bot demonstrates the capabilities of the ICP plugin and can help you:

- Generate meme tokens on PickPump platform
- Learn about ICP ecosystem
- Get information about token creation process

Simply send a message to the bot to start exploring ICP and meme token creation!

### Token Creation Options

```typescript
export type CreateMemeTokenArg = {
    name: string;
    symbol: string;
    description: string;
    logo: string;
    twitter?: string;
    website?: string;
    telegram?: string;
};
```
