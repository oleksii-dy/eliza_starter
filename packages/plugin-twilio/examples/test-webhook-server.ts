import { webhookService } from '../src/services/webhook.js';
import { storageService } from '../src/services/storage.js';
import { twilioService } from '../src/services/twilio.js';
import { RuntimeContext } from '../src/services/runtime-context.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../../../');
const envPath = join(rootDir, '.env');

dotenv.config({ path: envPath });

async function startServer() {
    try {
        // Initialize storage with test user
        console.log('Initializing storage...');
        await storageService.initialize();
        await storageService.storeVerifiedUser('test-user-123', process.env.TEST_PHONE_NUMBER!);
        console.log('Test user stored with phone:', process.env.TEST_PHONE_NUMBER);

        // Create a mock runtime
        console.log('Creating mock runtime...');
        const mockRuntime = {
            processMessage: async (message: any) => {
                console.log('Processing message:', message);
                return {
                    text: `Received your message: "${message.content.text}". This is a test response.`
                };
            },
            getSetting: (key: string) => process.env[key]
        };

        // Set runtime in context
        RuntimeContext.setRuntime(mockRuntime);

        // Initialize services
        await twilioService.initialize();
        console.log('Twilio service initialized');

        await webhookService.initialize(mockRuntime);
        console.log('Webhook service initialized');

    } catch (error) {
        console.error('Error during setup:', error);
        process.exit(1);
    }
}

startServer();