/**
 * Visual Representation Demo
 * 
 * This demo shows all the different entity types with their simple cube
 * representations, colors, and animations.
 */

import { World } from '../../types';
import { VisualRepresentationSystem } from '../systems/VisualRepresentationSystem';
import { SpawningSystem } from '../systems/SpawningSystem';
import { SpawnerType } from '../types';
import { NPCSystem } from '../systems/NPCSystem';
import { RPGEntity } from '../entities/RPGEntity';

/**
 * Run the visual demonstration
 */
export async function runVisualDemo(world: World): Promise<void> {
  console.log('\n=== Visual Representation Demo ===\n');

  // Get systems
  const visualSystem = world.getSystem('visualRepresentation') as unknown as VisualRepresentationSystem;
  const spawningSystem = world.getSystem('spawning') as unknown as SpawningSystem;
  const npcSystem = world.getSystem('npc') as unknown as NPCSystem;

  if (!visualSystem || !spawningSystem || !npcSystem) {
    console.error('Required systems not found');
    return;
  }

  console.log('Creating demo entities with visual representations...\n');

  // 1. Create NPCs with visuals
  console.log('1. NPCs:');
  const npcPositions = [
    { x: 0, y: 0, z: 0, type: 'goblin', npcId: 1 }, // Goblin
    { x: 5, y: 0, z: 0, type: 'skeleton', npcId: 5 }, // Skeleton
    { x: 10, y: 0, z: 0, type: 'guard', npcId: 100 }, // Guard (from guards.json)
    { x: 15, y: 0, z: 0, type: 'merchant', npcId: 200 }, // Merchant (from shop_keepers.json)
    { x: 20, y: 0, z: 0, type: 'quest_giver', npcId: 300 } // Quest giver (from quest_givers.json)
  ];

  for (const pos of npcPositions) {
    // Register spawner for each NPC type
    const spawnerId = spawningSystem.registerSpawner({
      position: pos,
      type: SpawnerType.NPC,
      entityDefinitions: [{
        entityType: pos.type,
        entityId: pos.npcId,
        weight: 100
      }],
      maxEntities: 1,
      respawnTime: 30000
    });

    // Spawn the NPC
    const spawner = (spawningSystem as any).spawners.get(spawnerId);
    if (spawner) {
      const npc = spawningSystem.spawnEntity(spawner);
      if (npc) {
        console.log(`  - Created ${pos.type} at (${pos.x}, ${pos.y}, ${pos.z})`);
        
        // Play idle animation
        visualSystem.playAnimation(npc.id, 'idle', true);
      }
    }
  }

  // 2. Create items with visuals
  console.log('\n2. Items:');
  const itemTypes = [
    { type: 'sword', position: { x: 0, y: 1, z: 5 } },
    { type: 'shield', position: { x: 5, y: 1, z: 5 } },
    { type: 'potion', position: { x: 10, y: 1, z: 5 } },
    { type: 'coin', position: { x: 15, y: 1, z: 5 } },
    { type: 'gem', position: { x: 20, y: 1, z: 5 } }
  ];

  for (const item of itemTypes) {
    const entity = new RPGEntity(world, 'item', {
      id: `item_${item.type}_${Date.now()}`,
      type: 'item',
      name: item.type,
      position: item.position
    });

    // Add item component
    entity.addComponent('item', {
      type: 'item',
      itemId: 1,
      itemType: item.type,
      stackable: item.type === 'coin'
    });

    // Create visual
    visualSystem.createVisual(entity, item.type);
    console.log(`  - Created ${item.type} at (${item.position.x}, ${item.position.y}, ${item.position.z})`);

    // Play appropriate animation
    if (item.type === 'coin' || item.type === 'gem') {
      visualSystem.playAnimation(entity.id, 'rotate', true);
    } else if (item.type === 'potion') {
      visualSystem.playAnimation(entity.id, 'bubble', true);
    }
  }

  // 3. Create resources with visuals
  console.log('\n3. Resources:');
  const resourcePositions = [
    { x: 0, y: 0, z: 10, type: 'tree' },
    { x: 5, y: 0, z: 10, type: 'rock' },
    { x: 10, y: 0, z: 10, type: 'fishing_spot' }
  ];

  for (const pos of resourcePositions) {
    const spawnerId = spawningSystem.registerSpawner({
      position: pos,
      type: SpawnerType.RESOURCE,
      entityDefinitions: [{
        entityType: pos.type,
        weight: 100
      }],
      maxEntities: 1,
      respawnTime: 60000
    });

    const spawner = (spawningSystem as any).spawners.get(spawnerId);
    if (spawner) {
      const resource = spawningSystem.spawnEntity(spawner);
      if (resource) {
        console.log(`  - Created ${pos.type} at (${pos.x}, ${pos.y}, ${pos.z})`);
      }
    }
  }

  // 4. Create chests with visuals
  console.log('\n4. Chests:');
  const chestPositions = [
    { x: 0, y: 0, z: 15, type: 'chest' },
    { x: 5, y: 0, z: 15, type: 'barrel' },
    { x: 10, y: 0, z: 15, type: 'crate' },
    { x: 15, y: 0, z: 15, type: 'bank_chest' }
  ];

  for (const pos of chestPositions) {
    const spawnerId = spawningSystem.registerSpawner({
      position: pos,
      type: SpawnerType.CHEST,
      entityDefinitions: [{
        entityType: pos.type,
        weight: 100
      }],
      maxEntities: 1,
      respawnTime: 300000
    });

    const spawner = (spawningSystem as any).spawners.get(spawnerId);
    if (spawner) {
      const chest = spawningSystem.spawnEntity(spawner);
      if (chest) {
        console.log(`  - Created ${pos.type} at (${pos.x}, ${pos.y}, ${pos.z})`);
      }
    }
  }

  // 5. Demonstrate animations
  console.log('\n5. Animation demonstrations:');
  
  // Create combat demonstration
  const combatDemo = new RPGEntity(world, 'npc', {
    id: 'combat_demo_npc',
    type: 'npc',
    name: 'Combat Demo Goblin',
    position: { x: 25, y: 0, z: 0 }
  });
  
  visualSystem.createVisual(combatDemo, 'goblin');
  
  // Cycle through combat animations
  console.log('  - Combat animations:');
  setTimeout(() => {
    console.log('    - Walk animation');
    visualSystem.playAnimation(combatDemo.id, 'walk', true, 2000);
  }, 1000);

  setTimeout(() => {
    console.log('    - Attack animation');
    visualSystem.playAnimation(combatDemo.id, 'attack', false, 1000);
  }, 3000);

  setTimeout(() => {
    console.log('    - Die animation');
    visualSystem.playAnimation(combatDemo.id, 'die', false, 2000);
  }, 5000);

  // Create chest animation demo
  const chestDemo = new RPGEntity(world, 'chest', {
    id: 'chest_demo',
    type: 'chest',
    name: 'Demo Chest',
    position: { x: 25, y: 0, z: 5 }
  });

  visualSystem.createVisual(chestDemo, 'chest');

  setTimeout(() => {
    console.log('  - Chest animations:');
    console.log('    - Open animation');
    visualSystem.playAnimation(chestDemo.id, 'open', false, 1000);
  }, 7000);

  setTimeout(() => {
    console.log('    - Close animation');
    visualSystem.playAnimation(chestDemo.id, 'close', false, 1000);
  }, 9000);

  // Create item animation demos
  const swordDemo = new RPGEntity(world, 'item', {
    id: 'sword_demo',
    type: 'item',
    name: 'Demo Sword',
    position: { x: 25, y: 1, z: 10 }
  });

  visualSystem.createVisual(swordDemo, 'sword');

  setTimeout(() => {
    console.log('  - Item animations:');
    console.log('    - Sword swing');
    visualSystem.playAnimation(swordDemo.id, 'swing_down', false, 1000);
  }, 11000);

  // Summary
  console.log('\n=== Visual Demo Summary ===');
  console.log('All entities have been created with:');
  console.log('- Cube representations with different sizes');
  console.log('- Unique colors for each entity type');
  console.log('- Simple placeholder animations');
  console.log('\nThese are temporary visuals that will be replaced with real models and animations later.');
  
  // Update loop for animations
  let lastTime = Date.now();
  const updateInterval = setInterval(() => {
    const currentTime = Date.now();
    const delta = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    // Update visual system animations
    visualSystem.update(delta);
  }, 16); // ~60 FPS

  // Stop after 15 seconds
  setTimeout(() => {
    clearInterval(updateInterval);
    console.log('\n=== Demo Complete ===');
  }, 15000);
}

// Export for use
export default runVisualDemo; 