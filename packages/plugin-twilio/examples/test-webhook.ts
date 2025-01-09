import twilio from 'twilio';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import crypto from 'crypto';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../../../');
const envPath = join(rootDir, '.env');

if (!existsSync(envPath)) {
    throw new Error(`.env file not found at ${envPath}`);
}

dotenv.config({ path: envPath });

// Function to generate Twilio signature
function generateTwilioSignature(authToken: string, url: string, params: Record<string, string>) {
    // Sort the params alphabetically as Twilio does
    const data = Object.keys(params)
        .sort()
        .reduce((str, key) => {
            return str + key + params[key];
        }, url);

    // Create HMAC with SHA1
    return crypto
        .createHmac('sha1', authToken)
        .update(Buffer.from(data, 'utf-8'))
        .digest('base64');
}

// Add debug mode
const DEBUG = true;

async function testWebhook() {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const webhookUrl = process.env.WEBHOOK_URL;

    if (!authToken || !webhookUrl) {
        console.error('Environment variables not found:');
        console.error('TWILIO_AUTH_TOKEN:', authToken ? '✓' : '✗');
        console.error('WEBHOOK_URL:', webhookUrl ? '✓' : '✗');
        throw new Error('TWILIO_AUTH_TOKEN and WEBHOOK_URL are required');
    }

    console.log('Testing webhook URL:', webhookUrl);

    // Create test parameters that match what Twilio sends
    const params = {
        AccountSid: process.env.TWILIO_ACCOUNT_SID || '',
        From: process.env.TEST_PHONE_NUMBER || '+33756807075',
        To: process.env.TWILIO_PHONE_NUMBER || '+12315158479',
        Body: 'Hello',
        MessageSid: 'TEST' + Date.now(),
        MessagingServiceSid: process.env.TWILIO_LOW_VOLUME_SERVICE_SID || '',
    };

    // Generate Twilio signature
    const signature = generateTwilioSignature(authToken, webhookUrl, params);

    if (DEBUG) {
        console.log('\nDebug Info:');
        console.log('URL:', webhookUrl);
        console.log('Auth Token:', authToken.substring(0, 8) + '...');
        console.log('Signature:', signature);
        console.log('Params:', params);
        console.log('\nRequest Details:');
    }

    try {
        const formData = new URLSearchParams(params).toString();

        if (DEBUG) {
            console.log('Form Data:', formData);
        }

        const response = await axios.post(webhookUrl,
            formData,
            {
                headers: {
                    'X-Twilio-Signature': signature,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        console.log('\nResponse:');
        console.log('Status:', response.status);
        console.log('Data:', response.data);
    } catch (error: any) {
        console.error('\nError:');
        console.error('Status:', error.response?.status);
        console.error('Data:', error.response?.data);
        console.error('Headers:', error.response?.headers);
        throw error;
    }
}

testWebhook().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});