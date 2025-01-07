import { TwilioPlugin } from '../src/twilio-plugin.js';
import dotenv from 'dotenv';

dotenv.config();

async function testSMSFlow() {
    // 1. Initialize plugin
    const plugin = TwilioPlugin;
    const runtime = {
        getSetting: (key: string) => process.env[key],
        processMessage: async (message: any) => ({
            text: `Echo: ${message.content.text}`
        })
    };

    // 2. Start webhook server
    await plugin.services
        .find(s => s.constructor.name === 'WebhookService')
        ?.initialize(runtime);

    console.log('Webhook server started. Use ngrok to expose it:');
    console.log('  ngrok http 3000');
    console.log('\nThen update your Twilio webhook URL and:');
    console.log('1. Send "verify phone +YOUR_NUMBER" in web interface');
    console.log('2. Enter verification code when received');
    console.log('3. Send SMS to your Twilio number to test');
}

testSMSFlow().catch(console.error);