import type { World } from '../../../types';
import { Vector3, RPGEntity, NPCType, NPCBehavior, NPCState, SkillType, AttackType, InventoryComponent, StatsComponent, CombatComponent, MovementComponent, ResourceComponent, ItemComponent, NPCComponent, QuestComponent, ConstructionComponent, ConstructionSiteComponent, SkillsComponent } from '../../types/index';
import { BaseTestScenario } from './BaseTestScenario';

/**
 * Kill Quest Scenario
 * 
 * Complete workflow:
 * 1. Player talks to Quest NPC
 * 2. Player receives kill quest (kill specific mob and get quest item)
 * 3. Player finds and kills the target mob
 * 4. Player obtains quest item from mob loot
 * 5. Player returns to Quest NPC
 * 6. Player gives quest item to NPC
 * 7. Player completes quest and receives rewards
 */
export class KillQuestScenario extends BaseTestScenario {
  private questNPC: RPGEntity | null = null;
  private player: RPGEntity | null = null;
  private targetMob: RPGEntity | null = null;
  private questId = 'kill_quest_test';
  private questItemId = 4002; // Quest item dropped by mob

  constructor(world: World) {
    super(world, 'Kill Quest Scenario', '#FF0000'); // Red color
  }

  async setup(): Promise<boolean> {
    try {
      console.log('[KillQuestScenario] Setting up kill quest scenario...');

      // 1. Spawn Quest NPC
      this.questNPC = this.spawnTestEntity('quest_npc', 'npc', { x: 5, y: 0, z: 5 }, '#FF0000');
      if (!this.questNPC) throw new Error('Failed to spawn quest NPC');

      this.questNPC.addComponent('npc', {
        type: 'npc',
        npcId: 1002,
        name: 'Monster Hunter',
        examine: 'A battle-hardened quest giver',
        npcType: NPCType.QUEST_GIVER,
        behavior: NPCBehavior.QUEST,
        faction: 'neutral',
        state: NPCState.IDLE,
        level: 1,
        combatLevel: 1,
        maxHitpoints: 10,
        currentHitpoints: 10,
        attackStyle: AttackType.MELEE,
        aggressionLevel: 0,
        aggressionRange: 0,
        attackBonus: 0,
        strengthBonus: 0,
        defenseBonus: 0,
        maxHit: 0,
        attackSpeed: 4000,
        respawnTime: 0,
        wanderRadius: 0,
        spawnPoint: { x: 5, y: 0, z: 5 },
        lootTable: undefined,
        dialogue: {
          greeting: "Greetings, warrior!",
          questAvailable: "There's a dangerous goblin nearby. Kill it and bring me proof!",
          questInProgress: "Have you slain the goblin yet?",
          questComplete: "Well done! Here's your reward.",
          farewell: "Safe travels!"
        },
        shop: undefined,
        questGiver: true,
        shopkeeper: false,
        shopType: undefined,
        currentTarget: null,
        lastInteraction: 0
      });

      // 2. Spawn Player
      this.player = this.spawnTestEntity('player', 'player', { x: 0, y: 0, z: 0 }, '#00FF00');
      if (!this.player) throw new Error('Failed to spawn player');

      // Add comprehensive player components
      this.setupPlayerComponents(this.player);

      // 3. Spawn Target Mob (Goblin)
      this.targetMob = this.spawnTestEntity('target_mob', 'npc', { x: 15, y: 0, z: 0 }, '#8B4513');
      if (!this.targetMob) throw new Error('Failed to spawn target mob');

      this.targetMob.addComponent('npc', {
        type: 'npc',
        npcId: 2001,
        name: 'Goblin',
        examine: 'A small, aggressive creature',
        npcType: NPCType.MONSTER,
        behavior: NPCBehavior.AGGRESSIVE,
        faction: 'hostile',
        state: NPCState.IDLE,
        level: 2,
        combatLevel: 2,
        maxHitpoints: 5,
        currentHitpoints: 5,
        attackStyle: AttackType.MELEE,
        aggressionLevel: 5,
        aggressionRange: 3,
        attackBonus: 1,
        strengthBonus: 1,
        defenseBonus: 0,
        maxHit: 2,
        attackSpeed: 4000,
        respawnTime: 30000,
        wanderRadius: 2,
        spawnPoint: { x: 15, y: 0, z: 0 },
        lootTable: 'goblin_drops',
        dialogue: undefined,
        shop: undefined,
        questGiver: false,
        shopkeeper: false,
        shopType: undefined,
        currentTarget: null,
        lastInteraction: 0
      });

      // Add stats to goblin
      this.targetMob.addComponent('stats', {
        type: 'stats',
        hitpoints: { current: 5, max: 5, level: 1, xp: 0 },
        attack: { level: 1, xp: 0 },
        strength: { level: 1, xp: 0 },
        defense: { level: 1, xp: 0 },
        ranged: { level: 1, xp: 0 },
        magic: { level: 1, xp: 0 },
        prayer: { level: 1, xp: 0, points: 0, maxPoints: 0 },
        combatBonuses: {
          attackStab: 0, attackSlash: 0, attackCrush: 0, attackMagic: 0, attackRanged: 0,
          defenseStab: 0, defenseSlash: 0, defenseCrush: 0, defenseMagic: 0, defenseRanged: 0,
          meleeStrength: 0, rangedStrength: 0, magicDamage: 0, prayerBonus: 0
        },
        combatLevel: 2,
        totalLevel: 8
      });

      // Add combat component to goblin
      this.targetMob.addComponent('combat', {
        type: 'combat',
        inCombat: false,
        target: null,
        lastAttackTime: 0,
        attackSpeed: 4000,
        combatStyle: 'accurate' as any,
        autoRetaliate: true,
        hitSplatQueue: [],
        animationQueue: [],
        specialAttackEnergy: 0,
        specialAttackActive: false,
        protectionPrayers: { melee: false, ranged: false, magic: false }
      });

      this.logProgress('✅ Kill quest scenario setup complete');
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logProgress(`❌ Setup failed: ${errorMessage}`);
      return false;
    }
  }

  async execute(): Promise<boolean> {
    try {
      console.log('[KillQuestScenario] Executing kill quest scenario...');
      
      // Step 1: Player talks to Quest NPC
      this.logProgress('📖 Step 1: Player approaches Quest NPC...');
      await this.movePlayerTo(this.player!, { x: 5, y: 0, z: 4 });
      
      // Step 2: Start the kill quest
      this.logProgress('📋 Step 2: Starting kill quest...');
      const questComponent = this.player!.getComponent<QuestComponent>('quest');
      if (!questComponent) throw new Error('Player missing quest component');

      const quest = {
        id: this.questId,
        name: 'Goblin Slayer',
        description: 'Kill a goblin and bring back proof',
        type: 'kill',
        status: 'active',
        startTime: Date.now(),
        objectives: [{
          id: 'kill_goblin',
          description: 'Kill 1 goblin',
          type: 'kill',
          targetNpcId: 2001,
          targetQuantity: 1,
          currentQuantity: 0,
          completed: false
        }, {
          id: 'get_proof',
          description: 'Obtain goblin ear',
          type: 'item',
          targetItemId: this.questItemId,
          targetQuantity: 1,
          currentQuantity: 0,
          completed: false
        }],
        rewards: {
          experience: { ['attack']: 200, ['strength']: 200 },
          items: [{ itemId: 995, quantity: 200 }], // 200 coins
          questPoints: 2
        },
        requirements: [],
        giver: 'quest_npc'
      };

      questComponent.activeQuests.set(this.questId, quest);
      questComponent.questLog.push(`Started quest: ${quest.name}`);

      // Step 3: Player goes to find the goblin
      this.logProgress('🏃 Step 3: Player searches for goblin...');
      await this.movePlayerTo(this.player!, { x: 14, y: 0, z: 0 });

      // Step 4: Combat with goblin
      this.logProgress('⚔️ Step 4: Player engages goblin in combat...');
      const playerCombat = this.player!.getComponent<CombatComponent>('combat');
      const goblinCombat = this.targetMob!.getComponent<CombatComponent>('combat');
      const goblinStats = this.targetMob!.getComponent<StatsComponent>('stats');
      
      if (!playerCombat || !goblinCombat || !goblinStats) {
        throw new Error('Missing combat components');
      }

      // Start combat
      playerCombat.inCombat = true;
      playerCombat.target = this.targetMob!.id;
      goblinCombat.inCombat = true;
      goblinCombat.target = this.player!.id;

      // Simulate combat rounds
      let combatRounds = 0;
      while (goblinStats.hitpoints.current > 0 && combatRounds < 10) {
        const damage = Math.floor(Math.random() * 3) + 1; // 1-3 damage
        goblinStats.hitpoints.current = Math.max(0, goblinStats.hitpoints.current - damage);
        combatRounds++;
        
        this.logProgress(`💥 Combat round ${combatRounds}: ${damage} damage dealt`);
        await this.wait(200); // Brief delay between attacks
      }

      if (goblinStats.hitpoints.current > 0) {
        throw new Error('Failed to kill goblin in combat');
      }

      // Step 5: Goblin dies and drops quest item
      this.logProgress('💀 Step 5: Goblin defeated! Processing loot...');
      
      // Update quest progress for kill
      const activeQuest = questComponent.activeQuests.get(this.questId);
      if (activeQuest) {
        activeQuest.objectives[0].currentQuantity = 1;
        activeQuest.objectives[0].completed = true;
        questComponent.questLog.push('Killed goblin');
      }

      // Add quest item to player inventory (simulating loot drop)
      const inventory = this.player!.getComponent<InventoryComponent>('inventory');
      if (!inventory) throw new Error('Player missing inventory component');

      const firstEmptySlot = inventory.items.findIndex(slot => slot === null);
      if (firstEmptySlot === -1) throw new Error('Player inventory full');

      inventory.items[firstEmptySlot] = {
        itemId: this.questItemId,
        quantity: 1,
        metadata: { name: 'Goblin Ear', examine: 'Proof of a goblin kill' }
      };

      // Update quest progress for item
      if (activeQuest) {
        activeQuest.objectives[1].currentQuantity = 1;
        activeQuest.objectives[1].completed = true;
        questComponent.questLog.push('Obtained goblin ear');
      }

      // End combat
      playerCombat.inCombat = false;
      playerCombat.target = null;

      // Step 6: Player returns to Quest NPC
      this.logProgress('🔄 Step 6: Player returns to Quest NPC...');
      await this.movePlayerTo(this.player!, { x: 5, y: 0, z: 4 });

      // Step 7: Complete the quest
      this.logProgress('🎉 Step 7: Completing kill quest...');
      
      // Remove quest item from inventory
      inventory.items[firstEmptySlot] = null;

      // Mark quest as complete and give rewards
      if (activeQuest) {
        activeQuest.status = 'completed';
        activeQuest.completedTime = Date.now();
        questComponent.completedQuests.add(this.questId);
        questComponent.activeQuests.delete(this.questId);
        questComponent.questPoints += 2;
        questComponent.questLog.push(`Completed quest: ${activeQuest.name}`);

        // Give coin reward
        const rewardSlot = inventory.items.findIndex(slot => slot === null);
        if (rewardSlot !== -1) {
          inventory.items[rewardSlot] = {
            itemId: 995,
            quantity: 200,
            metadata: { name: 'Coins', examine: 'Coins' }
          };
        }

        // Give experience rewards
        const playerStats = this.player!.getComponent<StatsComponent>('stats');
        if (playerStats) {
          playerStats.attack.xp += 200;
          playerStats.strength.xp += 200;
        }
      }

      this.logProgress('✅ Kill quest completed successfully!');
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logProgress(`❌ Execution failed: ${errorMessage}`);
      return false;
    }
  }

  async validate(): Promise<boolean> {
    try {
      console.log('[KillQuestScenario] Validating kill quest scenario...');

      // Check quest completion
      const questComponent = this.player?.getComponent<QuestComponent>('quest');
      if (!questComponent) {
        this.logProgress('❌ Validation failed: Player missing quest component');
        return false;
      }

      // Verify quest was completed
      if (!questComponent.completedQuests.has(this.questId)) {
        this.logProgress('❌ Validation failed: Quest not marked as completed');
        return false;
      }

      // Verify quest points awarded (should be 2)
      if (questComponent.questPoints < 2) {
        this.logProgress('❌ Validation failed: Quest points not awarded correctly');
        return false;
      }

      // Verify goblin is dead
      const goblinStats = this.targetMob?.getComponent<StatsComponent>('stats');
      if (!goblinStats || goblinStats.hitpoints.current > 0) {
        this.logProgress('❌ Validation failed: Goblin not killed');
        return false;
      }

      // Verify coin reward received
      const inventory = this.player?.getComponent<InventoryComponent>('inventory');
      const hasReward = inventory?.items.some(item => 
        item?.itemId === 995 && item?.quantity === 200
      );

      if (!hasReward) {
        this.logProgress('❌ Validation failed: Quest coin reward not received');
        return false;
      }

      // Verify quest item consumed
      const hasQuestItem = inventory?.items.some(item => 
        item?.itemId === this.questItemId
      );

      if (hasQuestItem) {
        this.logProgress('❌ Validation failed: Quest item not consumed');
        return false;
      }

      // Verify experience gained
      const playerStats = this.player?.getComponent<StatsComponent>('stats');
      if (!playerStats || playerStats.attack.xp < 200 || playerStats.strength.xp < 200) {
        this.logProgress('❌ Validation failed: Experience rewards not received');
        return false;
      }

      this.logProgress('✅ Kill quest validation successful');
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logProgress(`❌ Validation failed: ${errorMessage}`);
      return false;
    }
  }

  async cleanup(): Promise<void> {
    console.log('[KillQuestScenario] Cleaning up kill quest scenario...');
    
    // Remove spawned entities
    this.removeTestEntity('quest_npc');
    this.removeTestEntity('player');
    this.removeTestEntity('target_mob');
    
    // Clear references
    this.questNPC = null;
    this.player = null;
    this.targetMob = null;
    
    console.log('[KillQuestScenario] Cleanup complete');
  }

  private setupPlayerComponents(player: RPGEntity): void {
    // Add inventory component
    player.addComponent('inventory', {
      type: 'inventory',
      items: new Array(28).fill(null),
      maxSlots: 28,
      equipment: {
        head: null, cape: null, amulet: null, weapon: null, body: null,
        shield: null, legs: null, gloves: null, boots: null, ring: null, ammo: null
      },
      totalWeight: 0,
      equipmentBonuses: {
        attackStab: 0, attackSlash: 0, attackCrush: 0, attackMagic: 0, attackRanged: 0,
        defenseStab: 0, defenseSlash: 0, defenseCrush: 0, defenseMagic: 0, defenseRanged: 0,
        meleeStrength: 0, rangedStrength: 0, magicDamage: 0, prayerBonus: 0
      }
    });

    // Add quest component
    player.addComponent('quest', {
      type: 'quest',
      activeQuests: new Map(),
      completedQuests: new Set(),
      questLog: [],
      questPoints: 0,
      lastQuestUpdate: 0
    });

    // Add stats component
    player.addComponent('stats', {
      type: 'stats',
      hitpoints: { current: 100, max: 100, level: 10, xp: 1154 },
      attack: { level: 10, xp: 1154 },
      strength: { level: 10, xp: 1154 },
      defense: { level: 10, xp: 1154 },
      ranged: { level: 1, xp: 0 },
      magic: { level: 1, xp: 0 },
      prayer: { level: 1, xp: 0, points: 0, maxPoints: 0 },
      combatBonuses: {
        attackStab: 0, attackSlash: 0, attackCrush: 0, attackMagic: 0, attackRanged: 0,
        defenseStab: 0, defenseSlash: 0, defenseCrush: 0, defenseMagic: 0, defenseRanged: 0,
        meleeStrength: 0, rangedStrength: 0, magicDamage: 0, prayerBonus: 0
      },
      combatLevel: 10,
      totalLevel: 40
    });

    // Add combat component
    player.addComponent('combat', {
      type: 'combat',
      inCombat: false,
      target: null,
      lastAttackTime: 0,
      attackSpeed: 4000,
      combatStyle: 'accurate' as any,
      autoRetaliate: true,
      hitSplatQueue: [],
      animationQueue: [],
      specialAttackEnergy: 100,
      specialAttackActive: false,
      protectionPrayers: { melee: false, ranged: false, magic: false }
    });

    // Add movement component
    player.addComponent('movement', {
      type: 'movement',
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      destination: null,
      targetPosition: null,
      path: [],
      speed: 3,
      currentSpeed: 0,
      moveSpeed: 3,
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

  private async movePlayerTo(player: RPGEntity, destination: Vector3): Promise<void> {
    const movement = player.getComponent<MovementComponent>('movement');
    if (movement) {
      movement.destination = destination;
      movement.isMoving = true;
      // Simulate movement completion
      await this.wait(500);
      movement.position = destination;
      player.position = destination;
      movement.isMoving = false;
      movement.destination = null;
    }
  }
}