---
id: authorization
title: Authorization & Permissions
sidebar_label: Authorization
sidebar_position: 6
---

# Authorization & Permissions

While ElizaOS currently uses a simple API key authentication system, understanding the authorization model and planning for future enhancements is important for building secure applications.

## Current Authorization Model

### API Key Based Access

ElizaOS currently implements a simple all-or-nothing authorization model:

- **With valid API key**: Full access to all API endpoints
- **Without valid API key**: No access to protected endpoints

```javascript
// Current implementation
if (apiKey === process.env.ELIZA_SERVER_AUTH_TOKEN) {
  // Full access granted
} else {
  // Access denied
}
```

## Agent-Level Access Control

### Agent Ownership

Each agent is associated with the runtime that created it:

```javascript
// Agents are isolated by runtime
const agent = agents.get(agentId);
if (!agent) {
  return res.status(404).json({ error: 'Agent not found' });
}
```

### Channel Access

Channels and messages are scoped to specific agents:

```javascript
// Channel validation includes agent context
const channel = await getChannelDetails(channelId);
if (!channel || !channel.participants.includes(agentId)) {
  return res.status(403).json({ error: 'Access denied' });
}
```

## Best Practices for Application-Level Authorization

Since ElizaOS doesn't provide built-in user management, implement authorization at the application level:

### 1. Proxy Authentication

Use a reverse proxy or API gateway to add user authentication:

```nginx
# Nginx configuration with auth
location /api/ {
    auth_request /auth;
    auth_request_set $user_id $upstream_http_x_user_id;

    proxy_set_header X-User-ID $user_id;
    proxy_set_header X-API-KEY "your-eliza-api-key";
    proxy_pass http://localhost:3000;
}

location = /auth {
    internal;
    proxy_pass http://auth-service/verify;
}
```

### 2. Token Translation

Translate user tokens to ElizaOS API key:

```javascript
// Auth middleware in your application
async function authenticateUser(req, res, next) {
  const userToken = req.headers.authorization;

  // Verify user token with your auth service
  const user = await verifyUserToken(userToken);

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Add ElizaOS API key for backend
  req.headers['x-api-key'] = process.env.ELIZA_API_KEY;
  req.user = user;

  next();
}
```

### 3. Resource Scoping

Implement resource scoping in your application:

```javascript
class AgentManager {
  constructor(elizaClient) {
    this.elizaClient = elizaClient;
    this.userAgents = new Map(); // userId -> agentIds[]
  }

  async createAgent(userId, config) {
    // Create agent with ElizaOS
    const agent = await this.elizaClient.createAgent(config);

    // Track ownership
    const agents = this.userAgents.get(userId) || [];
    agents.push(agent.id);
    this.userAgents.set(userId, agents);

    return agent;
  }

  async getAgent(userId, agentId) {
    // Verify ownership
    const agents = this.userAgents.get(userId) || [];
    if (!agents.includes(agentId)) {
      throw new Error('Access denied');
    }

    return this.elizaClient.getAgent(agentId);
  }
}
```

## Multi-Tenant Architecture

For multi-tenant applications, implement tenant isolation:

### 1. Tenant-Specific API Keys

```javascript
// Tenant configuration
const tenants = {
  'tenant-1': {
    apiKey: process.env.TENANT_1_API_KEY,
    agentPrefix: 'tenant1_',
    limits: {
      maxAgents: 10,
      maxMessagesPerDay: 10000,
    },
  },
  'tenant-2': {
    apiKey: process.env.TENANT_2_API_KEY,
    agentPrefix: 'tenant2_',
    limits: {
      maxAgents: 50,
      maxMessagesPerDay: 100000,
    },
  },
};
```

### 2. Request Routing

```javascript
// Route requests based on tenant
app.use('/api/*', (req, res, next) => {
  const tenantId = req.headers['x-tenant-id'];
  const tenant = tenants[tenantId];

  if (!tenant) {
    return res.status(400).json({ error: 'Invalid tenant' });
  }

  // Set ElizaOS API key for tenant
  req.headers['x-api-key'] = tenant.apiKey;
  req.tenant = tenant;

  next();
});
```

### 3. Resource Namespacing

```javascript
// Namespace resources by tenant
async function createAgentForTenant(tenantId, config) {
  const tenant = tenants[tenantId];

  // Prefix agent name with tenant
  config.name = `${tenant.agentPrefix}${config.name}`;

  // Check tenant limits
  const agentCount = await getAgentCountForTenant(tenantId);
  if (agentCount >= tenant.limits.maxAgents) {
    throw new Error('Agent limit exceeded for tenant');
  }

  return elizaClient.createAgent(config);
}
```

## Role-Based Access Control (RBAC)

Implement RBAC in your application layer:

### 1. Define Roles

```javascript
const roles = {
  admin: {
    permissions: ['*'], // All permissions
  },
  developer: {
    permissions: [
      'agents:create',
      'agents:read',
      'agents:update',
      'agents:delete',
      'messages:read',
      'messages:create',
    ],
  },
  viewer: {
    permissions: ['agents:read', 'messages:read'],
  },
};
```

### 2. Permission Checking

```javascript
function hasPermission(user, resource, action) {
  const role = roles[user.role];
  if (!role) return false;

  const permission = `${resource}:${action}`;
  return role.permissions.includes('*') || role.permissions.includes(permission);
}

// Middleware
function requirePermission(resource, action) {
  return (req, res, next) => {
    if (!hasPermission(req.user, resource, action)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
      });
    }
    next();
  };
}

// Usage
app.post(
  '/api/agents',
  authenticateUser,
  requirePermission('agents', 'create'),
  createAgentHandler
);
```

## Audit Trail

Implement audit logging for authorization events:

```javascript
class AuthorizationAuditor {
  logAccess(user, resource, action, result) {
    const entry = {
      timestamp: new Date().toISOString(),
      userId: user.id,
      userRole: user.role,
      resource,
      action,
      result, // 'allowed' or 'denied'
      ip: user.ip,
      userAgent: user.userAgent,
    };

    // Store in audit log
    db.auditLog.insert(entry);

    // Alert on suspicious patterns
    if (result === 'denied') {
      this.checkSuspiciousActivity(user, entry);
    }
  }

  checkSuspiciousActivity(user, entry) {
    // Check for repeated access denials
    const recentDenials = db.auditLog.count({
      userId: user.id,
      result: 'denied',
      timestamp: { $gt: Date.now() - 3600000 }, // Last hour
    });

    if (recentDenials > 10) {
      alertSecurityTeam({
        message: 'Repeated access denials',
        user,
        denialCount: recentDenials,
      });
    }
  }
}
```

## Future Authorization Enhancements

### Planned Features

1. **OAuth 2.0 Support**

   - Standard OAuth flows
   - Scope-based permissions
   - Token refresh mechanisms

2. **JWT Integration**

   - Self-contained tokens
   - Claims-based authorization
   - Token expiration

3. **Fine-Grained Permissions**

   - Per-agent permissions
   - Channel-level access control
   - Message filtering based on roles

4. **API Key Scoping**
   - Read-only keys
   - Agent-specific keys
   - Time-limited keys

## Security Considerations

### 1. Principle of Least Privilege

Always grant the minimum permissions necessary:

```javascript
// Bad: Full access for all users
const apiKey = process.env.ELIZA_API_KEY;

// Good: Scoped access based on needs
const permissions = {
  readOnly: ['agents:read', 'messages:read'],
  contributor: [...readOnly, 'messages:create'],
  admin: ['*'],
};
```

### 2. Regular Permission Audits

```javascript
// Audit script to check permissions
async function auditPermissions() {
  const users = await getUsers();

  for (const user of users) {
    const lastActive = await getLastActivity(user.id);
    const daysSinceActive = (Date.now() - lastActive) / (1000 * 60 * 60 * 24);

    if (daysSinceActive > 90 && user.role === 'admin') {
      console.warn(`Admin user ${user.id} inactive for ${daysSinceActive} days`);
    }
  }
}
```

### 3. Defense in Depth

Layer authorization checks:

```javascript
// Multiple authorization layers
async function getAgentMessages(userId, agentId, channelId) {
  // Layer 1: User authentication
  if (!userId) throw new Error('Unauthorized');

  // Layer 2: Agent access
  if (!userCanAccessAgent(userId, agentId)) {
    throw new Error('Access denied to agent');
  }

  // Layer 3: Channel access
  if (!agentCanAccessChannel(agentId, channelId)) {
    throw new Error('Access denied to channel');
  }

  // Layer 4: Message filtering
  const messages = await getMessages(channelId);
  return messages.filter((msg) => userCanViewMessage(userId, msg));
}
```

## See Also

- [Authentication](./authentication.md) - API key setup
- [Security Best Practices](./security-best-practices.md) - Overall security guide
- [Rate Limiting](./rate-limiting.md) - Usage limits and quotas
