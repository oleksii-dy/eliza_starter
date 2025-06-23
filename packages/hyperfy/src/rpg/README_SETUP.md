# Hyperfy RPG World Setup Guide

This guide explains how to set up and run the RuneScape-style RPG world in Hyperfy.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Project
```bash
npm run build
```

### 3. Start the RPG Server
```bash
# Run the RPG server
node dist/server/rpg-server.js

# Or with environment variables
PORT=3000 WS_PORT=3001 node dist/server/rpg-server.js
```

### 4. Connect with Client
The server will start on:
- WebSocket: `ws://localhost:3001`
- API: `http://localhost:3000`

## World Features

### Implemented Systems
- **Combat**: Melee, Ranged, and Magic combat with authentic RuneScape mechanics
- **Skills**: 23 skills with XP and leveling (max level 99)
- **Inventory**: 28-slot inventory + 11 equipment slots
- **Banking**: 816-slot bank with PIN protection
- **Trading**: Player-to-player secure trading
- **Prayer**: 15+ prayers with drain mechanics
- **Shops**: NPC shops with restock mechanics
- **NPCs**: Monsters, shopkeepers, quest givers, bankers
- **Quests**: Quest system with objectives and rewards
- **Movement**: Click-to-move with pathfinding
- **Loot**: Item drops with rarity tiers
- **Spawning**: Area-based NPC spawning

### Default Locations
- **Tutorial Island**: (3094, 0, 3107)
- **Lumbridge**: (3222, 0, 3218) - Default spawn
- **Varrock**: (3213, 0, 3428)
- **Falador**: (2965, 0, 3380)
- **Edgeville**: (3087, 0, 3496)

### Starter NPCs
- **Combat**: Chickens, Cows, Goblins, Giant Rats, Men
- **Shops**: General Store, Rune Shop, Sword Shop
- **Services**: Bankers, Quest NPCs
- **Tutorial**: Tutorial Guide

### Commands
- `/help` - Show available commands
- `/stats` - View your combat and total level
- `/trade [player]` - Request trade with another player
- `/bank` - Open bank interface (near banker)

## Development

### Adding New NPCs
```typescript
// In your world initialization
npcSystem.registerNPCDefinition({
  id: 123,
  name: 'Dragon',
  npcType: 'monster',
  behavior: 'aggressive',
  level: 50,
  combatLevel: 83,
  maxHitpoints: 100,
  combat: {
    attackBonus: 50,
    strengthBonus: 50,
    defenseBonus: 50,
    maxHit: 20,
    attackSpeed: 4000
  },
  lootTable: 'dragon_drops'
});
```

### Creating Spawn Areas
```typescript
spawningSystem.createSpawnArea({
  id: 'dragon_lair',
  npcIds: [123],
  maxCount: 3,
  respawnTime: 60000,
  center: { x: 3000, y: 0, z: 3000 },
  radius: 20
});
```

### Adding Quests
```typescript
questSystem.registerQuest({
  id: 'dragon_slayer',
  name: 'Dragon Slayer',
  description: 'Defeat the dragon!',
  objectives: [{
    type: 'kill',
    targetId: '123',
    targetCount: 1
  }],
  rewards: {
    experience: { attack: 1000 },
    items: [{ itemId: 995, quantity: 1000 }]
  }
});
```

## Configuration

### Environment Variables
- `PORT` - HTTP server port (default: 3000)
- `WS_PORT` - WebSocket port (default: 3001)
- `API_URL` - API base URL
- `ASSETS_URL` - Assets CDN URL

### World Settings
Edit `RPGWorldDefinition` in `src/rpg/world/RPGWorld.ts`:
- `name` - World name
- `description` - World description
- `spawn` - Default spawn location
- `rules` - PvP, max players, etc.
- `starterKit` - Items given to new players

## Troubleshooting

### Systems Not Found
Ensure the RPG plugin is properly initialized:
```typescript
await HyperfyRPGPlugin.init(world);
```

### NPCs Not Spawning
Check that:
1. NPC definitions are registered
2. Spawn areas are created
3. SpawningSystem is running

### Combat Not Working
Verify:
1. Both entities have combat components
2. Attacker has a weapon equipped
3. Target is within range

## Next Steps

1. **Add Death System**: Implement respawning and item recovery
2. **PvP Zones**: Add wilderness and safe zones
3. **Grand Exchange**: Global marketplace
4. **Minigames**: Castle Wars, Pest Control, etc.
5. **More Content**: Additional quests, bosses, and areas

For more details, see the main [RPG README](./README.md) and [Implementation Status](../../plans/RPG_IMPLEMENTATION_STATUS.md). 