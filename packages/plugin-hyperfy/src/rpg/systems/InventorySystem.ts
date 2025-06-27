/**
 * RuneScape Inventory System Implementation
 * =========================================
 * Handles inventory management, equipment, banking, and item operations
 */

import { logger } from '@elizaos/core';
import type { HyperfySystem, HyperfyWorld, HyperfyEntity } from '../../types/hyperfy';
import type { StatsComponent } from '../types/stats';
import type {
  InventoryComponent,
  BankComponent,
  ItemStack,
  ItemDefinition,
  EquipmentSlot,
  ItemTransaction,
  InventoryOperationResult,
  INVENTORY_CONSTANTS
} from '../types/inventory';

export class InventorySystem implements HyperfySystem {
  name = 'InventorySystem';
  world: HyperfyWorld;
  enabled = true;

  // Item definitions database
  private itemDefinitions: Map<number, ItemDefinition> = new Map();
  
  // Transaction log for debugging and rollback
  private transactionLog: ItemTransaction[] = [];

  constructor(world: HyperfyWorld) {
    this.world = world;
    this.initializeBaseItems();
    logger.info('[InventorySystem] Initialized RuneScape inventory management');
  }

  async init(): Promise<void> {
    logger.info('[InventorySystem] Starting inventory system...');
    
    // Subscribe to inventory events
    this.world.events.on('rpg:add_item', this.handleAddItem.bind(this));
    this.world.events.on('rpg:remove_item', this.handleRemoveItem.bind(this));
    this.world.events.on('rpg:equip_item', this.handleEquipItem.bind(this));
    this.world.events.on('rpg:unequip_item', this.handleUnequipItem.bind(this));
    this.world.events.on('rpg:drop_item', this.handleDropItem.bind(this));
    this.world.events.on('rpg:use_item', this.handleUseItem.bind(this));
  }

  tick(delta: number): void {
    // Process any queued inventory operations
    // Update item charges, degradation, etc.
  }

  destroy(): void {
    this.world.events.off('rpg:add_item');
    this.world.events.off('rpg:remove_item');
    this.world.events.off('rpg:equip_item');
    this.world.events.off('rpg:unequip_item');
    this.world.events.off('rpg:drop_item');
    this.world.events.off('rpg:use_item');
    logger.info('[InventorySystem] Inventory system destroyed');
  }

  /**
   * Create initial inventory for a new player
   */
  createInitialInventory(): InventoryComponent {
    return {
      items: new Array(INVENTORY_CONSTANTS.STANDARD_SLOTS).fill(null),
      maxSlots: INVENTORY_CONSTANTS.STANDARD_SLOTS,
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
        ammo: null,
      },
      totalWeight: 0,
      usedSlots: 0,
      freeSlots: INVENTORY_CONSTANTS.STANDARD_SLOTS,
    };
  }

  /**
   * Create initial bank for a new player
   */
  createInitialBank(): BankComponent {
    return {
      items: new Map(),
      maxSlots: 400, // F2P default
      tabs: [
        { name: 'All', items: [], icon: undefined },
      ],
      currentTab: 0,
      searchFilter: '',
      noteMode: false,
    };
  }

  /**
   * Add item to player inventory
   */
  addItem(playerId: string, itemId: number, quantity: number, noted: boolean = false): InventoryOperationResult {
    const player = this.world.entities.players.get(playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    const inventory = this.getPlayerInventory(playerId);
    if (!inventory) {
      return { success: false, error: 'Inventory not found' };
    }

    const itemDef = this.getItemDefinition(itemId);
    if (!itemDef) {
      return { success: false, error: 'Invalid item ID' };
    }

    // Check if item is stackable or we should stack with existing
    if (itemDef.stackable || noted) {
      return this.addStackableItem(inventory, itemId, quantity, noted);
    } else {
      return this.addNonStackableItem(inventory, itemId, quantity);
    }
  }

  /**
   * Remove item from player inventory
   */
  removeItem(playerId: string, itemId: number, quantity: number): InventoryOperationResult {
    const inventory = this.getPlayerInventory(playerId);
    if (!inventory) {
      return { success: false, error: 'Inventory not found' };
    }

    const itemDef = this.getItemDefinition(itemId);
    if (!itemDef) {
      return { success: false, error: 'Invalid item ID' };
    }

    if (itemDef.stackable) {
      return this.removeStackableItem(inventory, itemId, quantity);
    } else {
      return this.removeNonStackableItem(inventory, itemId, quantity);
    }
  }

  /**
   * Equip item from inventory
   */
  equipItem(playerId: string, inventorySlot: number): InventoryOperationResult {
    const inventory = this.getPlayerInventory(playerId);
    if (!inventory) {
      return { success: false, error: 'Inventory not found' };
    }

    const itemStack = inventory.items[inventorySlot];
    if (!itemStack) {
      return { success: false, error: 'No item in slot' };
    }

    const itemDef = this.getItemDefinition(itemStack.itemId);
    if (!itemDef || !itemDef.equipable || !itemDef.equipmentSlot) {
      return { success: false, error: 'Item cannot be equipped' };
    }

    // Check requirements
    const meetsRequirements = this.checkEquipmentRequirements(playerId, itemDef);
    if (!meetsRequirements.success) {
      return meetsRequirements;
    }

    const equipSlot = itemDef.equipmentSlot;

    // Handle existing equipped item
    const existingEquipped = inventory.equipment[equipSlot];
    if (existingEquipped) {
      // Find free inventory slot for current equipped item
      const freeSlot = this.findFreeInventorySlot(inventory);
      if (freeSlot === -1) {
        return { success: false, error: 'Inventory full - cannot unequip current item' };
      }
      
      // Move equipped item to inventory
      inventory.items[freeSlot] = existingEquipped;
    }

    // Equip new item
    inventory.equipment[equipSlot] = { ...itemStack };
    
    // Remove from inventory (only 1 item for equipment)
    if (itemStack.quantity > 1) {
      itemStack.quantity -= 1;
    } else {
      inventory.items[inventorySlot] = null;
    }

    // Update computed stats
    this.updateInventoryStats(inventory);
    this.updateCombatBonuses(playerId);

    this.logTransaction({
      type: 'equip',
      itemId: itemStack.itemId,
      quantity: 1,
      fromSlot: inventorySlot,
      timestamp: Date.now(),
      source: 'player_action',
    });

    return { success: true, itemsAffected: [itemStack] };
  }

  /**
   * Unequip item to inventory
   */
  unequipItem(playerId: string, equipmentSlot: EquipmentSlot): InventoryOperationResult {
    const inventory = this.getPlayerInventory(playerId);
    if (!inventory) {
      return { success: false, error: 'Inventory not found' };
    }

    const equippedItem = inventory.equipment[equipmentSlot];
    if (!equippedItem) {
      return { success: false, error: 'No item equipped in slot' };
    }

    // Find free inventory slot
    const freeSlot = this.findFreeInventorySlot(inventory);
    if (freeSlot === -1) {
      return { success: false, error: 'Inventory full' };
    }

    // Move to inventory
    inventory.items[freeSlot] = { ...equippedItem };
    inventory.equipment[equipmentSlot] = null;

    // Update computed stats
    this.updateInventoryStats(inventory);
    this.updateCombatBonuses(playerId);

    this.logTransaction({
      type: 'unequip',
      itemId: equippedItem.itemId,
      quantity: equippedItem.quantity,
      toSlot: freeSlot,
      timestamp: Date.now(),
      source: 'player_action',
    });

    return { success: true, itemsAffected: [equippedItem] };
  }

  /**
   * Use/consume item
   */
  useItem(playerId: string, inventorySlot: number): InventoryOperationResult {
    const inventory = this.getPlayerInventory(playerId);
    if (!inventory) {
      return { success: false, error: 'Inventory not found' };
    }

    const itemStack = inventory.items[inventorySlot];
    if (!itemStack) {
      return { success: false, error: 'No item in slot' };
    }

    const itemDef = this.getItemDefinition(itemStack.itemId);
    if (!itemDef) {
      return { success: false, error: 'Invalid item' };
    }

    // Handle different item types
    if (itemDef.edible) {
      return this.consumeFood(playerId, inventorySlot);
    } else if (itemDef.type === 'consumable') {
      return this.consumePotion(playerId, inventorySlot);
    } else {
      return { success: false, error: 'Item cannot be used' };
    }
  }

  /**
   * Private helper methods
   */
  private addStackableItem(inventory: InventoryComponent, itemId: number, quantity: number, noted: boolean): InventoryOperationResult {
    // Find existing stack
    for (let i = 0; i < inventory.items.length; i++) {
      const item = inventory.items[i];
      if (item && item.itemId === itemId && item.noted === noted) {
        // Add to existing stack
        const newQuantity = Math.min(item.quantity + quantity, INVENTORY_CONSTANTS.MAX_STACK_SIZE);
        const actualAdded = newQuantity - item.quantity;
        item.quantity = newQuantity;
        
        this.updateInventoryStats(inventory);
        
        return { 
          success: true, 
          itemsAffected: [item],
          slotsUsed: [i]
        };
      }
    }

    // Create new stack
    const freeSlot = this.findFreeInventorySlot(inventory);
    if (freeSlot === -1) {
      return { success: false, error: 'Inventory full' };
    }

    const newStack: ItemStack = {
      itemId,
      quantity,
      noted,
    };

    inventory.items[freeSlot] = newStack;
    this.updateInventoryStats(inventory);

    return { 
      success: true, 
      itemsAffected: [newStack],
      slotsUsed: [freeSlot]
    };
  }

  private addNonStackableItem(inventory: InventoryComponent, itemId: number, quantity: number): InventoryOperationResult {
    const freeSlots = this.getFreeSlots(inventory);
    if (freeSlots.length < quantity) {
      return { 
        success: false, 
        error: `Not enough inventory space. Need ${quantity}, have ${freeSlots.length}` 
      };
    }

    const itemsAdded: ItemStack[] = [];
    const slotsUsed: number[] = [];

    for (let i = 0; i < quantity; i++) {
      const slot = freeSlots[i];
      const newItem: ItemStack = {
        itemId,
        quantity: 1,
        noted: false,
      };
      
      inventory.items[slot] = newItem;
      itemsAdded.push(newItem);
      slotsUsed.push(slot);
    }

    this.updateInventoryStats(inventory);

    return { 
      success: true, 
      itemsAffected: itemsAdded,
      slotsUsed 
    };
  }

  private removeStackableItem(inventory: InventoryComponent, itemId: number, quantity: number): InventoryOperationResult {
    let remaining = quantity;
    const affectedItems: ItemStack[] = [];

    for (let i = 0; i < inventory.items.length && remaining > 0; i++) {
      const item = inventory.items[i];
      if (item && item.itemId === itemId) {
        const removeFromThis = Math.min(item.quantity, remaining);
        item.quantity -= removeFromThis;
        remaining -= removeFromThis;
        
        affectedItems.push({ ...item });
        
        if (item.quantity === 0) {
          inventory.items[i] = null;
        }
      }
    }

    if (remaining > 0) {
      return { 
        success: false, 
        error: `Not enough items. Need ${quantity}, found ${quantity - remaining}` 
      };
    }

    this.updateInventoryStats(inventory);
    return { success: true, itemsAffected: affectedItems };
  }

  private removeNonStackableItem(inventory: InventoryComponent, itemId: number, quantity: number): InventoryOperationResult {
    let found = 0;
    const affectedSlots: number[] = [];

    // Count available items
    for (let i = 0; i < inventory.items.length; i++) {
      const item = inventory.items[i];
      if (item && item.itemId === itemId) {
        found++;
        affectedSlots.push(i);
        if (found >= quantity) break;
      }
    }

    if (found < quantity) {
      return { 
        success: false, 
        error: `Not enough items. Need ${quantity}, found ${found}` 
      };
    }

    // Remove items
    const affectedItems: ItemStack[] = [];
    for (let i = 0; i < quantity; i++) {
      const slot = affectedSlots[i];
      const item = inventory.items[slot];
      if (item) {
        affectedItems.push({ ...item });
        inventory.items[slot] = null;
      }
    }

    this.updateInventoryStats(inventory);
    return { success: true, itemsAffected: affectedItems };
  }

  private consumeFood(playerId: string, inventorySlot: number): InventoryOperationResult {
    const inventory = this.getPlayerInventory(playerId);
    if (!inventory) {
      return { success: false, error: 'Inventory not found' };
    }

    const itemStack = inventory.items[inventorySlot];
    if (!itemStack) {
      return { success: false, error: 'No item in slot' };
    }

    const itemDef = this.getItemDefinition(itemStack.itemId);
    if (!itemDef?.special?.healAmount) {
      return { success: false, error: 'Item cannot heal' };
    }

    // Get player stats
    const stats = this.getPlayerStats(playerId);
    if (!stats) {
      return { success: false, error: 'Player stats not found' };
    }

    // Apply healing
    const healAmount = itemDef.special.healAmount;
    const actualHeal = Math.min(healAmount, stats.hitpoints.max - stats.hitpoints.current);
    stats.hitpoints.current += actualHeal;

    // Consume item
    itemStack.quantity -= 1;
    if (itemStack.quantity === 0) {
      inventory.items[inventorySlot] = null;
    }

    this.updateInventoryStats(inventory);

    // Emit healing event
    this.world.events.emit('rpg:player_healed', {
      playerId,
      healAmount: actualHeal,
      itemUsed: itemDef.name,
    });

    return { 
      success: true, 
      itemsAffected: [itemStack],
    };
  }

  private consumePotion(playerId: string, inventorySlot: number): InventoryOperationResult {
    // TODO: Implement potion effects (stat boosts, etc.)
    return { success: false, error: 'Potions not yet implemented' };
  }

  private checkEquipmentRequirements(playerId: string, itemDef: ItemDefinition): InventoryOperationResult {
    if (!itemDef.requirements?.skills) {
      return { success: true };
    }

    const stats = this.getPlayerStats(playerId);
    if (!stats) {
      return { success: false, error: 'Player stats not found' };
    }

    for (const [skill, requiredLevel] of Object.entries(itemDef.requirements.skills)) {
      const playerLevel = (stats as any)[skill]?.level || 1;
      if (playerLevel < requiredLevel) {
        return { 
          success: false, 
          error: `Requires ${skill} level ${requiredLevel} (you have ${playerLevel})` 
        };
      }
    }

    return { success: true };
  }

  private updateCombatBonuses(playerId: string): void {
    const stats = this.getPlayerStats(playerId);
    const inventory = this.getPlayerInventory(playerId);
    
    if (!stats || !inventory) return;

    // Reset combat bonuses
    stats.combatBonuses = {
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
      prayerBonus: 0,
    };

    // Sum bonuses from equipped items
    for (const item of Object.values(inventory.equipment)) {
      if (!item) continue;
      
      const itemDef = this.getItemDefinition(item.itemId);
      if (!itemDef?.combatBonuses) continue;

      for (const [bonus, value] of Object.entries(itemDef.combatBonuses)) {
        (stats.combatBonuses as any)[bonus] += value;
      }
    }
  }

  private updateInventoryStats(inventory: InventoryComponent): void {
    let usedSlots = 0;
    let totalWeight = 0;

    // Count used slots and calculate weight
    for (const item of inventory.items) {
      if (item) {
        usedSlots++;
        const itemDef = this.getItemDefinition(item.itemId);
        if (itemDef) {
          totalWeight += itemDef.weight * item.quantity;
        }
      }
    }

    // Add equipment weight
    for (const item of Object.values(inventory.equipment)) {
      if (item) {
        const itemDef = this.getItemDefinition(item.itemId);
        if (itemDef) {
          totalWeight += itemDef.weight * item.quantity;
        }
      }
    }

    inventory.usedSlots = usedSlots;
    inventory.freeSlots = inventory.maxSlots - usedSlots;
    inventory.totalWeight = totalWeight;
  }

  private findFreeInventorySlot(inventory: InventoryComponent): number {
    for (let i = 0; i < inventory.items.length; i++) {
      if (!inventory.items[i]) {
        return i;
      }
    }
    return -1;
  }

  private getFreeSlots(inventory: InventoryComponent): number[] {
    const freeSlots: number[] = [];
    for (let i = 0; i < inventory.items.length; i++) {
      if (!inventory.items[i]) {
        freeSlots.push(i);
      }
    }
    return freeSlots;
  }

  private getPlayerInventory(playerId: string): InventoryComponent | null {
    const player = this.world.entities.players.get(playerId);
    return (player?.data as any)?.inventory || null;
  }

  private setPlayerInventory(playerId: string, inventory: InventoryComponent): void {
    const player = this.world.entities.players.get(playerId);
    if (player) {
      if (!player.data) player.data = {};
      (player.data as any).inventory = inventory;
    }
  }

  private getPlayerStats(playerId: string): StatsComponent | null {
    const player = this.world.entities.players.get(playerId);
    return (player?.data as any)?.stats || null;
  }

  private getItemDefinition(itemId: number): ItemDefinition | null {
    return this.itemDefinitions.get(itemId) || null;
  }

  private logTransaction(transaction: ItemTransaction): void {
    this.transactionLog.push(transaction);
    // Keep only last 1000 transactions
    if (this.transactionLog.length > 1000) {
      this.transactionLog.shift();
    }
  }

  private initializeBaseItems(): void {
    // Initialize basic RuneScape items for testing
    const basicItems: ItemDefinition[] = [
      // Coins
      {
        id: 995,
        name: 'Coins',
        examine: 'Lovely money!',
        value: 1,
        stackable: true,
        noted: false,
        tradeable: true,
        equipable: false,
        edible: false,
        weight: 0,
        type: 'misc',
        rarity: 'common',
      },
      
      // Bronze sword
      {
        id: 1277,
        name: 'Bronze sword',
        examine: 'A bronze sword.',
        value: 1,
        stackable: false,
        noted: false,
        tradeable: true,
        equipable: true,
        edible: false,
        weight: 2.26,
        type: 'weapon',
        rarity: 'common',
        equipmentSlot: 'weapon',
        weaponType: 'melee',
        requirements: {
          skills: { attack: 1 },
        },
        combatBonuses: {
          attackStab: 4,
          attackSlash: 4,
          attackCrush: -2,
          attackMagic: 0,
          attackRanged: 0,
          defenseStab: 0,
          defenseSlash: 0,
          defenseCrush: 0,
          defenseMagic: 0,
          defenseRanged: 0,
          meleeStrength: 3,
          rangedStrength: 0,
          magicDamage: 0,
          prayer: 0,
        },
        special: {
          attackSpeed: 4,
        },
      },
      
      // Bread (food)
      {
        id: 2309,
        name: 'Bread',
        examine: 'Bread. The staple diet.',
        value: 10,
        stackable: false,
        noted: false,
        tradeable: true,
        equipable: false,
        edible: true,
        weight: 0.5,
        type: 'consumable',
        rarity: 'common',
        special: {
          healAmount: 5,
        },
      },
    ];

    // Add items to database
    basicItems.forEach(item => {
      this.itemDefinitions.set(item.id, item);
    });

    logger.info(`[InventorySystem] Loaded ${basicItems.length} base items`);
  }

  // Event handlers
  private handleAddItem(event: any): void {
    const { playerId, itemId, quantity, noted } = event;
    this.addItem(playerId, itemId, quantity, noted);
  }

  private handleRemoveItem(event: any): void {
    const { playerId, itemId, quantity } = event;
    this.removeItem(playerId, itemId, quantity);
  }

  private handleEquipItem(event: any): void {
    const { playerId, inventorySlot } = event;
    this.equipItem(playerId, inventorySlot);
  }

  private handleUnequipItem(event: any): void {
    const { playerId, equipmentSlot } = event;
    this.unequipItem(playerId, equipmentSlot);
  }

  private handleDropItem(event: any): void {
    // TODO: Implement item dropping
    logger.info('[InventorySystem] Drop item requested (not yet implemented)');
  }

  private handleUseItem(event: any): void {
    const { playerId, inventorySlot } = event;
    this.useItem(playerId, inventorySlot);
  }

  // Public API methods
  getInventory(playerId: string): InventoryComponent | null {
    return this.getPlayerInventory(playerId);
  }

  initializePlayerInventory(playerId: string): void {
    const inventory = this.createInitialInventory();
    this.setPlayerInventory(playerId, inventory);
  }
}