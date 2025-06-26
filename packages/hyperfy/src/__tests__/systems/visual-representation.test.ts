import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createTestWorld } from '../createTestWorld';
import { VisualRepresentationSystem } from '../../rpg/systems/VisualRepresentationSystem';
import { SpawningSystem } from '../../rpg/systems/SpawningSystem';
import { NPCSystem } from '../../rpg/systems/NPCSystem';
import { RPGEntity } from '../../rpg/entities/RPGEntity';
import { SpawnerType } from '../../rpg/types';
import { VisualComponent } from '../../rpg/types/visual.types';

describe('VisualRepresentationSystem', () => {
  let world: any;
  let visualSystem: VisualRepresentationSystem;
  let spawningSystem: SpawningSystem;
  let npcSystem: NPCSystem;

  beforeEach(async () => {
    // Create test world with all RPG systems
    world = await createTestWorld({
      enableAllSystems: true
    });

    // Get systems
    visualSystem = world.getSystem('visualRepresentation') as VisualRepresentationSystem;
    spawningSystem = world.getSystem('spawning') as SpawningSystem;
    npcSystem = world.getSystem('npc') as NPCSystem;

    expect(visualSystem).toBeDefined();
    expect(spawningSystem).toBeDefined();
    expect(npcSystem).toBeDefined();
  });

  afterEach(() => {
    if (visualSystem) {
      visualSystem.destroy();
    }
  });

  describe('Visual Creation', () => {
    it('should create visual for entity with explicit template', () => {
      const entity = new RPGEntity(world, 'item', {
        id: 'test-sword',
        type: 'item',
        name: 'Test Sword',
        position: { x: 0, y: 0, z: 0 }
      });

      // Create visual with explicit template
      visualSystem.createVisual(entity, 'sword');

      // Verify visual was created
      const visual = visualSystem.getVisual(entity.id);
      expect(visual).toBeDefined();
      expect(visual?.template.color).toBe(16729156); // Red color for sword
      expect(visual?.template.size.height).toBe(1.2);
      expect(visual?.template.animations).toContain('swing_down');
    });

    it('should auto-detect template from entity type', () => {
      const entity = new RPGEntity(world, 'npc', {
        id: 'test-goblin',
        type: 'npc',
        name: 'Goblin Scout',
        position: { x: 5, y: 0, z: 5 }
      });

      // Add NPC component
      entity.addComponent('npc', {
        type: 'npc',
        npcId: 1,
        name: 'Goblin Scout',
        examine: 'A small goblin',
        npcType: 'monster' as any,
        behavior: 'aggressive' as any,
        faction: 'goblin',
        state: 'idle' as any,
        level: 1,
        combatLevel: 2,
        maxHitpoints: 10,
        currentHitpoints: 10,
        attackStyle: 'melee' as any,
        aggressionLevel: 5,
        aggressionRange: 10,
        attackBonus: 5,
        strengthBonus: 3,
        defenseBonus: 2,
        maxHit: 2,
        attackSpeed: 4,
        respawnTime: 60000,
        wanderRadius: 5,
        spawnPoint: { x: 5, y: 0, z: 5 },
        currentTarget: null,
        lastInteraction: 0
      });

      // Create visual without template name
      visualSystem.createVisual(entity);

      // Verify goblin template was auto-detected
      const visual = visualSystem.getVisual(entity.id);
      expect(visual).toBeDefined();
      expect(visual?.template.color).toBe(2263842); // Forest green for goblin
      expect(visual?.template.animations).toContain('walk');
      expect(visual?.template.animations).toContain('attack');
      expect(visual?.template.animations).toContain('die');
    });

    it('should use default template for unknown entity types', () => {
      const entity = new RPGEntity(world, 'unknown', {
        id: 'test-unknown',
        type: 'unknown',
        name: 'Mystery Object',
        position: { x: 0, y: 0, z: 0 }
      });

      visualSystem.createVisual(entity);

      const visual = visualSystem.getVisual(entity.id);
      expect(visual).toBeDefined();
      expect(visual?.template.color).toBe(8947848); // Gray for default
      expect(visual?.template.animations).toContain('pulse');
    });

    it('should handle resource entities', () => {
      const spawnerId = spawningSystem.registerSpawner({
        position: { x: 10, y: 0, z: 10 },
        type: SpawnerType.RESOURCE,
        entityDefinitions: [{
          entityType: 'tree',
          weight: 100
        }],
        maxEntities: 1,
        respawnTime: 60000
      });

      const spawner = (spawningSystem as any).spawners.get(spawnerId);
      const resource = spawningSystem.spawnEntity(spawner!);

      // Check visual was created automatically
      const visual = resource ? visualSystem.getVisual(resource.id) : null;
      expect(visual).toBeDefined();
      expect(visual?.template.color).toBe(2263842); // Green for tree
      expect(visual?.template.geometryType).toBe('cylinder');
    });
  });

  describe('Animation System', () => {
    let testEntity: RPGEntity;
    let visual: VisualComponent | undefined;

    beforeEach(() => {
      testEntity = new RPGEntity(world, 'item', {
        id: 'anim-test-entity',
        type: 'item',
        name: 'Animation Test',
        position: { x: 0, y: 0, z: 0 }
      });

      visualSystem.createVisual(testEntity, 'sword');
      visual = visualSystem.getVisual(testEntity.id);
    });

    it('should play animations', () => {
      expect(visual).toBeDefined();

      // Play animation
      visualSystem.playAnimation(testEntity.id, 'swing_down', false, 1000);

      // Check animation is active
      const activeAnimations = (visualSystem as any).activeAnimations;
      expect(activeAnimations.has(testEntity.id)).toBe(true);

      const animation = activeAnimations.get(testEntity.id);
      expect(animation.animationType).toBe('swing_down');
      expect(animation.loop).toBe(false);
      expect(animation.duration).toBe(1000);
    });

    it('should loop animations', () => {
      visualSystem.playAnimation(testEntity.id, 'idle', true, 500);

      const animation = (visualSystem as any).activeAnimations.get(testEntity.id);
      expect(animation).toBeDefined();
      expect(animation.loop).toBe(true);
    });

    it('should stop animations', () => {
      visualSystem.playAnimation(testEntity.id, 'swing_down', false, 1000);
      expect((visualSystem as any).activeAnimations.has(testEntity.id)).toBe(true);

      visualSystem.stopAnimation(testEntity.id);
      expect((visualSystem as any).activeAnimations.has(testEntity.id)).toBe(false);
    });

    it('should update animations over time', () => {
      // Play walk animation
      visualSystem.playAnimation(testEntity.id, 'walk', true, 1000);

      // Check animation was started
      const activeAnimations = (visualSystem as any).activeAnimations;
      expect(activeAnimations.has(testEntity.id)).toBe(true);

      // Get initial animation state
      const animation = activeAnimations.get(testEntity.id);
      const initialStartTime = animation.startTime;

      // Simulate time passing by adjusting start time
      animation.startTime = Date.now() - 500; // 50% through animation

      // Update animations
      visualSystem.update(0.016); // One frame

      // Check that animation is still active (since it's looping)
      expect(activeAnimations.has(testEntity.id)).toBe(true);

      // For non-looping animation, test completion
      visualSystem.playAnimation(testEntity.id, 'attack', false, 100);
      const attackAnim = activeAnimations.get(testEntity.id);
      attackAnim.startTime = Date.now() - 150; // Past duration

      visualSystem.update(0.016);

      // Non-looping animation should be removed after completion
      expect(activeAnimations.has(testEntity.id)).toBe(false);
    });

    it('should handle multiple animation types', () => {
      const animationTypes = ['walk', 'attack', 'die', 'pulse', 'rotate', 'bounce'];

      for (const animType of animationTypes) {
        visualSystem.playAnimation(testEntity.id, animType, false, 100);

        const animation = (visualSystem as any).activeAnimations.get(testEntity.id);
        expect(animation).toBeDefined();
        expect(animation.animationType).toBe(animType);

        // Update to apply animation
        visualSystem.update(0.05);
      }
    });
  });

  describe('Visual Cleanup', () => {
    it('should remove visual when entity is destroyed', () => {
      const entity = new RPGEntity(world, 'item', {
        id: 'cleanup-test',
        type: 'item',
        name: 'Cleanup Test',
        position: { x: 0, y: 0, z: 0 }
      });

      visualSystem.createVisual(entity, 'coin');
      expect(visualSystem.getVisual(entity.id)).toBeDefined();

      // Remove visual
      visualSystem.removeVisual(entity.id);
      expect(visualSystem.getVisual(entity.id)).toBeUndefined();
    });

    it('should stop animations when removing visual', () => {
      const entity = new RPGEntity(world, 'item', {
        id: 'cleanup-anim-test',
        type: 'item',
        name: 'Cleanup Animation Test',
        position: { x: 0, y: 0, z: 0 }
      });

      visualSystem.createVisual(entity, 'gem');
      visualSystem.playAnimation(entity.id, 'rotate', true);

      expect((visualSystem as any).activeAnimations.has(entity.id)).toBe(true);

      visualSystem.removeVisual(entity.id);
      expect((visualSystem as any).activeAnimations.has(entity.id)).toBe(false);
    });

    it('should clean up all visuals on destroy', () => {
      // Create multiple entities
      for (let i = 0; i < 5; i++) {
        const entity = new RPGEntity(world, 'item', {
          id: `destroy-test-${i}`,
          type: 'item',
          name: `Test Item ${i}`,
          position: { x: i, y: 0, z: 0 }
        });
        visualSystem.createVisual(entity);
      }

      expect((visualSystem as any).entityVisuals.size).toBe(5);

      // Destroy system
      visualSystem.destroy();

      expect((visualSystem as any).entityVisuals.size).toBe(0);
      expect((visualSystem as any).activeAnimations.size).toBe(0);
    });
  });

  describe('Integration with Spawning System', () => {
    it('should create visuals for spawned NPCs', () => {
      const spawnerId = spawningSystem.registerSpawner({
        position: { x: 0, y: 0, z: 0 },
        type: SpawnerType.NPC,
        entityDefinitions: [{
          entityType: 'skeleton',
          entityId: 5, // Skeleton NPC ID
          weight: 100
        }],
        maxEntities: 1,
        respawnTime: 30000
      });

      const spawner = (spawningSystem as any).spawners.get(spawnerId);
      const npc = spawningSystem.spawnEntity(spawner!);

      if (npc) {
        const visual = visualSystem.getVisual(npc.id);
        expect(visual).toBeDefined();
        expect(visual?.template.color).toBe(16119260); // Beige for skeleton
      }
    });

    it('should create visuals for spawned chests', () => {
      const spawnerId = spawningSystem.registerSpawner({
        position: { x: 5, y: 0, z: 5 },
        type: SpawnerType.CHEST,
        entityDefinitions: [{
          entityType: 'treasure_chest',
          weight: 100
        }],
        maxEntities: 1,
        respawnTime: 300000
      });

      const spawner = (spawningSystem as any).spawners.get(spawnerId);
      const chest = spawningSystem.spawnEntity(spawner!);

      if (chest) {
        const visual = visualSystem.getVisual(chest.id);
        expect(visual).toBeDefined();
        // Should detect 'chest' in the entity type
        expect(visual?.template.animations).toContain('open');
        expect(visual?.template.animations).toContain('close');
      }
    });
  });

  describe('Material and Geometry Types', () => {
    it('should create cylinder geometry for appropriate entities', () => {
      const entity = new RPGEntity(world, 'item', {
        id: 'potion-test',
        type: 'item',
        name: 'Health Potion',
        position: { x: 0, y: 0, z: 0 }
      });

      entity.addComponent('item', {
        type: 'item',
        itemId: 1,
        itemType: 'potion',
        stackable: true
      });

      visualSystem.createVisual(entity);

      const visual = visualSystem.getVisual(entity.id);
      expect(visual).toBeDefined();
      expect(visual?.template.geometryType).toBe('cylinder');
      expect(visual?.template.material?.opacity).toBe(0.8);
    });

    it('should apply metallic materials for appropriate items', () => {
      const entity = new RPGEntity(world, 'item', {
        id: 'sword-material-test',
        type: 'item',
        name: 'Iron Sword',
        position: { x: 0, y: 0, z: 0 }
      });

      visualSystem.createVisual(entity, 'sword');

      const visual = visualSystem.getVisual(entity.id);
      expect(visual).toBeDefined();
      expect(visual?.template.material?.metalness).toBe(0.8);
      expect(visual?.template.material?.roughness).toBe(0.2);
    });
  });

  describe('Performance', () => {
    it('should handle many entities efficiently', () => {
      const startTime = Date.now();
      const entityCount = 100;

      // Create many entities
      for (let i = 0; i < entityCount; i++) {
        const entity = new RPGEntity(world, 'item', {
          id: `perf-test-${i}`,
          type: 'item',
          name: `Item ${i}`,
          position: { x: i % 10, y: 0, z: Math.floor(i / 10) }
        });

        visualSystem.createVisual(entity);
        visualSystem.playAnimation(entity.id, 'rotate', true);
      }

      const creationTime = Date.now() - startTime;
      expect(creationTime).toBeLessThan(1000); // Should create 100 entities in under 1 second

      // Test update performance
      const updateStart = Date.now();
      for (let i = 0; i < 60; i++) { // Simulate 60 frames
        visualSystem.update(0.016); // ~60 FPS
      }
      const updateTime = Date.now() - updateStart;
      expect(updateTime).toBeLessThan(1000); // 60 frames should process in under 1 second

      // Cleanup
      for (let i = 0; i < entityCount; i++) {
        visualSystem.removeVisual(`perf-test-${i}`);
      }
    });
  });
});
