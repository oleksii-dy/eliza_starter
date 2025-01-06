# Plugin Twilio

A plugin for handling voice and text services using Twilio, ElevenLabs, and Deepgram.

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Create a `.env` file with your API keys:
```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
ELEVENLABS_API_KEY=your_elevenlabs_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key
```

3. Build the project:
```bash
pnpm build
```

4. Run the test:
```bash
pnpm test
```


## Usage
```typescript
import { voiceTextPlugin } from 'plugin-twilio';
// Initialize the plugin
await voiceTextPlugin.initialize();
// Use the services
const twilioService = voiceTextPlugin.getService(ServiceType.TEXT_GENERATION);
await twilioService.sendMessage(to, message);
```

6. Create an index.ts file:
```typescript:plugin-twilio/src/index.ts
export from './voice-text-plugin';
export from './services/voice';
export from './services/twilio';
export from './services/transcription';
```



To implement these changes:

1. Create the new directory:
```bash
mkdir plugin-twilio
```

2. Copy the files to their new locations:
```bash
cp -r src test package.json tsconfig.json README.md plugin-twilio/
```

3. Install dependencies in the new directory:
```bash
cd plugin-twilio
pnpm install
```

4. Build and test:
```bash
pnpm build && pnpm test
```



Let me know if you need any adjustments to these files!

## Phone Number Verification

Before sending SMS messages, you need to verify your phone number with the Eliza agent. This is a two-step process:

1. **Request Verification**
   ```
   User: verify phone +1234567890
   Agent: Please reply with the verification code sent to +1234567890
   ```

2. **Enter Verification Code**
   ```
   User: 123456
   Agent: Phone number +1234567890 has been verified successfully!
   ```

3. **Check Verified Number** (optional)
   ```
   User: show my verified number
   Agent: Your verified phone number is: +1234567890 (verified on Jan 1, 2024)
   ```

### Usage Notes

- You can only send SMS messages from verified phone numbers
- Each user can have one verified phone number at a time
- Verification codes expire after 10 minutes
- For trial accounts, you must verify each phone number you want to send messages to

### Environment Setup

Make sure you have the following environment variables set in your `.env` file:
```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number
```

### Security

- Phone numbers are stored securely in memory
- Verification state is tied to your user session
- Failed verification attempts are rate-limited