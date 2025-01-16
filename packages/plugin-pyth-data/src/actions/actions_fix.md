# Action Fixes Documentation

## Hermes API Endpoints Testing

### 1. GET_PRICE_FEEDS
```bash
# Test Command
curl -v "https://hermes-beta.pyth.network/v2/price_feeds?query=BTC&filter=USD"

# Expected Response Schema
{
  "id": string,
  "attributes": {
    "asset_type": string,
    "base": string,
    "description": string,
    "display_symbol": string,
    "generic_symbol": string,
    "quote_currency": string,
    "schedule": string,
    "symbol": string
  }
}[]

# Common Issues Fixed
- Response structure mismatch (using feed.attributes instead of direct properties)
- Missing type checks for metadata fields
- Improper number conversions
```

### 2. GET_LATEST_TWAPS
```bash
# Test Command
curl -v "https://hermes-beta.pyth.network/v2/twaps/latest?ids[]=ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace&windows[]=300&windows[]=900"

# Expected Response Schema
{
  "data": [
    {
      "id": string,
      "twaps": [
        {
          "window": number,
          "value": number,
          "timestamp": number
        }
      ]
    }
  ]
}
```

### 3. GET_LATEST_PRICE_UPDATES
```bash
# Test Command
curl -v "https://hermes-beta.pyth.network/v2/updates/price/latest?ids[]=ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace&encoding=base64&parsed=true"

# Expected Response Schema
{
  "parsed_messages": [
    {
      "price": number,
      "conf": number,
      "expo": number,
      "publish_time": number,
      "price_feed_id": string
    }
  ],
  "binary": string
}
```

### 4. GET_PRICE_UPDATES_STREAM
```bash
# Test Command (WebSocket)
# Note: Cannot test with curl, requires WebSocket client
wscat -c "wss://hermes-beta.pyth.network/ws/price_feeds?ids[]=ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"

# Expected Message Schema
{
  "type": "price_update",
  "data": {
    "id": string,
    "price": number,
    "conf": number,
    "expo": number,
    "publish_time": number
  }
}
```

### 5. GET_PRICE_UPDATES_AT_TIMESTAMP
```bash
# Test Command
curl -v "https://hermes-beta.pyth.network/v2/updates/price/1641034800?ids[]=ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace&encoding=base64&parsed=true"

# Expected Response Schema
{
  "parsed_messages": [
    {
      "price": number,
      "conf": number,
      "expo": number,
      "publish_time": number,
      "price_feed_id": string
    }
  ],
  "binary": string
}
```

### 6. GET_LATEST_PUBLISHER_CAPS
```bash
# Test Command
curl -v "https://hermes-beta.pyth.network/v2/updates/publisher_stake_caps/latest?encoding=base64&parsed=true"

# Expected Response Schema
{
  "parsed": {
    "caps": [
      {
        "publisherId": string,
        "stakeCap": number,
        "lastUpdate": number
      }
    ]
  },
  "binary": string
}
```

## Common Issues Across Actions

1. **Response Structure Mismatches**
   - API returns nested data structures
   - Need proper type checking and null handling
   - Must handle both parsed and binary responses

2. **Encoding Options**
   - Default encoding should be 'base64' not 'binary'
   - Must include parsed=true for human-readable data
   - Binary data needs proper handling

3. **Error Handling**
   - Network errors need proper wrapping
   - Invalid IDs need proper error messages
   - Timeouts need proper handling

4. **Type Safety**
   - All numeric fields need proper conversion
   - All optional fields need null checks
   - All enums need proper validation

## Environment Requirements

```bash
# Required Environment Variables
PYTH_NETWORK_ENV=testnet  # or mainnet
PYTH_GRANULAR_LOG=true    # for debugging
RUNTIME_CHECK_MODE=false  # to skip runtime checks

# Network URLs
PYTH_TESTNET_HERMES_URL="https://hermes-beta.pyth.network"
PYTH_TESTNET_WSS_URL="wss://hermes-beta.pyth.network/ws"
```

## Testing Steps

1. Set environment variables
2. Test each endpoint with curl
3. Compare response with action implementation
4. Fix type definitions if needed
5. Update error handling
6. Test with action
7. Document any issues found

## Next Steps

- [ ] Test all endpoints with curl
- [ ] Update type definitions based on actual responses
- [ ] Fix encoding handling in all actions
- [ ] Add proper error handling for all cases
- [ ] Update documentation with findings

## actionGetPriceFeeds.ts Fixes

### 1. Granular Logging Setup
```typescript
// Get configuration for granular logging
const config = getConfig();
const GRANULAR_LOG = config.PYTH_GRANULAR_LOG;

// Enhanced logging helper
const logGranular = (message: string, data?: unknown) => {
    if (GRANULAR_LOG) {
        elizaLogger.info(`[PriceFeeds] ${message}`, data);
        console.log(`[PriceFeeds] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
};
```

### 2. Interface Structure
```typescript
interface PriceFeedAttributes {
    asset_type: string;
    base: string;
    description: string;
    display_symbol: string;
    quote_currency: string;
    schedule: string;
    symbol: string;
    generic_symbol?: string;
    cms_symbol?: string;
    country?: string;
    cqs_symbol?: string;
    nasdaq_symbol?: string;
    contract_id?: string;
}

interface GetPriceFeedsContent extends Content {
    text: string;
    query?: string;
    filter?: string;
    success?: boolean;
    data?: {
        feeds: Array<{
            id: string;
            attributes: PriceFeedAttributes;
        }>;
        error?: string;
    };
}
```

### 3. Key Fixes Made
1. Added proper interface for API response attributes
2. Ensured error responses include required empty arrays
3. Added granular logging with environment variable control
4. Improved error handling with proper error types
5. Added data transformation with null checks and defaults
6. Updated example responses to match actual API structure

### 4. Common Issues Fixed
1. Type mismatch between API response and interface
2. Missing required properties in error responses
3. Incorrect attribute structure in transformed data
4. Lack of proper logging for debugging
5. Inconsistent error handling

### 5. Implementation Notes
- Always include empty arrays for required properties in error responses
- Use optional chaining for accessing nested properties
- Provide default values for required fields
- Log both to elizaLogger and console when granular logging is enabled
- Transform API response to match interface exactly

### Next Steps
1. Apply similar fixes to other action files:
   - actionGetLatestPriceUpdates.ts
   - actionGetLatestTwaps.ts
   - actionGetPriceUpdatesStream.ts
   - actionGetPriceUpdatesAtTimestamp.ts
   - actionGetLatestPublisherCaps.ts

2. For each action:
   - Add granular logging
   - Fix interface structures
   - Update error handling
   - Fix response transformations
   - Update examples
