import { createRPGServerWorld } from '../core/createRPGServerWorld';
import { initializeRPGWorld, RPGWorldDefinition } from '../rpg/world/RPGWorld';
import type { World, WorldOptions } from '../types';
import { ENV } from '../core/env';

// Server configuration
const SERVER_PORT = ENV.PORT || '3000';
const WS_PORT = ENV.WS_PORT || '4445';
const API_URL = ENV.get('API_URL') || `http://localhost:${SERVER_PORT}`;
const ASSETS_URL = ENV.get('ASSETS_URL') || 'https://hyperfy-assets.s3.amazonaws.com';

async function startRPGServer() {
  console.log('[RPGServer] Starting RuneScape RPG server...');

  try {
    // Create the world with RPG systems
    const world = await createRPGServerWorld();

    // Initialize world with options
    const options: WorldOptions = {
      storage: null, // Add your storage implementation here
      assetsUrl: ASSETS_URL,
      physics: true,
    };

    console.log('[RPGServer] Initializing world systems...');
    await world.init(options);

    // Initialize RPG world content (NPCs, quests, etc.)
    console.log('[RPGServer] Loading RPG content...');
    await initializeRPGWorld(world);

    // Set up player join handler
    world.on('player:join', async (player: any) => {
      console.log(`[RPGServer] Player joined: ${player.name} (${player.id})`);

      // Initialize player with RPG components
      const skillsSystem = world.systems.find(s => s.constructor.name === 'SkillsSystem');
      const inventorySystem = world.systems.find(s => s.constructor.name === 'InventorySystem');

      if (skillsSystem) {
        // Initialize skills for new player
        ;(skillsSystem as any).initializePlayer(player.id);
      }

      if (inventorySystem) {
        // Give starter items
        for (const item of RPGWorldDefinition.starterKit) {
          ;(inventorySystem as any).addItem(player.id, item.itemId, item.quantity);
        }
      }

      // Send welcome message
      world.events.emit('chat:system', {
        targetId: player.id,
        message: 'Welcome to RuneScape RPG! Type /help for commands.',
      });
    });

    // Set up command handlers
    world.on('chat:command', (data: { playerId: string; command: string; args: string[] }) => {
      const { playerId, command, args } = data;

      switch (command) {
        case 'help':
          world.events.emit('chat:system', {
            targetId: playerId,
            message: 'Commands: /stats, /skills, /quests, /trade [player], /bank',
          });
          break;

        case 'stats':
          const stats = world.entities.get(playerId)?.getComponent('stats');
          if (stats) {
            world.events.emit('chat:system', {
              targetId: playerId,
              message: `Combat Level: ${(stats as any).combatLevel}, Total Level: ${(stats as any).totalLevel}`,
            });
          }
          break;

        case 'trade':
          if (args[0]) {
            const tradingSystem = world.systems.find(s => s.constructor.name === 'TradingSystem');
            if (tradingSystem) {
              const targetPlayer = findPlayerByName(world, args[0]);
              if (targetPlayer) {
                ;(tradingSystem as any).requestTrade(playerId, targetPlayer.id);
              }
            }
          }
          break;
      }
    });

    // Start the game loop
    console.log('[RPGServer] Starting game loop...');
    let lastTime = Date.now();
    const gameLoop = () => {
      const now = Date.now();
      const _delta = now - lastTime;
      lastTime = now;

      world.tick(now);

      setTimeout(gameLoop, 16); // ~60 FPS
    };
    gameLoop();

    // Start network server
    const networkSystem = world.systems.find(s => s.constructor.name === 'ServerNetwork');
    if (networkSystem && 'listen' in networkSystem) {
      console.log(`[RPGServer] Starting network server on port ${WS_PORT}...`);
      await (networkSystem as any).listen(WS_PORT);
    }

    console.log('[RPGServer] RuneScape RPG server is running!');
    console.log(`[RPGServer] WebSocket: ws://localhost:${WS_PORT}`);
    console.log(`[RPGServer] API: ${API_URL}`);
  } catch (error) {
    console.error('[RPGServer] Failed to start server:', error);
    process.exit(1);
  }
}

// Helper function to find player by name
function findPlayerByName(world: World, name: string): any {
  const nameLower = name.toLowerCase();
  for (const entity of world.entities.getAll()) {
    if (entity.type === 'player' && entity.name?.toLowerCase() === nameLower) {
      return entity;
    }
  }
  return null;
}

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n[RPGServer] Shutting down...');
  process.exit(0);
});

// Start the server
startRPGServer().catch(error => {
  console.error('[RPGServer] Fatal error:', error);
  process.exit(1);
});
