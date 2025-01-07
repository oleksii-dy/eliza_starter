import { Runtime, Character } from '@elizaos/core';
import { webhookService } from '../src/services/webhook.js';
import { storageService } from '../src/services/storage.js';
import { twilioService } from '../src/services/twilio.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startSmsAgent() {
    console.log('Starting Eliza SMS agent...');

    try {
        // Load the character configuration
        const characterPath = path.resolve(__dirname, '../../../characters/test-character.json');
        const character = await Character.fromFile(characterPath);

        // Initialize the runtime with the character
        const runtime = new Runtime({
            character,
            verbose: true
        });
        await runtime.initialize();
        console.log('Runtime initialized with character:', character.name);

        // Initialize storage with test user (or load from persistent storage)
        await storageService.initialize();
        await storageService.storeVerifiedUser('test-user-123', '+33780999517');
        console.log('Storage initialized with test user');

        // Initialize Twilio service
        await twilioService.initialize(runtime);
        console.log('Twilio service initialized');

        // Start the webhook server
        await webhookService.initialize(runtime);
        const port = webhookService.getPort();
        console.log(`\n✓ SMS agent ready and listening on port ${port}`);
        console.log('\nTest with a message to your Twilio number: +12315158479');
        console.log('Or use curl for testing:');
        console.log(`curl -X POST http://localhost:${port}/webhook/sms \\
  -d "From=+33780999517" \\
  -d "To=+12315158479" \\
  -d "Body=Hello, who are you?" \\
  -H "Content-Type: application/x-www-form-urlencoded"\n`);

        console.log('\nServer is running. Press Ctrl+C to stop.');
    } catch (error) {
        console.error('Error starting SMS agent:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await webhookService.shutdown();
    process.exit(0);
});

startSmsAgent().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});