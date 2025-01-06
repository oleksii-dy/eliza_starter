// /plugins/plugin-twilio/test/discord-test.ts

console.log('Starting discord-test.ts...');

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return 'Unknown error';
  }
}

try {
  console.log('Loading imports...');
  
  console.log('Importing from index.js...');
  const { twilioService, voiceService, transcriptionService, DiscordAdapter } = await import('../src/index.js');
  console.log('Successfully imported from index.js');
  
  console.log('Importing dotenv...');
  const dotenv = await import('dotenv');
  console.log('Successfully imported dotenv');
  
  console.log('Importing path and url...');
  const { join, dirname } = await import('path');
  const { fileURLToPath } = await import('url');
  console.log('Successfully imported path and url');
  
  console.log('Importing discord.js...');
  const { Client, GatewayIntentBits } = await import('discord.js');
  console.log('Successfully imported discord.js');
  
  console.log('All modules imported successfully');

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
    console.error('Failed to load environment variables:', formatError(error));
    process.exit(1);
  }

  // Verify required environment variables
  const requiredEnvVars = [
    'DISCORD_API_TOKEN',
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

  async function test() {
    try {
      console.log('Starting service initialization...');
      
      // Initialize services one by one for better error tracking
      console.log('Initializing transcription service...');
      await transcriptionService.initialize().catch(error => {
        console.error('Failed to initialize transcription service:', formatError(error));
        throw error;
      });
      
      console.log('Initializing voice service...');
      await voiceService.initialize().catch(error => {
        console.error('Failed to initialize voice service:', formatError(error));
        throw error;
      });
      
      console.log('Initializing Twilio service...');
      await twilioService.initialize().catch(error => {
        console.error('Failed to initialize Twilio service:', formatError(error));
        throw error;
      });

      console.log('All services initialized successfully');

      console.log('Creating Discord client...');
      const client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.GuildVoiceStates,
          GatewayIntentBits.MessageContent
        ]
      });

      console.log('Creating Discord adapter...');
      const discordAdapter = new DiscordAdapter(
        twilioService,
        voiceService,
        transcriptionService
      );

      console.log('Setting up commands...');
      await discordAdapter.setupCommands(client).catch(error => {
        console.error('Failed to setup commands:', formatError(error));
        throw error;
      });

      console.log('Logging in to Discord...');
      await client.login(process.env.DISCORD_API_TOKEN).catch(error => {
        console.error('Failed to login to Discord:', formatError(error));
        throw error;
      });
      console.log('Bot is ready!');

      // Keep the process alive
      process.on('SIGINT', () => {
        console.log('Shutting down...');
        client.destroy();
        process.exit(0);
      });

    } catch (error) {
      console.error('Test failed:', formatError(error));
      if (error instanceof Error && error.stack) {
        console.error('Stack trace:', error.stack);
      }
      process.exit(1);
    }
  }

  // Add process error handlers
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', formatError(error));
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  });

  process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', formatError(error));
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  });

  test().catch(error => {
    console.error('Fatal error:', formatError(error));
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  });

} catch (error) {
  console.error('Failed during setup. Error type:', typeof error);
  console.error('Error value:', error);
  console.error('Formatted error:', formatError(error));
  if (error instanceof Error) {
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
  }
  process.exit(1);
} 