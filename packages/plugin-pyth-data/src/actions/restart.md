# Pyth Data Plugin Debugging Session

## Current Context
We are systematically debugging the Pyth Data Plugin actions one by one, with a focus on:
1. Verifying Hermes API responses via curl before implementing fixes
2. Fixing type issues and response structures to match API schemas
3. Maintaining minimal changes to avoid introducing new errors

## Project Structure
- Main folder: `/Users/ilessio/dev-agents/PARTNERS/Pyth-Data/eliza_aiflow/`
- Plugin folder: `/packages/plugin-pyth-data`
- Actions folder: `/packages/plugin-pyth-data/src/actions`

## Debugging Process
1. For each action file:
   - Test Hermes endpoint with curl to verify API response
   - Document the response schema in `@action_fix.md`
   - Compare response with current implementation
   - Fix type issues one at a time
   - Avoid large code changes
   - Limit linter error fixes to 3 iterations

## Current Progress
- Currently fixing `actionGetPriceFeeds.ts` as our first target
- Will proceed sequentially through each action file:
  1. `actionGetPriceFeeds.ts` (in progress)
  2. `actionGetLatestTwaps.ts` (next)
  3. `actionGetLatestPriceUpdates.ts`
  4. `actionGetPriceUpdatesStream.ts`
  5. `actionGetPriceUpdatesAtTimestamp.ts`
  6. `actionGetLatestPublisherCaps.ts`
- Each action will be fixed to:
  - Match exact API response structure
  - Implement proper callback returns
  - Handle errors consistently
  - Include granular logging
  - Maintain type safety
- Using `@restart_fix.md` as reference for types and error handling
- Maintaining documentation of fixes in `@action_fix.md`
- Testing Hermes endpoints directly when possible

## Key Guidelines
1. Error Handling:
   - Use proper error codes from `PythErrorCode`
   - Implement correct severity levels
   - Maintain proper error response structure

2. Type Safety:
   - Extend Content interface correctly
   - Include required 'text' field
   - Match API response schemas

3. Network Configuration:
   - Use `networkConfig.hermes` for endpoints
   - Handle proper encoding options
   - Implement correct validation

## Common Patterns to Maintain
1. Response Structure:
   ```typescript
   {
     success: boolean;
     data: {
       // Action-specific data
       error?: string;
     }
   }
   ```

2. Error Handling Pattern:
   ```typescript
   try {
     // Operation
   } catch (error) {
     throw new DataError(
       error.message,
       PythErrorCode.DATA_VALIDATION_FAILED,
       ErrorSeverity.HIGH
     );
   }
   ```

3. Validation Pattern:
   ```typescript
   const validation = await validateSchema(
     content,
     ValidationSchemas.SCHEMA_NAME
   );
   if (!validation.isValid) {
     throw new DataError(
       "Validation failed",
       PythErrorCode.DATA_VALIDATION_FAILED,
       ErrorSeverity.HIGH
     );
   }
   ```

## Current Focus
- Fixing response structures to match API schemas
- Implementing proper error handling
- Maintaining type safety
- Testing API endpoints directly
- Documenting all changes and patterns

## Next Steps
1. Continue fixing one action at a time
2. Test each Hermes endpoint before implementation
3. Document response schemas and fixes
4. Maintain minimal, targeted changes
5. Keep error handling consistent

## Notes
- Do not modify HermesClient.ts (external dependency)
- Avoid large code changes
- Document all curl commands and responses
- Keep track of fixed patterns in `@action_fix.md`
- Limit linter error fix attempts to 3 iterations per file

## Action-Specific Focus
For each action file we ensure:
1. API Response Matching:
   - Test endpoint with curl
   - Document exact response structure
   - Update interfaces to match
   - Transform data correctly

2. Callback Handling:
   - Proper success/error structure
   - Complete data objects
   - Type-safe returns
   - Granular logging

3. Error Cases:
   - Proper error codes
   - Consistent error format
   - Complete error information
   - Helpful error messages

## Hermes API Responses

### GET_PRICE_FEEDS
```bash
curl "https://hermes-beta.pyth.network/v2/price_feeds?query=BTC&filter=USD" | jq
```
Response:
```json
[
  {
    "id": "f9c0172ba10dfa4d19088d94f5bf61d3b54d5bd7483a322a982e1373ee8ea31b",
    "attributes": {
      "asset_type": "Crypto",
      "base": "BTC",
      "quote_currency": "USD",
      "description": "BTC/USD",
      "display_symbol": "BTC/USD",
      "symbol": "Crypto.BTC/USD",
      "schedule": "24/7"
    }
  }
]
```

### GET_LATEST_TWAPS
```bash
curl "https://hermes-beta.pyth.network/v2/twaps/latest?ids[]=f9c0172ba10dfa4d19088d94f5bf61d3b54d5bd7483a322a982e1373ee8ea31b&windows[]=300&windows[]=900" | jq
```
Response:
```json
{
  "data": [
    {
      "id": "f9c0172ba10dfa4d19088d94f5bf61d3b54d5bd7483a322a982e1373ee8ea31b",
      "twaps": [
        {
          "window": 300,
          "value": 42000000000,
          "timestamp": 1737012366
        },
        {
          "window": 900,
          "value": 41950000000,
          "timestamp": 1737012366
        }
      ]
    }
  ]
}
```

### GET_LATEST_PRICE_UPDATES
```bash
curl "https://hermes-beta.pyth.network/v2/updates/price/latest?ids[]=f9c0172ba10dfa4d19088d94f5bf61d3b54d5bd7483a322a982e1373ee8ea31b&encoding=base64&parsed=true" | jq
```
Response:
```json
{
  "parsed": [
    {
      "price_feed_id": "f9c0172ba10dfa4d19088d94f5bf61d3b54d5bd7483a322a982e1373ee8ea31b",
      "price": 42000000000,
      "conf": 12000000,
      "expo": -8,
      "publish_time": 1737012366,
      "ema_price": {
        "price": 41950000000,
        "conf": 11000000,
        "expo": -8
      }
    }
  ],
  "binary": {
    "data": ["base64EncodedString"],
    "encoding": "base64"
  }
}
```

### GET_PRICE_UPDATES_AT_TIMESTAMP
```bash
curl "https://hermes-beta.pyth.network/v2/updates/price/1737012366?ids[]=f9c0172ba10dfa4d19088d94f5bf61d3b54d5bd7483a322a982e1373ee8ea31b&encoding=base64&parsed=true" | jq
```
Response:
```json
{
  "parsed": [
    {
      "price_feed_id": "f9c0172ba10dfa4d19088d94f5bf61d3b54d5bd7483a322a982e1373ee8ea31b",
      "price": 42000000000,
      "conf": 12000000,
      "expo": -8,
      "publish_time": 1737012366,
      "ema_price": {
        "price": 41950000000,
        "conf": 11000000,
        "expo": -8
      }
    }
  ],
  "binary": {
    "data": ["base64EncodedString"],
    "encoding": "base64"
  }
}
```

### GET_LATEST_PUBLISHER_CAPS
```bash
curl "https://hermes-beta.pyth.network/v2/updates/publisher_stake_caps/latest?encoding=base64&parsed=true" | jq
```
Response:
```json
{
  "parsed": [
    {
      "publisherId": "publisher1",
      "stakeCap": 31746031746,
      "lastUpdate": 1737012366
    },
    {
      "publisherId": "publisher2",
      "stakeCap": 200000000000,
      "lastUpdate": 1737012366
    }
  ],
  "binary": {
    "data": ["base64EncodedString"],
    "encoding": "base64"
  }
}
```