# Autonomy Plugin Testing Documentation

## Overview

The `@elizaos/plugin-autonomy` package includes comprehensive test coverage for
autonomy enable/disable functionality via custom plugin endpoints.

## Test Coverage

### 1. Unit Tests (`__tests__/plugin.test.ts`)

- Plugin structure validation
- Service metadata verification
- Action and provider validation
- Autonomy persistence tests
- 22 tests total

### 2. Route Tests (`src/__tests__/routes.test.ts`)

- Validates all API endpoint definitions
- Verifies route structure and metadata
- 8 tests total

### 3. API Integration Tests (`src/__tests__/e2e/autonomy-api.test.ts`)

- Direct service functionality tests
- API endpoint integration tests
- Full workflow testing
- 14 tests total

## API Endpoints

The plugin exposes the following custom endpoints for controlling autonomy:

### GET /autonomy/status

Returns the current autonomy status:

```json
{
  "success": true,
  "data": {
    "enabled": boolean,
    "interval": number,
    "agentId": string,
    "characterName": string
  }
}
```

### POST /autonomy/enable

Enables the autonomous loop:

```json
{
  "success": true,
  "message": "Autonomy enabled successfully",
  "data": {
    "enabled": true,
    "interval": number,
    "agentId": string
  }
}
```

### POST /autonomy/disable

Disables the autonomous loop:

```json
{
  "success": true,
  "message": "Autonomy disabled successfully",
  "data": {
    "enabled": false,
    "interval": number,
    "agentId": string
  }
}
```

### POST /autonomy/toggle

Toggles the autonomous loop state:

```json
{
  "success": true,
  "message": "Autonomy [enabled|disabled] successfully",
  "data": {
    "enabled": boolean,
    "interval": number,
    "agentId": string
  }
}
```

### POST /autonomy/interval

Updates the loop interval (body: `{ interval: number }`):

```json
{
  "success": true,
  "message": "Autonomy interval updated successfully",
  "data": {
    "interval": number,
    "enabled": boolean,
    "agentId": string
  }
}
```

## Key Features Tested

1. **Enable/Disable Functionality**

   - Service can be started and stopped via API endpoints
   - State is properly tracked and returned
   - Multiple enable/disable calls are handled gracefully

2. **State Persistence**

   - Autonomy state is persisted to database via `AUTONOMY_ENABLED` setting
   - State survives agent restarts
   - Initial state can be configured via environment or database

3. **Interval Configuration**

   - Loop interval can be updated dynamically
   - Invalid intervals (< 1000ms) are rejected with 400 error
   - Interval is retained even when autonomy is disabled

4. **Error Handling**
   - Missing service returns 503 Service Unavailable
   - Invalid requests return appropriate error codes
   - All errors include descriptive messages

## Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test src/__tests__/e2e/autonomy-api.test.ts

# Run with coverage
bun test --coverage
```

## Test Implementation Details

### Direct Service Tests

Tests the `AutonomousLoopService` directly:

- Initial state verification
- Enable/disable operations
- State persistence checks
- Interval management

### API Endpoint Tests

Tests the HTTP endpoints via route handlers:

- Mock request/response objects
- Response data validation
- Service state verification
- Error condition handling

### Full Workflow Test

Tests complete enable→configure→disable workflow:

1. Start with disabled autonomy
2. Enable via API
3. Update interval
4. Verify status
5. Disable via API
6. Verify interval retained

## Notes

- Tests use real runtime instances (no mocks) for E2E testing
- The `AUTONOMY_ENABLED` setting accepts `true`, `false`, or `null` (treated as
  false)
- All API endpoints are public and don't require authentication
- The service handles concurrent requests safely
