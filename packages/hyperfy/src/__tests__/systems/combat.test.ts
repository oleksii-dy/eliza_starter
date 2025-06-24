import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createTestWorld, runWorldFor, runWorldUntil } from '../createTestWorld';
import type { World } from '../../types';
import { RPGEntity } from '../../rpg/entities/RPGEntity';
import { CombatSystem } from '../../rpg/systems/CombatSystem';
import { CombatStyle, AttackType } from '../../rpg/types';

describe('Combat System (Real World)', () => {
  let world: World;
  let combat: CombatSystem;

  beforeEach(async () => {
    world = await createTestWorld({ enablePhysics: false });
    combat = (world as any).combat;
  });

  afterEach(() => {
    world.destroy();
  });

  describe('Real Combat Flow', () => {
    it('should handle complete combat scenario with real entities', async () => {
      // Create real entities outside safe zone
      const player = new RPGEntity(world, 'player', {
        id: 'player-1',
        name: 'TestPlayer',
        position: { x: 200, y: 0, z: 200 } // Outside default safe zone
      });

      const npc = new RPGEntity(world, 'npc', {
        id: 'npc-1',
        name: 'Goblin',
        position: { x: 201, y: 0, z: 200 } // Next to player
      });

      // Add to world entities
      (world.entities as any).items.set(player.data.id, player);
      (world.entities as any).items.set(npc.data.id, npc);

      // Add realistic stats
      player.addComponent('stats', {
        type: 'stats',
        hitpoints: { current: 50, max: 50, level: 10, xp: 0 },
        attack: { level: 20, xp: 0, bonus: 0 },
        strength: { level: 20, xp: 0, bonus: 0 },
        defense: { level: 15, xp: 0, bonus: 0 },
        ranged: { level: 1, xp: 0, bonus: 0 },
        magic: { level: 1, xp: 0, bonus: 0 },
        prayer: { level: 1, xp: 0, points: 0, maxPoints: 0 },
        combatBonuses: {
          attackStab: 10,
          attackSlash: 10,
          attackCrush: 10,
          attackMagic: 0,
          attackRanged: 0,
          defenseStab: 5,
          defenseSlash: 5,
          defenseCrush: 5,
          defenseMagic: 0,
          defenseRanged: 0,
          meleeStrength: 8,
          rangedStrength: 0,
          magicDamage: 0,
          prayerBonus: 0
        },
        combatLevel: 22,
        totalLevel: 58
      });

      npc.addComponent('stats', {
        type: 'stats',
        hitpoints: { current: 15, max: 15, level: 2, xp: 0 },
        attack: { level: 1, xp: 0, bonus: 0 },
        strength: { level: 1, xp: 0, bonus: 0 },
        defense: { level: 1, xp: 0, bonus: 0 },
        ranged: { level: 1, xp: 0, bonus: 0 },
        magic: { level: 1, xp: 0, bonus: 0 },
        prayer: { level: 1, xp: 0, points: 0, maxPoints: 0 },
        combatBonuses: {
          attackStab: 0,
          attackSlash: 0,
          attackCrush: 0,
          attackMagic: 0,
          attackRanged: 0,
          defenseStab: 0,
          defenseSlash: 0,
          defenseCrush: 0,
          defenseMagic: 0,
          defenseRanged: 0,
          meleeStrength: 0,
          rangedStrength: 0,
          magicDamage: 0,
          prayerBonus: 0
        },
        combatLevel: 2,
        totalLevel: 6
      });

      // Add combat components
      player.addComponent('combat', {
        type: 'combat',
        inCombat: false,
        target: null,
        combatStyle: CombatStyle.ACCURATE,
        autoRetaliate: true,
        attackSpeed: 4,
        lastAttackTime: 0,
        specialAttackEnergy: 100,
        specialAttackActive: false,
        hitSplatQueue: [],
        animationQueue: [],
        protectionPrayers: {
          melee: false,
          ranged: false,
          magic: false
        }
      });

      npc.addComponent('combat', {
        type: 'combat',
        inCombat: false,
        target: null,
        combatStyle: CombatStyle.ACCURATE,
        autoRetaliate: true,
        attackSpeed: 4,
        lastAttackTime: 0,
        specialAttackEnergy: 0,
        specialAttackActive: false,
        hitSplatQueue: [],
        animationQueue: [],
        protectionPrayers: {
          melee: false,
          ranged: false,
          magic: false
        }
      });

      // Add inventory components (required for weapon checks)
      player.addComponent('inventory', {
        type: 'inventory',
        items: new Array(28).fill(null),
        maxSlots: 28,
        equipment: {
          head: null,
          cape: null,
          amulet: null,
          weapon: null,
          body: null,
          shield: null,
          legs: null,
          gloves: null,
          boots: null,
          ring: null,
          ammo: null
        },
        totalWeight: 0,
        equipmentBonuses: {
          attackStab: 0,
          attackSlash: 0,
          attackCrush: 0,
          attackMagic: 0,
          attackRanged: 0,
          defenseStab: 0,
          defenseSlash: 0,
          defenseCrush: 0,
          defenseMagic: 0,
          defenseRanged: 0,
          meleeStrength: 0,
          rangedStrength: 0,
          magicDamage: 0,
          prayerBonus: 0
        }
      });

      npc.addComponent('inventory', {
        type: 'inventory',
        items: new Array(28).fill(null),
        maxSlots: 28,
        equipment: {
          head: null,
          cape: null,
          amulet: null,
          weapon: null,
          body: null,
          shield: null,
          legs: null,
          gloves: null,
          boots: null,
          ring: null,
          ammo: null
        },
        totalWeight: 0,
        equipmentBonuses: {
          attackStab: 0,
          attackSlash: 0,
          attackCrush: 0,
          attackMagic: 0,
          attackRanged: 0,
          defenseStab: 0,
          defenseSlash: 0,
          defenseCrush: 0,
          defenseMagic: 0,
          defenseRanged: 0,
          meleeStrength: 0,
          rangedStrength: 0,
          magicDamage: 0,
          prayerBonus: 0
        }
      });

      // Add movement components for position
      player.addComponent('movement', {
        type: 'movement',
        position: { x: 200, y: 0, z: 200 },
        destination: null,
        path: [],
        moveSpeed: 1,
        isMoving: false,
        runEnergy: 100,
        isRunning: false,
        pathfindingFlags: 0,
        lastMoveTime: 0,
        teleportDestination: null,
        teleportTime: 0,
        teleportAnimation: ''
      });

      npc.addComponent('movement', {
        type: 'movement',
        position: { x: 201, y: 0, z: 200 },
        destination: null,
        path: [],
        moveSpeed: 1,
        isMoving: false,
        runEnergy: 100,
        isRunning: false,
        pathfindingFlags: 0,
        lastMoveTime: 0,
        teleportDestination: null,
        teleportTime: 0,
        teleportAnimation: ''
      });

      // Track combat events
      let combatStarted = false;
      let damageDealt = 0;
      let npcDied = false;

      combat.on('combat:start', () => {
        console.log('Combat start event fired!');
        combatStarted = true;
      });

      combat.on('combat:damage', (event: any) => {
        console.log('Damage event:', event);
        damageDealt += event.damage;
      });

      combat.on('combat:hit', (event: any) => {
        console.log('Hit event:', event);
      });

      combat.on('entity:death', (event: any) => {
        if (event.entityId === npc.data.id) {
          npcDied = true;
        }
      });

      // Debug: Check if entities exist in world
      console.log('Player in world:', world.entities.has(player.data.id));
      console.log('NPC in world:', world.entities.has(npc.data.id));
      console.log('Player stats:', player.getComponent('stats'));
      console.log('NPC stats:', npc.getComponent('stats'));

      // Start combat
      const result = combat.initiateAttack(player.data.id, npc.data.id);
      console.log('Combat initiation result:', result);
      expect(result).toBe(true);
      expect(combatStarted).toBe(true);

      // Run world for a short time to see if combat is working
      await runWorldFor(world, 3000);

      // Check if any damage was dealt
      console.log('Damage dealt:', damageDealt);
      console.log('NPC died:', npcDied);

      // For now, just verify combat started
      expect(damageDealt).toBeGreaterThan(0);

      const npcStats = npc.getComponent('stats') as any;
      console.log('NPC HP after combat:', npcStats.hitpoints.current);
    });

    it('should calculate realistic damage', () => {
      // Create entities with known stats
      const attacker = new RPGEntity(world, 'player', {
        id: 'attacker',
        position: { x: 0, y: 0, z: 0 }
      });

      const defender = new RPGEntity(world, 'player', {
        id: 'defender',
        position: { x: 1, y: 0, z: 0 }
      });

      // Set up precise stats for testing
      attacker.addComponent('stats', {
        type: 'stats',
        hitpoints: { current: 99, max: 99, level: 99, xp: 0 },
        attack: { level: 99, xp: 0, bonus: 0 },
        strength: { level: 99, xp: 0, bonus: 0 },
        defense: { level: 1, xp: 0, bonus: 0 },
        ranged: { level: 1, xp: 0, bonus: 0 },
        magic: { level: 1, xp: 0, bonus: 0 },
        prayer: { level: 1, xp: 0, points: 0, maxPoints: 0 },
        combatBonuses: {
          attackStab: 0,
          attackSlash: 136, // Whip stats
          attackCrush: 0,
          attackMagic: 0,
          attackRanged: 0,
          defenseStab: 0,
          defenseSlash: 0,
          defenseCrush: 0,
          defenseMagic: 0,
          defenseRanged: 0,
          meleeStrength: 82, // Whip strength
          rangedStrength: 0,
          magicDamage: 0,
          prayerBonus: 0
        },
        combatLevel: 126,
        totalLevel: 200
      });

      defender.addComponent('stats', {
        type: 'stats',
        hitpoints: { current: 99, max: 99, level: 99, xp: 0 },
        attack: { level: 1, xp: 0, bonus: 0 },
        strength: { level: 1, xp: 0, bonus: 0 },
        defense: { level: 99, xp: 0, bonus: 0 },
        ranged: { level: 1, xp: 0, bonus: 0 },
        magic: { level: 1, xp: 0, bonus: 0 },
        prayer: { level: 1, xp: 0, points: 0, maxPoints: 0 },
        combatBonuses: {
          attackStab: 0,
          attackSlash: 0,
          attackCrush: 0,
          attackMagic: 0,
          attackRanged: 0,
          defenseStab: 0,
          defenseSlash: 226, // Barrows armor
          defenseCrush: 0,
          defenseMagic: 0,
          defenseRanged: 0,
          meleeStrength: 0,
          rangedStrength: 0,
          magicDamage: 0,
          prayerBonus: 0
        },
        combatLevel: 99,
        totalLevel: 100
      });

      attacker.addComponent('combat', {
        type: 'combat',
        inCombat: false,
        target: null,
        combatStyle: CombatStyle.ACCURATE,
        autoRetaliate: false,
        attackSpeed: 4,
        lastAttackTime: 0,
        specialAttackEnergy: 100,
        specialAttackActive: false,
        hitSplatQueue: [],
        animationQueue: [],
        protectionPrayers: {
          melee: false,
          ranged: false,
          magic: false
        }
      });

      // Calculate hit
      const hit = combat.calculateHit(attacker, defender);

      // Verify hit properties
      expect(hit).toBeDefined();
      expect(hit.attackType).toBe(AttackType.MELEE);
      expect(hit.damage).toBeGreaterThanOrEqual(0);

      // Max hit should be around 46-48 with these stats
      // But we might miss, so just verify it's not unreasonable
      expect(hit.damage).toBeLessThanOrEqual(50);
    });

    it('should respect combat mechanics', async () => {
      // Test attack speed
      const player = new RPGEntity(world, 'player', {
        id: 'speed-test',
        position: { x: 0, y: 0, z: 0 }
      });

      const dummy = new RPGEntity(world, 'npc', {
        id: 'dummy',
        position: { x: 1, y: 0, z: 0 }
      });

      // Set up for speed test
      player.addComponent('stats', {
        type: 'stats',
        hitpoints: { current: 99, max: 99, level: 99, xp: 0 },
        attack: { level: 50, xp: 0, bonus: 0 },
        strength: { level: 50, xp: 0, bonus: 0 },
        defense: { level: 50, xp: 0, bonus: 0 },
        ranged: { level: 1, xp: 0, bonus: 0 },
        magic: { level: 1, xp: 0, bonus: 0 },
        prayer: { level: 1, xp: 0, points: 0, maxPoints: 0 },
        combatBonuses: {
          attackStab: 50,
          attackSlash: 50,
          attackCrush: 50,
          attackMagic: 0,
          attackRanged: 0,
          defenseStab: 0,
          defenseSlash: 0,
          defenseCrush: 0,
          defenseMagic: 0,
          defenseRanged: 0,
          meleeStrength: 50,
          rangedStrength: 0,
          magicDamage: 0,
          prayerBonus: 0
        },
        combatLevel: 60,
        totalLevel: 153
      });

      dummy.addComponent('stats', {
        type: 'stats',
        hitpoints: { current: 1000, max: 1000, level: 99, xp: 0 },
        attack: { level: 1, xp: 0, bonus: 0 },
        strength: { level: 1, xp: 0, bonus: 0 },
        defense: { level: 1, xp: 0, bonus: 0 },
        ranged: { level: 1, xp: 0, bonus: 0 },
        magic: { level: 1, xp: 0, bonus: 0 },
        prayer: { level: 1, xp: 0, points: 0, maxPoints: 0 },
        combatBonuses: {
          attackStab: 0,
          attackSlash: 0,
          attackCrush: 0,
          attackMagic: 0,
          attackRanged: 0,
          defenseStab: 0,
          defenseSlash: 0,
          defenseCrush: 0,
          defenseMagic: 0,
          defenseRanged: 0,
          meleeStrength: 0,
          rangedStrength: 0,
          magicDamage: 0,
          prayerBonus: 0
        },
        combatLevel: 3,
        totalLevel: 6
      });

      player.addComponent('combat', {
        type: 'combat',
        inCombat: false,
        target: null,
        combatStyle: CombatStyle.ACCURATE,
        autoRetaliate: false,
        attackSpeed: 4, // 2.4 seconds
        lastAttackTime: 0,
        specialAttackEnergy: 100,
        specialAttackActive: false,
        hitSplatQueue: [],
        animationQueue: [],
        protectionPrayers: {
          melee: false,
          ranged: false,
          magic: false
        }
      });

      dummy.addComponent('combat', {
        type: 'combat',
        inCombat: false,
        target: null,
        combatStyle: CombatStyle.ACCURATE,
        autoRetaliate: false,
        attackSpeed: 4,
        lastAttackTime: 0,
        specialAttackEnergy: 0,
        specialAttackActive: false,
        hitSplatQueue: [],
        animationQueue: [],
        protectionPrayers: {
          melee: false,
          ranged: false,
          magic: false
        }
      });

      player.addComponent('movement', {
        type: 'movement',
        position: { x: 0, y: 0, z: 0 },
        destination: null,
        path: [],
        moveSpeed: 1,
        isMoving: false,
        runEnergy: 100,
        isRunning: false,
        pathfindingFlags: 0,
        lastMoveTime: 0,
        teleportDestination: null,
        teleportTime: 0,
        teleportAnimation: ''
      });

      dummy.addComponent('movement', {
        type: 'movement',
        position: { x: 1, y: 0, z: 0 },
        destination: null,
        path: [],
        moveSpeed: 1,
        isMoving: false,
        runEnergy: 100,
        isRunning: false,
        pathfindingFlags: 0,
        lastMoveTime: 0,
        teleportDestination: null,
        teleportTime: 0,
        teleportAnimation: ''
      });

      (world.entities as any).items.set(player.data.id, player);
      (world.entities as any).items.set(dummy.data.id, dummy);

      let hitCount = 0;
      world.events.on('combat:hit', () => {
        hitCount++;
      });

      // Start combat
      combat.initiateAttack(player.data.id, dummy.data.id);

      // Run for exactly 5 seconds
      await runWorldFor(world, 5000);

      // Should have hit 2-3 times (first hit immediate, then every 2.4s)
      // 0s, 2.4s, 4.8s = 3 hits maximum
      expect(hitCount).toBeGreaterThanOrEqual(2);
      expect(hitCount).toBeLessThanOrEqual(3);
    });
  });
});
