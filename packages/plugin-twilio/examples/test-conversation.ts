import { webhookService } from '../src/services/webhook.js';
import { storageService } from '../src/services/storage.js';
import { twilioService } from '../src/services/twilio.js';

async function testConversation() {
    console.log('Starting conversation test...');

    try {
        // Initialize storage with test user
        console.log('Initializing storage...');
        await storageService.initialize();
        await storageService.storeVerifiedUser('test-user-123', '+33780999517');
        console.log('Test user stored with phone:', '+33780999517');

        // Create a more conversational mock runtime
        console.log('Creating mock runtime...');
        const mockRuntime = {
            processMessage: async (message: any) => {
                console.log('Processing message:', message);

                // Simulate different responses based on the message
                if (message.content.text.toLowerCase().includes('hello')) {
                    return {
                        text: "Hi! I'm Eliza. How are you feeling today?"
                    };
                } else if (message.content.text.toLowerCase().includes('good')) {
                    return {
                        text: "I'm glad you're feeling good! What would you like to talk about?"
                    };
                } else {
                    return {
                        text: "Tell me more about that..."
                    };
                }
            }
        };

        // Initialize services
        await twilioService.initialize(mockRuntime);
        console.log('Twilio service initialized');

        await webhookService.initialize(mockRuntime);
        const port = webhookService.getPort();

        console.log('\n✓ Server ready for conversation test');
        console.log('\nTest the conversation with these commands:');
        console.log('----------------------------------------');
        console.log('1. First message:');
        console.log(`curl -X POST http://localhost:${port}/webhook/sms \\
  -d "From=+33780999517" \\
  -d "To=+38689" \\
  -d "Body=Hello Eliza" \\
  -H "Content-Type: application/x-www-form-urlencoded"\n`);

        console.log('2. Follow-up response:');
        console.log(`curl -X POST http://localhost:${port}/webhook/sms \\
  -d "From=+33780999517" \\
  -d "To=+38689" \\
  -d "Body=I'm feeling good today" \\
  -H "Content-Type: application/x-www-form-urlencoded"\n`);

        console.log('3. Continue conversation:');
        console.log(`curl -X POST http://localhost:${port}/webhook/sms \\
  -d "From=+33780999517" \\
  -d "To=+38689" \\
  -d "Body=Let's talk about my day" \\
  -H "Content-Type: application/x-www-form-urlencoded"\n`);

        console.log('\nServer is running. Press Ctrl+C to stop.');
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

testConversation().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});