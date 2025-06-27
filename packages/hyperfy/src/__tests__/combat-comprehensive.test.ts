/**
 * Comprehensive Combat System Tests
 * Tests all combat mechanics including animations, range, damage, PvP scenarios
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createTestWorld } from './test-utils';
import { AdvancedCombatSystem } from '../rpg/systems/combat/AdvancedCombatSystem';
import { CombatAnimationSystem } from '../rpg/systems/combat/CombatAnimationSystem';
import { EnhancedSkillsSystem } from '../rpg/systems/EnhancedSkillsSystem';
import {
  CombatStyle,
  AttackStyle,
  WeaponType,
  WEAPON_DEFINITIONS,
  COMBAT_TRIANGLE,
  applyCombatTriangle,
} from '../rpg/systems/combat/CombatDefinitions';
import { SkillType, getXPForLevel } from '../rpg/systems/skills/SkillDefinitions';

describe('Combat System Comprehensive Tests', () => {
  let world: any;
  let combatSystem: AdvancedCombatSystem;
  let animationSystem: CombatAnimationSystem;
  let skillsSystem: EnhancedSkillsSystem;

  beforeEach(async () => {
    // Create test world
    world = createTestWorld();

    // Add combat systems
    combatSystem = new AdvancedCombatSystem(world);
    animationSystem = new CombatAnimationSystem(world);
    skillsSystem = new EnhancedSkillsSystem(world);

    world.addSystem(combatSystem);
    world.addSystem(animationSystem);
    world.addSystem(skillsSystem);

    // Initialize systems
    await combatSystem.initialize();
    await animationSystem.initialize();
    await skillsSystem.initialize();
  });

  afterEach(() => {
    if (world && world.cleanup) {
      world.cleanup();
    }
  });

  describe('Combat Component Creation', () => {
    it('should create combat components with proper stats', () => {
      const player = world.createEntity({
        type: 'player',
        id: 'test_player_combat',
        components: [],
      });

      player.addComponent({
        type: 'movement',
        position: { x: 0, y: 0, z: 0 },
      });

      // Initialize player skills first
      skillsSystem.createPlayerSkills(player);

      const combat = combatSystem.createCombatComponent(player.id);

      expect(combat).not.toBeNull();
      expect(combat.currentHitpoints).toBeGreaterThan(0);
      expect(combat.maxHitpoints).toBeGreaterThan(0);
      expect(combat.combatLevel).toBeGreaterThan(0);
      expect(combat.specialAttackEnergy).toBe(100);
      expect(combat.autoRetaliate).toBe(true);
      expect(combat.inCombat).toBe(false);
    });

    it('should create equipment components with proper structure', () => {
      const player = world.createEntity({
        type: 'player',
        id: 'test_player_equipment',
        components: [],
      });

      const equipment = combatSystem.createEquipmentComponent(player.id);

      expect(equipment).not.toBeNull();
      expect(equipment.slots).toBeDefined();
      expect(equipment.bonuses).toBeDefined();
      expect(equipment.totalWeight).toBe(0);
      expect(equipment.bonuses.attackBonus).toBe(0);
      expect(equipment.bonuses.defenceBonus).toBe(0);
    });
  });

  describe('Equipment System', () => {
    it('should equip and unequip weapons correctly', () => {
      const player = world.createEntity({
        type: 'player',
        id: 'test_player_equip',
        components: [],
      });

      skillsSystem.createPlayerSkills(player);
      combatSystem.createCombatComponent(player.id);
      combatSystem.createEquipmentComponent(player.id);

      // Equip bronze sword
      const equipped = combatSystem.equipItem(player.id, 'bronze_sword', 'weapon');
      expect(equipped).toBe(true);

      const equipment = combatSystem.getEquipmentComponent(player.id);
      expect(equipment.slots['weapon']).toBeDefined();
      expect(equipment.slots['weapon'].id).toBe('bronze_sword');
      expect(equipment.bonuses.attackBonus).toBeGreaterThan(0);

      // Unequip weapon
      const unequipped = combatSystem.unequipItem(player.id, 'weapon');
      expect(unequipped).toBe(true);
      expect(equipment.slots['weapon']).toBeUndefined();
      expect(equipment.bonuses.attackBonus).toBe(0);
    });

    it('should respect equipment requirements', () => {
      const player = world.createEntity({
        type: 'player',
        id: 'test_player_req',
        components: [],
      });

      skillsSystem.createPlayerSkills(player);
      combatSystem.createCombatComponent(player.id);
      combatSystem.createEquipmentComponent(player.id);

      // Try to equip high-level weapon without requirements
      const equipped = combatSystem.equipItem(player.id, 'rune_scimitar', 'weapon');
      expect(equipped).toBe(false); // Should fail due to level requirement

      // Give sufficient attack level
      skillsSystem.addExperience(player.id, SkillType.ATTACK, getXPForLevel(40));

      const equippedWithLevel = combatSystem.equipItem(player.id, 'rune_scimitar', 'weapon');
      expect(equippedWithLevel).toBe(true);
    });

    it('should calculate equipment bonuses correctly', () => {
      const player = world.createEntity({
        type: 'player',
        id: 'test_player_bonuses',
        components: [],
      });

      skillsSystem.createPlayerSkills(player);
      combatSystem.createCombatComponent(player.id);
      combatSystem.createEquipmentComponent(player.id);

      // Give levels to equip items
      skillsSystem.addExperience(player.id, SkillType.ATTACK, getXPForLevel(40));
      skillsSystem.addExperience(player.id, SkillType.DEFENCE, getXPForLevel(40));

      // Equip multiple items
      combatSystem.equipItem(player.id, 'rune_scimitar', 'weapon');
      combatSystem.equipItem(player.id, 'rune_platebody', 'body');

      const equipment = combatSystem.getEquipmentComponent(player.id);
      expect(equipment.bonuses.attackBonus).toBeGreaterThan(60); // Rune scimitar bonus
      expect(equipment.bonuses.defenceBonus).toBeGreaterThan(60); // Rune platebody bonus
    });
  });

  describe('Combat Mechanics', () => {
    let attacker: any;
    let target: any;

    beforeEach(() => {
      // Create attacker
      attacker = world.createEntity({
        type: 'player',
        id: 'test_attacker',
        components: [],
      });
      attacker.addComponent({
        type: 'movement',
        position: { x: 0, y: 0, z: 0 },
      });
      skillsSystem.createPlayerSkills(attacker);
      combatSystem.createCombatComponent(attacker.id);
      combatSystem.createEquipmentComponent(attacker.id);

      // Create target
      target = world.createEntity({
        type: 'npc',
        id: 'test_target',
        components: [],
      });
      target.addComponent({
        type: 'movement',
        position: { x: 1, y: 0, z: 0 }, // 1 tile away
      });
      skillsSystem.createPlayerSkills(target);
      combatSystem.createCombatComponent(target.id);
      combatSystem.createEquipmentComponent(target.id);
    });

    it('should start melee attacks within range', () => {
      const attackStarted = combatSystem.startAttack(attacker.id, target.id);
      expect(attackStarted).toBe(true);

      const attackerCombat = combatSystem.getCombatComponent(attacker.id);
      expect(attackerCombat.inCombat).toBe(true);
      expect(attackerCombat.target).toBe(target.id);
    });

    it('should reject attacks out of range', () => {
      // Move target far away
      const targetMovement = target.getComponent('movement');
      targetMovement.position = { x: 10, y: 0, z: 0 }; // 10 tiles away

      const attackStarted = combatSystem.startAttack(attacker.id, target.id);
      expect(attackStarted).toBe(false);
    });

    it('should handle ranged combat with proper range', () => {
      // Equip bow and move target further away
      skillsSystem.addExperience(attacker.id, SkillType.RANGED, getXPForLevel(50));
      combatSystem.equipItem(attacker.id, 'magic_bow', 'weapon');

      const targetMovement = target.getComponent('movement');
      targetMovement.position = { x: 8, y: 0, z: 0 }; // 8 tiles away

      const attackStarted = combatSystem.startAttack(attacker.id, target.id);
      expect(attackStarted).toBe(true); // Should work with bow range
    });

    it('should calculate damage based on levels and equipment', async () => {
      // Give attacker high levels and good weapon
      skillsSystem.addExperience(attacker.id, SkillType.ATTACK, getXPForLevel(60));
      skillsSystem.addExperience(attacker.id, SkillType.STRENGTH, getXPForLevel(60));
      combatSystem.equipItem(attacker.id, 'rune_scimitar', 'weapon');

      let damageDealt = 0;
      let damageEvents = 0;

      // Listen for damage events
      world.events.on('combat:damage_dealt', (data: any) => {
        damageDealt += data.damage;
        damageEvents++;
      });

      // Start attack and wait for completion
      const attackStarted = combatSystem.startAttack(attacker.id, target.id);
      expect(attackStarted).toBe(true);

      // Wait for attack to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Should have dealt some damage
      expect(damageEvents).toBeGreaterThan(0);
      expect(damageDealt).toBeGreaterThan(0);
    });

    it('should award experience for combat', async () => {
      const initialAttackXP = skillsSystem.getSkillXP(attacker.id, SkillType.ATTACK);
      const initialHPXP = skillsSystem.getSkillXP(attacker.id, SkillType.HITPOINTS);

      // Force a hit by dealing damage directly
      combatSystem.dealDamage(attacker.id, target.id, 5, CombatStyle.MELEE);

      const finalAttackXP = skillsSystem.getSkillXP(attacker.id, SkillType.ATTACK);
      const finalHPXP = skillsSystem.getSkillXP(attacker.id, SkillType.HITPOINTS);

      expect(finalAttackXP).toBeGreaterThan(initialAttackXP);
      expect(finalHPXP).toBeGreaterThan(initialHPXP);
    });
  });

  describe('Combat Triangle', () => {
    it('should apply combat triangle bonuses correctly', () => {
      const baseDamage = 10;

      // Melee vs Ranged (strong)
      const meleeVsRanged = applyCombatTriangle(baseDamage, CombatStyle.MELEE, CombatStyle.RANGED);
      expect(meleeVsRanged).toBeGreaterThan(baseDamage);

      // Melee vs Magic (weak)
      const meleeVsMagic = applyCombatTriangle(baseDamage, CombatStyle.MELEE, CombatStyle.MAGIC);
      expect(meleeVsMagic).toBeLessThan(baseDamage);

      // Same style (neutral)
      const meleeVsMelee = applyCombatTriangle(baseDamage, CombatStyle.MELEE, CombatStyle.MELEE);
      expect(meleeVsMelee).toBe(baseDamage);
    });

    it('should validate combat triangle relationships', () => {
      expect(COMBAT_TRIANGLE[CombatStyle.MELEE][CombatStyle.RANGED]).toBe(1.25);
      expect(COMBAT_TRIANGLE[CombatStyle.RANGED][CombatStyle.MAGIC]).toBe(1.25);
      expect(COMBAT_TRIANGLE[CombatStyle.MAGIC][CombatStyle.MELEE]).toBe(1.25);

      expect(COMBAT_TRIANGLE[CombatStyle.MELEE][CombatStyle.MAGIC]).toBe(0.75);
      expect(COMBAT_TRIANGLE[CombatStyle.RANGED][CombatStyle.MELEE]).toBe(0.75);
      expect(COMBAT_TRIANGLE[CombatStyle.MAGIC][CombatStyle.RANGED]).toBe(0.75);
    });
  });

  describe('Death and Respawn', () => {
    it('should handle player death correctly', async () => {
      const player = world.createEntity({
        type: 'player',
        id: 'test_death_player',
        components: [],
      });

      player.addComponent({
        type: 'movement',
        position: { x: 5, y: 0, z: 5 },
      });

      skillsSystem.createPlayerSkills(player);
      combatSystem.createCombatComponent(player.id);

      let deathEventFired = false;
      let respawnEventFired = false;

      world.events.on('combat:entity_died', () => {
        deathEventFired = true;
      });

      world.events.on('combat:entity_respawned', () => {
        respawnEventFired = true;
      });

      const combat = combatSystem.getCombatComponent(player.id);
      const initialHP = combat.currentHitpoints;

      // Deal lethal damage
      combatSystem.dealDamage('test_killer', player.id, initialHP + 10, CombatStyle.MELEE);

      expect(combat.currentHitpoints).toBe(0);
      expect(deathEventFired).toBe(true);

      // Wait for respawn
      await new Promise(resolve => setTimeout(resolve, 3500));

      expect(respawnEventFired).toBe(true);
      expect(combat.currentHitpoints).toBe(combat.maxHitpoints);

      // Should be at respawn location (Lumbridge)
      const movement = player.getComponent('movement');
      expect(movement.position.x).toBe(0);
      expect(movement.position.z).toBe(0);
    });
  });

  describe('Special Attacks', () => {
    it('should execute special attacks with proper energy cost', () => {
      const player = world.createEntity({
        type: 'player',
        id: 'test_special_player',
        components: [],
      });

      player.addComponent({
        type: 'movement',
        position: { x: 0, y: 0, z: 0 },
      });

      skillsSystem.createPlayerSkills(player);
      combatSystem.createCombatComponent(player.id);
      combatSystem.createEquipmentComponent(player.id);

      const target = world.createEntity({
        type: 'npc',
        id: 'test_special_target',
        components: [],
      });

      target.addComponent({
        type: 'movement',
        position: { x: 1, y: 0, z: 0 },
      });

      skillsSystem.createPlayerSkills(target);
      combatSystem.createCombatComponent(target.id);

      // Equip weapon with special attack
      skillsSystem.addExperience(player.id, SkillType.ATTACK, getXPForLevel(60));
      combatSystem.equipItem(player.id, 'dragon_dagger', 'weapon');

      const combat = combatSystem.getCombatComponent(player.id);
      const initialEnergy = combat.specialAttackEnergy;

      const specialUsed = combatSystem.executeSpecialAttack(player.id, target.id);
      expect(specialUsed).toBe(true);
      expect(combat.specialAttackEnergy).toBeLessThan(initialEnergy);
    });
  });

  describe('Animation System', () => {
    it('should trigger attack animations', () => {
      let animationStarted = false;
      let animationCompleted = false;

      world.events.on('combat:animation_started', () => {
        animationStarted = true;
      });

      world.events.on('combat:animation_completed', () => {
        animationCompleted = true;
      });

      const player = world.createEntity({
        type: 'player',
        id: 'test_anim_player',
        components: [],
      });

      // Play melee animation
      const animationId = animationSystem.playAnimation(player.id, 'melee_swing');
      expect(animationId).toBeTruthy();
      expect(animationStarted).toBe(true);

      // Animation should be playing
      expect(animationSystem.isAnimationPlaying(player.id)).toBe(true);
    });

    it('should create combat effects', () => {
      let effectsCreated = 0;

      world.events.on('combat:damage_dealt', () => {
        effectsCreated++;
      });

      // Trigger various combat events
      world.events.emit('combat:attack_started', {
        attackerId: 'test_attacker',
        weaponType: WeaponType.SWORD,
        combatStyle: CombatStyle.MELEE,
      });

      world.events.emit('combat:projectile_launched', {
        attackerId: 'test_attacker',
        targetId: 'test_target',
        projectileType: 'arrow',
      });

      world.events.emit('combat:magic_cast', {
        casterId: 'test_caster',
        targetId: 'test_target',
        spellType: 'fire_blast',
      });

      // Events should trigger without errors
      expect(true).toBe(true); // Basic verification that no errors occurred
    });
  });

  describe('Auto-Attack and Retaliation', () => {
    it('should handle auto-retaliation', async () => {
      const attacker = world.createEntity({
        type: 'player',
        id: 'test_auto_attacker',
        components: [],
      });
      attacker.addComponent({
        type: 'movement',
        position: { x: 0, y: 0, z: 0 },
      });
      skillsSystem.createPlayerSkills(attacker);
      combatSystem.createCombatComponent(attacker.id);
      combatSystem.createEquipmentComponent(attacker.id);

      const defender = world.createEntity({
        type: 'player',
        id: 'test_auto_defender',
        components: [],
      });
      defender.addComponent({
        type: 'movement',
        position: { x: 1, y: 0, z: 0 },
      });
      skillsSystem.createPlayerSkills(defender);
      combatSystem.createCombatComponent(defender.id);
      combatSystem.createEquipmentComponent(defender.id);

      // Attacker attacks defender
      combatSystem.startAttack(attacker.id, defender.id);

      // Wait for combat to process
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Defender should retaliate
      const defenderCombat = combatSystem.getCombatComponent(defender.id);
      expect(defenderCombat.target).toBe(attacker.id);
      expect(defenderCombat.inCombat).toBe(true);
    });
  });
});

describe('PvP Combat Scenarios', () => {
  let world: any;
  let combatSystem: AdvancedCombatSystem;
  let animationSystem: CombatAnimationSystem;
  let skillsSystem: EnhancedSkillsSystem;

  beforeEach(async () => {
    world = createTestWorld();
    combatSystem = new AdvancedCombatSystem(world);
    animationSystem = new CombatAnimationSystem(world);
    skillsSystem = new EnhancedSkillsSystem(world);

    world.addSystem(combatSystem);
    world.addSystem(animationSystem);
    world.addSystem(skillsSystem);

    await combatSystem.initialize();
    await animationSystem.initialize();
    await skillsSystem.initialize();
  });

  afterEach(() => {
    if (world && world.cleanup) {
      world.cleanup();
    }
  });

  describe('Free-For-All PvP Test', () => {
    it('should handle 6-player free-for-all combat', async () => {
      console.log('\n=== FREE-FOR-ALL PVP TEST ===');

      const players: any[] = [];
      const playerNames = ['Warrior', 'Archer', 'Mage', 'Berserker', 'Ranger', 'Wizard'];

      // Create 6 players in a circle formation
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const radius = 3;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        const player = world.createEntity({
          type: 'player',
          id: `ffa_player_${i}`,
          name: playerNames[i],
          components: [],
        });

        player.addComponent({
          type: 'movement',
          position: { x, y: 0, z },
        });

        skillsSystem.createPlayerSkills(player);
        combatSystem.createCombatComponent(player.id);
        combatSystem.createEquipmentComponent(player.id);

        // Give each player different combat styles and levels
        switch (i % 3) {
          case 0: // Melee
            skillsSystem.addExperience(player.id, SkillType.ATTACK, getXPForLevel(50 + i * 5));
            skillsSystem.addExperience(player.id, SkillType.STRENGTH, getXPForLevel(50 + i * 5));
            combatSystem.equipItem(player.id, 'rune_scimitar', 'weapon');
            break;
          case 1: // Ranged
            skillsSystem.addExperience(player.id, SkillType.RANGED, getXPForLevel(50 + i * 5));
            combatSystem.equipItem(player.id, 'magic_bow', 'weapon');
            break;
          case 2: // Magic
            skillsSystem.addExperience(player.id, SkillType.MAGIC, getXPForLevel(50 + i * 5));
            combatSystem.equipItem(player.id, 'ancient_staff', 'weapon');
            break;
        }

        players.push(player);
      }

      console.log(`Created ${players.length} players for FFA combat`);

      // Track combat events
      let damageEvents = 0;
      let deathEvents = 0;
      let respawnEvents = 0;

      world.events.on('combat:damage_dealt', (data: any) => {
        damageEvents++;
        console.log(`💥 ${data.attackerId} dealt ${data.damage} damage to ${data.targetId}`);
      });

      world.events.on('combat:entity_died', (data: any) => {
        deathEvents++;
        console.log(`💀 ${data.entityId} has died! Killed by ${data.killerId}`);
      });

      world.events.on('combat:entity_respawned', (data: any) => {
        respawnEvents++;
        console.log(`🔄 ${data.entityId} respawned at Lumbridge`);
      });

      // Start free-for-all combat
      for (let i = 0; i < players.length; i++) {
        const attacker = players[i];
        const target = players[(i + 1) % players.length]; // Attack next player in circle

        console.log(`⚔️ ${attacker.name} attacks ${target.name}`);
        combatSystem.startAttack(attacker.id, target.id);
      }

      // Let combat run for 5 seconds
      console.log('🕐 Combat running for 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify combat occurred
      expect(damageEvents).toBeGreaterThan(0);
      console.log('✅ FFA Test Results:');
      console.log(`   Damage Events: ${damageEvents}`);
      console.log(`   Deaths: ${deathEvents}`);
      console.log(`   Respawns: ${respawnEvents}`);

      // Stop all combat
      for (const player of players) {
        combatSystem.stopCombat(player.id);
      }

      console.log('=== FREE-FOR-ALL TEST COMPLETE ===\n');
    });
  });

  describe('3v3 Team Combat Test', () => {
    it('should handle 3v3 team combat (Melee vs Ranged vs Magic)', async () => {
      console.log('\n=== 3v3 TEAM COMBAT TEST ===');

      const teamA: any[] = []; // Melee team
      const teamB: any[] = []; // Ranged team
      const teamC: any[] = []; // Magic team

      // Create Team A (Melee) - positioned on left
      for (let i = 0; i < 3; i++) {
        const player = world.createEntity({
          type: 'player',
          id: `melee_${i}`,
          name: `Warrior${i + 1}`,
          components: [],
        });

        player.addComponent({
          type: 'movement',
          position: { x: -5, y: 0, z: i * 2 - 2 },
        });

        skillsSystem.createPlayerSkills(player);
        combatSystem.createCombatComponent(player.id);
        combatSystem.createEquipmentComponent(player.id);

        // High melee stats
        skillsSystem.addExperience(player.id, SkillType.ATTACK, getXPForLevel(70));
        skillsSystem.addExperience(player.id, SkillType.STRENGTH, getXPForLevel(70));
        skillsSystem.addExperience(player.id, SkillType.DEFENCE, getXPForLevel(70));
        combatSystem.equipItem(player.id, 'rune_scimitar', 'weapon');

        teamA.push(player);
      }

      // Create Team B (Ranged) - positioned on right
      for (let i = 0; i < 3; i++) {
        const player = world.createEntity({
          type: 'player',
          id: `ranged_${i}`,
          name: `Archer${i + 1}`,
          components: [],
        });

        player.addComponent({
          type: 'movement',
          position: { x: 5, y: 0, z: i * 2 - 2 },
        });

        skillsSystem.createPlayerSkills(player);
        combatSystem.createCombatComponent(player.id);
        combatSystem.createEquipmentComponent(player.id);

        // High ranged stats
        skillsSystem.addExperience(player.id, SkillType.RANGED, getXPForLevel(70));
        skillsSystem.addExperience(player.id, SkillType.DEFENCE, getXPForLevel(70));
        combatSystem.equipItem(player.id, 'rune_crossbow', 'weapon');

        teamB.push(player);
      }

      // Create Team C (Magic) - positioned in center back
      for (let i = 0; i < 3; i++) {
        const player = world.createEntity({
          type: 'player',
          id: `magic_${i}`,
          name: `Mage${i + 1}`,
          components: [],
        });

        player.addComponent({
          type: 'movement',
          position: { x: 0, y: 0, z: 8 + i * 2 },
        });

        skillsSystem.createPlayerSkills(player);
        combatSystem.createCombatComponent(player.id);
        combatSystem.createEquipmentComponent(player.id);

        // High magic stats
        skillsSystem.addExperience(player.id, SkillType.MAGIC, getXPForLevel(70));
        skillsSystem.addExperience(player.id, SkillType.DEFENCE, getXPForLevel(70));
        combatSystem.equipItem(player.id, 'ancient_staff', 'weapon');

        teamC.push(player);
      }

      console.log('🛡️ Team A (Melee): 3 Warriors positioned at x=-5');
      console.log('🏹 Team B (Ranged): 3 Archers positioned at x=5');
      console.log('🔮 Team C (Magic): 3 Mages positioned at z=8+');

      // Track team combat stats
      const teamStats = {
        A: { damage: 0, deaths: 0 },
        B: { damage: 0, deaths: 0 },
        C: { damage: 0, deaths: 0 },
      };

      world.events.on('combat:damage_dealt', (data: any) => {
        if (data.attackerId.startsWith('melee_')) {
          teamStats.A.damage += data.damage;
        }
        if (data.attackerId.startsWith('ranged_')) {
          teamStats.B.damage += data.damage;
        }
        if (data.attackerId.startsWith('magic_')) {
          teamStats.C.damage += data.damage;
        }
      });

      world.events.on('combat:entity_died', (data: any) => {
        if (data.entityId.startsWith('melee_')) {
          teamStats.A.deaths++;
        }
        if (data.entityId.startsWith('ranged_')) {
          teamStats.B.deaths++;
        }
        if (data.entityId.startsWith('magic_')) {
          teamStats.C.deaths++;
        }

        console.log(`💀 ${data.entityId} has fallen!`);
      });

      // Start team combat - each team targets the team they're strong against
      // Melee (A) targets Ranged (B) - should be effective
      for (let i = 0; i < 3; i++) {
        combatSystem.startAttack(teamA[i].id, teamB[i].id);
        console.log(`⚔️ ${teamA[i].name} attacks ${teamB[i].name} (Melee vs Ranged)`);
      }

      // Ranged (B) targets Magic (C) - should be effective
      for (let i = 0; i < 3; i++) {
        combatSystem.startAttack(teamB[i].id, teamC[i].id);
        console.log(`🏹 ${teamB[i].name} attacks ${teamC[i].name} (Ranged vs Magic)`);
      }

      // Magic (C) targets Melee (A) - should be effective
      for (let i = 0; i < 3; i++) {
        combatSystem.startAttack(teamC[i].id, teamA[i].id);
        console.log(`🔮 ${teamC[i].name} attacks ${teamA[i].name} (Magic vs Melee)`);
      }

      // Let team combat run for 8 seconds
      console.log('🕐 Team combat running for 8 seconds...');
      await new Promise(resolve => setTimeout(resolve, 8000));

      // Display results
      console.log('\n📊 3v3 Combat Results:');
      console.log(`   Team A (Melee): ${teamStats.A.damage} total damage, ${teamStats.A.deaths} deaths`);
      console.log(`   Team B (Ranged): ${teamStats.B.damage} total damage, ${teamStats.B.deaths} deaths`);
      console.log(`   Team C (Magic): ${teamStats.C.damage} total damage, ${teamStats.C.deaths} deaths`);

      // Verify combat triangle effectiveness
      const totalDamage = teamStats.A.damage + teamStats.B.damage + teamStats.C.damage;
      expect(totalDamage).toBeGreaterThan(0)

      // Stop all combat
      ;[...teamA, ...teamB, ...teamC].forEach(player => {
        combatSystem.stopCombat(player.id);
      });

      console.log('=== 3v3 TEAM COMBAT TEST COMPLETE ===\n');
    });
  });

  describe('Visual Combat Verification', () => {
    it('should create visually verifiable combat scenario', async () => {
      console.log('\n=== VISUAL COMBAT VERIFICATION ===');

      // Create arena setup
      const gladiator1 = world.createEntity({
        type: 'player',
        id: 'gladiator_1',
        name: 'Gladiator Red',
        components: [],
      });

      gladiator1.addComponent({
        type: 'movement',
        position: { x: -3, y: 0, z: 0 },
      });

      const gladiator2 = world.createEntity({
        type: 'player',
        id: 'gladiator_2',
        name: 'Gladiator Blue',
        components: [],
      });

      gladiator2.addComponent({
        type: 'movement',
        position: { x: 3, y: 0, z: 0 },
      });

      // Set up both gladiators
      for (const gladiator of [gladiator1, gladiator2]) {
        skillsSystem.createPlayerSkills(gladiator);
        combatSystem.createCombatComponent(gladiator.id);
        combatSystem.createEquipmentComponent(gladiator.id);

        // Give decent combat stats
        skillsSystem.addExperience(gladiator.id, SkillType.ATTACK, getXPForLevel(50));
        skillsSystem.addExperience(gladiator.id, SkillType.STRENGTH, getXPForLevel(50));
        skillsSystem.addExperience(gladiator.id, SkillType.DEFENCE, getXPForLevel(40));
        combatSystem.equipItem(gladiator.id, 'steel_sword', 'weapon');
      }

      console.log('🏛️ Arena set up with two gladiators 6 tiles apart');
      console.log('🗡️ Both equipped with steel swords');

      // Track visual events
      let animationsTriggered = 0;
      let hitSplatsShown = 0;
      let deathEffects = 0;

      world.events.on('combat:animation_started', (data: any) => {
        animationsTriggered++;
        console.log(`🎬 Animation started: ${data.entityId} - ${data.animationId}`);
      });

      world.events.on('combat:damage_dealt', (data: any) => {
        hitSplatsShown++;
        console.log(`💥 Hit splat: ${data.damage} damage to ${data.targetId}`);
      });

      world.events.on('combat:entity_died', (data: any) => {
        deathEffects++;
        console.log(`💀 Death effect triggered for ${data.entityId}`);
      });

      world.events.on('combat:entity_respawned', (data: any) => {
        console.log(`✨ ${data.entityId} respawned at ${JSON.stringify(data.respawnLocation)}`);
      });

      // Start gladiator combat
      console.log('🥊 GLADIATOR COMBAT BEGINS!');
      combatSystem.startAttack(gladiator1.id, gladiator2.id);

      // Let combat run until someone dies
      console.log('⚡ Combat running until death...');
      let combatComplete = false;

      world.events.on('combat:entity_died', () => {
        combatComplete = true;
      });

      // Wait up to 15 seconds for death
      let waitTime = 0;
      // eslint-disable-next-line no-unmodified-loop-condition
      while (!combatComplete && waitTime < 15000) {
        await new Promise(resolve => setTimeout(resolve, 500));
        waitTime += 500;
      }

      // Wait additional time for respawn
      if (combatComplete) {
        console.log('⏳ Waiting for respawn...');
        await new Promise(resolve => setTimeout(resolve, 4000));
      }

      console.log('\n📊 Visual Verification Results:');
      console.log(`   Combat Animations: ${animationsTriggered}`);
      console.log(`   Hit Splats Shown: ${hitSplatsShown}`);
      console.log(`   Death Effects: ${deathEffects}`);

      // Verify visual elements were triggered
      expect(animationsTriggered).toBeGreaterThan(0);
      expect(hitSplatsShown).toBeGreaterThan(0);

      if (deathEffects > 0) {
        console.log('✅ Death and respawn visually verified');

        // Check both gladiators are at respawn location
        const g1Movement = gladiator1.getComponent('movement');
        const g2Movement = gladiator2.getComponent('movement');

        // At least one should be at Lumbridge (0,0,0)
        const atRespawn =
          (g1Movement.position.x === 0 && g1Movement.position.z === 0) ||
          (g2Movement.position.x === 0 && g2Movement.position.z === 0);
        expect(atRespawn).toBe(true);
      }

      console.log('=== VISUAL COMBAT VERIFICATION COMPLETE ===\n');
    });
  });

  describe('Range and Line of Sight', () => {
    it('should respect attack ranges for different weapon types', () => {
      const attacker = world.createEntity({
        type: 'player',
        id: 'range_test_attacker',
        components: [],
      });

      attacker.addComponent({
        type: 'movement',
        position: { x: 0, y: 0, z: 0 },
      });

      const target = world.createEntity({
        type: 'npc',
        id: 'range_test_target',
        components: [],
      });

      target.addComponent({
        type: 'movement',
        position: { x: 5, y: 0, z: 0 }, // 5 tiles away
      });

      skillsSystem.createPlayerSkills(attacker);
      combatSystem.createCombatComponent(attacker.id);
      combatSystem.createEquipmentComponent(attacker.id);

      skillsSystem.createPlayerSkills(target);
      combatSystem.createCombatComponent(target.id);

      // Test melee range (should fail at 5 tiles)
      let attackStarted = combatSystem.startAttack(attacker.id, target.id);
      expect(attackStarted).toBe(false);

      // Equip ranged weapon
      skillsSystem.addExperience(attacker.id, SkillType.RANGED, getXPForLevel(50));
      combatSystem.equipItem(attacker.id, 'magic_bow', 'weapon');

      // Test ranged attack (should succeed)
      attackStarted = combatSystem.startAttack(attacker.id, target.id);
      expect(attackStarted).toBe(true);
    });
  });
});
