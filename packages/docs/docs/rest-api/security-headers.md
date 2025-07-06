---
id: security-headers
title: Security Headers
sidebar_label: Security Headers
sidebar_position: 4
---

# Security Headers

ElizaOS implements comprehensive security headers to protect against common web vulnerabilities. This guide covers the security headers applied by the server and how they protect your application.

## Overview

Security headers are HTTP response headers that provide an additional layer of security by instructing browsers how to behave when handling your site's content. ElizaOS uses the [Helmet.js](https://helmetjs.github.io/) middleware along with custom security measures.

## Default Security Headers

### Content Security Policy (CSP)

CSP helps prevent XSS attacks by controlling which resources can be loaded.

**Production Configuration:**

```javascript
{
  defaultSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
  scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
  fontSrc: ["'self'", 'https:', 'data:'],
  connectSrc: ["'self'", 'ws:', 'wss:', 'https:', 'http:'],
  mediaSrc: ["'self'", 'blob:', 'data:'],
  objectSrc: ["'none'"],
  frameSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  upgradeInsecureRequests: [] // Automatically added in production
}
```

**Development Configuration:**

```javascript
{
  // More permissive for development
  defaultSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'", 'https:', 'http:'],
  scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
  fontSrc: ["'self'", 'https:', 'http:', 'data:'],
  connectSrc: ["'self'", 'ws:', 'wss:', 'https:', 'http:'],
  mediaSrc: ["'self'", 'blob:', 'data:'],
  objectSrc: ["'none'"],
  frameSrc: ["'self'", 'data:'], // Allows same-origin iframes for plugins
  baseUri: ["'self'"],
  formAction: ["'self'"]
  // No upgrade-insecure-requests for local development
}
```

### Strict Transport Security (HSTS)

Forces HTTPS connections in production:

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Configuration:**

- `max-age=31536000`: Remember HTTPS preference for 1 year
- `includeSubDomains`: Apply to all subdomains
- `preload`: Allow inclusion in browser HSTS preload lists
- **Disabled in development** to avoid local HTTPS requirements

### X-Frame-Options

Prevents clickjacking attacks:

```http
X-Frame-Options: SAMEORIGIN
```

- `SAMEORIGIN`: Allows framing only from the same origin
- Protects against UI redressing attacks
- Aligned with CSP `frameSrc` directive

### X-Content-Type-Options

Prevents MIME type sniffing:

```http
X-Content-Type-Options: nosniff
```

- Forces browsers to respect declared content types
- Prevents treating non-scripts as scripts
- Critical for preventing XSS via content sniffing

### X-XSS-Protection

Legacy XSS protection for older browsers:

```http
X-XSS-Protection: 1; mode=block
```

- Enables XSS filtering
- Blocks page rendering if XSS detected
- Supplementary to CSP

### Referrer-Policy

Controls referrer information sent with requests:

```http
Referrer-Policy: no-referrer-when-downgrade
```

- Sends referrer for same-protocol requests
- Omits referrer when downgrading from HTTPS to HTTP
- Balances security and functionality

### Additional Custom Headers

ElizaOS adds custom security headers via middleware:

```javascript
// Remove potentially revealing headers
res.removeHeader('X-Powered-By');
res.removeHeader('Server');

// Additional security headers for API responses
res.setHeader('X-Content-Type-Options', 'nosniff');
res.setHeader('X-Frame-Options', 'SAMEORIGIN');
res.setHeader('X-XSS-Protection', '1; mode=block');
res.setHeader('Referrer-Policy', 'no-referrer');
```

## Environment-Specific Configuration

### Production Environment

In production (`NODE_ENV=production`), ElizaOS applies strict security headers:

```javascript
const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
  // Strict CSP with upgrade-insecure-requests
  // HSTS enabled with preload
  // All security features maximized
}
```

### Development Environment

In development, some restrictions are relaxed:

- No HSTS (allows HTTP for local development)
- No `upgrade-insecure-requests` in CSP
- More permissive resource loading
- Frame embedding allowed for testing

## Security Monitoring

### Suspicious Pattern Detection

ElizaOS monitors for suspicious patterns in requests:

```javascript
// Detected patterns:
- Path traversal: '..'
- XSS attempts: '<script'
- JavaScript injection: 'javascript:'
- SQL injection: Combined SQL keywords
```

Example log entries:

```log
[SECURITY] Path traversal detected from 192.168.1.100: /api/../../../etc/passwd
[SECURITY] XSS attempt detected from 10.0.0.50: /api/test<script>alert(1)</script>
[SECURITY] SQL injection pattern detected from 172.16.0.10: /api/users?id=1' UNION SELECT * FROM users--
```

### User-Agent Analysis

Suspicious User-Agent strings are logged:

```javascript
if (userAgent && (userAgent.includes('..') || userAgent.includes('<script'))) {
  logger.warn(`[SECURITY] Suspicious User-Agent from ${clientIp}: ${userAgent}`);
}
```

## Customizing Security Headers

### Modifying CSP for Specific Needs

If you need to load resources from specific domains:

```javascript
// Example: Adding a CDN for fonts
const cspDirectives = {
  ...defaultDirectives,
  fontSrc: ["'self'", 'https:', 'data:', 'https://fonts.googleapis.com'],
};
```

### Disabling Specific Headers

For compatibility with certain services:

```javascript
app.use(
  helmet({
    // Disable frameguard for embeddable widgets
    frameguard: false,
    // Or set custom frame options
    frameguard: { action: 'ALLOWFROM', domain: 'https://trusted.com' },
  })
);
```

### Adding Custom Security Headers

Add application-specific security headers:

```javascript
app.use((req, res, next) => {
  // Custom security headers
  res.setHeader('X-Custom-Security', 'enabled');
  res.setHeader('Feature-Policy', "geolocation 'none'; microphone 'none'");
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=()');
  next();
});
```

## Testing Security Headers

### Using Security Headers Scanner

Test your deployment's security headers:

```bash
# Using curl to check headers
curl -I https://your-api.example.com/api/ping

# Using online tools
# https://securityheaders.com
# https://observatory.mozilla.org
```

### Expected Response Headers

A properly configured ElizaOS server should return:

```http
HTTP/2 200
content-security-policy: default-src 'self'; style-src 'self' 'unsafe-inline' https:; ...
strict-transport-security: max-age=31536000; includeSubDomains; preload
x-frame-options: SAMEORIGIN
x-content-type-options: nosniff
x-xss-protection: 1; mode=block
referrer-policy: no-referrer-when-downgrade
```

## Common Issues and Solutions

### 1. CSP Blocking Resources

**Problem:** Resources fail to load with CSP errors

**Solution:** Update CSP directives to allow required sources:

```javascript
// Console error: Refused to load script from 'https://cdn.example.com/script.js'
// Add to scriptSrc:
scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.example.com'];
```

### 2. HSTS Issues in Development

**Problem:** Browser forces HTTPS after visiting production site

**Solution:** Clear HSTS settings:

- Chrome: `chrome://net-internals/#hsts`
- Firefox: Clear site data in privacy settings
- Use different domain/port for development

### 3. Iframe Embedding Issues

**Problem:** Cannot embed ElizaOS UI in iframe

**Solution:** Adjust frame options if embedding is required:

```javascript
// Allow specific origin
frameguard: { action: 'ALLOWFROM', domain: 'https://trusted-site.com' }

// Or disable for specific routes
app.get('/embeddable/*', (req, res, next) => {
  res.removeHeader('X-Frame-Options');
  next();
});
```

## Security Best Practices

### 1. Regular Security Audits

```bash
# Run security audit tools
npm audit
npm audit fix

# Check for known vulnerabilities
npx snyk test
```

### 2. Monitor Security Logs

```javascript
// Set up alerts for security events
logger.on('warn', (log) => {
  if (log.msg && log.msg.includes('[SECURITY]')) {
    // Send alert to security monitoring
    alertSecurityTeam(log);
  }
});
```

### 3. Keep Dependencies Updated

```bash
# Check for updates
npm outdated

# Update security-related packages
npm update helmet express
```

### 4. Test Security Headers in CI/CD

```javascript
// Example test
describe('Security Headers', () => {
  it('should set X-Frame-Options', async () => {
    const response = await request(app).get('/api/ping');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('should have strict CSP in production', async () => {
    process.env.NODE_ENV = 'production';
    const response = await request(app).get('/api/ping');
    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
  });
});
```

## Compliance Considerations

### OWASP Recommendations

ElizaOS security headers align with OWASP guidelines:

- ✅ Content Security Policy
- ✅ X-Frame-Options
- ✅ X-Content-Type-Options
- ✅ Strict-Transport-Security
- ✅ Referrer-Policy

### GDPR and Privacy

Security headers support privacy compliance:

- Referrer-Policy prevents leaking user paths
- CSP prevents unauthorized data exfiltration
- HSTS ensures encrypted data transmission

## See Also

- [Authentication](./authentication.md) - API authentication setup
- [CORS Configuration](./cors.md) - Cross-origin request handling
- [Rate Limiting](./rate-limiting.md) - Request throttling and limits
- [Security Best Practices](./security-best-practices.md) - Overall security guide
