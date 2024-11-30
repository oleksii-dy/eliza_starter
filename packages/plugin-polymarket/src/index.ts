import {
    Action,
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    Provider,
    Plugin,
    State,
} from "@ai16z/eliza";
import axios from 'axios';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { getAllMarkets } from "./actions/getAllMarkets";
import { getMarketDetails } from "./actions/getMarketDetails";
import { getTradeableMarkets } from "./actions/getTradeableMarkets";
import { getTradeableEvents } from "./actions/getTradeableEvents";
import { buildOrder } from "./actions/buildOrder";
import { getUsdcBalance } from "./actions/getUsdcBalance";
import { getAllEvents } from "./actions/getAllEvents";
import { getOrderbook } from "./actions/getOrderbook";
import { getOrderbookPrice } from "./actions/getOrderbookPrice";

dotenv.config();

export interface Market {
  id: number;
  question: string;
  end: string;
  description: string;
  active: boolean;
  funded: boolean;
  rewardsMinSize: number;
  rewardsMaxSpread: number;
  spread: number;
  outcomes: string;
  outcome_prices: string;
  clob_token_ids: string;
}

export interface Event {
  id: number;
  ticker: string;
  slug: string;
  title: string;
  description: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  new: boolean;
  featured: boolean;
  restricted: boolean;
  end: string;
  markets: string;
}

export class PolymarketClient {
  private readonly gammaUrl = 'https://gamma-api.polymarket.com';
  private readonly gammaMarketsEndpoint: string;
  private readonly gammaEventsEndpoint: string;

  constructor() {
    this.gammaMarketsEndpoint = `${this.gammaUrl}/markets`;
    this.gammaEventsEndpoint = `${this.gammaUrl}/events`;
  }

  async getAllMarkets(): Promise<Market[]> {
    try {
      const response = await axios.get(this.gammaMarketsEndpoint);
      if (response.status === 200) {
        return response.data.map((market: any) => this.mapApiToMarket(market));
      }
      return [];
    } catch (error) {
      console.error('Error fetching markets:', error);
      return [];
    }
  }

  filterTradeableMarkets(markets: Market[]): Market[] {
    return markets.filter(market => market.active);
  }

  async getMarket(tokenId: string): Promise<Market | null> {
    try {
      const response = await axios.get(this.gammaMarketsEndpoint, {
        params: { clob_token_ids: tokenId }
      });

      if (response.status === 200 && response.data.length > 0) {
        return this.mapApiToMarket(response.data[0], tokenId);
      }
      return null;
    } catch (error) {
      console.error('Error fetching market:', error);
      return null;
    }
  }

  private mapApiToMarket(market: any, tokenId: string = ''): Market {
    return {
      id: parseInt(market.id),
      question: market.question,
      end: market.endDate,
      description: market.description,
      active: market.active,
      funded: market.funded,
      rewardsMinSize: parseFloat(market.rewardsMinSize),
      rewardsMaxSpread: parseFloat(market.rewardsMaxSpread),
      spread: parseFloat(market.spread),
      outcomes: String(market.outcomes),
      outcome_prices: String(market.outcomePrices),
      clob_token_ids: tokenId || String(market.clobTokenIds),
    };
  }

  async getUsdcBalance(): Promise<number> {
    try {
      const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');
      const usdcAddress = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
      const walletPrivateKey = process.env.POLYGON_WALLET_PRIVATE_KEY;

      if (!walletPrivateKey) {
        throw new Error('Private key not found in environment variables');
      }

      const wallet = new ethers.Wallet(walletPrivateKey, provider);
      const usdcAbi = ['function balanceOf(address) view returns (uint256)'];
      const usdcContract = new ethers.Contract(usdcAddress, usdcAbi, provider);

      const balance = await usdcContract.balanceOf(wallet.address);
      return Number(ethers.formatUnits(balance, 6)); // USDC has 6 decimals
    } catch (error) {
      console.error('Error getting USDC balance:', error);
      return 0;
    }
  }

  async executeMarketOrder(market: Market, amount: number): Promise<string> {
    try {
      // Implementation needed for market order execution
      throw new Error('Market order execution not implemented');
    } catch (error) {
      console.error('Error executing market order:', error);
      throw error;
    }
  }

  async getAllEvents(): Promise<Event[]> {
    try {
      const response = await axios.get(this.gammaEventsEndpoint);
      if (response.status === 200) {
        return response.data.map((event: any) => this.mapApiToEvent(event));
      }
      return [];
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  }

  filterEventsForTrading(events: Event[]): Event[] {
    return events.filter(event =>
      event.active &&
      !event.restricted &&
      !event.archived &&
      !event.closed
    );
  }

  private mapApiToEvent(event: any): Event {
    return {
      id: parseInt(event.id),
      ticker: event.ticker,
      slug: event.slug,
      title: event.title,
      description: event.description || '',
      active: event.active,
      closed: event.closed,
      archived: event.archived,
      new: event.new,
      featured: event.featured,
      restricted: event.restricted,
      end: event.endDate,
      markets: event.markets.map((m: any) => m.id).join(','),
    };
  }

  async getOrderbook(tokenId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.gammaUrl}/orderbook/${tokenId}`);
      if (response.status === 200) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching orderbook:', error);
      return null;
    }
  }

  async getOrderbookPrice(tokenId: string): Promise<number> {
    try {
      const response = await axios.get(`${this.gammaUrl}/price/${tokenId}`);
      if (response.status === 200) {
        return parseFloat(response.data);
      }
      return 0;
    } catch (error) {
      console.error('Error fetching price:', error);
      return 0;
    }
  }

  getAddressForPrivateKey(): string {
    const walletPrivateKey = process.env.POLYGON_WALLET_PRIVATE_KEY;
    if (!walletPrivateKey) {
      throw new Error('Private key not found in environment variables');
    }
    const wallet = new ethers.Wallet(walletPrivateKey);
    return wallet.address;
  }

  async buildOrder(
    marketToken: string,
    amount: number,
    nonce: string = Date.now().toString(),
    side: string = 'BUY',
    expiration: string = '0'
  ): Promise<any> {
    return {
      maker: this.getAddressForPrivateKey(),
      tokenId: marketToken,
      makerAmount: side === 'BUY' ? amount : 0,
      takerAmount: side === 'BUY' ? 0 : amount,
      feeRateBps: '1',
      nonce,
      side: side === 'BUY' ? 0 : 1,
      expiration,
    };
  }
}

export const polymarketActions = [
    getAllMarkets,
    getTradeableMarkets,
    getMarketDetails,
    getUsdcBalance,
    getAllEvents,
    getTradeableEvents,
    getOrderbook,
    getOrderbookPrice,
    buildOrder
] as const;

const polymarketProviders: Provider[] = [
  {
    name: "polymarket_provider",
    description: "Provider for Polymarket data and trading functionality",
    actions: polymarketActions,
  },
];

const polymarketPlugin: Plugin = {
  name: "polymarket-plugin",
  description: "Plugin for interacting with Polymarket prediction markets",
  actions: polymarketActions,
  evaluators: [],
  providers: polymarketProviders,
  services: [],
};

export default polymarketPlugin;