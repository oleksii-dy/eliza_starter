/**
 * TypeScript interfaces for Polymarket CLOB API
 * Based on official CLOB documentation: https://docs.polymarket.com/developers/CLOB/markets/get-markets
 */

/**
 * Token object representing a binary outcome in a prediction market
 */
export interface Token {
  /** ERC1155 token ID */
  token_id: string;
  /** Human readable outcome (e.g., "YES", "NO") */
  outcome: string;
}

/**
 * Rewards configuration for a market
 */
export interface Rewards {
  /** Minimum size of an order to score rewards */
  min_size: number;
  /** Maximum spread from the midpoint until an order scores */
  max_spread: number;
  /** String date when the event starts */
  event_start_date: string;
  /** String date when the event ends */
  event_end_date: string;
  /** Reward multiplier while the game has started */
  in_game_multiplier: number;
  /** Current reward epoch */
  reward_epoch: number;
}

/**
 * Market object representing a Polymarket prediction market
 */
export interface Market {
  /** ID of market which is also the CTF condition ID */
  condition_id: string;
  /** Question ID of market which is the CTF question ID used to derive the condition_id */
  question_id: string;
  /** Binary token pair for market */
  tokens: [Token, Token];
  /** Rewards related data */
  rewards: Rewards;
  /** Minimum limit order size */
  minimum_order_size: string;
  /** Minimum tick size in units of implied probability (max price resolution) */
  minimum_tick_size: string;
  /** Market category */
  category: string;
  /** ISO string of market end date */
  end_date_iso: string;
  /** ISO string of game start time which is used to trigger delay */
  game_start_time: string;
  /** Market question */
  question: string;
  /** Slug of market */
  market_slug: string;
  /** Minimum resting order size for incentive qualification */
  min_incentive_size: string;
  /** Max spread up to which orders are qualified for incentives (in cents) */
  max_incentive_spread: string;
  /** Boolean indicating whether market is active/live */
  active: boolean;
  /** Boolean indicating whether market is closed/open */
  closed: boolean;
  /** Seconds of match delay for in-game trade */
  seconds_delay: number;
  /** Reference to the market icon image */
  icon: string;
  /** Address of associated fixed product market maker on Polygon network */
  fpmm: string;
}

/**
 * Simplified market object with reduced fields
 * Based on: https://docs.polymarket.com/developers/CLOB/markets/get-simplified-markets
 */
export interface SimplifiedMarket {
  /** ID of market which is also the CTF condition ID */
  condition_id: string;
  /** Binary token pair for market */
  tokens: [Token, Token];
  /** Rewards related data */
  rewards: Rewards;
  /** Minimum resting order size for incentive qualification */
  min_incentive_size: string;
  /** Max spread up to which orders are qualified for incentives (in cents) */
  max_incentive_spread: string;
  /** Boolean indicating whether market is active/live */
  active: boolean;
  /** Boolean indicating whether market is closed/open */
  closed: boolean;
}

/**
 * Paginated response for markets API
 */
export interface MarketsResponse {
  /** Limit of results in a single page */
  limit: number;
  /** Number of results */
  count: number;
  /** Pagination item to retrieve the next page base64 encoded. 'LTE=' means the end and empty ("") means the beginning */
  next_cursor: string;
  /** List of markets */
  data: Market[];
}

/**
 * Paginated response for simplified markets API
 */
export interface SimplifiedMarketsResponse {
  /** Limit of results in a single page */
  limit: number;
  /** Number of results */
  count: number;
  /** Pagination item to retrieve the next page base64 encoded. 'LTE=' means the end and empty ("") means the beginning */
  next_cursor: string;
  /** List of simplified markets */
  data: SimplifiedMarket[];
}

/**
 * Order book entry
 */
export interface BookEntry {
  /** Price level */
  price: string;
  /** Size at this price level */
  size: string;
}

/**
 * Order book data
 */
export interface OrderBook {
  /** Market condition ID */
  market: string;
  /** Token ID */
  asset_id: string;
  /** Buy orders (bids) */
  bids: BookEntry[];
  /** Sell orders (asks) */
  asks: BookEntry[];
}

/**
 * Price data for a token
 */
export interface TokenPrice {
  /** Token ID */
  token_id: string;
  /** Current price */
  price: string;
}

/**
 * Filter parameters for markets API
 */
export interface MarketFilters {
  /** Category filter */
  category?: string;
  /** Active status filter */
  active?: boolean;
  /** Result limit */
  limit?: number;
  /** Pagination cursor */
  next_cursor?: string;
}

/**
 * Order parameters for creating orders
 */
export interface OrderParams {
  /** Token ID to trade */
  tokenId: string;
  /** Order side */
  side: 'BUY' | 'SELL';
  /** Price per share (0-1.0) */
  price: number;
  /** Order size */
  size: number;
  /** Fee rate in basis points */
  feeRateBps: string;
  /** Nonce for order uniqueness */
  nonce?: number;
}

/**
 * Trade data
 */
export interface Trade {
  /** Trade ID */
  id: string;
  /** Market condition ID */
  market: string;
  /** Token ID */
  asset_id: string;
  /** Trade side */
  side: 'BUY' | 'SELL';
  /** Trade price */
  price: string;
  /** Trade size */
  size: string;
  /** Trade timestamp */
  timestamp: string;
  /** Trade status */
  status: 'MATCHED' | 'MINED' | 'CONFIRMED' | 'RETRYING' | 'FAILED';
}

/**
 * User position in a market
 */
export interface Position {
  /** Market condition ID */
  market: string;
  /** Token ID */
  asset_id: string;
  /** Position size */
  size: string;
  /** Average price */
  average_price: string;
  /** Realized PnL */
  realized_pnl: string;
  /** Unrealized PnL */
  unrealized_pnl: string;
}

/**
 * User balance data
 */
export interface Balance {
  /** Asset address */
  asset: string;
  /** Balance amount */
  balance: string;
  /** Asset symbol */
  symbol: string;
  /** Asset decimals */
  decimals: number;
}

/**
 * Error response from CLOB API
 */
export interface ClobError {
  /** Error message */
  error: string;
  /** Error details */
  details?: string;
  /** HTTP status code */
  status?: number;
}

/**
 * Order side enumeration
 */
export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL',
}

/**
 * Order type enumeration
 */
export enum OrderType {
  GTC = 'GTC', // Good Till Cancelled
  FOK = 'FOK', // Fill Or Kill
  GTD = 'GTD', // Good Till Date
  FAK = 'FAK', // Fill And Kill
}

/**
 * Order arguments for creating orders
 */
export interface OrderArgs {
  /** Token ID to trade */
  tokenId: string;
  /** Order side */
  side: OrderSide;
  /** Price per share (0-1.0) */
  price: number;
  /** Order size */
  size: number;
  /** Fee rate in basis points */
  feeRateBps?: string;
  /** Order expiration timestamp */
  expiration?: number;
  /** Order nonce */
  nonce?: number;
}

/**
 * Signed order object
 */
export interface SignedOrder {
  /** Random salt for unique order */
  salt: number;
  /** Maker address */
  maker: string;
  /** Signer address */
  signer: string;
  /** Taker address */
  taker: string;
  /** Token ID */
  tokenId: string;
  /** Maker amount */
  makerAmount: string;
  /** Taker amount */
  takerAmount: string;
  /** Expiration timestamp */
  expiration: string;
  /** Nonce */
  nonce: string;
  /** Fee rate in basis points */
  feeRateBps: string;
  /** Order side */
  side: string;
  /** Signature type */
  signatureType: number;
  /** Hex signature */
  signature: string;
}

/**
 * Order response from CLOB API
 */
export interface OrderResponse {
  /** Success flag */
  success: boolean;
  /** Error message if unsuccessful */
  errorMsg?: string;
  /** Order ID */
  orderId?: string;
  /** Order hash(es) if matched */
  orderHashes?: string[];
  /** Order status */
  status?: 'matched' | 'delayed' | 'unmatched';
}

/**
 * Market order request
 */
export interface MarketOrderRequest {
  /** Token ID to trade */
  tokenId: string;
  /** Order side */
  side: OrderSide;
  /** Amount to buy/sell */
  amount: number;
  /** Slippage tolerance (optional) */
  slippage?: number;
}
