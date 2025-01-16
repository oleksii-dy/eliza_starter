import { WebSocketState } from '../error/websocket';
import { Content } from '@elizaos/core';

// WebSocket Configuration Types
export interface WebSocketConfig {
  url: string;
  options: {
    reconnectInterval: number;    // Time between reconnection attempts
    maxReconnectAttempts: number; // Maximum number of reconnection attempts
    pingInterval: number;         // Heartbeat interval
    pongTimeout: number;          // Time to wait for pong response
    connectTimeout: number;       // Initial connection timeout
  };
}

export interface WebSocketMessage {
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface WebSocketSubscription {
  id: string;
  symbol: string;
  updateCriteria: {
    minChange?: number;     // Minimum price change to trigger update
    minInterval?: number;   // Minimum time between updates
    maxInterval?: number;   // Maximum time between updates
  };
}

export interface WebSocketStatus {
  state: WebSocketState;
  lastMessageTime?: number;
  reconnectAttempts: number;
  subscriptions: string[];
}

// Provider interface
export interface Provider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getStatus(): WebSocketStatus;
}



// Provider type
export interface PythDataProvider extends Provider {
  type: string;
  version: string;
  name: string;
  description: string;
  initialize: () => Promise<void>;
  validate: () => Promise<boolean>;
  process: () => Promise<void>;
}

// Registry type for Akash
export type PythDataRegistryTypes = [string, unknown][];

// Deployment related types
export interface PythDataDeploymentId {
  owner: string;
  dseq: string;
}


// Lease related types
export interface PythDataLeaseId {
  owner: string;
  dseq: string;
  provider: string;
  gseq: number;
  oseq: number;
}

// Provider types
export interface PythDataProviderInfo {
  owner: string;
  hostUri: string;
  attributes: Array<{
    key: string;
    value: string;
  }>;
}

// Bid types
export interface PythDataBidId {
  owner: string;
  dseq: string;
  gseq: number;
  oseq: number;
  provider: string;
}

export interface PythDataBid {
  id: PythDataBidId;
  state: string;
  price: {
    denom: string;
    amount: string;
  };
}

// Provider configuration
export interface PythDataConfig {
  PYTH_DATA_MNEMONIC: string;
  RPC_ENDPOINT: string;
  CHAIN_ID?: string;
  GAS_PRICE?: string;
  GAS_ADJUSTMENT?: number;
  CERTIFICATE_PATH?: string;
}

// Message types
export interface PythDataMessage {
  type: string;
  value: unknown;
}

// Response types
export interface PythDataTxResponse {
  code: number;
  height: number;
  txhash: string;
  rawLog: string;
  data?: string;
  gasUsed: number;
  gasWanted: number;
}

// Provider state types
export interface PythDataProviderState {
  isInitialized: boolean;
  lastSync: number;
  balance?: string;
  address?: string;
  certificate?: {
    cert: string;
    privateKey: string;
    publicKey: string;
  };
}

// Memory room constants
export const PYTH_DATA_MEMORY_ROOMS = {
  WALLET: "00000000-0000-0000-0000-000000000001",
  DEPLOYMENT: "00000000-0000-0000-0000-000000000002",
  LEASE: "00000000-0000-0000-0000-000000000003",
  CERTIFICATE: "00000000-0000-0000-0000-000000000004"
} as const;

// Data Handling Types
export interface DataValidationConfig {
  schema: Record<string, unknown>;
  strictMode?: boolean;
  additionalProperties?: boolean;
}

export interface DataTransformConfig {
  inputFormat: string;
  outputFormat: string;
  transformations?: Array<{
    type: string;
    params: Record<string, unknown>;
  }>;
}

export interface DataSubscriptionConfig {
  maxSubscriptions: number;
  maxUpdatesPerSecond: number;
  batchSize: number;
  validateData: boolean;
}

export interface DataSequenceConfig {
  trackSequence: boolean;
  maxGapSize: number;
  replayMissing: boolean;
}

// Data validation result
export interface ValidationResult {
  isValid: boolean;
  errors?: Array<Record<string, unknown>>;
  warnings?: Array<Record<string, unknown>>;
}

// Data transformation result
export interface TransformResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
  metadata?: {
    transformationTime: number;
    steps: Array<{
      name: string;
      duration: number;
      success: boolean;
    }>;
  };
}

// Subscription status
export interface SubscriptionStatus {
  id: string;
  active: boolean;
  lastUpdate: number;
  updateCount: number;
  errorCount: number;
  validationStats: {
    total: number;
    valid: number;
    invalid: number;
  };
}

// Price Feed Validation Schemas
export interface PriceValidationSchema {
  // Base price feed schema
  price: {
    type: 'number';
    minimum: 0;
    description: 'The current price';
  };
  confidence: {
    type: 'number';
    minimum: 0;
    maximum: 1;
    description: 'Confidence interval (0-1)';
  };
  expo: {
    type: 'number';
    description: 'Price exponent';
  };
  publishTime: {
    type: 'number';
    minimum: 0;
    description: 'Unix timestamp of publication';
  };
}

// Validation schemas for specific actions
export const ValidationSchemas = {
  GET_LATEST_PRICE: {
    type: 'object',
    required: ['symbol'],
    properties: {
      symbol: {
        type: 'string',
        pattern: '^[A-Za-z0-9./]+$',
        description: 'The symbol to get price for'
      },
      options: {
        type: 'object',
        properties: {
          includeEma: {
            type: 'boolean',
            description: 'Whether to include EMA price'
          }
        }
      }
    }
  },

  VALIDATE_PRICE_FEED: {
    type: 'object',
    required: ['symbol'],
    properties: {
      symbol: {
        type: 'string',
        pattern: '^[A-Za-z0-9./]+$',
        description: 'The symbol to validate'
      },
      options: {
        type: 'object',
        properties: {
          validateConfidence: {
            type: 'boolean',
            description: 'Whether to validate confidence level'
          },
          validateUpdateTime: {
            type: 'boolean',
            description: 'Whether to validate update time'
          },
          minConfidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Minimum required confidence level'
          },
          maxUpdateAge: {
            type: 'number',
            minimum: 0,
            description: 'Maximum age of last update in seconds'
          },
          timeout: {
            type: 'number',
            minimum: 0,
            description: 'Request timeout in milliseconds'
          }
        }
      }
    }
  },

  GET_MULTI_PRICE: {
    type: 'object',
    required: ['symbols'],
    properties: {
      symbols: {
        type: 'array',
        items: {
          type: 'string',
          pattern: '^[A-Z0-9/]+$'
        },
        minItems: 1,
        maxItems: 100,
        description: 'Array of asset symbols'
      },
      options: {
        type: 'object',
        properties: {
          includeEma: {
            type: 'boolean'
          },
          timeout: {
            type: 'number',
            minimum: 1000,
            maximum: 30000
          }
        }
      }
    }
  },

  SUBSCRIBE_PRICE_UPDATES: {
    type: 'object',
    required: ['symbols'],
    properties: {
      symbols: {
        type: 'array',
        items: {
          type: 'string',
          pattern: '^[A-Z0-9/]+$'
        },
        minItems: 1,
        maxItems: 50
      },
      options: {
        type: 'object',
        properties: {
          updateInterval: {
            type: 'number',
            minimum: 100,
            maximum: 60000
          },
          includeEma: {
            type: 'boolean'
          },
          batchUpdates: {
            type: 'boolean'
          }
        }
      }
    }
  },

  GET_PRICE_FEEDS: {
    type: 'object',
    properties: {
      assetClass: {
        type: 'string',
        enum: ['crypto', 'forex', 'equity', 'commodity']
      },
      chain: {
        type: 'string',
        enum: ['solana', 'evm', 'aptos', 'starknet', 'ton', 'fuel']
      },
      options: {
        type: 'object',
        properties: {
          includeMetadata: {
            type: 'boolean'
          },
          validateAvailability: {
            type: 'boolean'
          }
        }
      }
    }
  },

  GET_PRICE_HISTORY: {
    type: 'object',
    required: ['symbol', 'options'],
    properties: {
      symbol: {
        type: 'string',
        pattern: '^[A-Z0-9/]+$'
      },
      options: {
        type: 'object',
        required: ['interval', 'duration'],
        properties: {
          interval: {
            type: 'number',
            minimum: 60,
            description: 'Interval in seconds'
          },
          duration: {
            type: 'number',
            minimum: 3600,
            maximum: 2592000,
            description: 'Duration in seconds (max 30 days)'
          }
        }
      }
    }
  },

  GET_PRICE_PAIR_RATIO: {
    type: 'object',
    required: ['baseSymbol', 'quoteSymbol'],
    properties: {
      baseSymbol: {
        type: 'string',
        pattern: '^[A-Z0-9/]+$'
      },
      quoteSymbol: {
        type: 'string',
        pattern: '^[A-Z0-9/]+$'
      },
      options: {
        type: 'object',
        properties: {
          includeConfidence: {
            type: 'boolean'
          },
          normalize: {
            type: 'boolean'
          }
        }
      }
    }
  },

  GET_PRICE_UPDATES_STREAM: {
    type: 'object',
    required: ['text', 'priceIds'],
    properties: {
      text: {
        type: 'string',
        description: 'Description of the price update stream request'
      },
      priceIds: {
        type: 'array',
        items: {
          type: 'string',
          pattern: '^[0-9a-fA-F]+$'
        },
        minItems: 1,
        maxItems: 100,
        description: 'Array of price feed IDs to stream'
      },
      options: {
        type: 'object',
        properties: {
          encoding: {
            type: 'string',
            enum: ['hex', 'binary'],
            description: 'Encoding format for price updates'
          },
          parsed: {
            type: 'boolean',
            description: 'Whether to parse the price updates'
          },
          allowUnordered: {
            type: 'boolean',
            description: 'Whether to allow unordered updates'
          },
          benchmarksOnly: {
            type: 'boolean',
            description: 'Whether to only include benchmark updates'
          }
        }
      },
      success: {
        type: 'boolean',
        description: 'Whether the operation was successful'
      },
      data: {
        type: 'object',
        properties: {
          streamId: {
            type: 'string',
            description: 'Unique identifier for the stream'
          },
          status: {
            type: 'string',
            enum: ['connected', 'disconnected', 'error'],
            description: 'Current status of the stream'
          },
          updates: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'price', 'confidence', 'timestamp'],
              properties: {
                id: {
                  type: 'string',
                  description: 'Price feed ID'
                },
                price: {
                  type: 'number',
                  description: 'Current price value'
                },
                confidence: {
                  type: 'number',
                  description: 'Confidence level'
                },
                timestamp: {
                  type: 'number',
                  description: 'Update timestamp'
                },
                emaPrice: {
                  type: 'number',
                  description: 'EMA price value'
                }
              }
            }
          },
          error: {
            type: 'string',
            description: 'Error message if status is error'
          }
        }
      }
    }
  },

  MONITOR_PRICE_DEVIATION: {
    type: 'object',
    required: ['symbol', 'options'],
    properties: {
      symbol: {
        type: 'string',
        pattern: '^[A-Z0-9/]+$'
      },
      options: {
        type: 'object',
        required: ['deviationThreshold', 'baselineType'],
        properties: {
          deviationThreshold: {
            type: 'number',
            minimum: 0.1,
            maximum: 100
          },
          baselineType: {
            type: 'string',
            enum: ['fixed', 'moving_average', 'reference_price']
          },
          baselineValue: {
            type: 'number'
          },
          movingAveragePeriod: {
            type: 'number',
            minimum: 60
          },
          referenceSymbol: {
            type: 'string',
            pattern: '^[A-Z0-9/]+$'
          },
          alertInterval: {
            type: 'number',
            minimum: 1000
          }
        }
      }
    }
  },

  GET_ARBITRAGE_OPPORTUNITIES: {
    type: 'object',
    required: ['symbols'],
    properties: {
      symbols: {
        type: 'array',
        items: {
          type: 'string',
          pattern: '^[A-Z0-9/]+$'
        },
        minItems: 2,
        maxItems: 10
      },
      minSpread: {
        type: 'number',
        minimum: 0.1,
        maximum: 100
      },
      maxPathLength: {
        type: 'number',
        minimum: 2,
        maximum: 5
      },
      minConfidence: {
        type: 'number',
        minimum: 0.1,
        maximum: 1
      }
    }
  },

  TRACK_LIQUIDITY_METRICS: {
    type: 'object',
    required: ['symbol'],
    properties: {
      symbol: {
        type: 'string',
        pattern: '^[A-Z0-9/]+$'
      },
      options: {
        type: 'object',
        properties: {
          window: {
            type: 'string',
            pattern: '^[0-9]+(h|d)$'
          },
          metrics: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['volume', 'volatility', 'spread', 'depth']
            }
          },
          updateInterval: {
            type: 'number',
            minimum: 1000
          }
        }
      }
    }
  },

  GET_NETWORK_STATUS: {
    type: "object",
    properties: {
      options: {
        type: "object",
        properties: {
          includeFeeds: {
            type: "boolean",
            description: "Whether to include status of individual feeds"
          },
          chain: {
            type: "string",
            description: "Target blockchain network"
          },
          timeout: {
            type: "number",
            description: "Request timeout in milliseconds"
          }
        }
      }
    }
  },

  GET_PRICE_AGGREGATION: {
    type: "object",
    required: ["symbol", "windows"],
    properties: {
      symbol: {
        type: "string",
        pattern: "^[A-Z0-9/]+$",
        description: "Asset symbol (e.g., 'BTC/USD')"
      },
      windows: {
        type: "array",
        items: {
          type: "object",
          required: ["duration", "type"],
          properties: {
            duration: {
              type: "number",
              minimum: 60,
              description: "Window duration in seconds"
            },
            type: {
              type: "string",
              enum: ["twap", "vwap", "ohlc"],
              description: "Type of aggregation"
            }
          }
        },
        minItems: 1
      },
      options: {
        type: "object",
        properties: {
          timeout: {
            type: "number",
            minimum: 1000,
            description: "Request timeout in milliseconds"
          }
        }
      }
    }
  },

  BATCH_SUBSCRIBE_PRICES: {
    type: 'object',
    required: ['subscriptions'],
    properties: {
      subscriptions: {
        type: 'array',
        minItems: 1,
        maxItems: 100,
        items: {
          type: 'object',
          required: ['symbol'],
          properties: {
            symbol: {
              type: 'string',
              pattern: '^[A-Z0-9]+/[A-Z0-9]+$',
              description: 'Trading pair symbol (e.g., BTC/USD)'
            },
            updateInterval: {
              type: 'number',
              minimum: 100,
              description: 'Update interval in milliseconds'
            },
            minChange: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Minimum price change to trigger update'
            }
          }
        }
      },
      options: {
        type: 'object',
        properties: {
          batchInterval: {
            type: 'number',
            minimum: 1000,
            description: 'Interval for batching updates in milliseconds'
          },
          includeEma: {
            type: 'boolean',
            description: 'Include EMA price in updates'
          },
          timeout: {
            type: 'number',
            minimum: 1000,
            description: 'Connection timeout in milliseconds'
          }
        }
      }
    }
  },

  CREATE_BID: {
    type: "object",
    required: ["amount", "chain_id", "permission_key", "target_calldata", "target_contract"],
    properties: {
      amount: {
        type: "string",
        description: "Amount of bid in wei"
      },
      chain_id: {
        type: "string",
        description: "The chain id to bid on"
      },
      permission_key: {
        type: "string",
        description: "The permission key to bid on"
      },
      target_calldata: {
        type: "string",
        description: "Calldata for the contract call"
      },
      target_contract: {
        type: "string",
        description: "The contract address to call"
      }
    }
  },

  GET_BID_STATUS: {
    type: "object",
    required: ["bid_id", "chain_id"],
    properties: {
      bid_id: {
        type: "string",
        description: "The ID of the bid to check"
      },
      chain_id: {
        type: "string",
        description: "The chain ID where the bid was placed"
      }
    }
  },

  LIST_CHAIN_BIDS: {
    type: "object",
    required: ["chain_id"],
    properties: {
      chain_id: {
        type: "string",
        description: "The chain ID to list bids for"
      },
      from_time: {
        type: "string",
        format: "date-time",
        description: "Optional timestamp to filter bids from"
      }
    }
  },

  CREATE_OPPORTUNITY: {
    type: "object",
    required: [
      "chain_id",
      "permission_key",
      "buy_tokens",
      "sell_tokens",
      "target_call_value",
      "target_calldata",
      "target_contract",
      "version"
    ],
    properties: {
      chain_id: {
        type: "string",
        description: "The chain ID where the opportunity will be executed"
      },
      permission_key: {
        type: "string",
        description: "The permission key required for execution"
      },
      buy_tokens: {
        type: "array",
        items: {
          type: "object",
          required: ["token", "amount"],
          properties: {
            token: {
              type: "string",
              description: "Token address to buy"
            },
            amount: {
              type: "string",
              description: "Amount of tokens to buy"
            }
          }
        }
      },
      sell_tokens: {
        type: "array",
        items: {
          type: "object",
          required: ["token", "amount"],
          properties: {
            token: {
              type: "string",
              description: "Token address to sell"
            },
            amount: {
              type: "string",
              description: "Amount of tokens to sell"
            }
          }
        }
      },
      target_call_value: {
        type: "string",
        description: "Value to send with the contract call"
      },
      target_calldata: {
        type: "string",
        description: "Calldata for the target contract call"
      },
      target_contract: {
        type: "string",
        description: "Contract address to call"
      },
      version: {
        type: "string",
        enum: ["v1"],
        description: "API version"
      }
    }
  },

  DELETE_OPPORTUNITIES: {
    type: "object",
    required: ["chain_id", "chain_type", "permission_account", "program", "router", "version"],
    properties: {
      chain_id: {
        type: "string",
        description: "The chain ID for the opportunity"
      },
      chain_type: {
        type: "string",
        enum: ["svm"],
        description: "The type of chain"
      },
      permission_account: {
        type: "string",
        description: "The permission account for the opportunity"
      },
      program: {
        type: "string",
        enum: ["swap_kamino", "limo"],
        description: "The program type"
      },
      router: {
        type: "string",
        description: "The router account for the opportunity"
      },
      version: {
        type: "string",
        enum: ["v1"],
        description: "API version"
      }
    }
  },

  LIST_OPPORTUNITIES: {
    type: "object",
    properties: {
      chain_id: {
        type: "string",
        description: "Optional chain ID to filter opportunities"
      },
      mode: {
        type: "string",
        enum: ["live", "historical"],
        default: "live",
        description: "Mode to fetch opportunities in"
      },
      permission_key: {
        type: "string",
        description: "Optional permission key to filter by"
      },
      from_time: {
        type: "string",
        format: "date-time",
        description: "Optional timestamp to filter opportunities from"
      },
      limit: {
        type: "integer",
        minimum: 0,
        maximum: 100,
        default: 20,
        description: "Maximum number of opportunities to return"
      }
    }
  },

  SUBMIT_QUOTE: {
    type: "object",
    required: [
      "chain_id",
      "input_token_mint",
      "output_token_mint",
      "router",
      "specified_token_amount",
      "user_wallet_address",
      "version"
    ],
    properties: {
      chain_id: {
        type: "string",
        description: "The chain ID for creating the quote"
      },
      input_token_mint: {
        type: "string",
        description: "The token mint address of the input token"
      },
      output_token_mint: {
        type: "string",
        description: "The token mint address of the output token"
      },
      router: {
        type: "string",
        description: "The router account to send referral fees to"
      },
      specified_token_amount: {
        type: "object",
        required: ["amount", "side"],
        properties: {
          amount: {
            type: "number",
            description: "The amount of tokens"
          },
          side: {
            type: "string",
            enum: ["input", "output"],
            description: "Whether this is the input or output amount"
          }
        }
      },
      user_wallet_address: {
        type: "string",
        description: "The user wallet address which requested the quote"
      },
      version: {
        type: "string",
        enum: ["v1"],
        description: "API version"
      }
    }
  },

  BID_ON_OPPORTUNITY: {
    type: "object",
    required: [
      "opportunity_id",
      "amount",
      "deadline",
      "executor",
      "nonce",
      "permission_key",
      "signature"
    ],
    properties: {
      opportunity_id: {
        type: "string",
        description: "The ID of the opportunity to bid on"
      },
      amount: {
        type: "string",
        description: "The bid amount in wei"
      },
      deadline: {
        type: "string",
        description: "The latest unix timestamp in seconds until which the bid is valid"
      },
      executor: {
        type: "string",
        description: "The executor address"
      },
      nonce: {
        type: "string",
        description: "The nonce of the bid permit signature"
      },
      permission_key: {
        type: "string",
        description: "The opportunity permission key"
      },
      signature: {
        type: "string",
        description: "The bid permit signature"
      }
    }
  },

  GET_PRICE_UPDATES_AT_TIMESTAMP: {
    type: 'object',
    required: ['text', 'priceIds', 'timestamp'],
    properties: {
      text: {
        type: 'string',
        description: 'Description of the price update request'
      },
      priceIds: {
        type: 'array',
        items: {
          type: 'string',
          pattern: '^[0-9a-fA-F]+$'
        },
        minItems: 1,
        maxItems: 100,
        description: 'Array of price feed IDs to fetch'
      },
      timestamp: {
        type: 'number',
        minimum: 0,
        description: 'Unix timestamp to fetch prices at'
      },
      success: {
        type: 'boolean',
        description: 'Whether the operation was successful'
      },
      data: {
        type: 'object',
        properties: {
          updates: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'price', 'confidence', 'timestamp'],
              properties: {
                id: {
                  type: 'string',
                  description: 'Price feed ID'
                },
                price: {
                  type: 'number',
                  description: 'Price value at timestamp'
                },
                confidence: {
                  type: 'number',
                  description: 'Confidence level'
                },
                timestamp: {
                  type: 'number',
                  description: 'Update timestamp'
                },
                emaPrice: {
                  type: 'number',
                  description: 'EMA price value'
                }
              }
            }
          },
          error: {
            type: 'string',
            description: 'Error message if operation failed'
          }
        }
      }
    }
  },

  GET_LATEST_TWAPS: {
    type: 'object',
    required: ['text', 'priceIds', 'windows'],
    properties: {
      text: {
        type: 'string',
        description: 'Description of the TWAP request'
      },
      priceIds: {
        type: 'array',
        items: {
          type: 'string',
          pattern: '^[0-9a-fA-F]+$'
        },
        minItems: 1,
        maxItems: 100,
        description: 'Array of price feed IDs to fetch TWAPs for'
      },
      windows: {
        type: 'array',
        items: {
          type: 'number',
          minimum: 1
        },
        minItems: 1,
        maxItems: 10,
        description: 'Array of time windows in seconds'
      },
      success: {
        type: 'boolean',
        description: 'Whether the operation was successful'
      },
      data: {
        type: 'object',
        properties: {
          twaps: {
            type: 'array',
            items: {
              type: 'object',
              required: ['priceId', 'windows'],
              properties: {
                priceId: {
                  type: 'string',
                  description: 'Price feed ID'
                },
                windows: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['window', 'value', 'confidence', 'timestamp'],
                    properties: {
                      window: {
                        type: 'number',
                        description: 'Time window in seconds'
                      },
                      value: {
                        type: 'number',
                        description: 'TWAP value'
                      },
                      confidence: {
                        type: 'number',
                        description: 'Confidence level'
                      },
                      timestamp: {
                        type: 'number',
                        description: 'Update timestamp'
                      }
                    }
                  }
                }
              }
            }
          },
          error: {
            type: 'string',
            description: 'Error message if operation failed'
          }
        }
      }
    }
  },

  GET_LATEST_PUBLISHER_CAPS: {
    type: 'object',
    required: ['text'],
    properties: {
      text: {
        type: 'string',
        description: 'Description of the publisher caps request'
      },
      success: {
        type: 'boolean',
        description: 'Whether the operation was successful'
      },
      data: {
        type: 'object',
        properties: {
          caps: {
            type: 'array',
            items: {
              type: 'object',
              required: ['publisher', 'cap', 'timestamp'],
              properties: {
                publisher: {
                  type: 'string',
                  description: 'Publisher address'
                },
                cap: {
                  type: 'number',
                  minimum: 0,
                  description: 'Publisher cap value'
                },
                timestamp: {
                  type: 'number',
                  minimum: 0,
                  description: 'Last update timestamp'
                }
              }
            }
          },
          error: {
            type: 'string',
            description: 'Error message if operation failed'
          }
        }
      }
    }
  }
};

// Response validation schemas
export const ResponseSchemas = {
  PriceResponse: {
    type: 'object',
    required: ['success'],
    properties: {
      success: {
        type: 'boolean'
      },
      data: {
        type: 'object',
        properties: {
          price: {
            type: 'number',
            minimum: 0
          },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1
          },
          expo: {
            type: 'number'
          },
          publishTime: {
            type: 'number',
            minimum: 0
          },
          emaPrice: {
            type: 'object',
            properties: {
              price: {
                type: 'number',
                minimum: 0
              },
              confidence: {
                type: 'number',
                minimum: 0,
                maximum: 1
              },
              expo: {
                type: 'number'
              },
              publishTime: {
                type: 'number',
                minimum: 0
              }
            }
          }
        }
      },
      error: {
        type: 'string'
      }
    }
  }
};

// WebSocket Message Format Validation
export const WebSocketSchemas = {
  // Base message format that all WS messages must follow
  BaseMessage: {
    type: 'object',
    required: ['type', 'timestamp'],
    properties: {
      type: {
        type: 'string',
        enum: ['price_update', 'heartbeat', 'subscription_success', 'error']
      },
      timestamp: {
        type: 'number',
        minimum: 0
      }
    }
  },

  // Price update message format
  PriceUpdateMessage: {
    type: 'object',
    required: ['type', 'timestamp', 'data'],
    properties: {
      type: {
        type: 'string',
        const: 'price_update'
      },
      timestamp: {
        type: 'number',
        minimum: 0
      },
      data: {
        type: 'object',
        required: ['symbol', 'price', 'confidence', 'publishTime'],
        properties: {
          symbol: {
            type: 'string',
            pattern: '^[A-Z0-9/]+$'
          },
          price: {
            type: 'number',
            minimum: 0
          },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1
          },
          publishTime: {
            type: 'number',
            minimum: 0
          }
        }
      }
    }
  },

  // Subscription message format
  SubscriptionMessage: {
    type: 'object',
    required: ['type', 'timestamp', 'data'],
    properties: {
      type: {
        type: 'string',
        const: 'subscription_success'
      },
      timestamp: {
        type: 'number',
        minimum: 0
      },
      data: {
        type: 'object',
        required: ['subscriptionId', 'symbol'],
        properties: {
          subscriptionId: {
            type: 'string'
          },
          symbol: {
            type: 'string',
            pattern: '^[A-Z0-9/]+$'
          }
        }
      }
    }
  }
};

// Chain-Specific Validation Schemas
export const ChainValidationSchemas = {
  // Solana-specific validation (based on Pyth documentation)
  solana: {
    priceAccount: {
      type: 'object',
      required: ['version', 'type', 'size', 'priceType', 'exponent', 'currentSlot', 'validSlot'],
      properties: {
        version: {
          type: 'number',
          const: 2
        },
        type: {
          type: 'number',
          const: 0
        },
        size: {
          type: 'number',
          const: 3232
        },
        priceType: {
          type: 'string',
          enum: ['price']
        },
        exponent: {
          type: 'number'
        },
        currentSlot: {
          type: 'number',
          minimum: 0
        },
        validSlot: {
          type: 'number',
          minimum: 0
        }
      }
    }
  },

  // EVM-specific validation (based on Pyth documentation)
  evm: {
    priceUpdateData: {
      type: 'object',
      required: ['id', 'price', 'conf', 'expo', 'publishTime'],
      properties: {
        id: {
          type: 'string',
          pattern: '^0x[a-fA-F0-9]{64}$'  // Price feed ID format
        },
        price: {
          type: 'string',  // BigNumber format
          pattern: '^-?[0-9]+$'
        },
        conf: {
          type: 'string',  // BigNumber format
          pattern: '^[0-9]+$'
        },
        expo: {
          type: 'number'
        },
        publishTime: {
          type: 'number',
          minimum: 0
        }
      }
    },
    updateFee: {
      type: 'object',
      required: ['value', 'unit'],
      properties: {
        value: {
          type: 'string',
          pattern: '^[0-9]+$'
        },
        unit: {
          type: 'string',
          enum: ['wei', 'gwei', 'ether']
        }
      }
    }
  },

  // Aptos-specific validation (based on Pyth documentation)
  aptos: {
    priceInfo: {
      type: 'object',
      required: ['price_identifier', 'price', 'confidence', 'sequence_number'],
      properties: {
        price_identifier: {
          type: 'string',
          pattern: '^0x[a-fA-F0-9]{64}$'
        },
        price: {
          type: 'string',
          pattern: '^-?[0-9]+$'
        },
        confidence: {
          type: 'string',
          pattern: '^[0-9]+$'
        },
        sequence_number: {
          type: 'number',
          minimum: 0
        }
      }
    }
  }
};

// Chain-specific configuration validation
export const ChainConfigSchemas = {
  // Solana configuration
  solana: {
    type: 'object',
    required: ['endpoint', 'commitment'],
    properties: {
      endpoint: {
        type: 'string',
        format: 'uri'
      },
      commitment: {
        type: 'string',
        enum: ['processed', 'confirmed', 'finalized']
      }
    }
  },

  // EVM configuration
  evm: {
    type: 'object',
    required: ['rpcUrl', 'pythContractAddress'],
    properties: {
      rpcUrl: {
        type: 'string',
        format: 'uri'
      },
      pythContractAddress: {
        type: 'string',
        pattern: '^0x[a-fA-F0-9]{40}$'
      },
      gasLimit: {
        type: 'number',
        minimum: 21000
      }
    }
  }
};

// WebSocket Types
export interface WebSocketErrorEvent {
    type: string;
    message?: string;
    error?: Error;
    target: WebSocket;
}

export interface WebSocketCallback {
    (message: WebSocketCallbackMessage): void;
}

export interface WebSocketCallbackMessage extends Content {
    type: 'success' | 'error' | 'update';
    text: string;
    data?: {
        batchId?: string;
        activeSubscriptions?: Array<{
            symbol: string;
            status: 'active' | 'pending' | 'failed';
            error?: string;
        }>;
        updates?: Array<{
            symbol: string;
            price: number;
            confidence: number;
            timestamp: number;
            emaPrice?: number;
        }>;
    };
    error?: Error;
}
