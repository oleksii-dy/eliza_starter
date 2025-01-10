// /packages/plugin-twilio/examples/test-anthropic.ts

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Fix __dirname in ESM
const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = dirname(currentFilePath);

// Load environment variables with debugging
const envPath = join(currentDirPath, '../../../.env');
console.log('Loading environment from:', envPath);

dotenv.config({
    path: envPath
});

// Add environment debugging
console.log('Current directory:', process.cwd());
console.log('API key loaded?', !!process.env.ANTHROPIC_API_KEY);
console.log('API key real length:', process.env.ANTHROPIC_API_KEY?.length);

// Test function
async function testAnthropicConnection() {
    try {
        const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
        if (!apiKey) {
            throw new Error('ANTHROPIC_API_KEY is not set');
        }

        // Log key details for debugging
        console.log('API key validation:', {
            length: apiKey.length,
            startsWithPrefix: apiKey.startsWith('sk-ant-'),
            hasSpaces: /\s/.test(apiKey),
            format: 'Using x-api-key header'
        });

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
                'accept': 'application/json',
                'client-sdk': '@anthropic-ai/sdk@0.10.2'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 1024,
                messages: [{
                    role: 'user',
                    content: [{
                        type: 'text',
                        text: 'Say hello'
                    }]
                }],
                system: "You are a helpful AI assistant."
            })
        });

        console.log('Request details:', {
            url: 'https://api.anthropic.com/v1/messages',
            headers: {
                'x-api-key': apiKey.substring(0, 10) + '...',
                'anthropic-version': '2023-06-01'
            },
            body: {
                model: 'claude-3-sonnet-20240229',
                max_tokens: 1024,
                messages: [{
                    role: 'user',
                    content: [{
                        type: 'text',
                        text: 'Say hello'
                    }]
                }],
                system: "You are a helpful AI assistant."
            }
        });

        const data = await response.json();
        console.log('Response data:', JSON.stringify(data, null, 2));

        return response.ok;
    } catch (error) {
        console.error('Error testing Anthropic connection:', error);
        return false;
    }
}

// Run test
console.log('Testing with API key:', process.env.ANTHROPIC_API_KEY?.substring(0, 10) + '...');
testAnthropicConnection().then(success => {
    if (!success) {
        process.exit(1);
    }
});