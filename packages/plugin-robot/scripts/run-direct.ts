import { IAgentRuntime, logger, ModelType } from '@elizaos/core';
import { SqliteDatabaseAdapter } from '@elizaos/database-sqlite';
import { visionPlugin } from '../src/index.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load character
const characterPath = path.join(__dirname, '../characters/visual-assistant-minimal.json');
const character = JSON.parse(fs.readFileSync(characterPath, 'utf-8'));

// Configure environment
process.env.VISION_MODE = 'BOTH';
process.env.VISION_ENABLE_OBJECT_DETECTION = 'true';
process.env.VISION_ENABLE_POSE_DETECTION = 'true';
process.env.VISION_OCR_ENABLED = 'true';
process.env.VISION_FLORENCE2_ENABLED = 'true';

// Set up model provider
const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  console.error('❌ No API key found. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY');
  process.exit(1);
}

async function main() {
  console.log('🤖 Starting Visual Assistant directly...');
  console.log('📷 Camera: Enabled');
  console.log('🖥️  Screen: Enabled');
  console.log('🧠 Vision Processing: Enabled');
  console.log('');

  try {
    // Create database adapter
    const db = new SqliteAdapter({
      filename: ':memory:', // Use in-memory DB for testing
    });
    await db.init();

    // Create runtime configuration
    const runtime = {
      databaseAdapter: db,
      token: apiKey,
      character,
      plugins: [visionPlugin],
      getSetting: (key: string) => process.env[key],
      getMemoryManager: () => db,
      messageManager: db,
      descriptionManager: db,
      documentsManager: db,
      knowledgeManager: db,
      providers: []
      actions: []
      evaluators: []
      services: new Map(),
      fetch: globalThis.fetch,
      useModel: async (type: ModelType, input: any) => {
        // Simple model implementation for testing
        if (type === ModelType.IMAGE_DESCRIPTION) {
          return { description: 'I see a computer screen with code' };
        }
        return 'Test response';
      },
      composeState: async () => ({ values: {}, data: {}, text: '' }),
      processActions: async () => {},
      evaluate: async () => null,
      registerPlugin: async (plugin: any) => {
        console.log(`[Runtime] Registering plugin: ${plugin.name}`);

        // Initialize services
        if (plugin.services) {
          for (const ServiceClass of plugin.services) {
            const service = await ServiceClass.start(runtime as any);
            runtime.services.set(ServiceClass.serviceName, service);
            console.log(`[Runtime] Started service: ${ServiceClass.serviceName}`);
          }
        }

        // Register providers
        if (plugin.providers) {
          runtime.providers.push(...plugin.providers);
        }

        // Register actions
        if (plugin.actions) {
          runtime.actions.push(...plugin.actions);
        }
      },
      getService: (name: string) => runtime.services.get(name),
      logger,
    } as any;

    // Register plugins
    await runtime.registerPlugin(visionPlugin);

    console.log('\n✅ Vision plugin loaded successfully!');
    console.log('🔍 Available services:', Array.from(runtime.services.keys()));
    console.log(
      '📋 Available actions:',
      runtime.actions.map((a: any) => a.name)
    );
    console.log(
      '📊 Available providers:',
      runtime.providers.map((p: any) => p.name)
    );

    // Get vision service
    const visionService = runtime.getService('VISION');
    if (visionService) {
      console.log('\n👁️ Vision Service Status:');
      console.log('  - Mode:', visionService.getVisionMode());
      console.log('  - Camera:', visionService.getCameraInfo() ? 'Connected' : 'Not connected');
      console.log('  - Active:', visionService.isActive());

      // Wait a bit for initial capture
      console.log('\n⏳ Waiting for initial vision capture...');
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Get current scene
      const scene = await visionService.getSceneDescription();
      if (scene) {
        console.log('\n🎬 Current Scene:');
        console.log('  - Description:', scene.description);
        console.log('  - Objects:', scene.objects.length);
        console.log('  - People:', scene.people.length);
        console.log('  - Change:', scene.changePercentage?.toFixed(1) + '%');
      }

      // Get screen capture
      const screen = await visionService.getScreenCapture();
      if (screen) {
        console.log('\n🖥️ Screen Capture:');
        console.log('  - Resolution:', `${screen.width}x${screen.height}`);
        console.log('  - Tiles:', screen.tiles.length);
        console.log('  - Active Tile:', screen.activeTileIndex);
      }
    } else {
      console.error('❌ Vision service not found!');
    }

    // Keep running for a bit to see updates
    console.log('\n👀 Watching for vision updates (press Ctrl+C to stop)...\n');

    setInterval(async () => {
      const scene = await visionService?.getSceneDescription();
      if (scene && scene.sceneChanged) {
        console.log(
          `[${new Date().toLocaleTimeString()}] Scene changed:`,
          scene.description.substring(0, 100) + '...'
        );
      }
    }, 1000);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...');
  process.exit(0);
});

main().catch(console.error);
