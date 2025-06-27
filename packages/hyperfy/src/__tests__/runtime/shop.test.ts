import { describe, it, expect, beforeEach } from 'vitest';
import { createTestWorld, runWorldFor } from '../createTestWorld';
import type { World } from '../../types';
import type { ShopSystem } from '../../rpg/systems/ShopSystem';
import type { InventorySystem } from '../../rpg/systems/InventorySystem';
import type { NPCSystem } from '../../rpg/systems/NPCSystem';

describe('ShopSystem Runtime', () => {
  let world: World;
  let shopSystem: ShopSystem;
  let inventorySystem: InventorySystem;
  let npcSystem: NPCSystem;

  beforeEach(async () => {
    world = await createTestWorld();
    shopSystem = world.getSystem('shop') as ShopSystem;
    inventorySystem = world.getSystem('inventory') as InventorySystem;
    npcSystem = world.getSystem('npc') as NPCSystem;

    // Create a test shop NPC for general store
    const shopNpc = (world as any).entities.add({
      id: 'shopkeeper_general',
      type: 'npc',
      name: 'General Store Owner',
      position: { x: 0, y: 0, z: 0 },
    });

    // Add NPC component
    shopNpc.addComponent('npc', {
      type: 'npc',
      npcId: 'shopkeeper_general',
      name: 'General Store Owner',
      examine: 'A friendly shopkeeper',
      npcType: 'shopkeeper',
      behavior: 'shop',
    });

    // Create sword shop NPC
    const swordShopNpc = (world as any).entities.add({
      id: 'shopkeeper_sword',
      type: 'npc',
      name: 'Sword Shop Owner',
      position: { x: 10, y: 0, z: 10 },
    });

    swordShopNpc.addComponent('npc', {
      type: 'npc',
      npcId: 'shopkeeper_sword',
      name: 'Sword Shop Owner',
      examine: 'Sells sharp things',
      npcType: 'shopkeeper',
      behavior: 'shop',
    });
  });

  describe('Shop Opening', () => {
    it('should open shop when near shopkeeper', async () => {
      const player = (world as any).createTestPlayer('player1');

      // Open shop
      const opened = shopSystem.openShop('player1', 'general_store');
      expect(opened).toBe(true);

      // Check shop is open for player
      const openShopId = shopSystem.getOpenShop('player1');
      expect(openShopId).toBe('general_store');

      const shop = shopSystem.getShop('general_store');
      expect(shop?.name).toBe('General Store');
    });

    it('should not open shop if player is too far', async () => {
      const player = (world as any).createTestPlayer('player1');

      // Move player far away
      player.position = { x: 100, y: 0, z: 100 };

      // Try to open shop
      const opened = shopSystem.openShop('player1', 'general_store');
      expect(opened).toBe(false);
    });

    it('should close shop properly', async () => {
      const player = (world as any).createTestPlayer('player1');

      // Open shop
      shopSystem.openShop('player1', 'general_store');
      expect(shopSystem.hasShopOpen('player1')).toBe(true);

      // Close shop
      shopSystem.closeShop('player1');
      expect(shopSystem.hasShopOpen('player1')).toBe(false);
    });
  });

  describe('Buying Items', () => {
    it('should buy item from shop', async () => {
      const player = (world as any).createTestPlayer('player1');

      // Give player coins
      inventorySystem.addItem('player1', 995, 100); // 100 coins

      // Open shop
      shopSystem.openShop('player1', 'general_store');

      // Buy first item (pot at index 0)
      const bought = shopSystem.buyItem('player1', 'general_store', 0, 1);
      expect(bought).toBe(true);

      // Check player has the item
      const inventory = player.getComponent('inventory');
      const hasItem = inventory?.items.some((item: any) => item?.itemId === 1931);
      expect(hasItem).toBe(true);
    });

    it('should not buy without enough coins', async () => {
      const player = (world as any).createTestPlayer('player1');

      // Give player only 1 coin
      inventorySystem.addItem('player1', 995, 1);

      // Open shop
      shopSystem.openShop('player1', 'general_store');

      // Try to buy a pot (costs more than 1gp)
      const bought = shopSystem.buyItem('player1', 'general_store', 0, 1);
      expect(bought).toBe(false);
    });

    it('should not buy more than stock available', async () => {
      const player = (world as any).createTestPlayer('player1');

      // Give player lots of coins
      inventorySystem.addItem('player1', 995, 10000);

      // Open shop
      shopSystem.openShop('player1', 'general_store');

      // Try to buy more than stock (general store has 30 pots)
      const bought = shopSystem.buyItem('player1', 'general_store', 0, 50);
      expect(bought).toBe(false);
    });

    it('should reduce stock after purchase', async () => {
      const player = (world as any).createTestPlayer('player1');

      // Give player coins
      inventorySystem.addItem('player1', 995, 1000);

      // Open shop
      shopSystem.openShop('player1', 'general_store');

      // Get initial shop data
      const shopBefore = shopSystem.getShop('general_store');
      const initialStock = shopBefore?.items[0].stock || 0;

      // Buy 3 items
      shopSystem.buyItem('player1', 'general_store', 0, 3);

      // Check stock decreased
      const shopAfter = shopSystem.getShop('general_store');
      const updatedStock = shopAfter?.items[0].stock || 0;

      expect(updatedStock).toBe(initialStock - 3);
    });
  });

  describe('Selling Items', () => {
    it('should sell items to general store', async () => {
      const player = (world as any).createTestPlayer('player1');

      // Give player an item to sell
      inventorySystem.addItem('player1', 1351, 1); // Bronze axe

      // Open shop
      shopSystem.openShop('player1', 'general_store');

      // Sell the item from slot 0
      const sold = shopSystem.sellItem('player1', 'general_store', 0, 1);
      expect(sold).toBe(true);

      // Check player received coins
      const inventory = player.getComponent('inventory');
      const hasCoins = inventory?.items.some((item: any) => item?.itemId === 995);
      expect(hasCoins).toBe(true);
    });

    it('should not sell to specialty shops that dont accept item', async () => {
      const player = (world as any).createTestPlayer('player1');

      // Give player a pot (not a sword)
      inventorySystem.addItem('player1', 1931, 1);

      // Open sword shop
      shopSystem.openShop('player1', 'sword_shop');

      // Try to sell pot to sword shop
      const sold = shopSystem.sellItem('player1', 'sword_shop', 0, 1);
      expect(sold).toBe(false);
    });

    it('should add sold items to general store stock', async () => {
      const player = (world as any).createTestPlayer('player1');

      // Give player an item not normally in general store
      inventorySystem.addItem('player1', 1523, 1); // Lockpick

      // Open shop
      shopSystem.openShop('player1', 'general_store');

      // Get shop before selling
      const shopBefore = shopSystem.getShop('general_store');
      const hadLockpick = shopBefore?.items.some(item => item.itemId === 1523);
      expect(hadLockpick).toBe(false);

      // Sell the item
      shopSystem.sellItem('player1', 'general_store', 0, 1);

      // Check shop now has the item
      const shopAfter = shopSystem.getShop('general_store');
      const hasLockpick = shopAfter?.items.some(item => item.itemId === 1523);
      expect(hasLockpick).toBe(true);
    });
  });

  describe('Shop Restocking', () => {
    it('should restock items over time', async () => {
      const player = (world as any).createTestPlayer('player1');

      // Give player coins
      inventorySystem.addItem('player1', 995, 10000);

      // Open shop
      shopSystem.openShop('player1', 'general_store');

      // Buy all pots
      shopSystem.buyItem('player1', 'general_store', 0, 30);

      // Check stock is 0
      let shop = shopSystem.getShop('general_store');
      let potStock = shop?.items[0].stock;
      expect(potStock).toBe(0);

      // Close and reopen shop after restock time
      shopSystem.closeShop('player1');

      // Run world for restock time
      await runWorldFor(world, 65000); // 65 seconds

      // Reopen shop to check stock
      shopSystem.openShop('player1', 'general_store');
      shop = shopSystem.getShop('general_store');
      potStock = shop?.items[0].stock;
      expect(potStock).toBeGreaterThan(0);
    });
  });

  describe('Shop Interactions', () => {
    it('should handle multiple players in different shops', async () => {
      const player1 = (world as any).createTestPlayer('player1');
      const player2 = (world as any).createTestPlayer('player2');

      // Player 2 position near sword shop
      player2.position = { x: 10, y: 0, z: 10 };

      // Open different shops
      shopSystem.openShop('player1', 'general_store');
      shopSystem.openShop('player2', 'sword_shop');

      expect(shopSystem.getOpenShop('player1')).toBe('general_store');
      expect(shopSystem.getOpenShop('player2')).toBe('sword_shop');
    });
  });
});
