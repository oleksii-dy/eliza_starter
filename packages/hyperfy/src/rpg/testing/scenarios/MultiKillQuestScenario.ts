import type { World } from '../../../types';
import { Vector3, RPGEntity, NPCType, NPCBehavior, NPCState, SkillType, AttackType, InventoryComponent, StatsComponent, CombatComponent, MovementComponent, ResourceComponent, ItemComponent, NPCComponent, QuestComponent, ConstructionComponent, ConstructionSiteComponent, SkillsComponent } from '../../types/index';
import { BaseTestScenario } from './BaseTestScenario';

/**
 * Multi-Kill Quest Scenario
 * 
 * Complete workflow:
 * 1. Player talks to Quest NPC
 * 2. Player receives multi-kill quest (kill 3 goblins)
 * 3. Player finds and kills 3 goblins one by one
 * 4. Player returns to Quest NPC after each kill to track progress
 * 5. Player completes quest after killing all required goblins
 */
export class MultiKillQuestScenario extends BaseTestScenario {
  private questNPC: RPGEntity | null = null;
  private player: RPGEntity | null = null;
  private goblins: RPGEntity[] = [];
  private questId = 'multi_kill_quest_test';
  private requiredKills = 3;
  private currentKills = 0;

  constructor(world: World) {
    super(world, 'Multi-Kill Quest Scenario', '#800080'); // Purple color
  }

  async setup(): Promise<boolean> {
    try {
      console.log('[MultiKillQuestScenario] Setting up multi-kill quest scenario...');

      // 1. Spawn Quest NPC
      this.questNPC = this.spawnTestEntity('quest_npc', 'npc', { x: 5, y: 0, z: 5 }, '#800080');
      if (!this.questNPC) throw new Error('Failed to spawn quest NPC');

      this.questNPC.addComponent('npc', {
        type: 'npc',
        npcId: 1003,
        name: 'Goblin Exterminator',
        examine: 'Seeks to rid the land of goblins',
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
          greeting: "The goblin threat grows daily!",
          questAvailable: "Kill 3 goblins to help secure our lands. I'll track your progress.",
          questInProgress: `You've killed ${this.currentKills}/${this.requiredKills} goblins. Keep going!`,
          questComplete: "Excellent work! The goblin threat has been reduced.",
          farewell: "Stay vigilant out there!"
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

      this.setupPlayerComponents(this.player);

      // 3. Spawn Multiple Goblins at different locations
      const goblinPositions = [
        { x: 15, y: 0, z: 0 },
        { x: 20, y: 0, z: 5 },
        { x: 10, y: 0, z: -10 }
      ];

      for (let i = 0; i < this.requiredKills; i++) {
        const goblin = this.spawnTestEntity(`goblin_${i}`, 'npc', goblinPositions[i], '#654321');
        if (!goblin) throw new Error(`Failed to spawn goblin ${i}`);

        this.setupGoblinComponents(goblin, 2000 + i);
        this.goblins.push(goblin);
      }

      this.logProgress(`✅ Multi-kill quest scenario setup complete (${this.requiredKills} goblins spawned)`);
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logProgress(`❌ Setup failed: ${errorMessage}`);
      return false;
    }
  }

  async execute(): Promise<boolean> {
    try {
      console.log('[MultiKillQuestScenario] Executing multi-kill quest scenario...');
      
      // Step 1: Player talks to Quest NPC
      this.logProgress('📖 Step 1: Player approaches Quest NPC...');
      await this.movePlayerTo(this.player!, { x: 5, y: 0, z: 4 });
      
      // Step 2: Start the multi-kill quest
      this.logProgress('📋 Step 2: Starting multi-kill quest...');
      const questComponent = this.player!.getComponent<QuestComponent>('quest');
      if (!questComponent) throw new Error('Player missing quest component');

      const quest = {
        id: this.questId,
        name: 'Goblin Extermination',
        description: `Kill ${this.requiredKills} goblins to protect the area`,
        type: 'multi_kill',
        status: 'active',
        startTime: Date.now(),
        objectives: [{
          id: 'kill_goblins',
          description: `Kill ${this.requiredKills} goblins`,
          type: 'kill_count',
          targetNpcId: 2000, // Generic goblin ID
          targetQuantity: this.requiredKills,
          currentQuantity: 0,
          completed: false
        }],
        rewards: {
          experience: { 
            ['attack']: 300, 
            ['strength']: 300,
            ['defense']: 150
          },
          items: [{ itemId: 995, quantity: 500 }], // 500 coins
          questPoints: 3
        },
        requirements: [],
        giver: 'quest_npc'
      };

      questComponent.activeQuests.set(this.questId, quest);
      questComponent.questLog.push(`Started quest: ${quest.name}`);

      // Step 3-5: Kill each goblin and track progress
      for (let i = 0; i < this.requiredKills; i++) {
        const goblin = this.goblins[i];
        const goblinPosition = goblin.position;
        
        this.logProgress(`🏃 Step ${3 + i}: Player hunts goblin ${i + 1}...`);
        
        // Move to goblin location
        await this.movePlayerTo(this.player!, {
          x: goblinPosition.x - 1,
          y: goblinPosition.y,
          z: goblinPosition.z
        });

        // Engage in combat
        this.logProgress(`⚔️ Engaging goblin ${i + 1} in combat...`);
        const killSuccess = await this.combatGoblin(goblin);
        
        if (!killSuccess) {
          throw new Error(`Failed to kill goblin ${i + 1}`);
        }

        this.currentKills++;
        
        // Update quest progress
        const activeQuest = questComponent.activeQuests.get(this.questId);
        if (activeQuest) {
          activeQuest.objectives[0].currentQuantity = this.currentKills;
          activeQuest.objectives[0].completed = (this.currentKills >= this.requiredKills);
          questComponent.questLog.push(`Killed goblin ${i + 1} (${this.currentKills}/${this.requiredKills})`);
        }

        this.logProgress(`💀 Goblin ${i + 1} defeated! Progress: ${this.currentKills}/${this.requiredKills}`);

        // Brief pause between kills
        await this.wait(300);
      }

      // Step 6: Return to Quest NPC
      this.logProgress('🔄 Step 6: Player returns to Quest NPC to complete quest...');
      await this.movePlayerTo(this.player!, { x: 5, y: 0, z: 4 });

      // Step 7: Complete the quest
      this.logProgress('🎉 Step 7: Completing multi-kill quest...');
      
      const activeQuest = questComponent.activeQuests.get(this.questId);
      if (activeQuest && activeQuest.objectives[0].completed) {
        activeQuest.status = 'completed';
        activeQuest.completedTime = Date.now();
        questComponent.completedQuests.add(this.questId);
        questComponent.activeQuests.delete(this.questId);
        questComponent.questPoints += 3;
        questComponent.questLog.push(`Completed quest: ${activeQuest.name}`);

        // Give rewards
        const inventory = this.player!.getComponent<InventoryComponent>('inventory');
        if (inventory) {
          const rewardSlot = inventory.items.findIndex(slot => slot === null);
          if (rewardSlot !== -1) {
            inventory.items[rewardSlot] = {
              itemId: 995,
              quantity: 500,
              metadata: { name: 'Coins', examine: 'Coins' }
            };
          }
        }

        // Give experience rewards
        const playerStats = this.player!.getComponent<StatsComponent>('stats');
        if (playerStats) {
          playerStats.attack.xp += 300;
          playerStats.strength.xp += 300;
          playerStats.defense.xp += 150;
        }
      }

      this.logProgress('✅ Multi-kill quest completed successfully!');
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logProgress(`❌ Execution failed: ${errorMessage}`);
      return false;
    }
  }

  async validate(): Promise<boolean> {
    try {
      console.log('[MultiKillQuestScenario] Validating multi-kill quest scenario...');

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

      // Verify quest points awarded (should be 3)
      if (questComponent.questPoints < 3) {
        this.logProgress('❌ Validation failed: Quest points not awarded correctly');
        return false;
      }

      // Verify all goblins are dead
      let deadGoblins = 0;
      for (const goblin of this.goblins) {
        const goblinStats = goblin.getComponent<StatsComponent>('stats');
        if (goblinStats && goblinStats.hitpoints.current <= 0) {
          deadGoblins++;
        }
      }

      if (deadGoblins < this.requiredKills) {
        this.logProgress(`❌ Validation failed: Only ${deadGoblins}/${this.requiredKills} goblins killed`);
        return false;
      }

      // Verify coin reward received
      const inventory = this.player?.getComponent<InventoryComponent>('inventory');
      const hasReward = inventory?.items.some(item => 
        item?.itemId === 995 && item?.quantity === 500
      );

      if (!hasReward) {
        this.logProgress('❌ Validation failed: Quest coin reward not received');
        return false;
      }

      // Verify experience gained
      const playerStats = this.player?.getComponent<StatsComponent>('stats');
      if (!playerStats || 
          playerStats.attack.xp < 300 || 
          playerStats.strength.xp < 300 || 
          playerStats.defense.xp < 150) {
        this.logProgress('❌ Validation failed: Experience rewards not received');
        return false;
      }

      // Verify kill count tracking
      if (this.currentKills !== this.requiredKills) {
        this.logProgress(`❌ Validation failed: Kill count mismatch: ${this.currentKills}/${this.requiredKills}`);
        return false;
      }

      this.logProgress('✅ Multi-kill quest validation successful');
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logProgress(`❌ Validation failed: ${errorMessage}`);
      return false;
    }
  }

  async cleanup(): Promise<void> {
    console.log('[MultiKillQuestScenario] Cleaning up multi-kill quest scenario...');
    
    // Remove spawned entities
    this.removeTestEntity('quest_npc');
    this.removeTestEntity('player');
    
    for (let i = 0; i < this.goblins.length; i++) {
      this.removeTestEntity(`goblin_${i}`);
    }
    
    // Clear references
    this.questNPC = null;
    this.player = null;
    this.goblins = [];
    this.currentKills = 0;
    
    console.log('[MultiKillQuestScenario] Cleanup complete');
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
      hitpoints: { current: 100, max: 100, level: 15, xp: 2411 },
      attack: { level: 15, xp: 2411 },
      strength: { level: 15, xp: 2411 },
      defense: { level: 15, xp: 2411 },
      ranged: { level: 1, xp: 0 },
      magic: { level: 1, xp: 0 },
      prayer: { level: 1, xp: 0, points: 0, maxPoints: 0 },
      combatBonuses: {
        attackStab: 0, attackSlash: 0, attackCrush: 0, attackMagic: 0, attackRanged: 0,
        defenseStab: 0, defenseSlash: 0, defenseCrush: 0, defenseMagic: 0, defenseRanged: 0,
        meleeStrength: 0, rangedStrength: 0, magicDamage: 0, prayerBonus: 0
      },
      combatLevel: 15,
      totalLevel: 60
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

  private setupGoblinComponents(goblin: RPGEntity, npcId: number): void {
    goblin.addComponent('npc', {
      type: 'npc',
      npcId: npcId,
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
      spawnPoint: goblin.position,
      lootTable: 'goblin_drops',
      dialogue: undefined,
      shop: undefined,
      questGiver: false,
      shopkeeper: false,
      shopType: undefined,
      currentTarget: null,
      lastInteraction: 0
    });

    goblin.addComponent('stats', {
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

    goblin.addComponent('combat', {
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
  }

  private async combatGoblin(goblin: RPGEntity): Promise<boolean> {
    const playerCombat = this.player!.getComponent<CombatComponent>('combat');
    const goblinCombat = goblin.getComponent<CombatComponent>('combat');
    const goblinStats = goblin.getComponent<StatsComponent>('stats');
    
    if (!playerCombat || !goblinCombat || !goblinStats) {
      return false;
    }

    // Start combat
    playerCombat.inCombat = true;
    playerCombat.target = goblin.id;
    goblinCombat.inCombat = true;
    goblinCombat.target = this.player!.id;

    // Simulate combat rounds
    let combatRounds = 0;
    while (goblinStats.hitpoints.current > 0 && combatRounds < 10) {
      const damage = Math.floor(Math.random() * 4) + 2; // 2-5 damage (stronger player)
      goblinStats.hitpoints.current = Math.max(0, goblinStats.hitpoints.current - damage);
      combatRounds++;
      
      await this.wait(150); // Brief delay between attacks
    }

    // End combat
    playerCombat.inCombat = false;
    playerCombat.target = null;

    return goblinStats.hitpoints.current <= 0;
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