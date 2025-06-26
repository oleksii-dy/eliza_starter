// @ts-nocheck
/**
 * Grand Exchange System - RuneScape-style player economy and trading
 * Handles buy/sell orders, price tracking, and automated trading
 */

import { System } from '../../core/systems/System';
import type { World, Entity } from '../../types';
import { getItemDefinition, ItemDefinition } from './items/ItemDefinitions';

export enum OrderType {
  BUY = 'buy',
  SELL = 'sell'
}

export enum OrderStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  PARTIALLY_FILLED = 'partially_filled'
}

export interface GrandExchangeOffer {
  id: string;
  playerId: string;
  playerName: string;
  itemId: string;
  type: OrderType;
  quantity: number;
  pricePerItem: number;
  totalValue: number;
  quantityRemaining: number;
  status: OrderStatus;
  created: number;
  expires: number;
  lastUpdated: number;
}

export interface PriceHistory {
  itemId: string;
  timestamp: number;
  price: number;
  quantity: number;
  type: 'trade' | 'update';
}

export interface MarketData {
  itemId: string;
  currentPrice: number;
  dailyVolume: number;
  highPrice24h: number;
  lowPrice24h: number;
  priceChange24h: number;
  priceChangePercent: number;
  lastUpdated: number;
  activeOffers: {
    buy: number;
    sell: number;
  };
}

export interface GrandExchangeComponent {
  type: 'grand_exchange';
  activeOffers: string[]; // offer IDs
  completedOffers: string[];
  totalTradeValue: number;
  tradesCompleted: number;
  lastActivity: number;
}

export class GrandExchangeSystem extends System {
  private offers: Map<string, GrandExchangeOffer> = new Map();
  private marketData: Map<string, MarketData> = new Map();
  private priceHistory: Map<string, PriceHistory[]> = new Map();
  private offerCounter: number = 0;
  private readonly OFFER_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly MAX_OFFERS_PER_PLAYER = 8; // RuneScape limit
  private readonly PRICE_UPDATE_INTERVAL = 60000; // 1 minute
  private readonly MAX_PRICE_HISTORY = 1000; // per item

  constructor(world: World) {
    super(world);
    this.initializeMarketData();
  }

  async initialize(): Promise<void> {
    console.log('[GrandExchangeSystem] Initializing...');
    
    // Listen for GE events
    this.world.events.on('player:joined', this.handlePlayerJoined.bind(this));
    this.world.events.on('ge:place_buy_offer', this.handlePlaceBuyOffer.bind(this));
    this.world.events.on('ge:place_sell_offer', this.handlePlaceSellOffer.bind(this));
    this.world.events.on('ge:cancel_offer', this.handleCancelOffer.bind(this));
    this.world.events.on('ge:collect_offer', this.handleCollectOffer.bind(this));
    this.world.events.on('ge:view_market_data', this.handleViewMarketData.bind(this));
    this.world.events.on('ge:view_price_history', this.handleViewPriceHistory.bind(this));
    this.world.events.on('ge:search_items', this.handleSearchItems.bind(this));
    
    // Start market update timer
    setInterval(() => this.updateMarketData(), this.PRICE_UPDATE_INTERVAL);
    
    console.log('[GrandExchangeSystem] Initialized with market tracking');
  }

  private initializeMarketData(): void {
    // Initialize market data for all tradeable items
    const allItems = Object.values(require('./items/ItemDefinitions').ITEM_DEFINITIONS);
    
    for (const item of allItems) {
      if (item.tradeable) {
        this.marketData.set(item.id, {
          itemId: item.id,
          currentPrice: item.value, // Start with item's base value
          dailyVolume: 0,
          highPrice24h: item.value,
          lowPrice24h: item.value,
          priceChange24h: 0,
          priceChangePercent: 0,
          lastUpdated: Date.now(),
          activeOffers: {
            buy: 0,
            sell: 0
          }
        });
        
        this.priceHistory.set(item.id, []);
      }
    }
  }

  private handlePlayerJoined(data: any): void {
    const { entityId } = data;
    this.createGrandExchangeComponent(entityId);
  }

  public createGrandExchangeComponent(entityId: string): GrandExchangeComponent | null {
    const entity = this.world.getEntityById(entityId);
    if (!entity) return null;

    const geComponent: GrandExchangeComponent = {
      type: 'grand_exchange',
      activeOffers: [],
      completedOffers: [],
      totalTradeValue: 0,
      tradesCompleted: 0,
      lastActivity: Date.now()
    };

    entity.addComponent(geComponent);
    return geComponent;
  }

  private handlePlaceBuyOffer(data: any): void {
    const { playerId, itemId, quantity, pricePerItem } = data;
    this.placeBuyOffer(playerId, itemId, quantity, pricePerItem);
  }

  private handlePlaceSellOffer(data: any): void {
    const { playerId, itemId, quantity, pricePerItem } = data;
    this.placeSellOffer(playerId, itemId, quantity, pricePerItem);
  }

  private handleCancelOffer(data: any): void {
    const { playerId, offerId } = data;
    this.cancelOffer(playerId, offerId);
  }

  private handleCollectOffer(data: any): void {
    const { playerId, offerId } = data;
    this.collectOffer(playerId, offerId);
  }

  private handleViewMarketData(data: any): void {
    const { playerId, itemId } = data;
    const marketData = this.getMarketData(itemId);
    
    this.world.events.emit('ge:market_data_response', {
      playerId,
      itemId,
      marketData
    });
  }

  private handleViewPriceHistory(data: any): void {
    const { playerId, itemId, timeframe } = data;
    const history = this.getPriceHistory(itemId, timeframe);
    
    this.world.events.emit('ge:price_history_response', {
      playerId,
      itemId,
      history
    });
  }

  private handleSearchItems(data: any): void {
    const { playerId, searchTerm } = data;
    const results = this.searchTradeableItems(searchTerm);
    
    this.world.events.emit('ge:search_results', {
      playerId,
      searchTerm,
      results
    });
  }

  public placeBuyOffer(playerId: string, itemId: string, quantity: number, pricePerItem: number): boolean {
    const entity = this.world.getEntityById(playerId);
    const itemDef = getItemDefinition(itemId);
    
    if (!entity || !itemDef) {
      this.world.events.emit('ge:error', {
        playerId,
        message: 'Invalid item or player'
      });
      return false;
    }

    if (!itemDef.tradeable) {
      this.world.events.emit('ge:error', {
        playerId,
        message: 'This item cannot be traded'
      });
      return false;
    }

    const geComponent = entity.getComponent('grand_exchange') as GrandExchangeComponent;
    if (!geComponent) {
      this.world.events.emit('ge:error', {
        playerId,
        message: 'Grand Exchange component not found'
      });
      return false;
    }

    // Check offer limits
    if (geComponent.activeOffers.length >= this.MAX_OFFERS_PER_PLAYER) {
      this.world.events.emit('ge:error', {
        playerId,
        message: `Maximum ${this.MAX_OFFERS_PER_PLAYER} active offers allowed`
      });
      return false;
    }

    // Validate quantity and price
    if (quantity <= 0 || pricePerItem <= 0) {
      this.world.events.emit('ge:error', {
        playerId,
        message: 'Invalid quantity or price'
      });
      return false;
    }

    const totalCost = quantity * pricePerItem;
    
    // Check if player has enough coins
    const inventorySystem = this.world.systems.find(s => s.constructor.name === 'InventorySystem');
    if (!inventorySystem || !(inventorySystem as any).hasItem(playerId, 'coins', totalCost)) {
      this.world.events.emit('ge:error', {
        playerId,
        message: `You need ${totalCost} coins to place this buy offer`
      });
      return false;
    }

    // Remove coins from player
    (inventorySystem as any).removeItem(playerId, 'coins', totalCost);

    // Create buy offer
    const offerId = `buy_${this.offerCounter++}_${Date.now()}`;
    const offer: GrandExchangeOffer = {
      id: offerId,
      playerId,
      playerName: this.getPlayerName(playerId),
      itemId,
      type: OrderType.BUY,
      quantity,
      pricePerItem,
      totalValue: totalCost,
      quantityRemaining: quantity,
      status: OrderStatus.ACTIVE,
      created: Date.now(),
      expires: Date.now() + this.OFFER_DURATION,
      lastUpdated: Date.now()
    };

    this.offers.set(offerId, offer);
    geComponent.activeOffers.push(offerId);
    geComponent.lastActivity = Date.now();

    // Update market data
    this.updateActiveOfferCount(itemId);

    // Try to match with existing sell offers
    this.attemptMatching(offer);

    this.world.events.emit('ge:buy_offer_placed', {
      playerId,
      offerId,
      itemId,
      itemName: itemDef.name,
      quantity,
      pricePerItem,
      totalCost
    });

    return true;
  }

  public placeSellOffer(playerId: string, itemId: string, quantity: number, pricePerItem: number): boolean {
    const entity = this.world.getEntityById(playerId);
    const itemDef = getItemDefinition(itemId);
    
    if (!entity || !itemDef) {
      this.world.events.emit('ge:error', {
        playerId,
        message: 'Invalid item or player'
      });
      return false;
    }

    if (!itemDef.tradeable) {
      this.world.events.emit('ge:error', {
        playerId,
        message: 'This item cannot be traded'
      });
      return false;
    }

    const geComponent = entity.getComponent('grand_exchange') as GrandExchangeComponent;
    if (!geComponent) {
      this.world.events.emit('ge:error', {
        playerId,
        message: 'Grand Exchange component not found'
      });
      return false;
    }

    // Check offer limits
    if (geComponent.activeOffers.length >= this.MAX_OFFERS_PER_PLAYER) {
      this.world.events.emit('ge:error', {
        playerId,
        message: `Maximum ${this.MAX_OFFERS_PER_PLAYER} active offers allowed`
      });
      return false;
    }

    // Validate quantity and price
    if (quantity <= 0 || pricePerItem <= 0) {
      this.world.events.emit('ge:error', {
        playerId,
        message: 'Invalid quantity or price'
      });
      return false;
    }

    // Check if player has the items
    const inventorySystem = this.world.systems.find(s => s.constructor.name === 'InventorySystem');
    if (!inventorySystem || !(inventorySystem as any).hasItem(playerId, itemId, quantity)) {
      this.world.events.emit('ge:error', {
        playerId,
        message: `You need ${quantity} ${itemDef.name} to place this sell offer`
      });
      return false;
    }

    // Remove items from player
    (inventorySystem as any).removeItem(playerId, itemId, quantity);

    // Create sell offer
    const offerId = `sell_${this.offerCounter++}_${Date.now()}`;
    const offer: GrandExchangeOffer = {
      id: offerId,
      playerId,
      playerName: this.getPlayerName(playerId),
      itemId,
      type: OrderType.SELL,
      quantity,
      pricePerItem,
      totalValue: quantity * pricePerItem,
      quantityRemaining: quantity,
      status: OrderStatus.ACTIVE,
      created: Date.now(),
      expires: Date.now() + this.OFFER_DURATION,
      lastUpdated: Date.now()
    };

    this.offers.set(offerId, offer);
    geComponent.activeOffers.push(offerId);
    geComponent.lastActivity = Date.now();

    // Update market data
    this.updateActiveOfferCount(itemId);

    // Try to match with existing buy offers
    this.attemptMatching(offer);

    this.world.events.emit('ge:sell_offer_placed', {
      playerId,
      offerId,
      itemId,
      itemName: itemDef.name,
      quantity,
      pricePerItem,
      totalValue: quantity * pricePerItem
    });

    return true;
  }

  private attemptMatching(newOffer: GrandExchangeOffer): void {
    const oppositeType = newOffer.type === OrderType.BUY ? OrderType.SELL : OrderType.BUY;
    
    // Get matching offers sorted by best price
    const matchingOffers = Array.from(this.offers.values())
      .filter(offer => 
        offer.itemId === newOffer.itemId &&
        offer.type === oppositeType &&
        offer.status === OrderStatus.ACTIVE &&
        offer.playerId !== newOffer.playerId && // Can't trade with yourself
        this.canOffersMatch(newOffer, offer)
      )
      .sort((a, b) => {
        // For buy offers, sort by highest price first
        // For sell offers, sort by lowest price first
        if (oppositeType === OrderType.BUY) {
          return b.pricePerItem - a.pricePerItem;
        } else {
          return a.pricePerItem - b.pricePerItem;
        }
      });

    // Process matches
    for (const matchingOffer of matchingOffers) {
      if (newOffer.quantityRemaining <= 0) break;
      
      this.executeTrade(newOffer, matchingOffer);
    }
  }

  private canOffersMatch(buyOffer: GrandExchangeOffer, sellOffer: GrandExchangeOffer): boolean {
    // Determine which is buy and which is sell
    const actualBuyOffer = buyOffer.type === OrderType.BUY ? buyOffer : sellOffer;
    const actualSellOffer = buyOffer.type === OrderType.SELL ? buyOffer : sellOffer;
    
    // Buy price must be >= sell price for a match
    return actualBuyOffer.pricePerItem >= actualSellOffer.pricePerItem;
  }

  private executeTrade(offer1: GrandExchangeOffer, offer2: GrandExchangeOffer): void {
    const buyOffer = offer1.type === OrderType.BUY ? offer1 : offer2;
    const sellOffer = offer1.type === OrderType.SELL ? offer1 : offer2;
    
    // Determine trade quantity (minimum of both remaining quantities)
    const tradeQuantity = Math.min(buyOffer.quantityRemaining, sellOffer.quantityRemaining);
    
    // Trade price is the seller's price (seller gets their asking price)
    const tradePrice = sellOffer.pricePerItem;
    const totalTradeValue = tradeQuantity * tradePrice;
    
    // Update offer quantities
    buyOffer.quantityRemaining -= tradeQuantity;
    sellOffer.quantityRemaining -= tradeQuantity;
    buyOffer.lastUpdated = Date.now();
    sellOffer.lastUpdated = Date.now();
    
    // Update statuses
    if (buyOffer.quantityRemaining === 0) {
      buyOffer.status = OrderStatus.COMPLETED;
    } else {
      buyOffer.status = OrderStatus.PARTIALLY_FILLED;
    }
    
    if (sellOffer.quantityRemaining === 0) {
      sellOffer.status = OrderStatus.COMPLETED;
    } else {
      sellOffer.status = OrderStatus.PARTIALLY_FILLED;
    }

    // Execute the trade
    const inventorySystem = this.world.systems.find(s => s.constructor.name === 'InventorySystem');
    if (inventorySystem) {
      // Give items to buyer
      (inventorySystem as any).addItem(buyOffer.playerId, buyOffer.itemId, tradeQuantity);
      
      // Give coins to seller
      (inventorySystem as any).addItem(sellOffer.playerId, 'coins', totalTradeValue);
      
      // If buyer paid more than trade price, refund the difference
      const buyerOverpayment = (buyOffer.pricePerItem - tradePrice) * tradeQuantity;
      if (buyerOverpayment > 0) {
        (inventorySystem as any).addItem(buyOffer.playerId, 'coins', buyerOverpayment);
      }
    }

    // Update player stats
    this.updatePlayerTradeStats(buyOffer.playerId, totalTradeValue);
    this.updatePlayerTradeStats(sellOffer.playerId, totalTradeValue);

    // Record price history
    this.recordPriceHistory(buyOffer.itemId, tradePrice, tradeQuantity);

    // Update market data
    this.updateMarketDataFromTrade(buyOffer.itemId, tradePrice, tradeQuantity);

    // Emit trade events
    this.world.events.emit('ge:trade_executed', {
      buyerId: buyOffer.playerId,
      sellerId: sellOffer.playerId,
      itemId: buyOffer.itemId,
      quantity: tradeQuantity,
      pricePerItem: tradePrice,
      totalValue: totalTradeValue,
      buyOfferId: buyOffer.id,
      sellOfferId: sellOffer.id
    });

    // Move completed offers to completed list
    if (buyOffer.status === OrderStatus.COMPLETED) {
      this.moveOfferToCompleted(buyOffer.playerId, buyOffer.id);
    }
    
    if (sellOffer.status === OrderStatus.COMPLETED) {
      this.moveOfferToCompleted(sellOffer.playerId, sellOffer.id);
    }
  }

  public cancelOffer(playerId: string, offerId: string): boolean {
    const offer = this.offers.get(offerId);
    
    if (!offer || offer.playerId !== playerId) {
      this.world.events.emit('ge:error', {
        playerId,
        message: 'Offer not found or not owned by you'
      });
      return false;
    }

    if (offer.status !== OrderStatus.ACTIVE && offer.status !== OrderStatus.PARTIALLY_FILLED) {
      this.world.events.emit('ge:error', {
        playerId,
        message: 'Cannot cancel completed or cancelled offer'
      });
      return false;
    }

    // Refund items/coins
    const inventorySystem = this.world.systems.find(s => s.constructor.name === 'InventorySystem');
    if (inventorySystem) {
      if (offer.type === OrderType.BUY) {
        // Refund remaining coins
        const refundAmount = offer.quantityRemaining * offer.pricePerItem;
        (inventorySystem as any).addItem(playerId, 'coins', refundAmount);
      } else {
        // Refund remaining items
        (inventorySystem as any).addItem(playerId, offer.itemId, offer.quantityRemaining);
      }
    }

    // Update offer status
    offer.status = OrderStatus.CANCELLED;
    offer.lastUpdated = Date.now();

    // Remove from active offers
    const entity = this.world.getEntityById(playerId);
    if (entity) {
      const geComponent = entity.getComponent('grand_exchange') as GrandExchangeComponent;
      if (geComponent) {
        const index = geComponent.activeOffers.indexOf(offerId);
        if (index !== -1) {
          geComponent.activeOffers.splice(index, 1);
        }
        geComponent.completedOffers.push(offerId);
      }
    }

    // Update market data
    this.updateActiveOfferCount(offer.itemId);

    this.world.events.emit('ge:offer_cancelled', {
      playerId,
      offerId,
      itemId: offer.itemId,
      refundAmount: offer.type === OrderType.BUY ? offer.quantityRemaining * offer.pricePerItem : offer.quantityRemaining,
      refundType: offer.type === OrderType.BUY ? 'coins' : 'items'
    });

    return true;
  }

  public collectOffer(playerId: string, offerId: string): boolean {
    const offer = this.offers.get(offerId);
    
    if (!offer || offer.playerId !== playerId) {
      this.world.events.emit('ge:error', {
        playerId,
        message: 'Offer not found or not owned by you'
      });
      return false;
    }

    if (offer.status !== OrderStatus.COMPLETED) {
      this.world.events.emit('ge:error', {
        playerId,
        message: 'Offer is not ready for collection'
      });
      return false;
    }

    // Remove from completed offers
    const entity = this.world.getEntityById(playerId);
    if (entity) {
      const geComponent = entity.getComponent('grand_exchange') as GrandExchangeComponent;
      if (geComponent) {
        const index = geComponent.completedOffers.indexOf(offerId);
        if (index !== -1) {
          geComponent.completedOffers.splice(index, 1);
        }
      }
    }

    // Remove offer from system
    this.offers.delete(offerId);

    this.world.events.emit('ge:offer_collected', {
      playerId,
      offerId,
      itemId: offer.itemId
    });

    return true;
  }

  private moveOfferToCompleted(playerId: string, offerId: string): void {
    const entity = this.world.getEntityById(playerId);
    if (!entity) return;

    const geComponent = entity.getComponent('grand_exchange') as GrandExchangeComponent;
    if (!geComponent) return;

    const activeIndex = geComponent.activeOffers.indexOf(offerId);
    if (activeIndex !== -1) {
      geComponent.activeOffers.splice(activeIndex, 1);
      geComponent.completedOffers.push(offerId);
    }
  }

  private updatePlayerTradeStats(playerId: string, tradeValue: number): void {
    const entity = this.world.getEntityById(playerId);
    if (!entity) return;

    const geComponent = entity.getComponent('grand_exchange') as GrandExchangeComponent;
    if (!geComponent) return;

    geComponent.totalTradeValue += tradeValue;
    geComponent.tradesCompleted++;
    geComponent.lastActivity = Date.now();
  }

  private recordPriceHistory(itemId: string, price: number, quantity: number): void {
    const history = this.priceHistory.get(itemId) || [];
    
    history.push({
      itemId,
      timestamp: Date.now(),
      price,
      quantity,
      type: 'trade'
    });

    // Keep only recent history
    if (history.length > this.MAX_PRICE_HISTORY) {
      history.splice(0, history.length - this.MAX_PRICE_HISTORY);
    }

    this.priceHistory.set(itemId, history);
  }

  private updateMarketDataFromTrade(itemId: string, price: number, quantity: number): void {
    const marketData = this.marketData.get(itemId);
    if (!marketData) return;

    const oldPrice = marketData.currentPrice;
    
    // Update current price (weighted average with recent trades)
    const weight = Math.min(quantity / 100, 0.1); // Max 10% price change per trade
    marketData.currentPrice = Math.round(marketData.currentPrice * (1 - weight) + price * weight);
    
    // Update daily stats
    marketData.dailyVolume += quantity;
    marketData.highPrice24h = Math.max(marketData.highPrice24h, price);
    marketData.lowPrice24h = Math.min(marketData.lowPrice24h, price);
    marketData.priceChange24h = marketData.currentPrice - oldPrice;
    marketData.priceChangePercent = oldPrice > 0 ? (marketData.priceChange24h / oldPrice) * 100 : 0;
    marketData.lastUpdated = Date.now();
  }

  private updateActiveOfferCount(itemId: string): void {
    const marketData = this.marketData.get(itemId);
    if (!marketData) return;

    const activeOffers = Array.from(this.offers.values())
      .filter(offer => offer.itemId === itemId && offer.status === OrderStatus.ACTIVE);

    marketData.activeOffers.buy = activeOffers.filter(o => o.type === OrderType.BUY).length;
    marketData.activeOffers.sell = activeOffers.filter(o => o.type === OrderType.SELL).length;
  }

  private updateMarketData(): void {
    // Clean up expired offers
    this.cleanupExpiredOffers();
    
    // Update market data for all items
    for (const [itemId, marketData] of this.marketData) {
      this.updateActiveOfferCount(itemId);
      
      // Reset daily stats if it's a new day
      const now = Date.now();
      const daysSinceUpdate = (now - marketData.lastUpdated) / (24 * 60 * 60 * 1000);
      
      if (daysSinceUpdate >= 1) {
        marketData.dailyVolume = 0;
        marketData.priceChange24h = 0;
        marketData.priceChangePercent = 0;
        marketData.highPrice24h = marketData.currentPrice;
        marketData.lowPrice24h = marketData.currentPrice;
      }
    }
  }

  private cleanupExpiredOffers(): void {
    const now = Date.now();
    const expiredOffers = Array.from(this.offers.values())
      .filter(offer => 
        offer.status === OrderStatus.ACTIVE && 
        offer.expires < now
      );

    for (const offer of expiredOffers) {
      this.cancelOffer(offer.playerId, offer.id);
    }
  }

  private getPlayerName(playerId: string): string {
    const entity = this.world.getEntityById(playerId);
    return entity?.data?.name || `Player_${playerId.slice(-6)}`;
  }

  private searchTradeableItems(searchTerm: string): ItemDefinition[] {
    const allItems = Object.values(require('./items/ItemDefinitions').ITEM_DEFINITIONS);
    const term = searchTerm.toLowerCase();
    
    return allItems
      .filter(item => 
        item.tradeable && 
        item.name.toLowerCase().includes(term)
      )
      .slice(0, 20); // Limit results
  }

  public getMarketData(itemId: string): MarketData | null {
    return this.marketData.get(itemId) || null;
  }

  public getPriceHistory(itemId: string, timeframe?: number): PriceHistory[] {
    const history = this.priceHistory.get(itemId) || [];
    
    if (!timeframe) return history;
    
    const cutoff = Date.now() - timeframe;
    return history.filter(entry => entry.timestamp >= cutoff);
  }

  public getPlayerOffers(playerId: string): { active: GrandExchangeOffer[], completed: GrandExchangeOffer[] } {
    const entity = this.world.getEntityById(playerId);
    if (!entity) return { active: [], completed: [] };

    const geComponent = entity.getComponent('grand_exchange') as GrandExchangeComponent;
    if (!geComponent) return { active: [], completed: [] };

    const active = geComponent.activeOffers
      .map(id => this.offers.get(id))
      .filter(offer => offer) as GrandExchangeOffer[];

    const completed = geComponent.completedOffers
      .map(id => this.offers.get(id))
      .filter(offer => offer) as GrandExchangeOffer[];

    return { active, completed };
  }

  public getGrandExchangeComponent(playerId: string): GrandExchangeComponent | null {
    const entity = this.world.getEntityById(playerId);
    return entity ? entity.getComponent('grand_exchange') as GrandExchangeComponent : null;
  }

  update(deltaTime: number): void {
    // Periodic cleanup and market updates are handled by intervals
  }

  serialize(): any {
    return {
      offers: Object.fromEntries(this.offers),
      marketData: Object.fromEntries(this.marketData),
      priceHistory: Object.fromEntries(this.priceHistory),
      offerCounter: this.offerCounter
    };
  }

  deserialize(data: any): void {
    if (data.offers) {
      this.offers = new Map(Object.entries(data.offers));
    }
    if (data.marketData) {
      this.marketData = new Map(Object.entries(data.marketData));
    }
    if (data.priceHistory) {
      this.priceHistory = new Map(Object.entries(data.priceHistory));
    }
    if (data.offerCounter) {
      this.offerCounter = data.offerCounter;
    }
  }
}