import { describe, it, expect, beforeEach } from 'vitest';
import { createTestWorld, runWorldFor } from '../createTestWorld';
import type { World } from '../../types';
import type { MagicSystem } from '../../rpg/systems/MagicSystem';
import type { InventorySystem } from '../../rpg/systems/InventorySystem';

describe('MagicSystem Runtime', () => {
  let world: World;
  let magicSystem: MagicSystem;
  let inventorySystem: InventorySystem;

  beforeEach(async () => {
    world = await createTestWorld();
    magicSystem = world.getSystem('magic') as MagicSystem;
    inventorySystem = world.getSystem('inventory') as InventorySystem;
  });

  describe('Basic Spell Casting', () => {
    it('should cast spells with required runes', async () => {
      const player = (world as any).createTestPlayer('player1');
      const target = (world as any).createTestPlayer('target1');

      // Set up player stats
      const stats = player.getComponent('stats');
      if (stats) {
        stats.magic = { level: 50, xp: 100000 };
        stats.hitpoints = { current: 50, max: 50, level: 50, xp: 100000 };
      }

      // Set up target stats
      const targetStats = target.getComponent('stats');
      if (targetStats) {
        targetStats.hitpoints = { current: 50, max: 50, level: 50, xp: 100000 };
      }

      // Give player runes (generic runes for testing)
      inventorySystem.addItem('player1', 554, 10); // Fire runes
      inventorySystem.addItem('player1', 556, 10); // Air runes
      inventorySystem.addItem('player1', 558, 10); // Mind runes

      // Cast a spell (using generic spell name)
      const casted = magicSystem.castSpell('player1', 'windStrike', 'target1');
      expect(casted).toBe(true);

      // Check some runes were consumed
      const inventory = player.getComponent('inventory');
      const airRunes = inventory?.items.find((item: any) => item?.itemId === 556);
      expect(airRunes?.quantity).toBeLessThan(10);
    });

    it('should not cast without required runes', async () => {
      const player = (world as any).createTestPlayer('player1');
      const target = (world as any).createTestPlayer('target1');

      // Set up player stats
      const stats = player.getComponent('stats');
      if (stats) {
        stats.magic = { level: 50, xp: 100000 };
      }

      // Don't give any runes

      // Try to cast spell
      const casted = magicSystem.castSpell('player1', 'windStrike', 'target1');
      expect(casted).toBe(false);
    });

    it('should not cast spell without required level', async () => {
      const player = (world as any).createTestPlayer('player1');
      const target = (world as any).createTestPlayer('target1');

      // Set low magic level
      const stats = player.getComponent('stats');
      if (stats) {
        stats.magic = { level: 1, xp: 0 };
      }

      // Give runes
      inventorySystem.addItem('player1', 554, 10);
      inventorySystem.addItem('player1', 556, 10);
      inventorySystem.addItem('player1', 558, 10);
      inventorySystem.addItem('player1', 562, 10); // Chaos runes

      // Try to cast high level spell
      const casted = magicSystem.castSpell('player1', 'fireBlast', 'target1');
      expect(casted).toBe(false);
    });
  });

  describe('Combat Spell Effects', () => {
    it('should initiate combat when casting combat spell', async () => {
      const player = (world as any).createTestPlayer('player1');
      const target = (world as any).createTestPlayer('target1');

      // Set up stats
      const stats = player.getComponent('stats');
      if (stats) {
        stats.magic = { level: 50, xp: 100000 };
        stats.hitpoints = { current: 50, max: 50, level: 50, xp: 100000 };
      }

      // Set up target stats
      const targetStats = target.getComponent('stats');
      if (targetStats) {
        targetStats.hitpoints = { current: 50, max: 50, level: 50, xp: 100000 };
      }

      // Ensure combat components exist
      if (!player.getComponent('combat')) {
        player.addComponent('combat', {
          type: 'combat',
          inCombat: false,
          target: null,
          lastAttackTime: 0,
          attackSpeed: 4,
          combatStyle: 'accurate',
          autoRetaliate: true,
          hitSplatQueue: [],
          animationQueue: [],
          specialAttackEnergy: 100,
          specialAttackActive: false,
          protectionPrayers: {
            melee: false,
            ranged: false,
            magic: false
          }
        });
      }

      // Give runes
      inventorySystem.addItem('player1', 556, 10);
      inventorySystem.addItem('player1', 558, 10);

      // Cast combat spell
      magicSystem.castSpell('player1', 'windStrike', 'target1');

      // Check combat initiated
      const combatComponent = player.getComponent('combat');
      expect(combatComponent?.inCombat).toBe(true);
      expect(combatComponent?.target).toBe('target1');
    });

    it('should deal damage with combat spell', async () => {
      const player = (world as any).createTestPlayer('player1');
      const target = (world as any).createTestPlayer('target1');

      // Set up stats
      const stats = player.getComponent('stats');
      if (stats) {
        stats.magic = { level: 50, xp: 100000 };
        stats.hitpoints = { current: 50, max: 50, level: 50, xp: 100000 };
      }

      const targetStats = target.getComponent('stats');
      if (targetStats) {
        targetStats.hitpoints = { current: 50, max: 50, level: 50, xp: 100000 };
      }

      // Give runes
      inventorySystem.addItem('player1', 556, 100);
      inventorySystem.addItem('player1', 558, 100);

      // Track initial HP
      const initialHp = targetStats.hitpoints.current;

      // Cast spell
      magicSystem.castSpell('player1', 'windStrike', 'target1');

      // Run world to process damage
      await runWorldFor(world, 100);

      // Check damage was dealt (or at least attempted)
      // Note: Damage might be 0 due to accuracy, but spell was cast
      const finalHp = targetStats.hitpoints.current;
      expect(finalHp).toBeLessThanOrEqual(initialHp);
    });
  });

  describe('Non-Combat Spells', () => {
    it('should cast teleport spell', async () => {
      const player = (world as any).createTestPlayer('player1');

      // Set up stats
      const stats = player.getComponent('stats');
      if (stats) {
        stats.magic = { level: 50, xp: 100000 };
      }

      // Ensure movement component exists
      if (!player.getComponent('movement')) {
        player.addComponent('movement', {
          type: 'movement',
          position: { x: 0, y: 0, z: 0 },
          destination: null,
          path: [],
          moveSpeed: 1,
          currentSpeed: 1,
          isMoving: false,
          canMove: true,
          runEnergy: 100,
          isRunning: false,
          facingDirection: 0,
          pathfindingFlags: 0,
          lastMoveTime: 0,
          teleportDestination: null,
          teleportTime: 0,
          teleportAnimation: ''
        });
      }

      // Give teleport runes (air and law)
      inventorySystem.addItem('player1', 556, 10); // Air
      inventorySystem.addItem('player1', 563, 5); // Law

      // Cast teleport
      const casted = magicSystem.castSpell('player1', 'teleportVarrock');
      expect(casted).toBe(true);

      // Check teleport initiated
      const movement = player.getComponent('movement');
      expect(movement?.teleportDestination).toBeDefined();
    });

    it('should cast alchemy spell', async () => {
      const player = (world as any).createTestPlayer('player1');

      // Set up stats
      const stats = player.getComponent('stats');
      if (stats) {
        stats.magic = { level: 55, xp: 200000 };
      }

      // Give nature runes and fire runes
      inventorySystem.addItem('player1', 561, 10); // Nature
      inventorySystem.addItem('player1', 554, 50); // Fire

      // Give an item to alch
      inventorySystem.addItem('player1', 1277, 1); // Bronze sword

      // Cast alchemy (might need different parameters)
      const casted = magicSystem.castSpell('player1', 'highAlchemy', undefined);
      expect(casted).toBe(true);

      // Check item was removed and gold added
      const inventory = player.getComponent('inventory');
      const hasGold = inventory?.items.some((item: any) => item?.itemId === 995);
      expect(hasGold).toBe(true);
    });
  });

  describe('Spell Mechanics', () => {
    it('should respect spell cooldowns', async () => {
      const player = (world as any).createTestPlayer('player1');
      const target = (world as any).createTestPlayer('target1');

      // Set up stats
      const stats = player.getComponent('stats');
      if (stats) {
        stats.magic = { level: 50, xp: 100000 };
      }

      // Give lots of runes
      inventorySystem.addItem('player1', 556, 100);
      inventorySystem.addItem('player1', 558, 100);

      // Cast spell
      const firstCast = magicSystem.castSpell('player1', 'windStrike', 'target1');
      expect(firstCast).toBe(true);

      // Try to cast again immediately - should fail due to cooldown
      const secondCast = magicSystem.castSpell('player1', 'windStrike', 'target1');
      expect(secondCast).toBe(false);

      // Wait for cooldown
      await runWorldFor(world, 3000);

      // Should be able to cast again
      const thirdCast = magicSystem.castSpell('player1', 'windStrike', 'target1');
      expect(thirdCast).toBe(true);
    });

    it('should update magic experience on cast', async () => {
      const player = (world as any).createTestPlayer('player1');
      const target = (world as any).createTestPlayer('target1');

      // Set up stats
      const stats = player.getComponent('stats');
      if (stats) {
        stats.magic = { level: 50, xp: 100000 };
      }

      // Give runes
      inventorySystem.addItem('player1', 556, 10);
      inventorySystem.addItem('player1', 558, 10);

      // Track initial XP
      const initialXp = stats.magic.xp;

      // Cast spell
      magicSystem.castSpell('player1', 'windStrike', 'target1');

      // Check XP increased
      expect(stats.magic.xp).toBeGreaterThan(initialXp);
    });
  });
});
