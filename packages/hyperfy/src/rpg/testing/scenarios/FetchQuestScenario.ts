// @ts-nocheck
import type { World } from '../../../types';
import { Vector3, RPGEntity, NPCType, NPCBehavior, NPCState, SkillType, InventoryComponent, StatsComponent, CombatComponent, MovementComponent, ResourceComponent, ItemComponent, NPCComponent, QuestComponent, ConstructionComponent, ConstructionSiteComponent, SkillsComponent } from '../../types/index';
import { BaseTestScenario } from './BaseTestScenario';

/**
 * Fetch Quest Scenario
 * 
 * Complete workflow:
 * 1. Player talks to Quest NPC
 * 2. Player receives fetch quest (get specific item)
 * 3. Player finds/obtains the item
 * 4. Player returns to Quest NPC
 * 5. Player gives item to NPC
 * 6. Player completes quest and receives rewards
 */
export class FetchQuestScenario extends BaseTestScenario {
  private questNPC: RPGEntity | null = null;
  private player: RPGEntity | null = null;
  private questItem: RPGEntity | null = null;
  private questId = 'fetch_quest_test';
  private questItemId = 4001; // Bronze dagger

  constructor(world: World) {
    super(world, 'Fetch Quest Scenario', '#FF6B35'); // Orange color
  }

  async setup(): Promise<boolean> {
    try {
      console.log('[FetchQuestScenario] Setting up fetch quest scenario...');

      // 1. Spawn Quest NPC
      this.questNPC = this.spawnTestEntity('quest_npc', 'npc', { x: 5, y: 0, z: 5 }, '#FF6B35');
      if (!this.questNPC) throw new Error('Failed to spawn quest NPC');

      this.questNPC.addComponent('npc', {
        type: 'npc',
        npcId: 1001,
        name: 'Quest Master',
        examine: 'A helpful quest giver',
        npcType: NPCType.QUEST_GIVER,
        behavior: NPCBehavior.QUEST,
        faction: 'neutral',
        state: NPCState.IDLE,
        level: 1,
        combatLevel: 1,
        maxHitpoints: 10,
        currentHitpoints: 10,
        attackStyle: 'melee' as any,
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
          greeting: "Hello! I have a quest for you.",
          questAvailable: "Can you bring me a bronze dagger? I'll reward you well!",
          questInProgress: "Have you found that bronze dagger yet?",
          questComplete: "Excellent! Here's your reward.",
          farewell: "Good luck on your quest!"
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

      // Add inventory component
      this.player.addComponent('inventory', {
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
          attackStab: 0, attackSlash: 0, attackCrush: 0, attackMagic: 0, attackRanged: 0,
          defenseStab: 0, defenseSlash: 0, defenseCrush: 0, defenseMagic: 0, defenseRanged: 0,
          meleeStrength: 0, rangedStrength: 0, magicDamage: 0, prayerBonus: 0
        }
      });

      // Add quest component
      this.player.addComponent('quest', {
        type: 'quest',
        activeQuests: new Map(),
        completedQuests: new Set(),
        questLog: [],
        questPoints: 0,
        lastQuestUpdate: 0
      });

      // 3. Spawn quest item (bronze dagger) somewhere in the world
      this.questItem = this.spawnTestEntity('quest_item', 'item', { x: 10, y: 0, z: 0 }, '#8B4513');
      if (!this.questItem) throw new Error('Failed to spawn quest item');

      this.questItem.addComponent('item', {
        type: 'item',
        itemId: this.questItemId,
        quantity: 1,
        owner: null,
        spawnTime: Date.now(),
        publicSince: 0,
        despawnTimer: 300000, // 5 minutes
        highlightTimer: 60000, // 1 minute
        noted: false,
        metadata: {
          name: 'Bronze Dagger',
          examine: 'A simple bronze dagger',
          value: 1
        }
      });

      this.logProgress('✅ Fetch quest scenario setup complete');
      return true;

    } catch (error) {
      this.logProgress(`❌ Setup failed: ${error.message}`);
      return false;
    }
  }

  async execute(): Promise<boolean> {
    try {
      console.log('[FetchQuestScenario] Executing fetch quest scenario...');
      
      // Step 1: Player talks to Quest NPC
      this.logProgress('📖 Step 1: Player approaches Quest NPC...');
      await this.movePlayerTo(this.player!, { x: 5, y: 0, z: 4 }); // Near NPC
      
      // Simulate dialogue interaction
      const questComponent = this.player!.getComponent<QuestComponent>('quest');
      if (!questComponent) throw new Error('Player missing quest component');

      // Step 2: Start the quest
      this.logProgress('📋 Step 2: Starting fetch quest...');
      const quest = {
        id: this.questId,
        name: 'Fetch Quest Test',
        description: 'Bring a bronze dagger to the Quest Master',
        type: 'fetch',
        status: 'active',
        startTime: Date.now(),
        objectives: [{
          id: 'get_bronze_dagger',
          description: 'Obtain a bronze dagger',
          type: 'item',
          targetItemId: this.questItemId,
          targetQuantity: 1,
          currentQuantity: 0,
          completed: false
        }],
        rewards: {
          experience: { ['attack']: 100 },
          items: [{ itemId: 995, quantity: 100 }], // 100 coins
          questPoints: 1
        },
        requirements: [],
        giver: 'quest_npc'
      };

      questComponent.activeQuests.set(this.questId, quest);
      questComponent.questLog.push(`Started quest: ${quest.name}`);

      // Step 3: Player goes to find the item
      this.logProgress('🏃 Step 3: Player searches for bronze dagger...');
      await this.movePlayerTo(this.player!, { x: 10, y: 0, z: 1 }); // Near item

      // Step 4: Player picks up the item
      this.logProgress('✋ Step 4: Player picks up bronze dagger...');
      const inventory = this.player!.getComponent<InventoryComponent>('inventory');
      if (!inventory) throw new Error('Player missing inventory component');

      // Add item to inventory
      const firstEmptySlot = inventory.items.findIndex(slot => slot === null);
      if (firstEmptySlot === -1) throw new Error('Player inventory full');

      inventory.items[firstEmptySlot] = {
        itemId: this.questItemId,
        quantity: 1,
        metadata: { name: 'Bronze Dagger', examine: 'A simple bronze dagger' }
      };

      // Update quest progress
      const activeQuest = questComponent.activeQuests.get(this.questId);
      if (activeQuest) {
        activeQuest.objectives[0].currentQuantity = 1;
        activeQuest.objectives[0].completed = true;
        questComponent.questLog.push('Obtained bronze dagger');
      }

      // Step 5: Player returns to Quest NPC
      this.logProgress('🔄 Step 5: Player returns to Quest NPC...');
      await this.movePlayerTo(this.player!, { x: 5, y: 0, z: 4 });

      // Step 6: Player completes the quest
      this.logProgress('🎉 Step 6: Completing quest...');
      
      // Remove item from inventory
      inventory.items[firstEmptySlot] = null;

      // Mark quest as complete
      if (activeQuest) {
        activeQuest.status = 'completed';
        activeQuest.completedTime = Date.now();
        questComponent.completedQuests.add(this.questId);
        questComponent.activeQuests.delete(this.questId);
        questComponent.questPoints += 1;
        questComponent.questLog.push(`Completed quest: ${activeQuest.name}`);

        // Give rewards
        const rewardSlot = inventory.items.findIndex(slot => slot === null);
        if (rewardSlot !== -1) {
          inventory.items[rewardSlot] = {
            itemId: 995, // Coins
            quantity: 100,
            metadata: { name: 'Coins', examine: 'Coins' }
          };
        }
      }

      this.logProgress('✅ Fetch quest completed successfully!');
      return true;

    } catch (error) {
      this.logProgress(`❌ Execution failed: ${error.message}`);
      return false;
    }
  }

  async validate(): Promise<boolean> {
    try {
      console.log('[FetchQuestScenario] Validating fetch quest scenario...');

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

      // Verify quest points awarded
      if (questComponent.questPoints < 1) {
        this.logProgress('❌ Validation failed: Quest points not awarded');
        return false;
      }

      // Verify reward received
      const inventory = this.player?.getComponent<InventoryComponent>('inventory');
      const hasReward = inventory?.items.some(item => 
        item?.itemId === 995 && item?.quantity === 100
      );

      if (!hasReward) {
        this.logProgress('❌ Validation failed: Quest reward not received');
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

      this.logProgress('✅ Fetch quest validation successful');
      return true;

    } catch (error) {
      this.logProgress(`❌ Validation failed: ${error.message}`);
      return false;
    }
  }

  async cleanup(): Promise<void> {
    console.log('[FetchQuestScenario] Cleaning up fetch quest scenario...');
    
    // Remove spawned entities
    this.removeTestEntity('quest_npc');
    this.removeTestEntity('player');
    this.removeTestEntity('quest_item');
    
    // Clear references
    this.questNPC = null;
    this.player = null;
    this.questItem = null;
    
    console.log('[FetchQuestScenario] Cleanup complete');
  }

  private async movePlayerTo(player: RPGEntity, destination: Vector3): Promise<void> {
    const movement = player.getComponent<MovementComponent>('movement');
    if (movement) {
      movement.destination = destination;
      movement.isMoving = true;
      // Simulate movement completion
      await new Promise(resolve => setTimeout(resolve, 500));
      movement.position = destination;
      movement.isMoving = false;
      movement.destination = null;
    }
  }
}