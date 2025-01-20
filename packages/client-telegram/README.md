# Telegram Client Plugin for ElizaOS

This plugin integrates a Telegram client with ElizaOS, allowing characters in ElizaOS to interact via Telegram. It provides an easy setup for starting the Telegram client using the provided bot token and includes basic lifecycle management.

## Features

-   **Seamless Telegram Integration**: Connects ElizaOS characters to Telegram through the bot API.
-   **Configuration Validation**: Ensures required settings are properly configured before starting.
-   **Startup Logging**: Logs successful initialization of the Telegram client for better debugging.
-   **Future-proof Design**: Provides a basic structure for stopping the client (currently unsupported).

## Configuration

Before starting the plugin, ensure the following environment variables or settings are configured:

TELEGRAM_BOT_TOKEN: The bot token obtained from the Telegram BotFather.

## Pre-Requisites

1. Add the token to the .env file
2. Add the same token to the character.json file

"clients": ["telegram"]

"secrets": { "key": "<your-bot-token>" }

npm run dev

pnpm start --character="<path-to-your-character>.json"

## License
