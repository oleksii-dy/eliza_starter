import { describe, it, expect, beforeEach } from 'vitest';
import { createTestWorld, runWorldFor } from '../createTestWorld';
import type { World } from '../../types';
import type { TradingSystem } from '../../rpg/systems/TradingSystem';
import type { InventorySystem } from '../../rpg/systems/InventorySystem';

describe('TradingSystem Runtime', () => {
  let world: World;
  let tradingSystem: TradingSystem;
  let inventorySystem: InventorySystem;

  beforeEach(async () => {
    world = await createTestWorld();
    tradingSystem = world.getSystem('trading') as TradingSystem;
    inventorySystem = world.getSystem('inventory') as InventorySystem;
  });

  describe('Trade Requests', () => {
    it('should handle trade requests between players', async () => {
      // Create two test players using test helper
      const player1 = (world as any).createTestPlayer('player1');
      const player2 = (world as any).createTestPlayer('player2');

      // Player 1 requests trade with Player 2
      const requested = tradingSystem.requestTrade('player1', 'player2');
      expect(requested).toBe(true);

      // Player 2 accepts the trade
      const accepted = tradingSystem.acceptTradeRequest('player2', 'player1');
      expect(accepted).toBe(true);

      // Both players should now be in a trade session
      const session1 = tradingSystem.getTradeSession('player1');
      const session2 = tradingSystem.getTradeSession('player2');
      expect(session1).toBeDefined();
      expect(session2).toBeDefined();
      expect(session1?.id).toBe(session2?.id);
    });

    it('should prevent duplicate trade requests', async () => {
      const player1 = (world as any).createTestPlayer('player1');
      const player2 = (world as any).createTestPlayer('player2');

      // First request should succeed
      expect(tradingSystem.requestTrade('player1', 'player2')).toBe(true);

      // Second request should fail since already requested
      expect(tradingSystem.requestTrade('player1', 'player2')).toBe(false);
    });

    it('should handle trade cancellation', async () => {
      const player1 = (world as any).createTestPlayer('player1');
      const player2 = (world as any).createTestPlayer('player2');

      tradingSystem.requestTrade('player1', 'player2');
      tradingSystem.acceptTradeRequest('player2', 'player1');

      // Cancel the active trade
      const cancelled = tradingSystem.cancelTrade('player1');
      expect(cancelled).toBe(true);

      // Neither player should be in trade
      expect(tradingSystem.getTradeSession('player1')).toBeNull();
      expect(tradingSystem.getTradeSession('player2')).toBeNull();
    });
  });

  describe('Trading Items', () => {
    it('should handle item offers in trade', async () => {
      // Setup players with items
      const player1 = (world as any).createTestPlayer('player1');
      const player2 = (world as any).createTestPlayer('player2');

      // Give player 1 some items
      inventorySystem.addItem('player1', 1289, 1); // Rune scimitar
      inventorySystem.addItem('player1', 995, 1000); // Gold

      // Start trade
      tradingSystem.requestTrade('player1', 'player2');
      tradingSystem.acceptTradeRequest('player2', 'player1');

      // Player 1 offers items
      const offered1 = tradingSystem.offerItem('player1', 0, 1); // Offer rune scimitar
      const offered2 = tradingSystem.offerItem('player1', 1, 500); // Offer 500 gold

      expect(offered1).toBe(true);
      expect(offered2).toBe(true);

      // Check trade session state
      const session = tradingSystem.getTradeSession('player1');
      expect(session?.offer1.items[0]).toEqual({ itemId: 1289, quantity: 1 });
      expect(session?.offer1.items[1]).toEqual({ itemId: 995, quantity: 500 });
    });

    it('should complete trade with two-screen confirmation', async () => {
      const player1 = (world as any).createTestPlayer('player1');
      const player2 = (world as any).createTestPlayer('player2');

      // Give items to both players
      inventorySystem.addItem('player1', 1289, 1); // Rune scimitar
      inventorySystem.addItem('player2', 995, 5000); // Gold

      // Start trade
      tradingSystem.requestTrade('player1', 'player2');
      tradingSystem.acceptTradeRequest('player2', 'player1');

      // Make offers
      tradingSystem.offerItem('player1', 0, 1); // Player 1 offers scimitar
      tradingSystem.offerItem('player2', 0, 5000); // Player 2 offers gold

      // First confirmation screen
      expect(tradingSystem.acceptTrade('player1')).toBe(true);
      expect(tradingSystem.acceptTrade('player2')).toBe(true);

      // Check moved to second screen
      const session = tradingSystem.getTradeSession('player1');
      expect(session?.status).toBe('second_screen');

      // Second confirmation screen
      expect(tradingSystem.acceptTrade('player1')).toBe(true);
      expect(tradingSystem.acceptTrade('player2')).toBe(true);

      // Run world to process trade completion
      await runWorldFor(world, 100);

      // Trade should be completed
      expect(tradingSystem.getTradeSession('player1')).toBeNull();
      expect(tradingSystem.getTradeSession('player2')).toBeNull();
    });

    it('should reset acceptance if player modifies offer', async () => {
      const player1 = (world as any).createTestPlayer('player1');
      const player2 = (world as any).createTestPlayer('player2');

      inventorySystem.addItem('player1', 1289, 1);

      tradingSystem.requestTrade('player1', 'player2');
      tradingSystem.acceptTradeRequest('player2', 'player1');

      tradingSystem.offerItem('player1', 0, 1);

      // Both accept
      tradingSystem.acceptTrade('player1');
      tradingSystem.acceptTrade('player2');

      // Player 1 modifies offer - should reset acceptance
      tradingSystem.removeOfferItem('player1', 0);

      const session = tradingSystem.getTradeSession('player1');
      expect(session?.offer1.accepted).toBe(false);
      expect(session?.offer2.accepted).toBe(false);
    });
  });

  describe('Ironman Restrictions', () => {
    it('should prevent ironmen from trading', async () => {
      const player1 = (world as any).createTestPlayer('ironman1');
      const player2 = (world as any).createTestPlayer('player2')

      // Set player1 as ironman by changing account type
      ;(player1 as any).accountType = 'ironman';

      // Trade request should fail
      const requested = tradingSystem.requestTrade('ironman1', 'player2');
      expect(requested).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should check distance requirements', async () => {
      const player1 = (world as any).createTestPlayer('player1');
      const player2 = (world as any).createTestPlayer('player2');

      // Move player 2 far away
      player2.position = { x: 100, y: 0, z: 100 };

      // Trade request should fail due to distance
      const requested = tradingSystem.requestTrade('player1', 'player2');
      expect(requested).toBe(false);
    });

    it('should handle player disconnect during trade', async () => {
      const player1 = (world as any).createTestPlayer('player1');
      const player2 = (world as any).createTestPlayer('player2');

      tradingSystem.requestTrade('player1', 'player2');
      tradingSystem.acceptTradeRequest('player2', 'player1')

      // Simulate player 2 disconnect
      ;(world as any).entities.remove('player2');

      // Cancel trade for disconnected player
      tradingSystem.cancelTrade('player2');

      // Player 1 should no longer be in trade
      expect(tradingSystem.getTradeSession('player1')).toBeNull();
    });

    it('should handle trade timeout', async () => {
      const player1 = (world as any).createTestPlayer('player1');
      const player2 = (world as any).createTestPlayer('player2');

      tradingSystem.requestTrade('player1', 'player2');
      tradingSystem.acceptTradeRequest('player2', 'player1');

      // Get session and modify last update time
      const session = tradingSystem.getTradeSession('player1');
      if (session) {
        session.lastUpdate = Date.now() - 600000; // 10 minutes ago
      }

      // Run update to check timeouts
      tradingSystem.update(1);

      // Trade should be cancelled due to timeout
      expect(tradingSystem.getTradeSession('player1')).toBeNull();
    });
  });
});
