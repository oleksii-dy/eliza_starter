/**
 * NPC System Tests
 * ================
 * Tests for RuneScape NPC mechanics implementation
 */

import { describe, expect, it, beforeEach, mock, spyOn } from 'bun:test';
import { NPCSystem } from '../rpg/systems/NPCSystem';
import { createMockWorld } from './test-utils';

describe('NPCSystem', () => {
  let npcSystem: NPCSystem;
  let mockWorld: any;
  let mockPlayer: any;

  beforeEach(() => {
    mockWorld = createMockWorld();
    
    // Set up mock world events
    mockWorld.events = {
      on: mock(),
      off: mock(),
      emit: mock(),
    };

    // Add systems array to world
    mockWorld.systems = [];

    // Create mock player with stats and inventory
    mockPlayer = {
      data: {
        stats: {
          attack: { level: 40, currentXp: 30000, maxLevel: 99 },
          strength: { level: 35, currentXp: 25000, maxLevel: 99 },
          defence: { level: 30, currentXp: 20000, maxLevel: 99 },
          hitpoints: { level: 45, currentXp: 35000, maxLevel: 99 },
          magic: { level: 25, currentXp: 15000, maxLevel: 99 }
        },
        inventory: {
          items: [
            { itemId: 995, quantity: 1000 }, // Coins
            { itemId: 1511, quantity: 50 }, // Logs
            null, null, null, null, null, null,
            null, null, null, null, null, null, null, null,
            null, null, null, null, null, null, null, null
          ],
          equipment: {
            weapon: null,
            helm: null,
            body: null,
            legs: null,
            feet: null,
            gloves: null,
            shield: null,
            cape: null,
            neck: null,
            ring: null,
            ammo: null
          }
        }
      }
    };

    // Add player to mock world
    mockWorld.entities.players = new Map();
    mockWorld.entities.players.set('test-player', mockPlayer);

    npcSystem = new NPCSystem(mockWorld);
  });

  describe('System Initialization', () => {
    it('should initialize with correct name and enabled state', () => {
      expect(npcSystem.name).toBe('NPCSystem');
      expect(npcSystem.enabled).toBe(true);
    });

    it('should load NPC types', () => {
      const npcTypes = npcSystem.getNPCTypes();

      expect(npcTypes.size).toBeGreaterThan(0);
      
      // Check for specific NPC types
      expect(npcTypes.has('duke_horacio')).toBe(true);
      expect(npcTypes.has('shop_keeper')).toBe(true);
      expect(npcTypes.has('combat_instructor')).toBe(true);
      expect(npcTypes.has('hans')).toBe(true);
    });

    it('should load dialogue trees', () => {
      const dialogueTrees = npcSystem.getDialogueTrees();

      expect(dialogueTrees.size).toBeGreaterThan(0);
      
      // Check for specific dialogue trees
      expect(dialogueTrees.has('duke_horacio_dialogue')).toBe(true);
      expect(dialogueTrees.has('shop_keeper_dialogue')).toBe(true);
      expect(dialogueTrees.has('combat_instructor_dialogue')).toBe(true);
      expect(dialogueTrees.has('hans_dialogue')).toBe(true);
    });

    it('should load shops', () => {
      const shops = npcSystem.getShops();

      expect(shops.size).toBeGreaterThan(0);
      
      // Check for Lumbridge General Store
      expect(shops.has('lumbridge_general_store')).toBe(true);
      
      const generalStore = shops.get('lumbridge_general_store');
      expect(generalStore?.name).toBe('Lumbridge General Store');
      expect(generalStore?.items.length).toBeGreaterThan(0);
    });

    it('should set up event listeners during init', async () => {
      await npcSystem.init();
      
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:talk_to_npc', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:choose_dialogue_option', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:open_shop', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:buy_from_shop', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:sell_to_shop', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:spawn_npc', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:despawn_npc', expect.any(Function));
    });

    it('should spawn NPCs at spawn points', async () => {
      await npcSystem.init();
      
      const activeNPCs = npcSystem.getActiveNPCs();
      expect(activeNPCs.size).toBeGreaterThan(0);
      
      // Check that NPCs were spawned
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:npc_spawned', expect.objectContaining({
        npcId: expect.any(String),
        npcTypeId: expect.any(String),
        npcName: expect.any(String),
        position: expect.any(Object)
      }));
    });
  });

  describe('NPC Types', () => {
    it('should have correct Duke Horacio NPC', () => {
      const npcTypes = npcSystem.getNPCTypes();
      const duke = npcTypes.get('duke_horacio');
      
      expect(duke).toBeDefined();
      expect(duke!.name).toBe('Duke Horacio');
      expect(duke!.role).toBe('quest_giver');
      expect(duke!.location).toBe('Lumbridge Castle');
      expect(duke!.hasDialogue).toBe(true);
      expect(duke!.hasShop).toBe(false);
      expect(duke!.dialogueTreeId).toBe('duke_horacio_dialogue');
    });

    it('should have correct Shop Keeper NPC', () => {
      const npcTypes = npcSystem.getNPCTypes();
      const shopKeeper = npcTypes.get('shop_keeper');
      
      expect(shopKeeper).toBeDefined();
      expect(shopKeeper!.name).toBe('Shop keeper');
      expect(shopKeeper!.role).toBe('merchant');
      expect(shopKeeper!.location).toBe('Lumbridge General Store');
      expect(shopKeeper!.hasDialogue).toBe(true);
      expect(shopKeeper!.hasShop).toBe(true);
      expect(shopKeeper!.shopId).toBe('lumbridge_general_store');
    });

    it('should have correct Combat Instructor NPC', () => {
      const npcTypes = npcSystem.getNPCTypes();
      const instructor = npcTypes.get('combat_instructor');
      
      expect(instructor).toBeDefined();
      expect(instructor!.name).toBe('Combat Instructor');
      expect(instructor!.role).toBe('trainer');
      expect(instructor!.location).toBe('Lumbridge Combat Academy');
      expect(instructor!.hasDialogue).toBe(true);
      expect(instructor!.hasShop).toBe(false);
    });

    it('should have correct Hans NPC', () => {
      const npcTypes = npcSystem.getNPCTypes();
      const hans = npcTypes.get('hans');
      
      expect(hans).toBeDefined();
      expect(hans!.name).toBe('Hans');
      expect(hans!.role).toBe('citizen');
      expect(hans!.location).toBe('Lumbridge');
      expect(hans!.hasDialogue).toBe(true);
      expect(hans!.hasShop).toBe(false);
    });

    it('should have different AI behaviors', () => {
      const npcTypes = npcSystem.getNPCTypes();
      
      for (const npcType of npcTypes.values()) {
        expect(['stationary', 'wandering', 'patrolling', 'working']).toContain(npcType.aiBehavior);
      }
    });
  });

  describe('NPC Spawning', () => {
    beforeEach(async () => {
      await npcSystem.init();
    });

    it('should successfully spawn NPC', () => {
      const position = { x: 50, y: 0, z: 50 };
      const npcId = npcSystem.spawnNPC('duke_horacio', position);
      
      expect(npcId).toBeDefined();
      expect(typeof npcId).toBe('string');
      
      const npc = npcSystem.getNPC(npcId!);
      expect(npc).toBeDefined();
      expect(npc!.typeId).toBe('duke_horacio');
      expect(npc!.position).toEqual(position);
      expect(npc!.state).toBe('idle');
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:npc_spawned', {
        npcId: npcId,
        npcTypeId: 'duke_horacio',
        npcName: 'Duke Horacio',
        position,
        role: 'quest_giver'
      });
    });

    it('should fail to spawn unknown NPC type', () => {
      const position = { x: 50, y: 0, z: 50 };
      const npcId = npcSystem.spawnNPC('unknown_npc', position);
      
      expect(npcId).toBeNull();
    });

    it('should track spawn time', () => {
      const beforeTime = Date.now();
      const position = { x: 50, y: 0, z: 50 };
      const npcId = npcSystem.spawnNPC('duke_horacio', position);
      const afterTime = Date.now();
      
      const npc = npcSystem.getNPC(npcId!);
      expect(npc!.spawnTime).toBeGreaterThanOrEqual(beforeTime);
      expect(npc!.spawnTime).toBeLessThanOrEqual(afterTime);
    });

    it('should assign unique NPC IDs', () => {
      const position = { x: 50, y: 0, z: 50 };
      const npcId1 = npcSystem.spawnNPC('duke_horacio', position);
      const npcId2 = npcSystem.spawnNPC('duke_horacio', position);
      
      expect(npcId1).not.toBe(npcId2);
    });
  });

  describe('NPC Despawning', () => {
    beforeEach(async () => {
      await npcSystem.init();
    });

    it('should successfully despawn NPC', () => {
      const position = { x: 50, y: 0, z: 50 };
      const npcId = npcSystem.spawnNPC('duke_horacio', position)!;
      
      const result = npcSystem.despawnNPC(npcId);
      expect(result).toBe(true);
      
      const npc = npcSystem.getNPC(npcId);
      expect(npc).toBeNull();
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:npc_despawned', {
        npcId,
        position
      });
    });

    it('should fail to despawn non-existent NPC', () => {
      const result = npcSystem.despawnNPC('non-existent-npc');
      expect(result).toBe(false);
    });
  });

  describe('Dialogue System', () => {
    beforeEach(async () => {
      await npcSystem.init();
    });

    it('should start dialogue with NPC', () => {
      const position = { x: 50, y: 0, z: 50 };
      const npcId = npcSystem.spawnNPC('duke_horacio', position)!;
      
      const result = npcSystem.talkToNPC('test-player', npcId);
      expect(result).toBe(true);
      
      const activeDialogues = npcSystem.getActiveDialogues();
      const playerDialogue = activeDialogues.get('test-player');
      
      expect(playerDialogue).toBeDefined();
      expect(playerDialogue!.npcId).toBe(npcId);
      expect(playerDialogue!.dialogueTreeId).toBe('duke_horacio_dialogue');
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:dialogue_started', {
        playerId: 'test-player',
        npcId,
        npcName: 'Duke Horacio',
        dialogueTreeId: 'duke_horacio_dialogue'
      });
    });

    it('should fail to talk to non-existent NPC', () => {
      const result = npcSystem.talkToNPC('test-player', 'non-existent-npc');
      expect(result).toBe(false);
    });

    it('should fail to talk to NPC without dialogue', () => {
      // Mock an NPC type without dialogue by modifying the private npcTypes directly
      const npcTypes = (npcSystem as any).npcTypes as Map<string, any>;
      const originalNPC = npcTypes.get('duke_horacio')!;
      const npcWithoutDialogue = { ...originalNPC, hasDialogue: false, dialogueTreeId: '' };
      npcTypes.set('duke_horacio', npcWithoutDialogue);
      
      const position = { x: 50, y: 0, z: 50 };
      const npcId = npcSystem.spawnNPC('duke_horacio', position)!;
      
      const result = npcSystem.talkToNPC('test-player', npcId);
      expect(result).toBe(false);
      
      // Restore original NPC
      npcTypes.set('duke_horacio', originalNPC);
    });

    it('should choose dialogue option', () => {
      const position = { x: 50, y: 0, z: 50 };
      const npcId = npcSystem.spawnNPC('duke_horacio', position)!;
      
      // Start dialogue first
      npcSystem.talkToNPC('test-player', npcId);
      
      const result = npcSystem.chooseDialogueOption('test-player', '0');
      expect(result).toBe(true);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:dialogue_option_chosen', expect.objectContaining({
        playerId: 'test-player',
        npcId,
        optionId: '0'
      }));
    });

    it('should end dialogue', () => {
      const position = { x: 50, y: 0, z: 50 };
      const npcId = npcSystem.spawnNPC('duke_horacio', position)!;
      
      // Start dialogue first
      npcSystem.talkToNPC('test-player', npcId);
      
      const result = npcSystem.endDialogue('test-player');
      expect(result).toBe(true);
      
      const activeDialogues = npcSystem.getActiveDialogues();
      expect(activeDialogues.has('test-player')).toBe(false);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:dialogue_ended', {
        playerId: 'test-player',
        npcId
      });
    });
  });

  describe('Shop System', () => {
    beforeEach(async () => {
      await npcSystem.init();
    });

    it('should open shop with merchant NPC', () => {
      const position = { x: 50, y: 0, z: 50 };
      const npcId = npcSystem.spawnNPC('shop_keeper', position)!;
      
      const result = npcSystem.openShop('test-player', npcId);
      expect(result).toBe(true);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:shop_opened', {
        playerId: 'test-player',
        npcId,
        shopId: 'lumbridge_general_store',
        shopName: 'Lumbridge General Store',
        items: expect.any(Array)
      });
    });

    it('should fail to open shop with non-merchant NPC', () => {
      const position = { x: 50, y: 0, z: 50 };
      const npcId = npcSystem.spawnNPC('duke_horacio', position)!;
      
      const result = npcSystem.openShop('test-player', npcId);
      expect(result).toBe(false);
    });

    it('should buy item from shop', () => {
      const position = { x: 50, y: 0, z: 50 };
      const npcId = npcSystem.spawnNPC('shop_keeper', position)!;
      
      // Open shop first
      npcSystem.openShop('test-player', npcId);
      
      const result = npcSystem.buyFromShopByName('test-player', npcId, 'bread', 2);
      expect(result).toBe(true);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:shop_purchase', expect.objectContaining({
        playerId: 'test-player',
        itemName: 'Bread',
        quantity: 2,
        totalCost: expect.any(Number)
      }));
    });

    it('should fail to buy non-existent item', () => {
      const position = { x: 50, y: 0, z: 50 };
      const npcId = npcSystem.spawnNPC('shop_keeper', position)!;
      
      const result = npcSystem.buyFromShopByName('test-player', npcId, 'dragon_sword', 1);
      expect(result).toBe(false);
    });

    it('should sell item to shop', () => {
      const position = { x: 50, y: 0, z: 50 };
      const npcId = npcSystem.spawnNPC('shop_keeper', position)!;
      
      const result = npcSystem.sellToShopByName('test-player', npcId, 'logs', 10);
      expect(result).toBe(true);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:shop_sale', expect.objectContaining({
        playerId: 'test-player',
        itemName: 'Logs',
        quantity: 10,
        totalValue: expect.any(Number)
      }));
    });

    it('should fail to sell item player doesn\'t have', () => {
      const position = { x: 50, y: 0, z: 50 };
      const npcId = npcSystem.spawnNPC('shop_keeper', position)!;
      
      const result = npcSystem.sellToShopByName('test-player', npcId, 'dragon_sword', 1);
      expect(result).toBe(false);
    });
  });

  describe('NPC AI and Behavior', () => {
    beforeEach(async () => {
      await npcSystem.init();
    });

    it('should process NPC AI during tick', () => {
      const position = { x: 50, y: 0, z: 50 };
      const npcId = npcSystem.spawnNPC('hans', position)!;
      
      // Simulate AI tick
      npcSystem.tick(1000);
      
      // NPC should still exist and be in a valid state
      const npc = npcSystem.getNPC(npcId);
      expect(npc).toBeDefined();
      expect(['idle', 'wandering', 'working', 'patrolling']).toContain(npc!.state);
    });

    it('should handle greeting opportunities', () => {
      const position = { x: 50, y: 0, z: 50 };
      const npcId = npcSystem.spawnNPC('hans', position)!;
      
      // Process multiple ticks to trigger greeting check
      for (let i = 0; i < 5; i++) {
        npcSystem.tick(500);
      }
      
      // NPC should still be functioning normally
      const npc = npcSystem.getNPC(npcId);
      expect(npc).toBeDefined();
    });

    it('should handle different AI behaviors', () => {
      const npcTypes = npcSystem.getNPCTypes();
      
      // Spawn NPCs with different behaviors
      const duke = npcSystem.spawnNPC('duke_horacio', { x: 50, y: 0, z: 50 })!;
      const hans = npcSystem.spawnNPC('hans', { x: 60, y: 0, z: 60 })!;
      
      // Process AI ticks
      npcSystem.tick(1000);
      
      // All NPCs should remain valid
      expect(npcSystem.getNPC(duke)).toBeDefined();
      expect(npcSystem.getNPC(hans)).toBeDefined();
    });
  });

  describe('Query Methods', () => {
    beforeEach(async () => {
      await npcSystem.init();
    });

    it('should get NPCs by type', () => {
      // Get initial counts
      const initialDukes = npcSystem.getNPCsByType('duke_horacio').length;
      const initialHans = npcSystem.getNPCsByType('hans').length;
      
      // Spawn additional NPCs
      const position1 = { x: 50, y: 0, z: 50 };
      const position2 = { x: 60, y: 0, z: 60 };
      
      npcSystem.spawnNPC('duke_horacio', position1);
      npcSystem.spawnNPC('duke_horacio', position2);
      npcSystem.spawnNPC('hans', position1);
      
      const dukes = npcSystem.getNPCsByType('duke_horacio');
      expect(dukes.length).toBe(initialDukes + 2);
      expect(dukes.every(npc => npc.typeId === 'duke_horacio')).toBe(true);
      
      const hanses = npcSystem.getNPCsByType('hans');
      expect(hanses.length).toBe(initialHans + 1);
      expect(hanses.every(npc => npc.typeId === 'hans')).toBe(true);
    });

    it('should get NPCs by name', () => {
      const position = { x: 50, y: 0, z: 50 };
      npcSystem.spawnNPC('duke_horacio', position);
      npcSystem.spawnNPC('hans', position);
      
      const dukes = npcSystem.getNPCsByName('Duke Horacio');
      expect(dukes.length).toBeGreaterThan(0);
      expect(dukes.every(npc => npc.typeId === 'duke_horacio')).toBe(true);
      
      const hanses = npcSystem.getNPCsByName('Hans');
      expect(hanses.length).toBeGreaterThan(0);
      expect(hanses.every(npc => npc.typeId === 'hans')).toBe(true);
    });

    it('should get merchant NPCs', () => {
      const position = { x: 50, y: 0, z: 50 };
      npcSystem.spawnNPC('shop_keeper', position);
      npcSystem.spawnNPC('duke_horacio', position);
      
      const merchants = npcSystem.getMerchantNPCs();
      expect(merchants.length).toBeGreaterThan(0);
      expect(merchants.every(npc => npc.typeId === 'shop_keeper')).toBe(true);
    });

    it('should get active NPCs', () => {
      const activeNPCs = npcSystem.getActiveNPCs();
      expect(activeNPCs.size).toBeGreaterThan(0);
      
      // All returned NPCs should be valid
      for (const npc of activeNPCs.values()) {
        expect(npc.id).toBeDefined();
        expect(npc.typeId).toBeDefined();
        expect(npc.position).toBeDefined();
      }
    });
  });

  describe('Validation Methods', () => {
    beforeEach(async () => {
      await npcSystem.init();
    });

    it('should validate NPC talk capability correctly', () => {
      const position = { x: 50, y: 0, z: 50 };
      const npcId = npcSystem.spawnNPC('duke_horacio', position)!;
      
      // Valid case
      const validResult = npcSystem.canTalkToNPC('test-player', npcId);
      expect(validResult.canTalk).toBe(true);
      
      // Non-existent NPC
      const nonExistentResult = npcSystem.canTalkToNPC('test-player', 'fake-npc');
      expect(nonExistentResult.canTalk).toBe(false);
      expect(nonExistentResult.reason).toContain('not found');
    });

    it('should validate shop access correctly', () => {
      const position = { x: 50, y: 0, z: 50 };
      const merchantId = npcSystem.spawnNPC('shop_keeper', position)!;
      const dukeId = npcSystem.spawnNPC('duke_horacio', position)!;
      
      // Valid merchant
      const validResult = npcSystem.canOpenShop('test-player', merchantId);
      expect(validResult.canOpen).toBe(true);
      
      // Non-merchant NPC
      const invalidResult = npcSystem.canOpenShop('test-player', dukeId);
      expect(invalidResult.canOpen).toBe(false);
      expect(invalidResult.reason).toContain('shop');
      
      // Non-existent NPC
      const nonExistentResult = npcSystem.canOpenShop('test-player', 'fake-npc');
      expect(nonExistentResult.canOpen).toBe(false);
      expect(nonExistentResult.reason).toContain('not found');
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await npcSystem.init();
    });

    it('should handle talk to NPC event', () => {
      const talkToNPCSpy = spyOn(npcSystem, 'talkToNPC');
      
      (npcSystem as any).handleTalkToNPC({
        playerId: 'test-player',
        npcId: 'test-npc'
      });
      
      expect(talkToNPCSpy).toHaveBeenCalledWith('test-player', 'test-npc');
    });

    it('should handle spawn NPC event', () => {
      const spawnNPCSpy = spyOn(npcSystem, 'spawnNPC');
      
      const position = { x: 50, y: 0, z: 50 };
      (npcSystem as any).handleSpawnNPC({
        npcTypeId: 'duke_horacio',
        position,
        spawnPointId: 'test-spawn'
      });
      
      expect(spawnNPCSpy).toHaveBeenCalledWith('duke_horacio', position, 'test-spawn');
    });

    it('should handle despawn NPC event', () => {
      const despawnNPCSpy = spyOn(npcSystem, 'despawnNPC');
      
      (npcSystem as any).handleDespawnNPC({
        npcId: 'test-npc'
      });
      
      expect(despawnNPCSpy).toHaveBeenCalledWith('test-npc');
    });

    it('should handle buy from shop event', () => {
      const buyFromShopSpy = spyOn(npcSystem, 'buyFromShopByName');
      
      (npcSystem as any).handleBuyFromShop({
        playerId: 'test-player',
        npcId: 'test-npc',
        itemName: 'bread',
        quantity: 2
      });
      
      expect(buyFromShopSpy).toHaveBeenCalledWith('test-player', 'test-npc', 'bread', 2);
    });

    it('should handle sell to shop event', () => {
      const sellToShopSpy = spyOn(npcSystem, 'sellToShopByName');
      
      (npcSystem as any).handleSellToShop({
        playerId: 'test-player',
        npcId: 'test-npc',
        itemName: 'logs',
        quantity: 10
      });
      
      expect(sellToShopSpy).toHaveBeenCalledWith('test-player', 'test-npc', 'logs', 10);
    });
  });

  describe('System Cleanup', () => {
    it('should clean up event listeners on destroy', () => {
      npcSystem.destroy();
      
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:talk_to_npc');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:choose_dialogue_option');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:open_shop');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:buy_from_shop');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:sell_to_shop');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:spawn_npc');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:despawn_npc');
    });
  });
});