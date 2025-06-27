/**
 * RuneScape NPC System Implementation
 * ==================================
 * Handles dialogue systems, shops, quest givers, and AI behaviors for NPCs
 */

import { logger } from '@elizaos/core';
import type { HyperfySystem, HyperfyWorld, HyperfyEntity } from '../../types/hyperfy';
import type { StatsComponent } from '../types/stats';
import type { InventoryComponent } from '../types/inventory';

export class NPCSystem implements HyperfySystem {
  name = 'NPCSystem';
  world: HyperfyWorld;
  enabled = true;

  // NPC data
  private npcTypes: Map<string, NPCType> = new Map();
  private dialogueTrees: Map<string, DialogueTree> = new Map();
  private shops: Map<string, Shop> = new Map();
  private spawnPoints: Map<string, NPCSpawnPoint> = new Map();

  // Active NPCs
  private activeNPCs: Map<string, NPC> = new Map();
  private npcStates: Map<string, NPCState> = new Map();
  private activeDialogues: Map<string, ActiveDialogue> = new Map();

  // AI and behavior tracking
  private lastAITick = 0;
  private aiTickInterval = 1000; // 1 second AI tick
  private lastGreetingCheck = 0;
  private greetingCheckInterval = 2000; // Check for greeting opportunities every 2 seconds

  constructor(world: HyperfyWorld) {
    this.world = world;
    this.initializeNPCData();
    logger.info('[NPCSystem] Initialized RuneScape NPC mechanics');
  }

  async init(): Promise<void> {
    logger.info('[NPCSystem] Starting NPC system...');
    
    // Subscribe to NPC events
    this.world.events.on('rpg:talk_to_npc', this.handleTalkToNPC.bind(this));
    this.world.events.on('rpg:choose_dialogue_option', this.handleChooseDialogueOption.bind(this));
    this.world.events.on('rpg:open_shop', this.handleOpenShop.bind(this));
    this.world.events.on('rpg:buy_from_shop', this.handleBuyFromShop.bind(this));
    this.world.events.on('rpg:sell_to_shop', this.handleSellToShop.bind(this));
    this.world.events.on('rpg:spawn_npc', this.handleSpawnNPC.bind(this));
    this.world.events.on('rpg:despawn_npc', this.handleDespawnNPC.bind(this));
    
    // Initialize spawn points
    this.initializeSpawnPoints();
  }

  tick(delta: number): void {
    const now = Date.now();
    
    // Process NPC AI
    if (now - this.lastAITick >= this.aiTickInterval) {
      this.processNPCAI();
      this.lastAITick = now;
    }
    
    // Check for greeting opportunities
    if (now - this.lastGreetingCheck >= this.greetingCheckInterval) {
      this.checkGreetingOpportunities();
      this.lastGreetingCheck = now;
    }
    
    // Update NPC states
    this.updateNPCStates(delta);
  }

  destroy(): void {
    this.world.events.off('rpg:talk_to_npc');
    this.world.events.off('rpg:choose_dialogue_option');
    this.world.events.off('rpg:open_shop');
    this.world.events.off('rpg:buy_from_shop');
    this.world.events.off('rpg:sell_to_shop');
    this.world.events.off('rpg:spawn_npc');
    this.world.events.off('rpg:despawn_npc');
    logger.info('[NPCSystem] NPC system destroyed');
  }

  /**
   * Spawn an NPC at a specific location
   */
  spawnNPC(npcTypeId: string, position: { x: number, y: number, z: number }, spawnPointId?: string): string | null {
    const npcType = this.npcTypes.get(npcTypeId);
    if (!npcType) {
      logger.warn(`[NPCSystem] NPC type ${npcTypeId} not found`);
      return null;
    }

    const npcId = `npc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const npc: NPC = {
      id: npcId,
      typeId: npcTypeId,
      position,
      spawnPointId: spawnPointId || null,
      spawnTime: Date.now(),
      lastInteraction: 0,
      mood: 'neutral',
      busy: false,
      facingDirection: 0,
      state: 'idle',
    };

    const npcState: NPCState = {
      currentAction: 'idle',
      actionStartTime: Date.now(),
      targetPosition: null,
      lastMovement: 0,
      greetedPlayers: new Set(),
      questsOffered: npcType.questsOffered || [],
      shopId: npcType.shopId || null,
    };

    this.activeNPCs.set(npcId, npc);
    this.npcStates.set(npcId, npcState);

    logger.info(`[NPCSystem] Spawned ${npcType.name} (${npcId}) at ${position.x},${position.y},${position.z}`);

    // Emit spawn event
    this.world.events.emit('rpg:npc_spawned', {
      npcId,
      npcTypeId,
      npcName: npcType.name,
      position,
      role: npcType.role,
    });

    return npcId;
  }

  /**
   * Start dialogue with an NPC
   */
  talkToNPC(playerId: string, npcId: string): boolean {
    const npc = this.activeNPCs.get(npcId);
    const npcState = this.npcStates.get(npcId);
    
    if (!npc || !npcState) {
      logger.warn(`[NPCSystem] NPC ${npcId} not found`);
      return false;
    }

    const npcType = this.npcTypes.get(npc.typeId);
    if (!npcType) {
      logger.warn(`[NPCSystem] NPC type ${npc.typeId} not found`);
      return false;
    }

    // Check if NPC has dialogue available
    if (!npcType.hasDialogue || !npcType.dialogueTreeId) {
      this.world.events.emit('rpg:npc_response', {
        playerId,
        npcId,
        npcName: npcType.name,
        message: "I don't have anything to say right now.",
        options: [],
      });
      return false;
    }

    // Check if NPC is busy
    if (npc.busy) {
      this.world.events.emit('rpg:npc_response', {
        playerId,
        npcId,
        npcName: npcType.name,
        message: "I'm busy right now. Please come back later.",
        options: [],
      });
      return false;
    }

    // Get initial dialogue
    const dialogueTree = this.dialogueTrees.get(npcType.dialogueTreeId);
    if (!dialogueTree) {
      this.world.events.emit('rpg:npc_response', {
        playerId,
        npcId,
        npcName: npcType.name,
        message: "I don't have anything to say right now.",
        options: [],
      });
      return false;
    }

    // Start dialogue
    const rootNode = dialogueTree.nodes.get(dialogueTree.rootNodeId);
    if (!rootNode) {
      return false;
    }

    // Create active dialogue
    const activeDialogue: ActiveDialogue = {
      playerId,
      npcId,
      dialogueTreeId: npcType.dialogueTreeId,
      currentNodeId: dialogueTree.rootNodeId,
      startTime: Date.now(),
      variables: new Map(),
    };

    this.activeDialogues.set(playerId, activeDialogue);
    npc.busy = true;
    npc.state = 'talking';
    npc.lastInteraction = Date.now();

    // Emit dialogue started event
    this.world.events.emit('rpg:dialogue_started', {
      playerId,
      npcId,
      npcName: npcType.name,
      dialogueTreeId: npcType.dialogueTreeId,
    });

    // Process the root node
    this.processDialogueNode(activeDialogue, rootNode);

    logger.info(`[NPCSystem] Player ${playerId} started dialogue with ${npcType.name}`);

    return true;
  }

  /**
   * Handle player choosing a dialogue option
   */
  chooseDialogueOption(playerId: string, optionId: string): boolean {
    const activeDialogue = this.activeDialogues.get(playerId);
    if (!activeDialogue) {
      return false;
    }

    const dialogueTree = this.dialogueTrees.get(activeDialogue.dialogueTreeId);
    const currentNode = dialogueTree?.nodes.get(activeDialogue.currentNodeId);
    
    if (!dialogueTree || !currentNode) {
      this.endDialogue(playerId);
      return false;
    }

    // Find the chosen option by text or index
    let chosenOption;
    if (optionId.startsWith('option_')) {
      const index = parseInt(optionId.split('_')[1]) - 1;
      chosenOption = currentNode.options[index];
    } else {
      // Try to find by option index for backward compatibility
      const optionIndex = parseInt(optionId);
      if (!isNaN(optionIndex) && optionIndex >= 0 && optionIndex < currentNode.options.length) {
        chosenOption = currentNode.options[optionIndex];
      }
    }

    if (!chosenOption) {
      return false;
    }
    
    // Execute option action if any
    if (chosenOption.action) {
      this.executeDialogueAction(activeDialogue, chosenOption.action);
    }

    // Emit option chosen event
    this.world.events.emit('rpg:dialogue_option_chosen', {
      playerId,
      npcId: activeDialogue.npcId,
      optionId,
      optionText: chosenOption.text,
    });

    // Move to next node
    if (chosenOption.nextNodeId) {
      activeDialogue.currentNodeId = chosenOption.nextNodeId;
      const nextNode = dialogueTree.nodes.get(chosenOption.nextNodeId);
      
      if (nextNode) {
        this.processDialogueNode(activeDialogue, nextNode);
      } else {
        this.endDialogue(playerId);
      }
    } else {
      // End dialogue
      this.endDialogue(playerId);
    }

    return true;
  }

  /**
   * Process a dialogue node
   */
  private processDialogueNode(activeDialogue: ActiveDialogue, node: DialogueNode): void {
    const npc = this.activeNPCs.get(activeDialogue.npcId);
    const npcType = this.npcTypes.get(npc?.typeId || '');
    
    if (!npc || !npcType) {
      this.endDialogue(activeDialogue.playerId);
      return;
    }

    // Check conditions
    if (node.conditions.length > 0) {
      const conditionsMet = this.checkDialogueConditions(activeDialogue, node.conditions);
      if (!conditionsMet) {
        this.endDialogue(activeDialogue.playerId);
        return;
      }
    }

    // Execute node action if any
    if (node.action) {
      this.executeDialogueAction(activeDialogue, node.action);
    }

    // Send response to player
    this.world.events.emit('rpg:npc_response', {
      playerId: activeDialogue.playerId,
      npcId: activeDialogue.npcId,
      npcName: npcType.name,
      message: node.text,
      options: node.options.map(option => ({
        text: option.text,
        enabled: this.checkDialogueConditions(activeDialogue, option.conditions || []),
      })),
    });
  }

  /**
   * Check dialogue conditions
   */
  private checkDialogueConditions(activeDialogue: ActiveDialogue, conditions: DialogueCondition[]): boolean {
    if (conditions.length === 0) return true;

    for (const condition of conditions) {
      if (!this.checkSingleCondition(activeDialogue, condition)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check a single dialogue condition
   */
  private checkSingleCondition(activeDialogue: ActiveDialogue, condition: DialogueCondition): boolean {
    const player = this.world.entities.players.get(activeDialogue.playerId);
    if (!player) return false;

    switch (condition.type) {
      case 'level':
        const stats = (player.data as any).stats as StatsComponent;
        const skillLevel = stats[condition.skill as keyof StatsComponent]?.level || 0;
        return skillLevel >= condition.value;

      case 'item':
        const inventory = (player.data as any).inventory as InventoryComponent;
        const hasItem = inventory.items.some(item => 
          item && item.itemId === condition.itemId && item.quantity >= (condition.quantity || 1)
        );
        return hasItem;

      case 'quest':
        // Would check quest completion status
        return true; // Placeholder

      case 'variable':
        const variableValue = activeDialogue.variables.get(condition.variable || '');
        return variableValue === condition.value;

      default:
        return true;
    }
  }

  /**
   * Execute dialogue action
   */
  private executeDialogueAction(activeDialogue: ActiveDialogue, action: DialogueAction): void {
    switch (action.type) {
      case 'give_item':
        this.world.events.emit('rpg:add_item', {
          playerId: activeDialogue.playerId,
          itemId: action.itemId!,
          quantity: action.quantity || 1,
        });
        break;

      case 'take_item':
        this.world.events.emit('rpg:remove_item', {
          playerId: activeDialogue.playerId,
          itemId: action.itemId!,
          quantity: action.quantity || 1,
        });
        break;

      case 'give_xp':
        this.world.events.emit('rpg:xp_gain', {
          playerId: activeDialogue.playerId,
          skill: action.skill!,
          amount: action.amount!,
          source: 'dialogue',
        });
        break;

      case 'start_quest':
        this.world.events.emit('rpg:quest_started', {
          playerId: activeDialogue.playerId,
          questId: action.questId!,
          npcId: activeDialogue.npcId,
        });
        break;

      case 'open_shop':
        this.openShop(activeDialogue.playerId, activeDialogue.npcId);
        break;

      case 'set_variable':
        activeDialogue.variables.set(action.variable!, action.value!);
        break;

      case 'teleport':
        this.world.events.emit('rpg:teleport_player', {
          playerId: activeDialogue.playerId,
          position: action.position!,
        });
        break;
    }
  }

  /**
   * End dialogue
   */
  private endDialogue(playerId: string): void {
    const activeDialogue = this.activeDialogues.get(playerId);
    if (activeDialogue) {
      const npc = this.activeNPCs.get(activeDialogue.npcId);
      if (npc) {
        npc.busy = false;
      }
      
      this.activeDialogues.delete(playerId);
      
      this.world.events.emit('rpg:dialogue_ended', {
        playerId,
        npcId: activeDialogue.npcId,
      });
    }
  }

  /**
   * Open shop interface
   */
  openShop(playerId: string, npcId: string): boolean {
    const npc = this.activeNPCs.get(npcId);
    const npcState = this.npcStates.get(npcId);
    
    if (!npc || !npcState || !npcState.shopId) {
      return false;
    }

    const shop = this.shops.get(npcState.shopId);
    if (!shop) {
      return false;
    }

    this.world.events.emit('rpg:shop_opened', {
      playerId,
      npcId,
      shopId: shop.id,
      shopName: shop.name,
      items: shop.items.map(item => ({
        itemId: item.itemId,
        stock: item.stock,
        buyPrice: item.buyPrice,
        sellPrice: item.sellPrice,
      })),
    });

    logger.info(`[NPCSystem] Player ${playerId} opened shop ${shop.name}`);
    return true;
  }

  /**
   * Buy item from shop
   */
  buyFromShop(playerId: string, shopId: string, itemId: number, quantity: number): boolean {
    const shop = this.shops.get(shopId);
    if (!shop) {
      return false;
    }

    const shopItem = shop.items.find(item => item.itemId === itemId);
    if (!shopItem) {
      return false;
    }

    // Check stock
    if (shopItem.stock < quantity) {
      this.world.events.emit('rpg:shop_error', {
        playerId,
        message: `Not enough ${shopItem.name} in stock. Available: ${shopItem.stock}`,
      });
      return false;
    }

    const totalCost = shopItem.buyPrice * quantity;

    // Check if player has enough coins
    const player = this.world.entities.players.get(playerId);
    if (!player) return false;

    const inventory = (player.data as any).inventory as InventoryComponent;
    const coinsItem = inventory.items.find(item => item && item.itemId === 995); // Coins
    const playerCoins = coinsItem?.quantity || 0;

    if (playerCoins < totalCost) {
      this.world.events.emit('rpg:shop_error', {
        playerId,
        message: `Not enough coins. Need ${totalCost}, have ${playerCoins}.`,
      });
      return false;
    }

    // Execute purchase
    this.world.events.emit('rpg:remove_item', {
      playerId,
      itemId: 995, // Coins
      quantity: totalCost,
    });

    this.world.events.emit('rpg:add_item', {
      playerId,
      itemId: shopItem.itemId,
      quantity,
    });

    // Update shop stock
    shopItem.stock -= quantity;

    this.world.events.emit('rpg:shop_purchase', {
      playerId,
      shopId,
      itemId,
      itemName: shopItem.name,
      quantity,
      totalCost,
    });

    logger.info(`[NPCSystem] Player ${playerId} bought ${quantity}x ${shopItem.name} for ${totalCost} coins`);
    return true;
  }

  /**
   * Sell item to shop
   */
  sellToShop(playerId: string, shopId: string, itemId: number, quantity: number): boolean {
    const shop = this.shops.get(shopId);
    if (!shop) {
      return false;
    }

    const shopItem = shop.items.find(item => item.itemId === itemId);
    if (!shopItem || shopItem.sellPrice <= 0) {
      this.world.events.emit('rpg:shop_error', {
        playerId,
        message: "This shop doesn't buy that item.",
      });
      return false;
    }

    // Check if player has the item
    const player = this.world.entities.players.get(playerId);
    if (!player) return false;

    const inventory = (player.data as any).inventory as InventoryComponent;
    const playerItem = inventory.items.find(item => item && item.itemId === itemId);
    
    if (!playerItem || playerItem.quantity < quantity) {
      this.world.events.emit('rpg:shop_error', {
        playerId,
        message: `You don't have ${quantity}x ${shopItem.name}.`,
      });
      return false;
    }

    const totalValue = shopItem.sellPrice * quantity;

    // Execute sale
    this.world.events.emit('rpg:remove_item', {
      playerId,
      itemId,
      quantity,
    });

    this.world.events.emit('rpg:add_item', {
      playerId,
      itemId: 995, // Coins
      quantity: totalValue,
    });

    // Update shop stock
    shopItem.stock += quantity;

    this.world.events.emit('rpg:shop_sale', {
      playerId,
      shopId,
      itemId,
      itemName: shopItem.name,
      quantity,
      totalValue,
    });

    logger.info(`[NPCSystem] Player ${playerId} sold ${quantity}x ${shopItem.name} for ${totalValue} coins`);
    return true;
  }

  /**
   * Process NPC AI
   */
  private processNPCAI(): void {
    for (const [npcId, npc] of this.activeNPCs.entries()) {
      const npcState = this.npcStates.get(npcId);
      const npcType = this.npcTypes.get(npc.typeId);
      
      if (!npcState || !npcType) continue;

      // Skip AI if NPC is busy with dialogue
      if (npc.busy) continue;

      // Process based on NPC behavior
      switch (npcType.aiBehavior) {
        case 'stationary':
          this.processStationaryBehavior(npc, npcState, npcType);
          break;
        case 'wandering':
          this.processWanderingBehavior(npc, npcState, npcType);
          break;
        case 'patrolling':
          this.processPatrollingBehavior(npc, npcState, npcType);
          break;
        case 'working':
          this.processWorkingBehavior(npc, npcState, npcType);
          break;
      }
    }
  }

  /**
   * Process stationary NPC behavior
   */
  private processStationaryBehavior(npc: NPC, npcState: NPCState, npcType: NPCType): void {
    // Stationary NPCs just stay in place and occasionally change facing direction
    if (Math.random() < 0.1) { // 10% chance to turn
      npc.facingDirection = Math.random() * 360;
    }
  }

  /**
   * Process wandering NPC behavior
   */
  private processWanderingBehavior(npc: NPC, npcState: NPCState, npcType: NPCType): void {
    // Randomly move around spawn point
    if (Math.random() < 0.3) { // 30% chance to start moving
      const wanderRadius = 10;
      const spawnPoint = this.spawnPoints.get(npc.spawnPointId || '');
      const basePos = spawnPoint?.position || npc.position;
      
      npcState.targetPosition = {
        x: basePos.x + (Math.random() - 0.5) * wanderRadius * 2,
        y: basePos.y,
        z: basePos.z + (Math.random() - 0.5) * wanderRadius * 2,
      };
      
      npcState.currentAction = 'moving';
    }
  }

  /**
   * Process patrolling NPC behavior
   */
  private processPatrollingBehavior(npc: NPC, npcState: NPCState, npcType: NPCType): void {
    // Move between predefined patrol points
    // This would require patrol point data in NPCType
  }

  /**
   * Process working NPC behavior
   */
  private processWorkingBehavior(npc: NPC, npcState: NPCState, npcType: NPCType): void {
    // NPCs that perform work actions (smithing, cooking, etc.)
    if (npcState.currentAction === 'idle' && Math.random() < 0.2) {
      npcState.currentAction = 'working';
      npcState.actionStartTime = Date.now();
    } else if (npcState.currentAction === 'working' && Date.now() - npcState.actionStartTime > 5000) {
      npcState.currentAction = 'idle';
    }
  }

  /**
   * Check for greeting opportunities
   */
  private checkGreetingOpportunities(): void {
    // This would check for players near NPCs and trigger greetings
    // Implementation would require position tracking
  }

  /**
   * Update NPC states
   */
  private updateNPCStates(delta: number): void {
    for (const [npcId, npcState] of this.npcStates.entries()) {
      // Update movement if NPC is moving to target position
      if (npcState.currentAction === 'moving' && npcState.targetPosition) {
        const npc = this.activeNPCs.get(npcId);
        if (npc) {
          // In a real implementation, you would smoothly move the NPC toward the target
          // For now, we'll just teleport them after a delay
          if (Date.now() - npcState.actionStartTime > 3000) {
            npc.position = npcState.targetPosition;
            npcState.currentAction = 'idle';
            npcState.targetPosition = null;
          }
        }
      }
    }
  }

  /**
   * Initialize spawn points
   */
  private initializeSpawnPoints(): void {
    // Lumbridge NPCs
    this.spawnPoints.set('lumbridge_duke', {
      id: 'lumbridge_duke',
      npcTypeId: 'duke_horacio',
      position: { x: 120, y: 0, z: 120 },
      region: 'Lumbridge',
      isActive: true,
    });

    this.spawnPoints.set('lumbridge_shopkeeper', {
      id: 'lumbridge_shopkeeper',
      npcTypeId: 'shop_keeper',
      position: { x: 125, y: 0, z: 125 },
      region: 'Lumbridge',
      isActive: true,
    });

    this.spawnPoints.set('lumbridge_combat_instructor', {
      id: 'lumbridge_combat_instructor',
      npcTypeId: 'combat_instructor',
      position: { x: 130, y: 0, z: 130 },
      region: 'Lumbridge',
      isActive: true,
    });

    this.spawnPoints.set('lumbridge_hans', {
      id: 'lumbridge_hans',
      npcTypeId: 'hans',
      position: { x: 110, y: 0, z: 115 },
      region: 'Lumbridge',
      isActive: true,
    });

    // Spawn initial NPCs
    for (const [spawnPointId, spawnPoint] of this.spawnPoints.entries()) {
      if (spawnPoint.isActive) {
        this.spawnNPC(spawnPoint.npcTypeId, spawnPoint.position, spawnPointId);
      }
    }
  }

  /**
   * Initialize NPC data
   */
  private initializeNPCData(): void {
    // Duke Horacio - Quest giver
    this.npcTypes.set('duke_horacio', {
      id: 'duke_horacio',
      name: 'Duke Horacio',
      role: 'quest_giver',
      location: 'Lumbridge Castle',
      description: 'The ruler of Lumbridge, a kind and helpful duke.',
      dialogueTreeId: 'duke_horacio_dialogue',
      aiBehavior: 'stationary',
      hasDialogue: true,
      hasShop: false,
      questsOffered: ['rune_mysteries', 'restless_ghost'],
      shopId: null,
      combatLevel: 0,
      aggressive: false,
    });

    // General store owner - Shopkeeper
    this.npcTypes.set('shop_keeper', {
      id: 'shop_keeper',
      name: 'Shop keeper',
      role: 'merchant',
      location: 'Lumbridge General Store',
      description: 'A friendly shopkeeper who sells general goods.',
      dialogueTreeId: 'shop_keeper_dialogue',
      aiBehavior: 'stationary',
      hasDialogue: true,
      hasShop: true,
      questsOffered: [],
      shopId: 'lumbridge_general_store',
      combatLevel: 0,
      aggressive: false,
    });

    // Combat instructor - Trainer
    this.npcTypes.set('combat_instructor', {
      id: 'combat_instructor',
      name: 'Combat Instructor',
      role: 'trainer',
      location: 'Lumbridge Combat Academy',
      description: 'A skilled warrior who teaches combat techniques.',
      dialogueTreeId: 'combat_instructor_dialogue',
      aiBehavior: 'stationary',
      hasDialogue: true,
      hasShop: false,
      questsOffered: [],
      shopId: null,
      combatLevel: 0,
      aggressive: false,
    });

    // Hans - Wandering NPC
    this.npcTypes.set('hans', {
      id: 'hans',
      name: 'Hans',
      role: 'citizen',
      location: 'Lumbridge',
      description: 'A longtime resident of Lumbridge who loves to chat.',
      dialogueTreeId: 'hans_dialogue',
      aiBehavior: 'wandering',
      hasDialogue: true,
      hasShop: false,
      questsOffered: [],
      shopId: null,
      combatLevel: 0,
      aggressive: false,
    });

    // Initialize dialogue trees
    this.initializeDialogueTrees();
    
    // Initialize shops
    this.initializeShops();
  }

  /**
   * Initialize dialogue trees
   */
  private initializeDialogueTrees(): void {
    // Duke Horatio dialogue
    const dukeDialogue = new Map<string, DialogueNode>();
    
    dukeDialogue.set('root', {
      id: 'root',
      text: "Greetings! I am Duke Horacio, ruler of Lumbridge. How may I help you?",
      conditions: [],
      options: [
        {
          text: "I'm looking for a quest.",
          nextNodeId: 'quest_offer',
          conditions: [],
        },
        {
          text: "Tell me about Lumbridge.",
          nextNodeId: 'about_lumbridge',
          conditions: [],
        },
        {
          text: "Nothing, thank you.",
          nextNodeId: null,
          conditions: [],
        },
      ],
      action: null,
    });

    dukeDialogue.set('quest_offer', {
      id: 'quest_offer',
      text: "Ah, a brave adventurer! I have several tasks that need doing. Would you like to help uncover the mysteries of runecrafting?",
      conditions: [],
      options: [
        {
          text: "Yes, I'd like to learn about runecrafting.",
          nextNodeId: 'start_rune_mysteries',
          conditions: [],
          action: { type: 'start_quest', questId: 'rune_mysteries' },
        },
        {
          text: "Maybe later.",
          nextNodeId: null,
          conditions: [],
        },
      ],
      action: null,
    });

    dukeDialogue.set('start_rune_mysteries', {
      id: 'start_rune_mysteries',
      text: "Excellent! Speak to the head wizard at the Wizards' Tower. Take this air talisman as proof of my endorsement.",
      conditions: [],
      options: [
        {
          text: "Thank you, I'll head there now.",
          nextNodeId: null,
          conditions: [],
        },
      ],
      action: { type: 'give_item', itemId: 1438, quantity: 1 }, // Air talisman
    });

    dukeDialogue.set('about_lumbridge', {
      id: 'about_lumbridge',
      text: "Lumbridge is a peaceful town, perfect for new adventurers. We have a castle, shops, and many friendly citizens.",
      conditions: [],
      options: [
        {
          text: "Thank you for the information.",
          nextNodeId: null,
          conditions: [],
        },
      ],
      action: null,
    });

    this.dialogueTrees.set('duke_horacio_dialogue', {
      id: 'duke_horacio_dialogue',
      rootNodeId: 'root',
      nodes: dukeDialogue,
    });

    // Shopkeeper dialogue
    const shopkeeperDialogue = new Map<string, DialogueNode>();
    
    shopkeeperDialogue.set('root', {
      id: 'root',
      text: "Welcome to my shop! Would you like to see what I have for sale?",
      conditions: [],
      options: [
        {
          text: "Yes, I'd like to browse your wares.",
          nextNodeId: null,
          conditions: [],
          action: { type: 'open_shop' },
        },
        {
          text: "Not right now, thanks.",
          nextNodeId: null,
          conditions: [],
        },
      ],
      action: null,
    });

    this.dialogueTrees.set('shop_keeper_dialogue', {
      id: 'shop_keeper_dialogue',
      rootNodeId: 'root',
      nodes: shopkeeperDialogue,
    });

    // Combat instructor dialogue
    const combatDialogue = new Map<string, DialogueNode>();
    
    combatDialogue.set('root', {
      id: 'root',
      text: "Hello there! I can teach you about combat. Would you like some training?",
      conditions: [],
      options: [
        {
          text: "Yes, please teach me about combat.",
          nextNodeId: 'combat_training',
          conditions: [],
        },
        {
          text: "I think I'm good for now.",
          nextNodeId: null,
          conditions: [],
        },
      ],
      action: null,
    });

    combatDialogue.set('combat_training', {
      id: 'combat_training',
      text: "Excellent! The key to combat is practice. Here's some experience to get you started.",
      conditions: [],
      options: [
        {
          text: "Thank you for the training!",
          nextNodeId: null,
          conditions: [],
        },
      ],
      action: { type: 'give_xp', skill: 'attack', amount: 100 },
    });

    this.dialogueTrees.set('combat_instructor_dialogue', {
      id: 'combat_instructor_dialogue',
      rootNodeId: 'root',
      nodes: combatDialogue,
    });

    // Hans dialogue
    const hansDialogue = new Map<string, DialogueNode>();
    
    hansDialogue.set('root', {
      id: 'root',
      text: "Hello! Nice day, isn't it? I've been exploring Lumbridge for years.",
      conditions: [],
      options: [
        {
          text: "How long have you been here?",
          nextNodeId: 'how_long',
          conditions: [],
        },
        {
          text: "See you around!",
          nextNodeId: null,
          conditions: [],
        },
      ],
      action: null,
    });

    hansDialogue.set('how_long', {
      id: 'how_long',
      text: "Oh, must be decades now! I've seen many adventurers pass through these parts.",
      conditions: [],
      options: [
        {
          text: "That's interesting, thanks for sharing.",
          nextNodeId: null,
          conditions: [],
        },
      ],
      action: null,
    });

    this.dialogueTrees.set('hans_dialogue', {
      id: 'hans_dialogue',
      rootNodeId: 'root',
      nodes: hansDialogue,
    });
  }

  /**
   * Initialize shops
   */
  private initializeShops(): void {
    this.shops.set('lumbridge_general_store', {
      id: 'lumbridge_general_store',
      name: 'Lumbridge General Store',
      type: 'general',
      items: [
        {
          itemId: 995,  // Coins
          name: 'Coins',
          stock: 0,
          maxStock: 0,
          buyPrice: 1,
          sellPrice: 1,
          restockRate: 0,
        },
        {
          itemId: 1931, // Pot
          name: 'Pot',
          stock: 5,
          maxStock: 10,
          buyPrice: 5,
          sellPrice: 2,
          restockRate: 1,
        },
        {
          itemId: 1925, // Bucket
          name: 'Bucket',
          stock: 3,
          maxStock: 10,
          buyPrice: 10,
          sellPrice: 4,
          restockRate: 1,
        },
        {
          itemId: 590,  // Tinderbox
          name: 'Tinderbox',
          stock: 2,
          maxStock: 5,
          buyPrice: 15,
          sellPrice: 6,
          restockRate: 1,
        },
        {
          itemId: 1759, // Hammer
          name: 'Hammer',
          stock: 2,
          maxStock: 5,
          buyPrice: 12,
          sellPrice: 5,
          restockRate: 1,
        },
        {
          itemId: 2309, // Bread
          name: 'Bread',
          stock: 10,
          maxStock: 20,
          buyPrice: 4,
          sellPrice: 2,
          restockRate: 2,
        },
        {
          itemId: 1511, // Logs
          name: 'Logs',
          stock: 0,
          maxStock: 50,
          buyPrice: 0, // Don't sell logs
          sellPrice: 2,
          restockRate: 0,
        },
      ],
    });
  }

  // Event handlers
  private handleTalkToNPC(data: { playerId: string, npcId: string }): void {
    this.talkToNPC(data.playerId, data.npcId);
  }

  private handleChooseDialogueOption(data: { playerId: string, optionIndex?: number, optionId?: string }): void {
    const optionId = data.optionId || (data.optionIndex !== undefined ? data.optionIndex.toString() : 'option_1');
    this.chooseDialogueOption(data.playerId, optionId);
  }

  private handleOpenShop(data: { playerId: string, npcId: string }): void {
    this.openShop(data.playerId, data.npcId);
  }

  private handleBuyFromShop(data: { playerId: string, npcId?: string, shopId?: string, itemId?: number, itemName?: string, quantity: number }): void {
    if (data.shopId && data.itemId) {
      this.buyFromShop(data.playerId, data.shopId, data.itemId, data.quantity);
    } else if (data.npcId && data.itemName) {
      this.buyFromShopByName(data.playerId, data.npcId, data.itemName, data.quantity);
    }
  }

  private handleSellToShop(data: { playerId: string, npcId?: string, shopId?: string, itemId?: number, itemName?: string, quantity: number }): void {
    if (data.shopId && data.itemId) {
      this.sellToShop(data.playerId, data.shopId, data.itemId, data.quantity);
    } else if (data.npcId && data.itemName) {
      this.sellToShopByName(data.playerId, data.npcId, data.itemName, data.quantity);
    }
  }

  private handleSpawnNPC(data: { npcTypeId: string, position: { x: number, y: number, z: number }, spawnPointId?: string }): void {
    this.spawnNPC(data.npcTypeId, data.position, data.spawnPointId);
  }

  private handleDespawnNPC(data: { npcId: string }): void {
    this.despawnNPC(data.npcId);
  }

  // Getters for external systems
  getNPCTypes(): Map<string, NPCType> {
    return new Map(this.npcTypes);
  }

  getActiveNPCs(): Map<string, NPC> {
    return new Map(this.activeNPCs);
  }

  getNPC(npcId: string): NPC | null {
    return this.activeNPCs.get(npcId) || null;
  }

  getNPCsByType(typeId: string): NPC[] {
    return Array.from(this.activeNPCs.values()).filter(npc => npc.typeId === typeId);
  }

  getNPCsByRole(role: string): NPC[] {
    const npcsWithRole: NPC[] = [];
    
    for (const npc of this.activeNPCs.values()) {
      const npcType = this.npcTypes.get(npc.typeId);
      if (npcType && npcType.role === role) {
        npcsWithRole.push(npc);
      }
    }
    
    return npcsWithRole;
  }

  getShops(): Map<string, Shop> {
    return new Map(this.shops);
  }

  getActiveDialogues(): Map<string, ActiveDialogue> {
    return new Map(this.activeDialogues);
  }

  getDialogueTrees(): Map<string, DialogueTree> {
    return new Map(this.dialogueTrees);
  }

  getNPCsByName(name: string): NPC[] {
    const npcsWithName: NPC[] = [];
    
    for (const npc of this.activeNPCs.values()) {
      const npcType = this.npcTypes.get(npc.typeId);
      if (npcType && npcType.name === name) {
        npcsWithName.push(npc);
      }
    }
    
    return npcsWithName;
  }

  getMerchantNPCs(): NPC[] {
    return this.getNPCsByRole('merchant');
  }

  despawnNPC(npcId: string): boolean {
    const npc = this.activeNPCs.get(npcId);
    if (!npc) {
      return false;
    }

    // Clean up states and dialogues
    this.npcStates.delete(npcId);
    
    // End any active dialogues with this NPC
    for (const [playerId, dialogue] of this.activeDialogues.entries()) {
      if (dialogue.npcId === npcId) {
        this.activeDialogues.delete(playerId);
      }
    }
    
    // Remove from active NPCs
    this.activeNPCs.delete(npcId);

    logger.info(`[NPCSystem] Despawned NPC ${npcId}`);

    // Emit despawn event
    this.world.events.emit('rpg:npc_despawned', {
      npcId,
      position: npc.position
    });

    return true;
  }

  endDialogue(playerId: string): boolean {
    const activeDialogue = this.activeDialogues.get(playerId);
    if (!activeDialogue) {
      return false;
    }

    const npc = this.activeNPCs.get(activeDialogue.npcId);
    if (npc) {
      npc.busy = false;
    }
    
    this.activeDialogues.delete(playerId);
    
    this.world.events.emit('rpg:dialogue_ended', {
      playerId,
      npcId: activeDialogue.npcId
    });

    return true;
  }

  // Convenience methods for action handlers
  buyFromShopByName(playerId: string, npcId: string, itemName: string, quantity: number): boolean {
    const npc = this.activeNPCs.get(npcId);
    const npcState = this.npcStates.get(npcId);
    
    if (!npc || !npcState || !npcState.shopId) {
      return false;
    }

    const shop = this.shops.get(npcState.shopId);
    if (!shop) {
      return false;
    }

    // Find item by name
    const shopItem = shop.items.find(item => item.name.toLowerCase() === itemName.toLowerCase());
    if (!shopItem) {
      return false;
    }

    return this.buyFromShop(playerId, npcState.shopId, shopItem.itemId, quantity);
  }

  sellToShopByName(playerId: string, npcId: string, itemName: string, quantity: number): boolean {
    const npc = this.activeNPCs.get(npcId);
    const npcState = this.npcStates.get(npcId);
    
    if (!npc || !npcState || !npcState.shopId) {
      return false;
    }

    const shop = this.shops.get(npcState.shopId);
    if (!shop) {
      return false;
    }

    // Find item by name  
    const shopItem = shop.items.find(item => item.name.toLowerCase() === itemName.toLowerCase());
    if (!shopItem) {
      return false;
    }

    return this.sellToShop(playerId, npcState.shopId, shopItem.itemId, quantity);
  }

  // Validation methods
  canTalkToNPC(playerId: string, npcId: string): { canTalk: boolean, reason?: string } {
    const npc = this.activeNPCs.get(npcId);
    if (!npc) {
      return { canTalk: false, reason: 'NPC not found' };
    }

    const npcType = this.npcTypes.get(npc.typeId);
    if (!npcType) {
      return { canTalk: false, reason: 'NPC type not found' };
    }

    if (!npcType.dialogueTreeId) {
      return { canTalk: false, reason: 'NPC has no dialogue available' };
    }

    if (npc.busy) {
      return { canTalk: false, reason: 'NPC is currently busy' };
    }

    return { canTalk: true };
  }

  canOpenShop(playerId: string, npcId: string): { canOpen: boolean, reason?: string } {
    const npc = this.activeNPCs.get(npcId);
    if (!npc) {
      return { canOpen: false, reason: 'NPC not found' };
    }

    const npcType = this.npcTypes.get(npc.typeId);
    if (!npcType) {
      return { canOpen: false, reason: 'NPC type not found' };
    }

    if (!npcType.shopId) {
      return { canOpen: false, reason: 'NPC does not have a shop' };
    }

    const shop = this.shops.get(npcType.shopId);
    if (!shop) {
      return { canOpen: false, reason: 'Shop not found' };
    }

    return { canOpen: true };
  }
}

// Type definitions
interface NPCType {
  id: string;
  name: string;
  role: 'quest_giver' | 'merchant' | 'trainer' | 'citizen' | 'guard';
  location: string;
  description: string;
  dialogueTreeId: string;
  aiBehavior: 'stationary' | 'wandering' | 'patrolling' | 'working';
  hasDialogue: boolean;
  hasShop: boolean;
  questsOffered: string[];
  shopId: string | null;
  combatLevel: number;
  aggressive: boolean;
}

interface NPC {
  id: string;
  typeId: string;
  position: { x: number, y: number, z: number };
  spawnPointId: string | null;
  spawnTime: number;
  lastInteraction: number;
  mood: 'friendly' | 'neutral' | 'hostile' | 'busy';
  busy: boolean;
  facingDirection: number;
  state: 'idle' | 'moving' | 'working' | 'talking';
}

interface NPCState {
  currentAction: 'idle' | 'moving' | 'working' | 'talking';
  actionStartTime: number;
  targetPosition: { x: number, y: number, z: number } | null;
  lastMovement: number;
  greetedPlayers: Set<string>;
  questsOffered: string[];
  shopId: string | null;
}

interface NPCSpawnPoint {
  id: string;
  npcTypeId: string;
  position: { x: number, y: number, z: number };
  region: string;
  isActive: boolean;
}

interface DialogueTree {
  id: string;
  rootNodeId: string;
  nodes: Map<string, DialogueNode>;
}

interface DialogueNode {
  id: string;
  text: string;
  conditions: DialogueCondition[];
  options: DialogueOption[];
  action: DialogueAction | null;
}

interface DialogueOption {
  text: string;
  nextNodeId: string | null;
  conditions?: DialogueCondition[];
  action?: DialogueAction;
}

interface DialogueCondition {
  type: 'level' | 'item' | 'quest' | 'variable';
  skill?: string;
  value: any;
  itemId?: number;
  quantity?: number;
  questId?: string;
  variable?: string;
}

interface DialogueAction {
  type: 'give_item' | 'take_item' | 'give_xp' | 'start_quest' | 'open_shop' | 'set_variable' | 'teleport';
  itemId?: number;
  quantity?: number;
  skill?: string;
  amount?: number;
  questId?: string;
  variable?: string;
  value?: any;
  position?: { x: number, y: number, z: number };
}

interface ActiveDialogue {
  playerId: string;
  npcId: string;
  dialogueTreeId: string;
  currentNodeId: string;
  startTime: number;
  variables: Map<string, any>;
}

interface Shop {
  id: string;
  name: string;
  type: 'general' | 'food' | 'equipment' | 'magic' | 'specialty';
  items: ShopItem[];
}

interface ShopItem {
  itemId: number;
  name: string;
  stock: number;
  maxStock: number;
  buyPrice: number;
  sellPrice: number;
  restockRate: number;
}