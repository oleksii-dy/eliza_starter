// @ts-nocheck
/**
 * Grand Exchange System Tests
 * Tests player economy, trading, market data, and price tracking
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { 
  GrandExchangeSystem, 
  OrderType, 
  OrderStatus 
} from '../rpg/systems/GrandExchangeSystem';

// Simple mock world for testing
function createSimpleWorld() {
  const events = {
    handlers: new Map(),
    emit(event: string, data?: any) {
      const eventHandlers = this.handlers.get(event);
      if (eventHandlers) {
        eventHandlers.forEach(handler => handler(data));
      }
    },
    on(event: string, handler: Function) {
      if (!this.handlers.has(event)) {
        this.handlers.set(event, new Set());
      }
      this.handlers.get(event).add(handler);
    }
  };

  const entities = new Map();

  return {
    events,
    systems: [],
    entities,
    getEntityById(id: string) {
      return entities.get(id);
    },
    createEntity(data: any) {
      const entity = {
        id: data.id,
        data: data,
        ...data,
        components: new Map(),
        addComponent(component: any) {
          this.components.set(component.type, component);
        },
        getComponent(type: string) {
          return this.components.get(type);
        }
      };
      entities.set(data.id, entity);
      return entity;
    }
  };
}

describe('Grand Exchange System Tests', () => {
  let world: any;
  let geSystem: GrandExchangeSystem;

  beforeEach(async () => {
    world = createSimpleWorld();
    geSystem = new GrandExchangeSystem(world);
    
    // Mock inventory system with tracking
    const inventoryItems = new Map();
    
    world.systems.push({
      constructor: { name: 'InventorySystem' },
      hasItem: (playerId: string, itemId: string, quantity: number) => {
        const playerItems = inventoryItems.get(playerId) || new Map();
        const currentQuantity = playerItems.get(itemId) || 0;
        return currentQuantity >= quantity;
      },
      removeItem: (playerId: string, itemId: string, quantity: number) => {
        const playerItems = inventoryItems.get(playerId) || new Map();
        const currentQuantity = playerItems.get(itemId) || 0;
        const newQuantity = Math.max(0, currentQuantity - quantity);
        playerItems.set(itemId, newQuantity);
        inventoryItems.set(playerId, playerItems);
        return true;
      },
      addItem: (playerId: string, itemId: string, quantity: number) => {
        const playerItems = inventoryItems.get(playerId) || new Map();
        const currentQuantity = playerItems.get(itemId) || 0;
        playerItems.set(itemId, currentQuantity + quantity);
        inventoryItems.set(playerId, playerItems);
        return true;
      },
      getItemQuantity: (playerId: string, itemId: string) => {
        const playerItems = inventoryItems.get(playerId) || new Map();
        return playerItems.get(itemId) || 0;
      },
      // Helper for tests
      setItem: (playerId: string, itemId: string, quantity: number) => {
        const playerItems = inventoryItems.get(playerId) || new Map();
        playerItems.set(itemId, quantity);
        inventoryItems.set(playerId, playerItems);
      }
    });

    await geSystem.initialize();
  });

  describe('Component Creation', () => {
    it('should create Grand Exchange components for players', () => {
      const player = world.createEntity({
        id: 'test_player',
        type: 'player',
        name: 'TestPlayer'
      });

      const geComponent = geSystem.createGrandExchangeComponent(player.id);

      expect(geComponent).not.toBeNull();
      expect(geComponent.type).toBe('grand_exchange');
      expect(geComponent.activeOffers).toEqual([]);
      expect(geComponent.completedOffers).toEqual([]);
      expect(geComponent.totalTradeValue).toBe(0);
      expect(geComponent.tradesCompleted).toBe(0);
      expect(geComponent.lastActivity).toBeGreaterThan(0);
    });
  });

  describe('Buy Offers', () => {
    it('should place buy offers successfully', () => {
      const player = world.createEntity({
        id: 'buyer',
        type: 'player',
        name: 'Buyer'
      });

      geSystem.createGrandExchangeComponent(player.id);
      
      // Give player coins
      const inventorySystem = world.systems[0];
      inventorySystem.setItem(player.id, 'coins', 10000);

      let offerPlaced = false;
      world.events.on('ge:buy_offer_placed', (data) => {
        offerPlaced = true;
        expect(data.playerId).toBe(player.id);
        expect(data.itemId).toBe('bronze_sword');
        expect(data.quantity).toBe(1);
        expect(data.pricePerItem).toBe(100);
        expect(data.totalCost).toBe(100);
      });

      const success = geSystem.placeBuyOffer(player.id, 'bronze_sword', 1, 100);

      expect(success).toBe(true);
      expect(offerPlaced).toBe(true);
      
      // Check coins were removed
      expect(inventorySystem.getItemQuantity(player.id, 'coins')).toBe(9900);
      
      // Check player offers
      const playerOffers = geSystem.getPlayerOffers(player.id);
      expect(playerOffers.active.length).toBe(1);
      expect(playerOffers.active[0].type).toBe(OrderType.BUY);
      expect(playerOffers.active[0].status).toBe(OrderStatus.ACTIVE);
    });

    it('should reject buy offers without sufficient coins', () => {
      const player = world.createEntity({
        id: 'poor_buyer',
        type: 'player',
        name: 'PoorBuyer'
      });

      geSystem.createGrandExchangeComponent(player.id);
      
      // Give player insufficient coins
      const inventorySystem = world.systems[0];
      inventorySystem.setItem(player.id, 'coins', 50);

      let errorReceived = false;
      world.events.on('ge:error', (data) => {
        errorReceived = true;
        expect(data.message).toContain('100 coins');
      });

      const success = geSystem.placeBuyOffer(player.id, 'bronze_sword', 1, 100);

      expect(success).toBe(false);
      expect(errorReceived).toBe(true);
    });

    it('should enforce maximum offers per player', () => {
      const player = world.createEntity({
        id: 'busy_trader',
        type: 'player',
        name: 'BusyTrader'
      });

      const geComponent = geSystem.createGrandExchangeComponent(player.id);
      
      // Give player lots of coins
      const inventorySystem = world.systems[0];
      inventorySystem.setItem(player.id, 'coins', 100000);

      // Fill up to max offers (8)
      for (let i = 0; i < 8; i++) {
        const success = geSystem.placeBuyOffer(player.id, 'bronze_sword', 1, 100);
        expect(success).toBe(true);
      }

      // Try to place 9th offer
      let errorReceived = false;
      world.events.on('ge:error', (data) => {
        errorReceived = true;
        expect(data.message).toContain('Maximum 8 active offers');
      });

      const success = geSystem.placeBuyOffer(player.id, 'bronze_sword', 1, 100);

      expect(success).toBe(false);
      expect(errorReceived).toBe(true);
      expect(geComponent.activeOffers.length).toBe(8);
    });
  });

  describe('Sell Offers', () => {
    it('should place sell offers successfully', () => {
      const player = world.createEntity({
        id: 'seller',
        type: 'player',
        name: 'Seller'
      });

      geSystem.createGrandExchangeComponent(player.id);
      
      // Give player items to sell
      const inventorySystem = world.systems[0];
      inventorySystem.setItem(player.id, 'bronze_sword', 5);

      let offerPlaced = false;
      world.events.on('ge:sell_offer_placed', (data) => {
        offerPlaced = true;
        expect(data.playerId).toBe(player.id);
        expect(data.itemId).toBe('bronze_sword');
        expect(data.quantity).toBe(3);
        expect(data.pricePerItem).toBe(150);
        expect(data.totalValue).toBe(450);
      });

      const success = geSystem.placeSellOffer(player.id, 'bronze_sword', 3, 150);

      expect(success).toBe(true);
      expect(offerPlaced).toBe(true);
      
      // Check items were removed
      expect(inventorySystem.getItemQuantity(player.id, 'bronze_sword')).toBe(2);
      
      // Check player offers
      const playerOffers = geSystem.getPlayerOffers(player.id);
      expect(playerOffers.active.length).toBe(1);
      expect(playerOffers.active[0].type).toBe(OrderType.SELL);
      expect(playerOffers.active[0].status).toBe(OrderStatus.ACTIVE);
    });

    it('should reject sell offers without sufficient items', () => {
      const player = world.createEntity({
        id: 'empty_seller',
        type: 'player',
        name: 'EmptySeller'
      });

      geSystem.createGrandExchangeComponent(player.id);
      
      // Give player no items
      const inventorySystem = world.systems[0];
      inventorySystem.setItem(player.id, 'bronze_sword', 0);

      let errorReceived = false;
      world.events.on('ge:error', (data) => {
        errorReceived = true;
        expect(data.message).toContain('need 5 Bronze Sword');
      });

      const success = geSystem.placeSellOffer(player.id, 'bronze_sword', 5, 100);

      expect(success).toBe(false);
      expect(errorReceived).toBe(true);
    });
  });

  describe('Order Matching and Trading', () => {
    it('should match compatible buy and sell offers', () => {
      const buyer = world.createEntity({
        id: 'buyer',
        type: 'player',
        name: 'Buyer'
      });

      const seller = world.createEntity({
        id: 'seller',
        type: 'player',
        name: 'Seller'
      });

      geSystem.createGrandExchangeComponent(buyer.id);
      geSystem.createGrandExchangeComponent(seller.id);
      
      const inventorySystem = world.systems[0];
      inventorySystem.setItem(buyer.id, 'coins', 10000);
      inventorySystem.setItem(seller.id, 'bronze_sword', 10);

      let tradeExecuted = false;
      world.events.on('ge:trade_executed', (data) => {
        tradeExecuted = true;
        expect(data.buyerId).toBe(buyer.id);
        expect(data.sellerId).toBe(seller.id);
        expect(data.itemId).toBe('bronze_sword');
        expect(data.quantity).toBe(2);
        expect(data.pricePerItem).toBe(120); // Seller's price
        expect(data.totalValue).toBe(240);
      });

      // Place sell offer first
      geSystem.placeSellOffer(seller.id, 'bronze_sword', 2, 120);
      
      // Place buy offer that matches (buyer willing to pay more)
      geSystem.placeBuyOffer(buyer.id, 'bronze_sword', 2, 150);

      expect(tradeExecuted).toBe(true);
      
      // Verify items transferred
      expect(inventorySystem.getItemQuantity(buyer.id, 'bronze_sword')).toBe(2);
      expect(inventorySystem.getItemQuantity(buyer.id, 'coins')).toBe(9760); // 10000 - 240
      expect(inventorySystem.getItemQuantity(seller.id, 'coins')).toBe(240);
      expect(inventorySystem.getItemQuantity(seller.id, 'bronze_sword')).toBe(8);

      // Check offer statuses
      const buyerOffers = geSystem.getPlayerOffers(buyer.id);
      const sellerOffers = geSystem.getPlayerOffers(seller.id);
      
      expect(buyerOffers.completed.length).toBe(1);
      expect(sellerOffers.completed.length).toBe(1);
      expect(buyerOffers.completed[0].status).toBe(OrderStatus.COMPLETED);
      expect(sellerOffers.completed[0].status).toBe(OrderStatus.COMPLETED);
    });

    it('should handle partial fills', () => {
      const buyer = world.createEntity({
        id: 'big_buyer',
        type: 'player',
        name: 'BigBuyer'
      });

      const seller = world.createEntity({
        id: 'small_seller',
        type: 'player',
        name: 'SmallSeller'
      });

      geSystem.createGrandExchangeComponent(buyer.id);
      geSystem.createGrandExchangeComponent(seller.id);
      
      const inventorySystem = world.systems[0];
      inventorySystem.setItem(buyer.id, 'coins', 10000);
      inventorySystem.setItem(seller.id, 'bronze_sword', 3);

      // Buyer wants 10, seller has only 3
      geSystem.placeBuyOffer(buyer.id, 'bronze_sword', 10, 100);
      geSystem.placeSellOffer(seller.id, 'bronze_sword', 3, 90);

      // Check partial fill
      const buyerOffers = geSystem.getPlayerOffers(buyer.id);
      const sellerOffers = geSystem.getPlayerOffers(seller.id);
      
      expect(buyerOffers.active.length).toBe(1);
      expect(buyerOffers.active[0].status).toBe(OrderStatus.PARTIALLY_FILLED);
      expect(buyerOffers.active[0].quantityRemaining).toBe(7);
      
      expect(sellerOffers.completed.length).toBe(1);
      expect(sellerOffers.completed[0].status).toBe(OrderStatus.COMPLETED);
      
      // Verify items
      expect(inventorySystem.getItemQuantity(buyer.id, 'bronze_sword')).toBe(3);
      expect(inventorySystem.getItemQuantity(buyer.id, 'coins')).toBe(9730); // Paid 270 for 3 items at 90 each
      expect(inventorySystem.getItemQuantity(seller.id, 'coins')).toBe(270);
    });

    it('should prioritize best prices for matching', () => {
      const buyer = world.createEntity({
        id: 'buyer',
        type: 'player',
        name: 'Buyer'
      });

      const cheapSeller = world.createEntity({
        id: 'cheap_seller',
        type: 'player',
        name: 'CheapSeller'
      });

      const expensiveSeller = world.createEntity({
        id: 'expensive_seller',
        type: 'player',
        name: 'ExpensiveSeller'
      });

      geSystem.createGrandExchangeComponent(buyer.id);
      geSystem.createGrandExchangeComponent(cheapSeller.id);
      geSystem.createGrandExchangeComponent(expensiveSeller.id);
      
      const inventorySystem = world.systems[0];
      inventorySystem.setItem(buyer.id, 'coins', 10000);
      inventorySystem.setItem(cheapSeller.id, 'bronze_sword', 5);
      inventorySystem.setItem(expensiveSeller.id, 'bronze_sword', 5);

      // Place sell offers
      geSystem.placeSellOffer(expensiveSeller.id, 'bronze_sword', 1, 200);
      geSystem.placeSellOffer(cheapSeller.id, 'bronze_sword', 1, 100);
      
      let tradeExecuted = false;
      world.events.on('ge:trade_executed', (data) => {
        tradeExecuted = true;
        // Should match with cheaper seller
        expect(data.sellerId).toBe(cheapSeller.id);
        expect(data.pricePerItem).toBe(100);
      });

      // Place buy offer that matches both
      geSystem.placeBuyOffer(buyer.id, 'bronze_sword', 1, 250);

      expect(tradeExecuted).toBe(true);
      expect(inventorySystem.getItemQuantity(buyer.id, 'coins')).toBe(9900); // Paid 100, not 200
    });
  });

  describe('Order Management', () => {
    it('should cancel active offers and refund properly', () => {
      const player = world.createEntity({
        id: 'canceller',
        type: 'player',
        name: 'Canceller'
      });

      geSystem.createGrandExchangeComponent(player.id);
      
      const inventorySystem = world.systems[0];
      inventorySystem.setItem(player.id, 'coins', 1000);

      // Place buy offer
      geSystem.placeBuyOffer(player.id, 'bronze_sword', 2, 150);

      let offerCancelled = false;
      world.events.on('ge:offer_cancelled', (data) => {
        offerCancelled = true;
        expect(data.playerId).toBe(player.id);
        expect(data.refundAmount).toBe(300);
        expect(data.refundType).toBe('coins');
      });

      const offers = geSystem.getPlayerOffers(player.id);
      const offerId = offers.active[0].id;

      const success = geSystem.cancelOffer(player.id, offerId);

      expect(success).toBe(true);
      expect(offerCancelled).toBe(true);
      
      // Check refund
      expect(inventorySystem.getItemQuantity(player.id, 'coins')).toBe(1000);
      
      // Check offer moved to completed
      const updatedOffers = geSystem.getPlayerOffers(player.id);
      expect(updatedOffers.active.length).toBe(0);
      expect(updatedOffers.completed.length).toBe(1);
      expect(updatedOffers.completed[0].status).toBe(OrderStatus.CANCELLED);
    });

    it('should collect completed offers', () => {
      const buyer = world.createEntity({
        id: 'collector_buyer',
        type: 'player',
        name: 'CollectorBuyer'
      });

      const seller = world.createEntity({
        id: 'collector_seller',
        type: 'player',
        name: 'CollectorSeller'
      });

      geSystem.createGrandExchangeComponent(buyer.id);
      geSystem.createGrandExchangeComponent(seller.id);
      
      const inventorySystem = world.systems[0];
      inventorySystem.setItem(buyer.id, 'coins', 1000);
      inventorySystem.setItem(seller.id, 'bronze_sword', 5);

      // Create and complete a trade
      geSystem.placeSellOffer(seller.id, 'bronze_sword', 1, 100);
      geSystem.placeBuyOffer(buyer.id, 'bronze_sword', 1, 100);

      const buyerOffers = geSystem.getPlayerOffers(buyer.id);
      const completedOfferId = buyerOffers.completed[0].id;

      let offerCollected = false;
      world.events.on('ge:offer_collected', (data) => {
        offerCollected = true;
        expect(data.playerId).toBe(buyer.id);
        expect(data.offerId).toBe(completedOfferId);
      });

      const success = geSystem.collectOffer(buyer.id, completedOfferId);

      expect(success).toBe(true);
      expect(offerCollected).toBe(true);
      
      // Check offer is removed
      const updatedOffers = geSystem.getPlayerOffers(buyer.id);
      expect(updatedOffers.completed.length).toBe(0);
    });
  });

  describe('Market Data', () => {
    it('should track market data for items', () => {
      const marketData = geSystem.getMarketData('bronze_sword');
      
      expect(marketData).not.toBeNull();
      expect(marketData.itemId).toBe('bronze_sword');
      expect(marketData.currentPrice).toBeGreaterThan(0);
      expect(marketData.dailyVolume).toBe(0);
      expect(marketData.activeOffers.buy).toBe(0);
      expect(marketData.activeOffers.sell).toBe(0);
    });

    it('should update market data after trades', () => {
      const buyer = world.createEntity({
        id: 'market_buyer',
        type: 'player',
        name: 'MarketBuyer'
      });

      const seller = world.createEntity({
        id: 'market_seller',
        type: 'player',
        name: 'MarketSeller'
      });

      geSystem.createGrandExchangeComponent(buyer.id);
      geSystem.createGrandExchangeComponent(seller.id);
      
      const inventorySystem = world.systems[0];
      inventorySystem.setItem(buyer.id, 'coins', 10000);
      inventorySystem.setItem(seller.id, 'bronze_sword', 10);

      const initialMarketData = geSystem.getMarketData('bronze_sword');
      const initialPrice = initialMarketData.currentPrice;

      // Execute trade
      geSystem.placeSellOffer(seller.id, 'bronze_sword', 5, 200);
      geSystem.placeBuyOffer(buyer.id, 'bronze_sword', 5, 200);

      const updatedMarketData = geSystem.getMarketData('bronze_sword');
      
      expect(updatedMarketData.dailyVolume).toBe(5);
      expect(updatedMarketData.currentPrice).toBeGreaterThanOrEqual(initialPrice); // Price should increase
      expect(updatedMarketData.highPrice24h).toBe(200);
      expect(updatedMarketData.lowPrice24h).toBeLessThanOrEqual(200);
    });

    it('should track price history', () => {
      const buyer = world.createEntity({ id: 'history_buyer', type: 'player' });
      const seller = world.createEntity({ id: 'history_seller', type: 'player' });

      geSystem.createGrandExchangeComponent(buyer.id);
      geSystem.createGrandExchangeComponent(seller.id);
      
      const inventorySystem = world.systems[0];
      inventorySystem.setItem(buyer.id, 'coins', 10000);
      inventorySystem.setItem(seller.id, 'bronze_sword', 10);

      // Execute multiple trades
      geSystem.placeSellOffer(seller.id, 'bronze_sword', 1, 100);
      geSystem.placeBuyOffer(buyer.id, 'bronze_sword', 1, 100);
      
      geSystem.placeSellOffer(seller.id, 'bronze_sword', 1, 110);
      geSystem.placeBuyOffer(buyer.id, 'bronze_sword', 1, 110);

      const priceHistory = geSystem.getPriceHistory('bronze_sword');
      
      expect(priceHistory.length).toBe(2);
      expect(priceHistory[0].price).toBe(100);
      expect(priceHistory[1].price).toBe(110);
      expect(priceHistory[0].quantity).toBe(1);
      expect(priceHistory[1].quantity).toBe(1);
      expect(priceHistory[0].type).toBe('trade');
      expect(priceHistory[1].type).toBe('trade');
    });
  });

  describe('Error Handling', () => {
    it('should reject invalid item IDs', () => {
      const player = world.createEntity({
        id: 'invalid_trader',
        type: 'player',
        name: 'InvalidTrader'
      });

      geSystem.createGrandExchangeComponent(player.id);

      let errorReceived = false;
      world.events.on('ge:error', (data) => {
        errorReceived = true;
        expect(data.message).toContain('Invalid item');
      });

      const success = geSystem.placeBuyOffer(player.id, 'invalid_item', 1, 100);

      expect(success).toBe(false);
      expect(errorReceived).toBe(true);
    });

    it('should reject trading with yourself', () => {
      const player = world.createEntity({
        id: 'self_trader',
        type: 'player',
        name: 'SelfTrader'
      });

      geSystem.createGrandExchangeComponent(player.id);
      
      const inventorySystem = world.systems[0];
      inventorySystem.setItem(player.id, 'coins', 10000);
      inventorySystem.setItem(player.id, 'bronze_sword', 10);

      // Place sell offer first
      geSystem.placeSellOffer(player.id, 'bronze_sword', 1, 100);
      
      // Try to buy from yourself (should not match)
      geSystem.placeBuyOffer(player.id, 'bronze_sword', 1, 150);

      const offers = geSystem.getPlayerOffers(player.id);
      
      // Both offers should remain active (no self-trade)
      expect(offers.active.length).toBe(2);
      expect(offers.completed.length).toBe(0);
    });

    it('should handle invalid quantities and prices', () => {
      const player = world.createEntity({
        id: 'invalid_params',
        type: 'player',
        name: 'InvalidParams'
      });

      geSystem.createGrandExchangeComponent(player.id);
      
      const inventorySystem = world.systems[0];
      inventorySystem.setItem(player.id, 'coins', 10000);

      let errorCount = 0;
      world.events.on('ge:error', (data) => {
        errorCount++;
        expect(data.message).toContain('Invalid quantity or price');
      });

      // Test invalid quantities
      geSystem.placeBuyOffer(player.id, 'bronze_sword', 0, 100);
      geSystem.placeBuyOffer(player.id, 'bronze_sword', -5, 100);
      
      // Test invalid prices
      geSystem.placeBuyOffer(player.id, 'bronze_sword', 1, 0);
      geSystem.placeBuyOffer(player.id, 'bronze_sword', 1, -50);

      expect(errorCount).toBe(4);
    });
  });

  describe('Player Trade Statistics', () => {
    it('should track player trade statistics', () => {
      const buyer = world.createEntity({
        id: 'stat_buyer',
        type: 'player',
        name: 'StatBuyer'
      });

      const seller = world.createEntity({
        id: 'stat_seller',
        type: 'player',
        name: 'StatSeller'
      });

      const buyerComponent = geSystem.createGrandExchangeComponent(buyer.id);
      const sellerComponent = geSystem.createGrandExchangeComponent(seller.id);
      
      const inventorySystem = world.systems[0];
      inventorySystem.setItem(buyer.id, 'coins', 10000);
      inventorySystem.setItem(seller.id, 'bronze_sword', 10);

      // Execute multiple trades
      geSystem.placeSellOffer(seller.id, 'bronze_sword', 2, 100);
      geSystem.placeBuyOffer(buyer.id, 'bronze_sword', 2, 100);
      
      geSystem.placeSellOffer(seller.id, 'bronze_sword', 3, 150);
      geSystem.placeBuyOffer(buyer.id, 'bronze_sword', 3, 150);

      expect(buyerComponent.tradesCompleted).toBe(2);
      expect(buyerComponent.totalTradeValue).toBe(650); // 200 + 450
      expect(sellerComponent.tradesCompleted).toBe(2);
      expect(sellerComponent.totalTradeValue).toBe(650);
    });
  });
});