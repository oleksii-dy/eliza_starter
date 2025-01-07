# @elizaos/plugin-twilio

A plugin for Eliza agents that enables SMS messaging, voice calls, and phone number verification using Twilio services.

## Features

### SMS Integration
- Two-way SMS conversations with AI agent
- Context preservation between web and SMS interfaces
- Phone number verification with secure code handling
- Webhook integration for real-time message processing

### Voice Capabilities
- Voice calls using ElevenLabs synthesis
- Speech-to-text with Deepgram
- Real-time conversation processing

## Installation

```bash
pnpm add @elizaos/plugin-twilio
```

## Setup

1. Environment Configuration
```env
# Required Twilio credentials
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number

# Webhook Configuration (one of these is required)
WEBHOOK_URL=https://your-domain.com/webhook/sms    # Full webhook URL
# OR
NGROK_URL=https://your-ngrok-url.ngrok.io         # Base ngrok URL (plugin will append /webhook/sms)

# Optional settings
WEBHOOK_PORT=4000  # Default: 4000
```

2. Register Plugin
```typescript
import { TwilioPlugin } from '@elizaos/plugin-twilio';

// In your agent configuration
plugins: [
    TwilioPlugin
]
```

## Webhook Setup

### Local Development
1. Start ngrok:
```bash
ngrok http 4000
```

2. Update your .env with the ngrok URL:
```env
# Option 1: Set full webhook URL
WEBHOOK_URL=https://abc123-xyz-456.ngrok.io/webhook/sms

# Option 2: Set base ngrok URL (plugin will append /webhook/sms)
NGROK_URL=https://abc123-xyz-456.ngrok.io
```

### Production
For production environments:
1. Set up a stable domain for your webhook
2. Configure SSL certificate
3. Update .env:
```env
WEBHOOK_URL=https://your-domain.com/webhook/sms
```

The plugin will automatically:
1. Create a Messaging Service if none exists
2. Configure the webhook URL for incoming messages
3. Add your Twilio phone number to the service

## Usage

### Phone Verification
Before using SMS features, users must verify their phone number:
```
User: verify phone +1234567890
Agent: Please reply with the verification code sent to +1234567890
User: 123456
Agent: Phone number +1234567890 has been verified successfully!
```

### Check Verified Number
```
User: show my verified number
Agent: Your verified phone number is: +1234567890 (verified on Jan 1, 2024)
```

### SMS Conversation
Once verified, users can:
- Send SMS to the Twilio number
- Receive AI responses via SMS
- Maintain conversation context between web and SMS

## Development

### Local Testing
1. Start ngrok:
```bash
ngrok http 4000
```

2. Configure Twilio webhook:
- Go to Twilio Console → Phone Numbers → Active Numbers
- Set webhook URL to: `https://your-ngrok-url/webhook/sms`
- Method: POST

3. Test webhook:
```bash
curl -X POST http://localhost:4000/webhook/sms \
  -d "From=+1234567890" \
  -d "Body=Hello AI" \
  -H "Content-Type: application/x-www-form-urlencoded"
```

### A2P Campaign Setup
For production use:
1. Register an A2P campaign in Twilio Console
2. Provide campaign details and sample messages
3. Wait for approval before using production SMS

## Security
- Phone numbers stored securely in memory
- Verification required before SMS usage
- Rate limiting on verification attempts
- Secure webhook handling

## API Reference

### Actions
- `REQUEST_VERIFICATION`: Send verification code
- `CHECK_VERIFICATION`: Verify phone number
- `CHECK_VERIFIED_NUMBER`: Show verified number
- `SEND_SMS`: Send SMS message

### Services
- `TwilioService`: SMS and voice call handling
- `VerifyService`: Phone number verification
- `WebhookService`: Incoming SMS processing

## Contributing
See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## License
MIT

## International SMS Considerations

### Using Your Twilio Number Directly

When sending SMS internationally using your US Twilio number (+1), be aware of:

1. **Costs & Pricing**
- Higher rates for international SMS
- Additional fees may apply for specific countries
- Pricing varies by destination country
- Check [Twilio's pricing page](https://www.twilio.com/sms/pricing) for current rates

2. **Deliverability**
- Lower delivery rates compared to local numbers
- Messages may be filtered as spam more frequently
- Some countries restrict messages from international numbers
- Delivery speed might be slower

3. **Regulatory Requirements**
- A2P (Application-to-Person) registration required for many countries
- Country-specific sender ID regulations
- Some destinations require pre-registration of message templates
- Compliance with local messaging laws

### Alternative: Using Messaging Services

For better deliverability, consider using Twilio's Messaging Service which:
- Uses local numbers for each country
- Optimizes delivery rates
- Often has lower costs
- Handles regulatory compliance automatically
- Maintains conversation continuity (users can reply)

#### How Replies Work with Messaging Services
1. **Session Stickiness**
   - Twilio maintains a consistent sender number for each recipient
   - The same local number is used for ongoing conversations
   - User replies are forwarded to your webhook

2. **Webhook Configuration**
```typescript
// Configure Messaging Service with webhook
const service = await client.messaging.v1.services.create({
    friendlyName: 'ElizaMessaging',
    inboundRequestUrl: webhookUrl,
    useInboundWebhookOnNumber: true,
    stickyService: true  // Ensures conversation continuity
});
```

3. **Example Flow**
```
User -> Your Twilio Number (+1XXXXXXXXXX)
Twilio -> Local Number (+38XXXXXXXXX)
User receives from & replies to +38XXXXXXXXX
Your webhook receives all messages
```

Note: The main difference is that users will see and reply to a local number instead of your US Twilio number, but all functionality remains the same.

```typescript
// Example: Using Messaging Service
const messageOptions = {
    messagingServiceSid: 'MGXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    to: '+33612345678',
    body: 'Your message'
};
```

### Best Practices

1. **For Testing**
- Use direct number sending during development
- Test with verified numbers only
- Monitor delivery rates and costs

2. **For Production**
- Consider using Messaging Services for scale
- Complete A2P registration for target countries
- Monitor costs and adjust strategy as needed
- Implement proper error handling for failed deliveries

[Source: Twilio International SMS Guidelines](https://www.twilio.com/docs/messaging/guidelines/international-sms-messaging-guidelines)