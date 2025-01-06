console.log('Starting test.ts...');

import { twilioService, voiceService, transcriptionService } from '../src/index.js';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables first
try {
  const rootDir = join(__dirname, '../../../');
  const pluginDir = join(__dirname, '../');

  // Try loading from plugin directory first
  let result = dotenv.config({ path: join(pluginDir, '.env') });
  
  // If no .env in plugin directory, try root directory
  if (result.error) {
    console.log('No .env file found in plugin directory, trying root directory...');
    result = dotenv.config({ path: join(rootDir, '.env') });
  }

  if (result.error) {
    throw new Error(`Error loading .env file: ${result.error.message}`);
  }

  console.log('Environment variables loaded successfully');
} catch (error) {
  console.error('Failed to load environment variables:', error);
  process.exit(1);
}

// Verify required environment variables
const requiredEnvVars = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'DEEPGRAM_API_KEY',
  'ELEVENLABS_XI_API_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

async function testTwilioService() {
  console.log('\nTesting Twilio Service...');
  try {
    const testNumber = process.env.TEST_PHONE_NUMBER;
    if (!testNumber) {
      console.log('⚠️  Skipping SMS test - TEST_PHONE_NUMBER not configured');
      return;
    }

    await twilioService.sendMessage(
      testNumber,
      'Test message from Eliza Twilio plugin'
    );
    console.log('✅ SMS sent successfully');
  } catch (error) {
    console.error('❌ Twilio test failed:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

async function testVoiceService() {
  console.log('\nTesting Voice Service...');
  try {
    const testText = 'Hello, this is a test message from Eliza';
    const audioBuffer = await voiceService.generateSpeech(testText);
    
    // Save test audio file
    const testFile = join(__dirname, 'test-output.mp3');
    await writeFile(testFile, audioBuffer);
    console.log('✅ Voice generated successfully:', testFile);
    return testFile;
  } catch (error) {
    console.error('❌ Voice test failed:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

async function testTranscriptionService(audioFile: string) {
  console.log('\nTesting Transcription Service...');
  try {
    // Read test audio file
    const audioBuffer = await readFile(audioFile);
    const transcript = await transcriptionService.transcribeAudio(audioBuffer);
    console.log('✅ Audio transcribed successfully:', transcript);
  } catch (error) {
    console.error('❌ Transcription test failed:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

async function test() {
  try {
    console.log('Starting service initialization...');
    
    // Initialize services one by one for better error tracking
    console.log('Initializing transcription service...');
    await transcriptionService.initialize();
    
    console.log('Initializing voice service...');
    await voiceService.initialize();
    
    console.log('Initializing Twilio service...');
    await twilioService.initialize();

    console.log('All services initialized successfully');
    
    // Test plugin registration
    console.log('Plugin name:', twilioPlugin.name);
    console.log('Plugin description:', twilioPlugin.description);
    console.log('Number of services:', twilioPlugin.services?.length);

    // Verify each service type
    console.log('\nService Types:');
    twilioPlugin.services?.forEach(service => {
      console.log(`- ${service.constructor.name}: ${service.serviceType}`);
    });

    // Run service-specific tests
    if (process.env.RUN_SERVICE_TESTS === 'true') {
      await testTwilioService();
      const audioFile = await testVoiceService();
      await testTranscriptionService(audioFile);
    } else {
      console.log('\n⚠️  Skipping service tests - set RUN_SERVICE_TESTS=true to enable');
    }

  } catch (error) {
    console.error('Test failed:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Add process error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error instanceof Error ? error.message : String(error));
  if (error instanceof Error && error.stack) {
    console.error('Stack trace:', error.stack);
  }
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error instanceof Error ? error.message : String(error));
  if (error instanceof Error && error.stack) {
    console.error('Stack trace:', error.stack);
  }
  process.exit(1);
});

test().catch(error => {
  console.error('Fatal error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});