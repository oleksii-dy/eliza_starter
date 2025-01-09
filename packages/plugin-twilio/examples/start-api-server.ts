import express from 'express';
import { Runtime, Character } from '@elizaos/core';
import { webhookService } from '../src/services/webhook.js';
import { storageService } from '../src/services/storage.js';
import { twilioService } from '../src/services/twilio.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startApiServer() {
    console.log('Starting API server with Twilio integration...');

    try {
        // Create Express app for API endpoints
        const app = express();
        app.use(express.json());

        // Load the character configuration
        const characterPath = path.resolve(__dirname, '../../../characters/test-character.json');
        const character = await Character.fromFile(characterPath);

        // Initialize the runtime with the character
        const runtime = new Runtime({
            character,
            verbose: true
        });
        await runtime.initialize();

        // Initialize services
        await storageService.initialize();
        await twilioService.initialize(runtime);
        await webhookService.initialize(runtime);

        // Add API routes
        app.use('/api', (req, res, next) => {
            // Forward to webhook service
            webhookService.app(req, res, next);
        });

        // Start API server on port 3000
        const server = app.listen(3000, () => {
            console.log('✓ API server listening on port 3000');
            console.log('\nTest the API with:');
            console.log('curl http://localhost:3000/api/agents');
        });

        // Handle shutdown
        process.on('SIGINT', async () => {
            console.log('\nShutting down...');
            server.close();
            await webhookService.shutdown();
            process.exit(0);
        });

    } catch (error) {
        console.error('Error starting API server:', error);
        process.exit(1);
    }
}

startApiServer().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});