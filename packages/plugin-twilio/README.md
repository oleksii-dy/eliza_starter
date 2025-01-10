# Eliza Twilio Plugin

Add SMS and voice capabilities to your Eliza agent using Twilio. This plugin enables two-way SMS conversations and voice interactions with your agent.

> Official plugin documentation and support available at [boolkeys.com/eliza/plugin-twilio](https://www.boolkeys.com/eliza/plugin-twilio/)

## Features

* Send SMS messages through your Eliza chatbot
* Make voice calls with natural text-to-speech
* Verify phone numbers for secure communication
* Track message delivery status
* Support for international numbers
* Easy integration with existing Eliza configurations

## Prerequisites

1. **Twilio Account**
   - Sign up for a [Twilio account](https://www.twilio.com/try-twilio)
   - Get a Twilio phone number with SMS and Voice capabilities
   - Note your Account SID and Auth Token

2. **Anthropic Account**
   - Get an [Anthropic API key](https://www.anthropic.com/)
   - The plugin uses Claude for consistent responses

3. **Environment Setup**
   Create a `.env` file in your project root:
   ```env
   ANTHROPIC_API_KEY=sk-ant-xxx
   TWILIO_ACCOUNT_SID=ACxxx
   TWILIO_AUTH_TOKEN=xxx
   TWILIO_PHONE_NUMBER=+1234567890
   WEBHOOK_PORT=3003  # Optional, defaults to 3003
   ```

## Installation

1. **Add the plugin to your Eliza project**
   ```bash
   pnpm add @elizaos/plugin-twilio
   ```

2. **Register the plugin in your agent's configuration**
   ```typescript
   import { TwilioPlugin } from '@elizaos/plugin-twilio';

   const agentConfig = {
     // ... your existing config
     plugins: [
       TwilioPlugin,
       // ... other plugins
     ]
   };
   ```

## Webhook Setup

The plugin requires a publicly accessible URL for Twilio webhooks. For development:

1. **Install ngrok**
   ```bash
   npm install -g ngrok
   ```

2. **Start ngrok**
   ```bash
   ngrok http 3003
   ```

3. **Configure Twilio Webhooks**
   - Go to your [Twilio Console](https://console.twilio.com)
   - Select your phone number
   - Set webhook URLs:
     - SMS: `https://your-ngrok-url/webhook/sms`
     - Voice: `https://your-ngrok-url/webhook/voice`

## Usage

1. **Start the Webhook Server**

   Create a startup file (e.g., `start.ts`):
   ```typescript
   import { startWebhookServer } from '@elizaos/plugin-twilio/examples/start-webhook-server';
   import path from 'path';

   // Start the webhook server
   startWebhookServer({
     // Path to your character file
     characterFile: path.resolve(__dirname, 'characters/your-character.json'),
     // Optional: custom port (defaults to 3003)
     port: process.env.WEBHOOK_PORT ? parseInt(process.env.WEBHOOK_PORT) : 3003
   });
   ```

   Then run it:
   ```bash
   # Using ts-node
   ts-node start.ts

   # Or using node with typescript
   tsc start.ts && node start.js
   ```

   The server will:
   - Initialize the storage service (SQLite database)
   - Set up Twilio service with your credentials
   - Start the webhook server
   - Load your character configuration
   - Configure the runtime with your character

2. **Send SMS Messages**
   ```typescript
   import { twilioService } from '@elizaos/plugin-twilio';

   await twilioService.sendMessage(
     '+1234567890',
     'Hello from your Eliza agent!'
   );
   ```

3. **Make Voice Calls**
   ```typescript
   import { webhookService } from '@elizaos/plugin-twilio';

   await webhookService.makeVoiceCall(
     '+1234567890',
     'Hello, this is your Eliza agent calling!'
   );
   ```

## Character Configuration

Your character file should include these additional settings for optimal SMS/voice interaction:

```json
{
  "name": "Your Agent Name",
  "config": {
    "model": "claude-3-sonnet-20240229",
    "temperature": 0.7
  },
  "personality": "Keep responses friendly and concise, perfect for SMS"
}
```

## Limitations

- SMS messages are limited to 160 characters
- Voice calls require proper punctuation for natural pauses
- Webhook server must be publicly accessible
- Character responses should be configured for brevity

## Troubleshooting

1. **Webhook Not Receiving Messages**
   - Verify ngrok is running
   - Check Twilio webhook configuration
   - Ensure port 3003 is available

2. **Messages Not Sending**
   - Verify Twilio credentials
   - Check phone number capabilities
   - Review error logs

3. **Character Not Responding Correctly**
   - Check character file path
   - Verify Anthropic API key
   - Review system prompts

## Support

- Documentation: [boolkeys.com/eliza/plugin-twilio](https://www.boolkeys.com/eliza/plugin-twilio/)
- Email: arwen@boolkeys.com
- Issues: [Open an issue](https://github.com/your-repo/issues) on the repository

## License

MIT

© 2025 Boolkeys. All rights reserved.
