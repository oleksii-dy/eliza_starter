# Eliza - Multi-agent simulation framework

# https://github.com/elizaOS/eliza

# Visit https://eliza.builders for support

## 🌍 README Translations

[中文说明](./README_CN.md) | [Deutsch](./README_DE.md) | [Français](./README_FR.md) | [ไทย](./README_TH.md) | [Español](README_ES.md)

# dev branch

<img src="static/img/eliza_banner.jpg" alt="Eliza Banner" width="100%" />

_As seen powering [@DegenSpartanAI](https://x.com/degenspartanai) and [@MarcAIndreessen](https://x.com/pmairca)_

- Multi-agent simulation framework
- Add as many unique characters as you want with [characterfile](https://github.com/lalalune/characterfile/)
- Full-featured Discord and Twitter connectors, with Discord voice channel support
- Full conversational and document RAG memory
- Can read links and PDFs, transcribe audio and videos, summarize conversations, and more
- Highly extensible - create your own actions and clients to extend Eliza's capabilities
- Supports open source and local models (default configured with Nous Hermes Llama 3.1B)
- Supports OpenAI for cloud inference on a light-weight device
- "Ask Claude" mode for calling Claude on more complex queries
- 100% Typescript

# Getting Started

**Prerequisites (MUST):**

- [Node.js 23+](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [pnpm](https://pnpm.io/installation)

### Edit the .env file

- Copy .env.example to .env and fill in the appropriate values
- Edit the TWITTER environment variables to add your bot's username and password

### Edit the character file

- Check out the file `src/core/defaultCharacter.ts` - you can modify this
- You can also load characters with the `pnpm start --characters="path/to/your/character.json"` and run multiple bots at the same time.

After setting up the .env file and character file, you can start the bot with the following command:

```
pnpm i
pnpm start
```

# Customising Eliza

### Adding Plugins

Eliza now supports dynamic plugin loading directly from the package registry.

1. **package.json:**
```json
{
  "dependencies": {
    "@elizaos/plugin-solana": "github:elizaos-plugins/plugin-solana",
    "@elizaos/plugin-twitter": "github:elizaos-plugins/plugin-twitter"
  }
}
```

2. **Character configuration:**
```json
{
  "name": "MyAgent",
  "plugins": [
    "@elizaos/plugin-solana",
    "@elizaos/plugin-twitter"
  ]
}
```

### Available Plugins

All official plugins are hosted at [github.com/elizaos-plugins](https://github.com/elizaos-plugins/). Currently available plugins include:

- [@elizaos/plugin-solana](https://github.com/elizaos-plugins/plugin-solana) - Solana blockchain integration
- [@elizaos/client-discord](https://github.com/elizaos-plugins/client-discord) - Discord bot integration
- [@elizaos/client-twitter](https://github.com/elizaos-plugins/client-twitter) - Twitter bot integration
- [@elizaos/plugin-whatsapp](https://github.com/elizaos-plugins/plugin-whatsapp) - WhatsApp integration
- [@elizaos/plugin-browser](https://github.com/elizaos-plugins/plugin-browser) - Web scraping capabilities
- [@elizaos/plugin-pdf](https://github.com/elizaos-plugins/plugin-pdf) - PDF processing
- [@elizaos/plugin-image](https://github.com/elizaos-plugins/plugin-image) - Image processing and analysis
- [@elizaos/plugin-video](https://github.com/elizaos-plugins/plugin-video) - Video processing capabilities
- [@elizaos/plugin-llama](https://github.com/elizaos-plugins/plugin-llama) - Local LLaMA model integration

Visit the [elizaos-plugins organization](https://github.com/elizaos-plugins/) for a complete list of available plugins and their documentation.
Visit the [elizaos registry](https://eliza-plugins-hub.vercel.app/) 

## Plugin Architecture

### Plugin Development

Eliza uses a unified plugin architecture where everything is a plugin - including clients, adapters, actions, evaluators, and services. This approach ensures consistent behavior and better extensibility. Here's how the architecture works:

1. **Plugin Types**: Each plugin can provide one or more of the following:
   - Clients (e.g., Discord, Twitter, WhatsApp integrations)
   - Adapters (e.g., database adapters, caching systems)
   - Actions (custom functionality)
   - Evaluators (decision-making components)
   - Services (background processes)
   - Providers (data or functionality providers)

2. **Plugin Interface**: All plugins implement the core Plugin interface:
   ```typescript
   type Plugin = {
       name: string;
       description: string;
       config?: { [key: string]: any };
       actions?: Action[];
       providers?: Provider[];
       evaluators?: Evaluator[];
       services?: Service[];
       clients?: Client[];
       adapters?: Adapter[];
   };
   ```

3. **Independent Repositories**: Each plugin lives in its own repository under the [elizaos-plugins](https://github.com/elizaos-plugins/) organization, allowing:
   - Independent versioning and releases
   - Focused issue tracking and documentation
   - Easier maintenance and contribution
   - Separate CI/CD pipelines

4. **Plugin Structure**: Each plugin repository should follow this structure:
   ```
   plugin-name/
   ├── src/
   │   ├── index.ts        # Main plugin entry point
   │   ├── actions/        # Plugin-specific actions
   │   ├── clients/        # Client implementations
   │   ├── adapters/       # Adapter implementations
   │   └── types.ts        # Type definitions
   │   └── environment.ts  # runtime.getSetting, zod validation
   ├── package.json        # Plugin dependencies
   └── README.md          # Plugin documentation
   ```

5. **Package Configuration**: Your plugin's `package.json` must include an `agentConfig` section:
   ```json
   {
     "name": "@elizaos/plugin-example",
     "version": "1.0.0",
     "agentConfig": {
       "pluginType": "elizaos:plugin:1.0.0",
       "pluginParameters": {
         "API_KEY": {
           "type": "string",
           "description": "API key for the service"
         }
       }
     }
   }
   ```

6. **Plugin Loading**: Plugins are dynamically loaded at runtime through the `handlePluginImporting` function, which:
   - Imports the plugin module
   - Reads the plugin configuration
   - Validates plugin parameters
   - Registers the plugin's components (clients, adapters, actions, etc.)

7. **Examples of Client, Adapter, Plugin Implementation** :
   ```typescript
   // Client example
   const discordPlugin: Plugin = {
     name: "discord",
     description: "Discord client plugin",
     clients: [DiscordClientInterface]
   };

   // Adapter example
   const postgresPlugin: Plugin = {
     name: "postgres",
     description: "PostgreSQL database adapter",
     adapters: [PostgresDatabaseAdapter]
   };
   
   // Adapter plugin
   export const browserPlugin: Plugin = {
    name: "default",
    description: "Pdf",
    services: [PdfService],
    actions: [],
  };
   ```

### Environment Variables and Secrets

Plugins can access environment variables and secrets in two ways:

1. **Character Configuration**: Through `agent.json.secret` or character settings:
   ```json
   {
     "name": "MyAgent",
     "settings": {
       "secrets": {
         "PLUGIN_API_KEY": "your-api-key",
         "PLUGIN_SECRET": "your-secret"
       }
     }
   }
   ```

2. **Runtime Access**: Plugins can access their configuration through the runtime:
   ```typescript
   class MyPlugin implements Plugin {
     async initialize(runtime: AgentRuntime) {
       const apiKey = runtime.getSetting("PLUGIN_API_KEY");
       const secret = runtime.getSetting("PLUGIN_SECRET");
     }
   }
   ```

The `getSetting` method follows this precedence:
1. Character settings secrets
2. Character settings
3. Global settings

### Plugin Registration
1. Add it to your agent's character configuration:
   ```json
   {
     "name": "MyAgent",
     "plugins": [
       "@elizaos/plugin-example"
     ]
   }
   ```

2. Include it in your package.json:
   ```json
   {
     "dependencies": {
       "@elizaos/plugin-example": "github:elizaos-plugins/plugin-example"
     }
   }
   ```

### Creating a New Plugin

1. Use the [plugin template](https://github.com/elizaos-plugins/plugin-template) as a starting point
2. Implement the Plugin interface:
   ```typescript
   interface Plugin {
     actions?: Action[];
     evaluators?: Evaluator[];
     services?: Service[];
     providers?: Provider[];
     initialize?(runtime: AgentRuntime): Promise<void>;
   }
   ```
3. Create a plugin.json file with metadata and configuration schema
4. Document your plugin's functionality and required environment variables

### Adding custom actions

To avoid git clashes in the core directory, we recommend adding custom actions to a `custom_actions` directory and then adding them to the `elizaConfig.yaml` file. See the `elizaConfig.example.yaml` file for an example.

## Running with different models

### Run with Llama

You can run Llama 70B or 405B models by setting the environment variable for a provider that supports these models. Llama is also supported locally if no other provider is set.

### Run with Grok

You can run Grok models by setting the `GROK_API_KEY` environment variable to your Grok API key and setting grok as the model provider in your character file.

### Run with OpenAI

You can run OpenAI models by setting the `OPENAI_API_KEY` environment variable to your OpenAI API key and setting openai as the model provider in your character file.

## Additional Requirements

You may need to install Sharp. If you see an error when starting up, try installing it with the following command:

```
pnpm install --include=optional sharp
```

# Environment Setup

You will need to add environment variables to your .env file to connect to various platforms:

```
# Required environment variables
DISCORD_APPLICATION_ID=
DISCORD_API_TOKEN= # Bot token
OPENAI_API_KEY=sk-* # OpenAI API key, starting with sk-
ELEVENLABS_XI_API_KEY= # API key from elevenlabs

# ELEVENLABS SETTINGS
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
ELEVENLABS_VOICE_STABILITY=0.5
ELEVENLABS_VOICE_SIMILARITY_BOOST=0.9
ELEVENLABS_VOICE_STYLE=0.66
ELEVENLABS_VOICE_USE_SPEAKER_BOOST=false
ELEVENLABS_OPTIMIZE_STREAMING_LATENCY=4
ELEVENLABS_OUTPUT_FORMAT=pcm_16000

TWITTER_DRY_RUN=false
TWITTER_USERNAME= # Account username
TWITTER_PASSWORD= # Account password
TWITTER_EMAIL= # Account email


# For asking Claude stuff
ANTHROPIC_API_KEY=

WALLET_SECRET_KEY=EXAMPLE_WALLET_SECRET_KEY
WALLET_PUBLIC_KEY=EXAMPLE_WALLET_PUBLIC_KEY

BIRDEYE_API_KEY=

SOL_ADDRESS=So11111111111111111111111111111111111111112
SLIPPAGE=1
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
HELIUS_API_KEY=


## Telegram
TELEGRAM_BOT_TOKEN=

TOGETHER_API_KEY=
```

# Local Inference Setup

### CUDA Setup

If you have an NVIDIA GPU, you can install CUDA to speed up local inference dramatically.

```
pnpm install
npx --no node-llama-cpp source download --gpu cuda
```

Make sure that you've installed the CUDA Toolkit, including cuDNN and cuBLAS.

### Running locally

By default, the bot will download and use a local model. You can change this by setting the environment variables for the model you want to use.

# Clients

## Discord Bot

For help with setting up your Discord Bot, check out here: https://discordjs.guide/preparations/setting-up-a-bot-application.html

# Development

## Testing

To run the test suite:

```bash
pnpm test           # Run tests once
pnpm test:watch    # Run tests in watch mode
```

For database-specific tests:

```bash
pnpm test:sqlite   # Run tests with SQLite
pnpm test:sqljs    # Run tests with SQL.js
```

Tests are written using Jest and can be found in `src/**/*.test.ts` files. The test environment is configured to:

- Load environment variables from `.env.test`
- Use a 2-minute timeout for long-running tests
- Support ESM modules
- Run tests in sequence (--runInBand)

To create new tests, add a `.test.ts` file adjacent to the code you're testing.

## Docs Updates

Please make sure to verify if the documentation provided is correct. In order to do so, please run the docs service.

```console
docker compose -f docker-compose-docs.yaml up --build
```

The docusaurus server will get started and you can verify it locally at https://localhost:3000/eliza.

### Plugin Development Guidelines

1. **Minimal Dependencies**: Only include necessary dependencies
2. **Clear Documentation**: Document all required environment variables
3. **Error Handling**: Gracefully handle missing or invalid configuration
4. **Type Safety**: Use TypeScript for better developer experience
5. **Testing**: Include tests for core functionality

Visit the [Plugin Development Guide](https://github.com/elizaos-plugins/plugin-image) for detailed information on creating new plugins.
