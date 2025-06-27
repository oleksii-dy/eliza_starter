/**
 * Woodcutting System Tests
 * ========================
 * Tests for RuneScape woodcutting mechanics implementation
 */

import { describe, expect, it, beforeEach, mock, spyOn } from 'bun:test';
import { WoodcuttingSystem } from '../rpg/systems/WoodcuttingSystem';
import { createMockWorld } from './test-utils';
import { GATHERING_CONSTANTS } from '../rpg/types/gathering';

describe('WoodcuttingSystem', () => {
  let woodcuttingSystem: WoodcuttingSystem;
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

    // Create mock player with stats and inventory
    mockPlayer = {
      data: {
        stats: {
          woodcutting: { level: 45, currentXp: 40000, maxLevel: 99 },
          combat: { level: 3, currentXp: 0, maxLevel: 126 }
        },
        inventory: {
          items: [
            { itemId: 1355, quantity: 1 }, // Mithril axe
            null, null, null, null, null, null, null, null, null,
            null, null, null, null, null, null, null, null,
            null, null, null, null, null, null, null, null,
            null, null
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

    woodcuttingSystem = new WoodcuttingSystem(mockWorld);
  });

  describe('System Initialization', () => {
    it('should initialize with correct name and enabled state', () => {
      expect(woodcuttingSystem.name).toBe('WoodcuttingSystem');
      expect(woodcuttingSystem.enabled).toBe(true);
    });

    it('should load trees and axes during initialization', () => {
      const trees = woodcuttingSystem.getTrees();
      const axes = (woodcuttingSystem as any).axes;

      expect(trees.size).toBeGreaterThan(0);
      expect(axes.size).toBeGreaterThan(0);
      
      // Check for specific trees
      expect(trees.has('normal')).toBe(true);
      expect(trees.has('oak')).toBe(true);
      expect(trees.has('willow')).toBe(true);
      expect(trees.has('maple')).toBe(true);
      expect(trees.has('yew')).toBe(true);
      expect(trees.has('magic')).toBe(true);
    });

    it('should set up event listeners during init', async () => {
      await woodcuttingSystem.init();
      
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:start_woodcutting', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:stop_woodcutting', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:chop_tree', expect.any(Function));
    });
  });

  describe('Tree Data', () => {
    it('should have correct normal tree configuration', () => {
      const trees = woodcuttingSystem.getTrees();
      const normalTree = trees.get('normal');
      
      expect(normalTree).toBeDefined();
      expect(normalTree!.name).toBe('Tree');
      expect(normalTree!.level).toBe(1);
      expect(normalTree!.logId).toBe(1511); // Logs
      expect(normalTree!.xp).toBe(25);
      expect(normalTree!.treeType).toBe('normal');
    });

    it('should have correct oak tree configuration', () => {
      const trees = woodcuttingSystem.getTrees();
      const oakTree = trees.get('oak');
      
      expect(oakTree).toBeDefined();
      expect(oakTree!.name).toBe('Oak');
      expect(oakTree!.level).toBe(15);
      expect(oakTree!.logId).toBe(1521); // Oak logs
      expect(oakTree!.xp).toBe(37.5);
    });

    it('should have correct yew tree configuration', () => {
      const trees = woodcuttingSystem.getTrees();
      const yewTree = trees.get('yew');
      
      expect(yewTree).toBeDefined();
      expect(yewTree!.name).toBe('Yew');
      expect(yewTree!.level).toBe(60);
      expect(yewTree!.logId).toBe(1515); // Yew logs
      expect(yewTree!.xp).toBe(175);
    });

    it('should have correct magic tree configuration', () => {
      const trees = woodcuttingSystem.getTrees();
      const magicTree = trees.get('magic');
      
      expect(magicTree).toBeDefined();
      expect(magicTree!.name).toBe('Magic');
      expect(magicTree!.level).toBe(75);
      expect(magicTree!.logId).toBe(1513); // Magic logs
      expect(magicTree!.xp).toBe(250);
      expect(magicTree!.treeType).toBe('special');
    });
  });

  describe('Axe System', () => {
    it('should load axes correctly', () => {
      const axes = (woodcuttingSystem as any).axes as Map<number, any>;
      
      expect(axes.has(1351)).toBe(true); // Bronze axe
      expect(axes.has(1349)).toBe(true); // Iron axe
      expect(axes.has(1355)).toBe(true); // Mithril axe
      expect(axes.has(1359)).toBe(true); // Rune axe
      expect(axes.has(6739)).toBe(true); // Dragon axe
    });

    it('should find player axe in inventory', () => {
      const axe = (woodcuttingSystem as any).getPlayerAxe('test-player');
      
      expect(axe).toBeDefined();
      expect(axe.itemId).toBe(1355); // Mithril axe
      expect(axe.name).toBe('Mithril axe');
    });

    it('should return undefined for missing axe', () => {
      // Remove axe from inventory
      mockPlayer.data.inventory.items[0] = null;
      
      const axe = (woodcuttingSystem as any).getPlayerAxe('test-player');
      expect(axe).toBeUndefined();
    });

    it('should have special properties for dragon axe', () => {
      const axes = (woodcuttingSystem as any).axes as Map<number, any>;
      const dragonAxe = axes.get(6739);
      
      expect(dragonAxe).toBeDefined();
      expect(dragonAxe.special).toBeDefined();
      expect(dragonAxe.special.bonusXp).toBe(0.1); // 10% bonus XP
    });
  });

  describe('Woodcutting Mechanics', () => {
    beforeEach(async () => {
      await woodcuttingSystem.init();
    });

    it('should successfully start woodcutting normal trees', () => {
      const treeNodes = woodcuttingSystem.getTreeNodes();
      const normalNode = Array.from(treeNodes.values()).find(
        node => node.treeId === 'normal'
      );
      
      expect(normalNode).toBeDefined();
      
      const result = woodcuttingSystem.startWoodcutting('test-player', normalNode!.id);
      expect(result).toBe(true);
      
      expect(woodcuttingSystem.isPlayerWoodcutting('test-player')).toBe(true);
    });

    it('should successfully start woodcutting maple trees', () => {
      const treeNodes = woodcuttingSystem.getTreeNodes();
      const mapleNode = Array.from(treeNodes.values()).find(
        node => node.treeId === 'maple'
      );
      
      expect(mapleNode).toBeDefined();
      
      const result = woodcuttingSystem.startWoodcutting('test-player', mapleNode!.id);
      expect(result).toBe(true);
      
      expect(woodcuttingSystem.isPlayerWoodcutting('test-player')).toBe(true);
    });

    it('should fail to start woodcutting without axe', () => {
      const treeNodes = woodcuttingSystem.getTreeNodes();
      const normalNode = Array.from(treeNodes.values()).find(
        node => node.treeId === 'normal'
      );
      
      // Remove axe from inventory
      mockPlayer.data.inventory.items[0] = null;
      
      const result = woodcuttingSystem.startWoodcutting('test-player', normalNode!.id);
      expect(result).toBe(false);
    });

    it('should fail to start woodcutting without required level', () => {
      const treeNodes = woodcuttingSystem.getTreeNodes();
      const yewNode = Array.from(treeNodes.values()).find(
        node => node.treeId === 'yew'
      );
      
      // Lower player woodcutting level below yew requirement (60)
      mockPlayer.data.stats.woodcutting.level = 50;
      
      const result = woodcuttingSystem.startWoodcutting('test-player', yewNode!.id);
      expect(result).toBe(false);
    });

    it('should stop woodcutting successfully', () => {
      const treeNodes = woodcuttingSystem.getTreeNodes();
      const normalNode = Array.from(treeNodes.values()).find(
        node => node.treeId === 'normal'
      );
      
      woodcuttingSystem.startWoodcutting('test-player', normalNode!.id);
      expect(woodcuttingSystem.isPlayerWoodcutting('test-player')).toBe(true);
      
      const stopResult = woodcuttingSystem.stopWoodcutting('test-player');
      expect(stopResult).toBe(true);
      expect(woodcuttingSystem.isPlayerWoodcutting('test-player')).toBe(false);
    });
  });

  describe('Woodcutting Calculations', () => {
    it('should calculate chopping duration correctly', () => {
      const trees = woodcuttingSystem.getTrees();
      const normalTree = trees.get('normal')!;
      const axe = { speedMultiplier: 1.3 } as any;
      
      const duration = (woodcuttingSystem as any).calculateChoppingDuration(15, normalTree, axe);
      
      expect(duration).toBeGreaterThanOrEqual(1200); // Minimum 1.2 seconds
      expect(duration).toBeLessThan(10000); // Should be reasonable
    });

    it('should calculate chop rate correctly', () => {
      const trees = woodcuttingSystem.getTrees();
      const normalTree = trees.get('normal')!;
      const axe = { successBonus: 0.15 } as any;
      
      const chopRate = (woodcuttingSystem as any).calculateChopRate(20, normalTree, axe);
      
      expect(chopRate).toBeGreaterThanOrEqual(0.1);
      expect(chopRate).toBeLessThanOrEqual(0.95);
      expect(chopRate).toBeGreaterThan(0.5); // Should be higher than base rate with level and axe
    });

    it('should determine tree fall chance correctly', () => {
      const trees = woodcuttingSystem.getTrees();
      const normalTree = trees.get('normal')!;
      const yewTree = trees.get('yew')!;
      
      // Test multiple times to check probability distribution
      let normalFalls = 0;
      let yewFalls = 0;
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        if ((woodcuttingSystem as any).shouldTreeFall(normalTree, 1)) {
          normalFalls++;
        }
        if ((woodcuttingSystem as any).shouldTreeFall(yewTree, 1)) {
          yewFalls++;
        }
      }
      
      // Normal trees should fall more often than yew trees
      expect(normalFalls).toBeGreaterThan(yewFalls);
      
      // Both should have some falls but not all
      expect(normalFalls).toBeGreaterThan(0);
      expect(normalFalls).toBeLessThan(iterations);
      expect(yewFalls).toBeGreaterThan(0);
      expect(yewFalls).toBeLessThan(iterations);
    });
  });

  describe('Tree Node Management', () => {
    beforeEach(async () => {
      await woodcuttingSystem.init();
    });

    it('should spawn tree nodes', () => {
      const treeNodes = woodcuttingSystem.getTreeNodes();
      expect(treeNodes.size).toBeGreaterThan(0);
      
      // Check for specific tree types
      const normalNode = Array.from(treeNodes.values()).find(n => n.treeId === 'normal');
      const oakNode = Array.from(treeNodes.values()).find(n => n.treeId === 'oak');
      const yewNode = Array.from(treeNodes.values()).find(n => n.treeId === 'yew');
      
      expect(normalNode).toBeDefined();
      expect(oakNode).toBeDefined();
      expect(yewNode).toBeDefined();
    });

    it('should chop down tree when fall chance triggers', () => {
      const treeNodes = woodcuttingSystem.getTreeNodes();
      const testNode = Array.from(treeNodes.values())[0];
      const trees = woodcuttingSystem.getTrees();
      const testTree = trees.get(testNode.treeId)!;
      
      expect(testNode.chopped).toBe(false);
      
      (woodcuttingSystem as any).chopDownTree(testNode, testTree);
      
      expect(testNode.chopped).toBe(true);
      expect(testNode.regrowAt).toBeGreaterThan(Date.now());
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:tree_chopped', expect.any(Object));
    });

    it('should regrow tree after respawn timer', () => {
      const treeNodes = woodcuttingSystem.getTreeNodes();
      const testNode = Array.from(treeNodes.values())[0];
      
      // Manually set tree as chopped with past regrow time
      testNode.chopped = true;
      testNode.regrowAt = Date.now() - 1000; // 1 second ago
      
      (woodcuttingSystem as any).checkTreeRegrowth(Date.now());
      
      expect(testNode.chopped).toBe(false);
      expect(testNode.regrowAt).toBe(0);
    });
  });

  describe('Special Drops', () => {
    it('should check for bird nest drops', () => {
      const trees = woodcuttingSystem.getTrees();
      const normalTree = trees.get('normal')!;
      
      expect(normalTree.specialDrops).toBeDefined();
      expect(normalTree.specialDrops!.length).toBeGreaterThan(0);
      
      const birdNest = normalTree.specialDrops![0];
      expect(birdNest.itemId).toBe(5073); // Bird nest
      expect(birdNest.chance).toBe(256); // 1/256 chance
    });

    it('should grant special drops when chance triggers', () => {
      const trees = woodcuttingSystem.getTrees();
      const normalTree = trees.get('normal')!;
      
      // Mock Math.random to always trigger drop (1/256 chance)
      const originalRandom = Math.random;
      Math.random = () => 0.001; // Very low number to trigger 1/256 chance
      
      (woodcuttingSystem as any).checkSpecialDrops('test-player', normalTree);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:add_item', expect.objectContaining({
        playerId: 'test-player',
        itemId: 5073, // Bird nest
        quantity: 1,
      }));
      
      // Restore original Math.random
      Math.random = originalRandom;
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await woodcuttingSystem.init();
    });

    it('should handle start woodcutting event', () => {
      const startSpy = spyOn(woodcuttingSystem, 'startWoodcutting');
      
      (woodcuttingSystem as any).handleStartWoodcutting({
        playerId: 'test-player',
        nodeId: 'tree_node_0'
      });
      
      expect(startSpy).toHaveBeenCalledWith('test-player', 'tree_node_0');
    });

    it('should handle stop woodcutting event', () => {
      const stopSpy = spyOn(woodcuttingSystem, 'stopWoodcutting');
      
      (woodcuttingSystem as any).handleStopWoodcutting({
        playerId: 'test-player'
      });
      
      expect(stopSpy).toHaveBeenCalledWith('test-player');
    });

    it('should handle chop tree event', () => {
      const startSpy = spyOn(woodcuttingSystem, 'startWoodcutting');
      
      (woodcuttingSystem as any).handleChopTree({
        playerId: 'test-player',
        treeId: 'normal'
      });
      
      expect(startSpy).toHaveBeenCalled();
    });
  });

  describe('XP and Item Rewards', () => {
    it('should grant logs to player when chopped', () => {
      const trees = woodcuttingSystem.getTrees();
      const normalTree = trees.get('normal')!;
      
      (woodcuttingSystem as any).grantLog('test-player', normalTree);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:add_item', {
        playerId: 'test-player',
        itemId: 1511, // Logs
        quantity: 1,
        noted: false,
      });
    });

    it('should grant woodcutting XP when logs are chopped', () => {
      (woodcuttingSystem as any).grantWoodcuttingXP('test-player', 100);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:xp_gain', {
        playerId: 'test-player',
        skill: 'woodcutting',
        amount: 100,
        source: 'woodcutting',
      });
    });
  });

  describe('System Cleanup', () => {
    it('should clean up event listeners on destroy', () => {
      woodcuttingSystem.destroy();
      
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:start_woodcutting');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:stop_woodcutting');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:chop_tree');
    });
  });
});