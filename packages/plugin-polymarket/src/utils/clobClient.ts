import { type IAgentRuntime, logger } from '@elizaos/core';
import type {
  MarketsResponse,
  Market,
  OrderBook,
  TokenPrice,
  MarketFilters,
  SimplifiedMarketsResponse,
  SimplifiedMarket,
  OrderArgs,
  SignedOrder,
  OrderResponse,
  OrderType,
  DetailedOrder,
  AreOrdersScoringRequest,
  AreOrdersScoringResponse,
  GetOpenOrdersParams,
  OpenOrder,
  GetTradesParams,
  TradesResponse,
  TradeEntry,
  ApiKey,
  ApiKeysResponse,
} from '../types';
import { OrderSide } from '../types';

/**
 * Book parameters for bulk order book requests
 */
export interface BookParams {
  token_id: string;
}

/**
 * Midpoint price response
 */
export interface MidpointPrice {
  mid: string;
}

/**
 * Spread response
 */
export interface SpreadPrice {
  spread: string;
}

/**
 * Price history point
 */
export interface PricePoint {
  t: number; // timestamp
  p: number; // price
}

/**
 * Price history response
 */
export interface PriceHistoryResponse {
  history: PricePoint[];
}

/**
 * Simple CLOB client interface for Polymarket API calls
 */
export interface ClobClient {
  getMarkets(nextCursor?: string, filters?: MarketFilters): Promise<MarketsResponse>;
  getSamplingMarkets(nextCursor?: string): Promise<MarketsResponse>;
  getSimplifiedMarkets(nextCursor?: string): Promise<SimplifiedMarketsResponse>;
  getMarket(conditionId: string): Promise<Market>;
  getBook(tokenId: string): Promise<OrderBook>;
  getOrderBooks(params: BookParams[]): Promise<OrderBook[]>;
  getPrices(tokenIds: string[]): Promise<TokenPrice[]>;
  getPrice(tokenId: string, side: string): Promise<{ price: string }>;
  getMidpoint(tokenId: string): Promise<MidpointPrice>;
  getSpread(tokenId: string): Promise<SpreadPrice>;
  getPricesHistory(tokenId: string, interval: string): Promise<PricePoint[]>;
  createOrder(orderArgs: OrderArgs): Promise<SignedOrder>;
  postOrder(signedOrder: SignedOrder, orderType: OrderType): Promise<OrderResponse>;
  getOrder(orderId: string): Promise<DetailedOrder>;
  areOrdersScoring(orderIds: string[]): Promise<AreOrdersScoringResponse>;
  getOpenOrders(params: GetOpenOrdersParams): Promise<OpenOrder[]>;
  getTrades(params: GetTradesParams): Promise<TradesResponse>;
  getApiKeys(): Promise<ApiKeysResponse>;
}

/**
 * Basic CLOB client implementation using fetch
 */
class SimpleClobClient implements ClobClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (apiKey) {
      this.headers['Authorization'] = `Bearer ${apiKey}`;
    }
  }

  async getMarkets(nextCursor?: string, filters?: MarketFilters): Promise<MarketsResponse> {
    const url = new URL(`${this.baseUrl}/markets`);
    if (nextCursor) {
      url.searchParams.set('next_cursor', nextCursor);
    }

    // Apply filters if provided
    if (filters) {
      if (filters.category) {
        url.searchParams.set('category', filters.category);
      }
      if (filters.active !== undefined) {
        url.searchParams.set('active', filters.active.toString());
      }
      if (filters.limit) {
        url.searchParams.set('limit', filters.limit.toString());
      }
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`CLOB API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<MarketsResponse>;
  }

  async getSamplingMarkets(nextCursor?: string): Promise<MarketsResponse> {
    const url = new URL(`${this.baseUrl}/sampling-markets`);
    if (nextCursor) {
      url.searchParams.set('next_cursor', nextCursor);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`CLOB API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<MarketsResponse>;
  }

  async getSimplifiedMarkets(nextCursor?: string): Promise<SimplifiedMarketsResponse> {
    const url = new URL(`${this.baseUrl}/simplified-markets`);
    if (nextCursor) {
      url.searchParams.set('next_cursor', nextCursor);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`CLOB API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<SimplifiedMarketsResponse>;
  }

  async getMarket(conditionId: string): Promise<Market> {
    const response = await fetch(`${this.baseUrl}/markets/${conditionId}`, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`CLOB API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<Market>;
  }

  async getBook(tokenId: string): Promise<OrderBook> {
    const response = await fetch(`${this.baseUrl}/book?token_id=${tokenId}`, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`CLOB API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<OrderBook>;
  }

  async getOrderBooks(params: BookParams[]): Promise<OrderBook[]> {
    const response = await fetch(`${this.baseUrl}/books`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ params }),
    });

    if (!response.ok) {
      throw new Error(`CLOB API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<OrderBook[]>;
  }

  async getPrices(tokenIds: string[]): Promise<TokenPrice[]> {
    const url = new URL(`${this.baseUrl}/prices`);
    tokenIds.forEach((id) => url.searchParams.append('token_id', id));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`CLOB API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<TokenPrice[]>;
  }

  async getPrice(tokenId: string, side: string): Promise<{ price: string }> {
    const response = await fetch(`${this.baseUrl}/price?token_id=${tokenId}&side=${side}`, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`CLOB API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<{ price: string }>;
  }

  async getMidpoint(tokenId: string): Promise<MidpointPrice> {
    const response = await fetch(`${this.baseUrl}/midpoint?token_id=${tokenId}`, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`CLOB API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<MidpointPrice>;
  }

  async getSpread(tokenId: string): Promise<SpreadPrice> {
    const response = await fetch(`${this.baseUrl}/spread?token_id=${tokenId}`, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`CLOB API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<SpreadPrice>;
  }

  async getPricesHistory(tokenId: string, interval: string): Promise<PricePoint[]> {
    const response = await fetch(
      `${this.baseUrl}/prices-history?market=${tokenId}&interval=${interval}`,
      {
        method: 'GET',
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(`CLOB API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as PriceHistoryResponse;
    return result.history || [];
  }

  async getOrder(orderId: string): Promise<DetailedOrder> {
    const response = await fetch(`${this.baseUrl}/data/order/${orderId}`, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      // Attempt to parse error from response body for more details
      try {
        const errorData = await response.json() as { message?: string; error?: string };
        const errorMessage = errorData?.message || errorData?.error || response.statusText;
        throw new Error(`CLOB API error: ${response.status} ${errorMessage}`);
      } catch (e) {
        // Fallback if error body parsing fails
        throw new Error(`CLOB API error: ${response.status} ${response.statusText}`);
      }
    }

    return response.json() as Promise<DetailedOrder>;
  }

  async areOrdersScoring(orderIds: string[]): Promise<AreOrdersScoringResponse> {
    const payload: AreOrdersScoringRequest = { order_ids: orderIds };
    const response = await fetch(`${this.baseUrl}/orders-scoring`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      try {
        const errorData = await response.json() as { message?: string; error?: string; detail?: string };
        const errorMessage = errorData?.message || errorData?.error || errorData?.detail || response.statusText;
        throw new Error(`CLOB API error (${response.status}): ${errorMessage}`);
      } catch (e) {
        throw new Error(`CLOB API error: ${response.status} ${response.statusText}`);
      }
    }
    return response.json() as Promise<AreOrdersScoringResponse>;
  }

  async getOpenOrders(params: GetOpenOrdersParams): Promise<OpenOrder[]> {
    const url = new URL(`${this.baseUrl}/data/orders`);
    if (params.market) url.searchParams.set('market', params.market);
    if (params.assetId) url.searchParams.set('asset_id', params.assetId);
    if (params.address) url.searchParams.set('address', params.address);
    if (params.nextCursor) url.searchParams.set('next_cursor', params.nextCursor);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      try {
        const errorData = await response.json() as { message?: string; error?: string; detail?: string };
        const errorMessage = errorData?.message || errorData?.error || errorData?.detail || response.statusText;
        throw new Error(`CLOB API error (${response.status}): ${errorMessage}`);
      } catch (e) {
        throw new Error(`CLOB API error: ${response.status} ${response.statusText}`);
      }
    }
    // The API returns an object with a "data" field which is the array of orders, and a "next_cursor" field.
    // For now, we just return the data array as per the Promise<OpenOrder[]> signature.
    // We might need to adjust this if pagination control directly from the client method is needed later.
    const result = await response.json() as { data: OpenOrder[]; next_cursor: string };
    return result.data;
  }

  async getTrades(params: GetTradesParams): Promise<TradesResponse> {
    const url = new URL(`${this.baseUrl}/data/trades`);
    if (params.user_address) url.searchParams.set('user_address', params.user_address);
    if (params.market_id) url.searchParams.set('market_id', params.market_id);
    if (params.token_id) url.searchParams.set('token_id', params.token_id);
    if (params.from_timestamp) url.searchParams.set('from_timestamp', params.from_timestamp.toString());
    if (params.to_timestamp) url.searchParams.set('to_timestamp', params.to_timestamp.toString());
    if (params.limit) url.searchParams.set('limit', params.limit.toString());
    if (params.next_cursor) url.searchParams.set('next_cursor', params.next_cursor);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      try {
        const errorData = await response.json() as { message?: string; error?: string; detail?: string };
        const errorMessage = errorData?.message || errorData?.error || errorData?.detail || response.statusText;
        throw new Error(`CLOB API error (${response.status}) getting trades: ${errorMessage}`);
      } catch (e) {
        throw new Error(`CLOB API error: ${response.status} ${response.statusText} while getting trades`);
      }
    }
    return response.json() as Promise<TradesResponse>;
  }

  async getApiKeys(): Promise<ApiKeysResponse> {
    if (!this.headers['Authorization']) {
      throw new Error('CLOB_API_KEY is required for getApiKeys method.');
    }
    const response = await fetch(`${this.baseUrl}/auth/api-keys`, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      try {
        const errorData = await response.json() as { message?: string; error?: string; detail?: string };
        const errorMessage = errorData?.message || errorData?.error || errorData?.detail || response.statusText;
        throw new Error(`CLOB API error (${response.status}) getting API keys: ${errorMessage}`);
      } catch (e) {
        throw new Error(`CLOB API error: ${response.status} ${response.statusText} while getting API keys`);
      }
    }
    return response.json() as Promise<ApiKeysResponse>;
  }

  async createOrder(orderArgs: OrderArgs): Promise<SignedOrder> {
    // Note: This is a simplified implementation
    // Real implementation would require proper wallet signing
    // and order utilities for signature generation

    const now = Math.floor(Date.now() / 1000);
    const salt = Math.floor(Math.random() * 1000000);

    // Create mock signed order structure
    const signedOrder: SignedOrder = {
      salt: salt,
      maker: '0x0000000000000000000000000000000000000000', // Would be user's address
      signer: '0x0000000000000000000000000000000000000000', // Would be user's address
      taker: '0x0000000000000000000000000000000000000000', // Would be operator address
      tokenId: orderArgs.tokenId,
      makerAmount: (
        orderArgs.size * (orderArgs.side === OrderSide.BUY ? orderArgs.price : 1)
      ).toString(),
      takerAmount: (
        orderArgs.size * (orderArgs.side === OrderSide.BUY ? 1 : orderArgs.price)
      ).toString(),
      expiration: (orderArgs.expiration || now + 86400).toString(), // Default 24h expiration
      nonce: (orderArgs.nonce || now).toString(),
      feeRateBps: orderArgs.feeRateBps || '0',
      side: orderArgs.side === OrderSide.BUY ? '0' : '1',
      signatureType: 0,
      signature: '0x00', // Would be actual signature
    };

    return signedOrder;
  }

  async postOrder(signedOrder: SignedOrder, orderType: OrderType): Promise<OrderResponse> {
    // Note: This is a mock implementation
    // Real implementation would post to the CLOB API
    // For demonstration purposes, we'll return a mock response

    logger.warn(
      '[ClobClient] postOrder called with mock implementation - order not actually placed'
    );

    return {
      success: false,
      errorMsg:
        'Mock implementation - order creation not fully implemented. Real implementation requires wallet integration and proper signing.',
      orderId: undefined,
      orderHashes: [],
      status: 'unmatched',
    };
  }
}

/**
 * Initialize CLOB client with runtime configuration
 * @param runtime - The agent runtime containing configuration
 * @returns Configured CLOB client instance
 */
export async function initializeClobClient(runtime: IAgentRuntime): Promise<ClobClient> {
  const clobApiUrl = runtime.getSetting('CLOB_API_URL') || 'https://clob.polymarket.com';
  const apiKey = runtime.getSetting('CLOB_API_KEY'); // Optional for read-only operations

  logger.info(`[initializeClobClient] Initializing CLOB client with URL: ${clobApiUrl}`);

  const client = new SimpleClobClient(clobApiUrl, apiKey);

  // Test connection
  try {
    await client.getMarkets('');
    logger.info('[initializeClobClient] CLOB client initialized successfully');
  } catch (error) {
    logger.warn('[initializeClobClient] CLOB client test failed, but continuing:', error);
    // Don't throw here - let individual actions handle the error
  }

  return client;
}
