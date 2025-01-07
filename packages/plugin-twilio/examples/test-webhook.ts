import { webhookService } from '../src/services/webhook.js';
import { storageService } from '../src/services/storage.js';
import { twilioService } from '../src/services/twilio.js';

async function testWebhook() {
    console.log('Starting webhook test...');

    try {
        // Initialize storage with test user
        console.log('Initializing storage...');
        await storageService.initialize();
        await storageService.storeVerifiedUser('test-user-123', '+33780999517');
        console.log('Test user stored with phone:', '+33780999517');

        // Create a mock runtime
        console.log('Creating mock runtime...');
        const mockRuntime = {
            processMessage: async (message: any) => {
                console.log('Processing message:', message);
                return {
                    text: `Received your message: "${message.content.text}". This is a test response.`
                };
            }
        };

        // Initialize Twilio service
        await twilioService.initialize(mockRuntime);
        console.log('Twilio service initialized');

        // Initialize webhook with mock runtime
        console.log('Initializing webhook service...');
        await webhookService.initialize(mockRuntime);

        // Get the actual port from the server
        const port = webhookService.getPort();
        console.log(`\n✓ Server successfully started on port ${port}`);

        console.log('\nTest with this command:');
        console.log('------------------------');
        console.log(`curl -X POST http://localhost:${port}/webhook/sms \\
  -d "From=+33780999517" \\
  -d "To=+38689" \\
  -d "Body=Hello Eliza" \\
  -H "Content-Type: application/x-www-form-urlencoded"\n`);

        // Keep the process running
        console.log('Server is running. Press Ctrl+C to stop.');
    } catch (error) {
        console.error('Error during setup:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await webhookService.shutdown();
    process.exit(0);
});

testWebhook().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});