---
id: rate-limiting
title: Rate Limiting
sidebar_label: Rate Limiting
sidebar_position: 2
---

# Rate Limiting

ElizaOS implements comprehensive rate limiting to protect your API from abuse and ensure fair usage across all clients. This guide covers the different rate limiting tiers and how to work with them.

## Overview

Rate limiting in ElizaOS is implemented using a sliding window algorithm that tracks requests per IP address. Different endpoints have different rate limits based on their resource intensity.

## Rate Limit Tiers

### General API Rate Limit

Most API endpoints use the general rate limit:

- **Limit**: 1,000 requests per 15 minutes per IP
- **Window**: 15 minutes (sliding window)
- **Applies to**: Most `/api/*` endpoints

```javascript
// General API rate limit configuration
{
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window
}
```

### File System Operations

Endpoints that interact with the file system have stricter limits:

- **Limit**: 100 requests per 5 minutes per IP
- **Window**: 5 minutes (sliding window)
- **Applies to**: File reading, directory listing operations

```javascript
// File system rate limit configuration
{
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // Limit each IP to 100 file operations
}
```

### Upload Operations

File upload endpoints have the strictest limits:

- **Limit**: 50 uploads per 15 minutes per IP
- **Window**: 15 minutes (sliding window)
- **Applies to**: Media uploads, agent file uploads

```javascript
// Upload rate limit configuration
{
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 uploads
}
```

### Channel Validation

Channel ID validation has specific rate limiting to prevent brute force attacks:

- **Limit**: 200 attempts per 10 minutes per IP
- **Window**: 10 minutes (sliding window)
- **Special behavior**: Successful validations don't count against the limit

## Rate Limit Headers

ElizaOS returns standard rate limit headers with each response:

```http
RateLimit-Limit: 1000
RateLimit-Remaining: 950
RateLimit-Reset: 1642435200
```

| Header                | Description                            |
| --------------------- | -------------------------------------- |
| `RateLimit-Limit`     | Maximum requests allowed in the window |
| `RateLimit-Remaining` | Requests remaining in current window   |
| `RateLimit-Reset`     | Unix timestamp when the window resets  |

## Rate Limit Responses

### Successful Request

When under the rate limit, requests proceed normally with rate limit headers:

```http
HTTP/1.1 200 OK
RateLimit-Limit: 1000
RateLimit-Remaining: 999
RateLimit-Reset: 1642435200
Content-Type: application/json

{
  "success": true,
  "data": { ... }
}
```

### Rate Limit Exceeded

When the rate limit is exceeded:

```http
HTTP/1.1 429 Too Many Requests
RateLimit-Limit: 1000
RateLimit-Remaining: 0
RateLimit-Reset: 1642435200
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later."
  }
}
```

## Client Implementation

### Handling Rate Limits in JavaScript

```javascript
async function makeAPIRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'X-API-KEY': 'your-api-key',
      ...options.headers,
    },
  });

  // Check for rate limit
  if (response.status === 429) {
    const resetTime = response.headers.get('RateLimit-Reset');
    const waitTime = resetTime ? new Date(resetTime * 1000) - new Date() : 60000; // Default to 1 minute

    console.log(`Rate limited. Waiting ${waitTime}ms before retry...`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));

    // Retry the request
    return makeAPIRequest(url, options);
  }

  return response;
}
```

### Implementing Backoff Strategy

```javascript
class APIClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.requestQueue = [];
    this.rateLimitRemaining = 1000;
    this.rateLimitReset = null;
  }

  async request(url, options = {}) {
    // Check if we should wait
    if (this.rateLimitRemaining <= 0 && this.rateLimitReset) {
      const waitTime = this.rateLimitReset - Date.now();
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'X-API-KEY': this.apiKey,
        ...options.headers,
      },
    });

    // Update rate limit info
    this.rateLimitRemaining = parseInt(response.headers.get('RateLimit-Remaining') || '1000');
    this.rateLimitReset = parseInt(response.headers.get('RateLimit-Reset') || '0') * 1000;

    if (response.status === 429) {
      throw new Error('Rate limit exceeded');
    }

    return response;
  }
}
```

## Best Practices

### 1. Implement Client-Side Rate Limiting

Don't wait for server rate limits. Implement your own throttling:

```javascript
import pLimit from 'p-limit';

// Limit to 10 concurrent requests
const limit = pLimit(10);

// Limit to 100 requests per minute
const requestsPerMinute = 100;
const delayBetweenRequests = 60000 / requestsPerMinute;

async function throttledRequest(url) {
  return limit(async () => {
    const result = await fetch(url);
    await new Promise((resolve) => setTimeout(resolve, delayBetweenRequests));
    return result;
  });
}
```

### 2. Use Batch Operations

Instead of many individual requests, use batch endpoints where available:

```javascript
// Bad: Multiple individual requests
for (const id of agentIds) {
  await fetch(`/api/agents/${id}`);
}

// Good: Single batch request
await fetch('/api/agents/batch', {
  method: 'POST',
  body: JSON.stringify({ ids: agentIds }),
});
```

### 3. Cache Responses

Reduce API calls by caching responses client-side:

```javascript
class CachedAPIClient {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async get(url) {
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    const response = await fetch(url);
    const data = await response.json();

    this.cache.set(url, {
      data,
      timestamp: Date.now(),
    });

    return data;
  }
}
```

## Monitoring Rate Limits

### Server-Side Logging

The server logs rate limit violations:

```log
[2024-01-15 10:23:45] WARN: [SECURITY] Rate limit exceeded for IP: 192.168.1.100
[2024-01-15 10:24:12] WARN: [SECURITY] Upload rate limit exceeded for IP: 10.0.0.50, endpoint: /api/media/upload
```

### Client-Side Monitoring

Track your rate limit usage:

```javascript
class RateLimitMonitor {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      rateLimitHits: 0,
      averageRemaining: [],
    };
  }

  trackResponse(response) {
    this.metrics.totalRequests++;

    const remaining = parseInt(response.headers.get('RateLimit-Remaining') || '0');
    this.metrics.averageRemaining.push(remaining);

    if (response.status === 429) {
      this.metrics.rateLimitHits++;
    }

    // Alert if consistently low on quota
    if (remaining < 100) {
      console.warn(`Low rate limit quota: ${remaining} requests remaining`);
    }
  }

  getStats() {
    const avgRemaining =
      this.metrics.averageRemaining.reduce((a, b) => a + b, 0) /
      this.metrics.averageRemaining.length;

    return {
      ...this.metrics,
      averageRemaining: avgRemaining,
      hitRate: this.metrics.rateLimitHits / this.metrics.totalRequests,
    };
  }
}
```

## Rate Limit Configuration

### Environment Variables

Currently, rate limits are hardcoded in the application. Future versions may support environment variable configuration:

```bash
# Potential future configuration (not yet implemented)
API_RATE_LIMIT_WINDOW=15
API_RATE_LIMIT_MAX=1000
UPLOAD_RATE_LIMIT_MAX=50
```

### Custom Rate Limits

For enterprise deployments or special use cases, you can modify the rate limit middleware:

```javascript
// Custom rate limit for specific endpoints
app.use(
  '/api/special-endpoint',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // Very restrictive
    message: 'Special endpoint rate limit exceeded',
  })
);
```

## Troubleshooting

### Common Issues

1. **Sudden 429 errors**

   - Check for request loops or rapid polling
   - Implement exponential backoff
   - Review client implementation for efficiency

2. **Inconsistent rate limit headers**

   - Ensure requests are from the same IP
   - Check for proxy/load balancer configuration
   - Verify no IP spoofing is occurring

3. **Rate limits hit during normal usage**
   - Implement request batching
   - Add client-side caching
   - Consider upgrading to enterprise tier (if available)

## See Also

- [Authentication](./authentication.md) - Secure your API with authentication
- [Security Best Practices](./security-best-practices.md) - Production security guide
- [CORS Configuration](./cors.md) - Cross-origin request handling
