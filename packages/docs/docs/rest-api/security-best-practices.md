---
id: security-best-practices
title: Security Best Practices
sidebar_label: Best Practices
sidebar_position: 5
---

# Security Best Practices

This guide provides comprehensive security best practices for deploying and maintaining ElizaOS in production environments. Following these guidelines will help protect your API, data, and users from common security threats.

## Deployment Security

### 1. Use HTTPS in Production

Always deploy ElizaOS behind HTTPS in production:

```nginx
# Nginx configuration example
server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. Environment Configuration

#### Secure Environment Variables

```bash
# Production .env file
NODE_ENV=production
ELIZA_SERVER_AUTH_TOKEN=$(openssl rand -base64 32)
CORS_ORIGIN=https://app.example.com
SERVER_HOST=127.0.0.1  # Bind to localhost, proxy through reverse proxy
SERVER_PORT=3000
ELIZA_UI_ENABLE=false  # Disable UI in production APIs

# Database
POSTGRES_URL=postgresql://user:pass@localhost:5432/elizaos?sslmode=require
```

#### Never Commit Secrets

```bash
# .gitignore
.env
.env.local
.env.production
.env.*.local
*.key
*.pem
*.cert
```

### 3. Network Security

#### Firewall Configuration

```bash
# Allow only necessary ports
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 443/tcp   # HTTPS
ufw allow 80/tcp    # HTTP (redirect to HTTPS)
ufw enable
```

#### IP Whitelisting

For administrative endpoints:

```javascript
const adminIpWhitelist = ['192.168.1.100', '10.0.0.50'];

app.use('/api/admin/*', (req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress;

  if (!adminIpWhitelist.includes(clientIp)) {
    logger.warn(`[SECURITY] Admin access denied from ${clientIp}`);
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
});
```

## API Security

### 1. Authentication Best Practices

#### Strong API Keys

Generate cryptographically secure API keys:

```bash
# Generate secure API key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Or using openssl
openssl rand -base64 32
```

#### API Key Rotation

Implement regular key rotation:

```javascript
class APIKeyManager {
  constructor() {
    this.keys = new Map();
    this.rotationInterval = 90 * 24 * 60 * 60 * 1000; // 90 days
  }

  generateKey() {
    const key = crypto.randomBytes(32).toString('base64');
    const metadata = {
      created: Date.now(),
      lastUsed: null,
      expiresAt: Date.now() + this.rotationInterval,
    };

    this.keys.set(key, metadata);
    return key;
  }

  validateKey(key) {
    const metadata = this.keys.get(key);

    if (!metadata) return false;
    if (Date.now() > metadata.expiresAt) {
      this.keys.delete(key);
      return false;
    }

    metadata.lastUsed = Date.now();
    return true;
  }

  rotateKeys() {
    const now = Date.now();
    for (const [key, metadata] of this.keys) {
      if (now > metadata.expiresAt) {
        this.keys.delete(key);
        logger.info(`[SECURITY] Rotated expired API key`);
      }
    }
  }
}
```

### 2. Input Validation

#### Validate All Inputs

```javascript
import { z } from 'zod';

// Define schemas for validation
const CreateAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  model: z.enum(['gpt-4', 'gpt-3.5-turbo', 'claude-3']),
  temperature: z.number().min(0).max(2).default(0.7),
});

// Validation middleware
function validateRequest(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      logger.warn(`[SECURITY] Invalid input: ${error.message}`);
      res.status(400).json({
        error: 'Invalid request data',
        details: error.errors,
      });
    }
  };
}

// Use in routes
app.post('/api/agents', validateRequest(CreateAgentSchema), (req, res) => {
  // Handle validated request
});
```

#### Sanitize File Uploads

```javascript
import path from 'path';
import crypto from 'crypto';

function sanitizeFilename(filename) {
  // Remove path traversal attempts
  const base = path.basename(filename);

  // Remove special characters
  const clean = base.replace(/[^a-zA-Z0-9.-]/g, '_');

  // Add random suffix to prevent collisions
  const ext = path.extname(clean);
  const name = path.basename(clean, ext);
  const random = crypto.randomBytes(8).toString('hex');

  return `${name}_${random}${ext}`;
}

// File upload configuration
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    // Whitelist allowed file types
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type'));
    }

    cb(null, true);
  },
  filename: (req, file, cb) => {
    cb(null, sanitizeFilename(file.originalname));
  },
});
```

### 3. Rate Limiting Strategies

#### Progressive Rate Limiting

```javascript
// Different limits for different operations
const rateLimits = {
  // Strict limit for authentication attempts
  auth: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true,
  }),

  // Moderate limit for writes
  write: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  }),

  // Relaxed limit for reads
  read: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
  }),
};

// Apply to routes
app.post('/api/auth/login', rateLimits.auth, loginHandler);
app.post('/api/agents', rateLimits.write, createAgentHandler);
app.get('/api/agents', rateLimits.read, listAgentsHandler);
```

#### Per-User Rate Limiting

```javascript
const userRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => {
    // Use authenticated user ID instead of IP
    return req.user?.id || req.ip;
  },
  handler: (req, res) => {
    logger.warn(`[SECURITY] Rate limit exceeded for user ${req.user?.id}`);
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: req.rateLimit.resetTime,
    });
  },
});
```

## Database Security

### 1. Connection Security

```javascript
// Use SSL for database connections
const dbConfig = {
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/server-ca.pem'),
  },
};
```

### 2. Query Security

#### Parameterized Queries

```javascript
// Always use parameterized queries
// Good - Safe from SQL injection
const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

// Bad - Vulnerable to SQL injection
const user = await db.query(`SELECT * FROM users WHERE id = ${userId}`);
```

#### Input Sanitization

```javascript
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;

  // Remove null bytes
  input = input.replace(/\0/g, '');

  // Escape special characters
  input = input.replace(/[\x00-\x1F\x7F]/g, '');

  return input;
}
```

### 3. Access Control

```javascript
// Implement row-level security
async function getAgentData(userId, agentId) {
  // Verify user has access to this agent
  const agent = await db.query('SELECT * FROM agents WHERE id = $1 AND user_id = $2', [
    agentId,
    userId,
  ]);

  if (!agent) {
    throw new Error('Unauthorized access to agent');
  }

  return agent;
}
```

## Monitoring and Logging

### 1. Security Event Logging

```javascript
class SecurityLogger {
  logSecurityEvent(event) {
    const entry = {
      timestamp: new Date().toISOString(),
      type: event.type,
      severity: event.severity,
      ip: event.ip,
      userId: event.userId,
      details: event.details,
    };

    // Log to file
    fs.appendFileSync('security.log', JSON.stringify(entry) + '\n');

    // Alert on critical events
    if (event.severity === 'critical') {
      this.sendAlert(entry);
    }
  }

  sendAlert(entry) {
    // Send to monitoring service
    // Send email/SMS to security team
  }
}

// Usage
securityLogger.logSecurityEvent({
  type: 'authentication_failure',
  severity: 'warning',
  ip: req.ip,
  details: 'Invalid API key attempt',
});
```

### 2. Intrusion Detection

```javascript
class IntrusionDetector {
  constructor() {
    this.suspiciousPatterns = [
      /\.\.[\/\\]/, // Path traversal
      /<script/i, // XSS attempts
      /union.*select/i, // SQL injection
      /eval\s*\(/, // Code injection
    ];

    this.ipBlacklist = new Set();
    this.failedAttempts = new Map();
  }

  checkRequest(req) {
    const url = req.url;
    const body = JSON.stringify(req.body);
    const headers = JSON.stringify(req.headers);

    // Check for suspicious patterns
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(url) || pattern.test(body) || pattern.test(headers)) {
        this.handleSuspiciousActivity(req, pattern);
        return false;
      }
    }

    return true;
  }

  handleSuspiciousActivity(req, pattern) {
    const ip = req.ip;

    // Track failed attempts
    const attempts = this.failedAttempts.get(ip) || 0;
    this.failedAttempts.set(ip, attempts + 1);

    // Auto-ban after threshold
    if (attempts > 10) {
      this.ipBlacklist.add(ip);
      logger.error(`[SECURITY] IP ${ip} blacklisted for suspicious activity`);
    }

    logger.warn(`[SECURITY] Suspicious pattern detected from ${ip}: ${pattern}`);
  }
}
```

### 3. Audit Logging

```javascript
// Log all administrative actions
function auditLog(action, user, details) {
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    user: {
      id: user.id,
      email: user.email,
      ip: user.ip,
    },
    details,
    hash: null,
  };

  // Create tamper-proof hash
  entry.hash = crypto.createHash('sha256').update(JSON.stringify(entry)).digest('hex');

  // Store in append-only audit log
  db.query('INSERT INTO audit_log (entry, hash) VALUES ($1, $2)', [entry, entry.hash]);
}
```

## Incident Response

### 1. Security Incident Plan

```javascript
class IncidentResponse {
  async handleSecurityIncident(incident) {
    // 1. Contain the threat
    if (incident.type === 'compromised_key') {
      await this.revokeApiKey(incident.apiKey);
    }

    // 2. Assess the damage
    const impact = await this.assessImpact(incident);

    // 3. Notify stakeholders
    await this.notifyTeam(incident, impact);

    // 4. Document everything
    await this.documentIncident(incident, impact);

    // 5. Implement fixes
    await this.implementFixes(incident);
  }

  async revokeApiKey(key) {
    // Immediately invalidate the key
    await db.query('UPDATE api_keys SET revoked = true WHERE key = $1', [key]);

    // Log all recent usage
    const usage = await db.query('SELECT * FROM api_logs WHERE key = $1 ORDER BY timestamp DESC', [
      key,
    ]);

    return usage;
  }
}
```

### 2. Backup and Recovery

```bash
#!/bin/bash
# Automated backup script

# Backup database
pg_dump $POSTGRES_URL | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Encrypt backup
openssl enc -aes-256-cbc -salt -in backup.sql.gz -out backup.sql.gz.enc

# Upload to secure storage
aws s3 cp backup.sql.gz.enc s3://secure-backups/

# Test restore process regularly
```

## Security Checklist

### Pre-Deployment

- [ ] Enable HTTPS with valid certificates
- [ ] Set strong `ELIZA_SERVER_AUTH_TOKEN`
- [ ] Configure CORS for specific origins
- [ ] Disable UI in production (`ELIZA_UI_ENABLE=false`)
- [ ] Set `NODE_ENV=production`
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerting
- [ ] Review and update all dependencies
- [ ] Run security audit (`npm audit`)

### Post-Deployment

- [ ] Monitor security logs regularly
- [ ] Set up automated security scans
- [ ] Implement key rotation schedule
- [ ] Regular backup testing
- [ ] Penetration testing
- [ ] Security training for team
- [ ] Incident response drills

## See Also

- [Authentication](./authentication.md) - API authentication setup
- [Rate Limiting](./rate-limiting.md) - Request throttling
- [Security Headers](./security-headers.md) - HTTP security headers
- [CORS Configuration](./cors.md) - Cross-origin security
