# elizaos-okto-plugin

A comprehensive integration plugin for ElizaOS that provides access to Okto's various APIs and services.

## Features

- **Token Transfer**: Transfer tokens to other users
- **Wallet Management**: Get user's wallets
- **Portfolio Management**: Get user's portfolio
- **Order History**: Get user's order history

## Installation

```bash
npm install elizaos-okto-plugin
```

## Configuration

The plugin requires several environment variables to be set:

```env
OKTO_API_KEY=                   # Get from https://dashboard.okto.tech/home
OKTO_BUILD_TYPE=SANDBOX         # SANDBOX, STAGING, PRODUCTION
GOOGLE_CLIENT_SECRET=           # Get from https://console.cloud.google.com/
GOOGLE_CLIENT_ID=               # Get from https://console.cloud.google.com/
```

## Setup Google OAuth

1. Go to https://console.cloud.google.com/
2. Create a new project
3. Create Oauth credentials
4. Get the client id and secret
5. Set the redirect url to http://localhost:5000

## Usage

```typescript
import OktoPlugin from "elizaos-okto-plugin";

runtime.registerPlugin(OktoPlugin);
// etc...
```

## Contributing

Contributions are welcome! Please see the [CONTRIBUTING.md](CONTRIBUTING.md) file for more information.


## License

This plugin is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.