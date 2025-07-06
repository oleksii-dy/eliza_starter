---
id: error-responses
title: Error Response Format
sidebar_label: Error Responses
sidebar_position: 2
---

# Error Response Documentation

## Overview

The ElizaOS REST API uses a standardized error response format across all endpoints. All error responses follow a consistent structure to make error handling predictable and manageable for API consumers.

## Error Response Format

All API errors return a JSON response with the following structure:

```typescript
{
  "success": false,
  "error": {
    "code": string,      // Machine-readable error code
    "message": string,   // Human-readable error message
    "details"?: string   // Optional additional context (only for 500 errors)
  }
}
```

### Fields

- **success** (boolean): Always `false` for error responses
- **error** (object): Contains error details
  - **code** (string): A constant, machine-readable error identifier (e.g., "INVALID_ID", "NOT_FOUND")
  - **message** (string): A human-readable description of the error
  - **details** (string, optional): Additional error context, typically only included for 500-level errors

## HTTP Status Codes

### 400 Bad Request

Indicates invalid request parameters, missing required fields, or malformed data.

**Common Error Codes:**

- `INVALID_ID` - Invalid UUID format for agent, room, world, memory, or log IDs
- `INVALID_CHANNEL_ID` - Invalid channel ID format
- `INVALID_FILE_TYPE` - Unsupported file type for uploads
- `INVALID_REQUEST` - Missing required fields or malformed request body
- `INVALID_CONTENT_TYPE` - Wrong or missing Content-Type header
- `BAD_REQUEST` - General bad request error
- `MISSING_PARAM` - Required parameter is missing
- `MISSING_CHANNEL_ID` - Channel ID is required but not provided

**Example:**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_ID",
    "message": "Invalid agent ID format"
  }
}
```

### 404 Not Found

The requested resource does not exist.

**Common Error Codes:**

- `NOT_FOUND` - Generic not found error for agents, rooms, worlds, memories, etc.

**Example:**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Agent not found"
  }
}
```

### 408 Request Timeout

The operation took too long to complete.

**Common Error Codes:**

- `TIMEOUT` - Operation timed out

**Example:**

```json
{
  "success": false,
  "error": {
    "code": "TIMEOUT",
    "message": "Agent deletion operation timed out"
  }
}
```

### 409 Conflict

The request conflicts with the current state of the resource.

**Common Error Codes:**

- `CONFLICT` - Resource has dependencies preventing the operation

**Example:**

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Cannot delete agent because it has active references in the system"
  }
}
```

### 429 Too Many Requests

Rate limit exceeded.

**Common Error Codes:**

- `RATE_LIMIT_EXCEEDED` - General API rate limit exceeded
- `FILE_RATE_LIMIT_EXCEEDED` - File operation rate limit exceeded
- `UPLOAD_RATE_LIMIT_EXCEEDED` - Upload rate limit exceeded
- `CHANNEL_VALIDATION_RATE_LIMIT_EXCEEDED` - Channel validation attempts exceeded

**Example:**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later."
  }
}
```

### 500 Internal Server Error

Unexpected server error or system failure.

**Common Error Codes:**

- `DB_ERROR` - Database-related errors
- `MODEL_ERROR` - AI model errors
- `PROCESSING_ERROR` - General processing errors
- `CREATE_ERROR` - Resource creation failed
- `UPDATE_ERROR` - Resource update failed
- `DELETE_ERROR` - Resource deletion failed
- `UPLOAD_ERROR` - File upload processing failed
- `500` - Generic internal server error

**Example:**

```json
{
  "success": false,
  "error": {
    "code": "DB_ERROR",
    "message": "Database not available",
    "details": "Connection timeout after 30 seconds"
  }
}
```

### 503 Service Unavailable

The service is temporarily unavailable, often due to missing dependencies.

**Special Case - Health Check Endpoint:**

The `/health` endpoint returns 503 when no agents are running:

```json
{
  "status": "OK",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "dependencies": {
    "agents": "no_agents"
  }
}
```

Note: The health check endpoint doesn't follow the standard error format but uses HTTP status codes to indicate system health.

## Error Handling Best Practices

### Client-Side Error Handling

```javascript
try {
  const response = await fetch('/api/agents/123');
  const data = await response.json();

  if (!response.ok) {
    // Handle error based on status code
    switch (response.status) {
      case 400:
        if (data.error.code === 'INVALID_ID') {
          console.error('Invalid agent ID format');
        }
        break;
      case 404:
        console.error('Agent not found');
        break;
      case 429:
        // Implement exponential backoff
        console.error('Rate limit hit, retrying in 60 seconds...');
        break;
      case 500:
        console.error('Server error:', data.error.details || data.error.message);
        break;
    }
    return;
  }

  // Handle successful response
  console.log('Agent data:', data.data);
} catch (error) {
  console.error('Network error:', error);
}
```

### Error Code Constants

For better maintainability, define error codes as constants:

```typescript
const ErrorCodes = {
  // 400 errors
  INVALID_ID: 'INVALID_ID',
  INVALID_REQUEST: 'INVALID_REQUEST',
  BAD_REQUEST: 'BAD_REQUEST',

  // 404 errors
  NOT_FOUND: 'NOT_FOUND',

  // 408 errors
  TIMEOUT: 'TIMEOUT',

  // 409 errors
  CONFLICT: 'CONFLICT',

  // 429 errors
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // 500 errors
  DB_ERROR: 'DB_ERROR',
  MODEL_ERROR: 'MODEL_ERROR',
  PROCESSING_ERROR: 'PROCESSING_ERROR',
} as const;
```

## Rate Limiting

The API implements several rate limiting tiers:

1. **General API Rate Limit**: 1000 requests per 15 minutes per IP
2. **File System Operations**: 100 requests per 5 minutes per IP
3. **Upload Operations**: 50 requests per 15 minutes per IP
4. **Channel Validation**: 200 attempts per 10 minutes per IP

Rate limit information is included in response headers:

- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining in current window
- `RateLimit-Reset`: Unix timestamp when the rate limit resets

## Security Considerations

1. **Error Details**: Detailed error information (stack traces, system paths) is never exposed in production
2. **Rate Limiting**: Aggressive rate limiting on validation endpoints prevents brute force attacks
3. **Input Validation**: All IDs are validated to prevent path traversal and injection attacks
4. **Logging**: Security-relevant errors are logged with client IP addresses for monitoring

## Related Documentation

- [API Endpoints](./endpoints.md) - Complete REST API reference
- [Media Endpoints](/src/api/media-endpoints) - File upload error handling
- [Socket.IO Events](/src/api/socketio-events) - WebSocket error events
- [Environment Variables](/src/api/environment-variables) - Error logging configuration
