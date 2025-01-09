import { webhookService } from '../src/services/webhook.js';
import { storageService } from '../src/services/storage.js';
import { twilioService } from '../src/services/twilio.js';
import { RuntimeContext } from '../src/services/runtime-context.js';

async function startSmsAgent() {
    console.log('Starting Twilio SMS integration...');

    try {
        // Initialize storage with test user
        await storageService.initialize();
        await storageService.storeVerifiedUser('test-user-123', '+33780999517');
        console.log('Storage initialized with test user');

        // Initialize Twilio service
        await twilioService.initialize();
        console.log('Twilio service initialized');

        // Initialize webhook service
        await webhookService.initialize();
        const port = webhookService.getPort();

        console.log('\n✓ Twilio integration ready');
        console.log('\nTo use:');
        console.log('1. Start the main agent:');
        console.log('   pnpm start --character="characters/test-character.json"');
        console.log('\n2. Start the client:');
        console.log('   cd client && pnpm start:client');
        console.log('\n3. Test via:');
        console.log('   - Web UI: http://localhost:5173');
        console.log('   - SMS: Send message to +12315158479');
        console.log('\nPress Ctrl+C to stop the Twilio integration.\n');

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\nShutting down Twilio integration...');
            await webhookService.shutdown();
            process.exit(0);
        });

    } catch (error) {
        console.error('Error starting Twilio integration:', error);
        process.exit(1);
    }
}

startSmsAgent().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});