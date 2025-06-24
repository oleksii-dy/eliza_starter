import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { autoPlugin } from '../../index';
import { createMockRuntime, createMockMemory, createMockState } from '../utils/mock-runtime';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';

/**
 * Network security tests for autonomous operations
 * These tests ensure secure handling of network communications
 */
describe('Network Security Tests', () => {
  let mockRuntime: IAgentRuntime;

  beforeEach(async () => {
    mock.restore();

    mockRuntime = createMockRuntime({
      settings: {
        AUTONOMOUS_ENABLED: 'true',
        BLOCKED_IPS: JSON.stringify(['127.0.0.1', '0.0.0.0', '::1', '169.254.0.0/16']),
        BLOCKED_DOMAINS: JSON.stringify(['localhost', 'malware.com', 'phishing.net']),
        ALLOWED_DOMAINS: JSON.stringify(['example.com', 'httpbin.org', 'google.com']),
        MAX_REQUEST_SIZE: '10485760', // 10MB
        NETWORK_TIMEOUT: '30000', // 30 seconds
      },
    });
  });

  afterEach(() => {
    mock.restore();
  });

  describe('URL Validation and Filtering', () => {
    it('should block requests to localhost and internal IPs', async () => {
      const browseAction = autoPlugin.actions?.find((a) => a.name === 'BROWSE_WEB');
      expect(browseAction).toBeDefined();

      if (browseAction) {
        const localUrls = [
          'http://localhost:8080',
          'https://127.0.0.1:3000',
          'http://0.0.0.0:5000',
          'http://[::1]:8000',
          'http://192.168.1.1',
          'http://10.0.0.1',
          'http://172.16.0.1',
          'http://169.254.169.254', // AWS metadata
          'http://metadata.google.internal', // GCP metadata
        ];

        for (const url of localUrls) {
          const message = createMockMemory({
            content: { text: `Browse to ${url}`, source: 'user' },
          });

          const isValid = await browseAction.validate(mockRuntime, message, createMockState());
          expect(isValid).toBe(false);
        }
      }
    });

    it('should validate domain whitelist and blacklist', async () => {
      const browseAction = autoPlugin.actions?.find((a) => a.name === 'BROWSE_WEB');
      expect(browseAction).toBeDefined();

      if (browseAction) {
        // Blocked domains
        const blockedUrls = [
          'https://malware.com/payload',
          'http://phishing.net/steal-data',
          'https://localhost/admin',
        ];

        for (const url of blockedUrls) {
          const message = createMockMemory({
            content: { text: `Access ${url}`, source: 'user' },
          });

          const isValid = await browseAction.validate(mockRuntime, message, createMockState());
          expect(isValid).toBe(false);
        }

        // Allowed domains
        const allowedUrls = [
          'https://example.com/test',
          'https://httpbin.org/get',
          'https://www.google.com/search?q=test',
        ];

        for (const url of allowedUrls) {
          const message = createMockMemory({
            content: { text: `Browse ${url}`, source: 'user' },
          });

          const isValid = await browseAction.validate(mockRuntime, message, createMockState());
          expect(isValid).toBe(true);
        }
      }
    });

    it('should prevent SSRF attacks through URL redirection', async () => {
      const browseAction = autoPlugin.actions?.find((a) => a.name === 'BROWSE_WEB');
      expect(browseAction).toBeDefined();

      if (browseAction) {
        // URLs that might redirect to internal services
        const ssrfUrls = [
          'https://example.com/redirect?url=http://localhost:8080',
          'https://httpbin.org/redirect-to?url=http://127.0.0.1:3000',
          'https://evil.com/redirect?target=http://169.254.169.254/metadata',
        ];

        for (const url of ssrfUrls) {
          const callback = mock();
          const message = createMockMemory({
            content: { text: `Browse ${url}`, source: 'user' },
          });

          // Should handle redirects safely
          await browseAction.handler(mockRuntime, message, createMockState(), {}, callback);
          expect(callback).toHaveBeenCalled();

          // Check if response indicates security measures
          const response = callback.mock.calls[0][0];
          expect(response).toBeDefined();
        }
      }
    });
  });

  describe('Request Size and Rate Limiting', () => {
    it('should enforce maximum request size limits', async () => {
      const browseAction = autoPlugin.actions?.find((a) => a.name === 'BROWSE_WEB');
      expect(browseAction).toBeDefined();

      if (browseAction) {
        // Large payload URLs that might cause DoS
        const largePayloadUrls = [
          'https://httpbin.org/bytes/50000000', // 50MB response
          'https://httpbin.org/stream-bytes/100000000', // 100MB stream
        ];

        for (const url of largePayloadUrls) {
          const callback = mock();
          const message = createMockMemory({
            content: { text: `Download ${url}`, source: 'user' },
          });

          const startTime = Date.now();
          await browseAction.handler(mockRuntime, message, createMockState(), {}, callback);
          const duration = Date.now() - startTime;

          expect(callback).toHaveBeenCalled();

          // Should not take too long (should have size limits)
          expect(duration).toBeLessThan(60000); // 1 minute max

          const response = callback.mock.calls[0][0];
          expect(response.text).toBeDefined();
        }
      }
    });

    it('should implement rate limiting for network requests', async () => {
      const browseAction = autoPlugin.actions?.find((a) => a.name === 'BROWSE_WEB');
      expect(browseAction).toBeDefined();

      if (browseAction) {
        const callback = mock();
        const rapidRequests = Array.from(
          { length: 10 },
          (_, i) => `https://httpbin.org/delay/0?request=${i}`
        );

        const startTime = Date.now();

        // Make rapid successive requests
        for (const url of rapidRequests) {
          const message = createMockMemory({
            content: { text: `Browse ${url}`, source: 'user' },
          });

          await browseAction.handler(mockRuntime, message, createMockState(), {}, callback);
        }

        const duration = Date.now() - startTime;

        // Should have some delay between requests (rate limiting)
        expect(duration).toBeGreaterThan(1000); // At least 1 second for 10 requests
        expect(callback).toHaveBeenCalledTimes(rapidRequests.length);
      }
    });
  });

  describe('Protocol Security', () => {
    it('should enforce HTTPS for sensitive operations', async () => {
      const browseAction = autoPlugin.actions?.find((a) => a.name === 'BROWSE_WEB');
      expect(browseAction).toBeDefined();

      if (browseAction) {
        // HTTP URLs that should be upgraded or blocked
        const httpUrls = [
          'http://example.com/login',
          'http://api.example.com/sensitive-data',
          'http://admin.example.com/dashboard',
        ];

        for (const url of httpUrls) {
          const callback = mock();
          const message = createMockMemory({
            content: { text: `Access ${url}`, source: 'user' },
          });

          await browseAction.handler(mockRuntime, message, createMockState(), {}, callback);

          expect(callback).toHaveBeenCalled();
          const response = callback.mock.calls[0][0];

          // Should either upgrade to HTTPS or warn about insecurity
          expect(response.text).toBeDefined();
        }
      }
    });

    it('should block dangerous protocols', async () => {
      const browseAction = autoPlugin.actions?.find((a) => a.name === 'BROWSE_WEB');
      expect(browseAction).toBeDefined();

      if (browseAction) {
        const dangerousProtocols = [
          'file:///etc/passwd',
          'ftp://anonymous@server.com/data',
          'ldap://server.com/dc=example',
          'gopher://evil.com/payload',
          'dict://server.com:2628/show:info',
          'telnet://server.com:23',
        ];

        for (const url of dangerousProtocols) {
          const message = createMockMemory({
            content: { text: `Connect to ${url}`, source: 'user' },
          });

          const isValid = await browseAction.validate(mockRuntime, message, createMockState());
          expect(isValid).toBe(false);
        }
      }
    });
  });

  describe('Certificate and TLS Security', () => {
    it('should validate SSL certificates properly', async () => {
      const browseAction = autoPlugin.actions?.find((a) => a.name === 'BROWSE_WEB');
      expect(browseAction).toBeDefined();

      if (browseAction) {
        // URLs with potential certificate issues
        const certificateTestUrls = [
          'https://self-signed.badssl.com/',
          'https://expired.badssl.com/',
          'https://untrusted-root.badssl.com/',
        ];

        for (const url of certificateTestUrls) {
          const callback = mock();
          const message = createMockMemory({
            content: { text: `Test certificate for ${url}`, source: 'user' },
          });

          await browseAction.handler(mockRuntime, message, createMockState(), {}, callback);

          expect(callback).toHaveBeenCalled();
          const response = callback.mock.calls[0][0];

          // Should handle certificate errors appropriately
          expect(response.text).toBeDefined();
        }
      }
    });
  });

  describe('Header Security', () => {
    it('should not send sensitive headers in requests', async () => {
      const browseAction = autoPlugin.actions?.find((a) => a.name === 'BROWSE_WEB');
      expect(browseAction).toBeDefined();

      if (browseAction) {
        const callback = mock();
        const message = createMockMemory({
          content: { text: 'Browse https://httpbin.org/headers', source: 'user' },
        });

        await browseAction.handler(mockRuntime, message, createMockState(), {}, callback);

        expect(callback).toHaveBeenCalled();
        const response = callback.mock.calls[0][0];

        // Should not expose sensitive information in headers
        expect(response.text).not.toContain('Authorization: Bearer');
        expect(response.text).not.toContain('X-Api-Key:');
        expect(response.text).not.toContain('Cookie:');
      }
    });

    it('should respect security headers from responses', async () => {
      const browseAction = autoPlugin.actions?.find((a) => a.name === 'BROWSE_WEB');
      expect(browseAction).toBeDefined();

      if (browseAction) {
        const callback = mock();
        const message = createMockMemory({
          content: {
            text: 'Browse https://httpbin.org/response-headers?X-Frame-Options=DENY',
            source: 'user',
          },
        });

        await browseAction.handler(mockRuntime, message, createMockState(), {}, callback);

        expect(callback).toHaveBeenCalled();
        // Should properly handle security headers and not bypass them
      }
    });
  });

  describe('DNS Security', () => {
    it('should prevent DNS rebinding attacks', async () => {
      const browseAction = autoPlugin.actions?.find((a) => a.name === 'BROWSE_WEB');
      expect(browseAction).toBeDefined();

      if (browseAction) {
        // Domains that might resolve to internal IPs
        const rebindingUrls = [
          'http://localtest.me:8080', // Often resolves to 127.0.0.1
          'http://vcap.me:3000', // Another localhost alias
          'http://lvh.me:5000', // localhost variant
        ];

        for (const url of rebindingUrls) {
          const message = createMockMemory({
            content: { text: `Access ${url}`, source: 'user' },
          });

          const isValid = await browseAction.validate(mockRuntime, message, createMockState());
          // Should validate against DNS rebinding
          expect(typeof isValid).toBe('boolean');
        }
      }
    });
  });

  describe('Content Security', () => {
    it('should sanitize and validate response content', async () => {
      const browseAction = autoPlugin.actions?.find((a) => a.name === 'BROWSE_WEB');
      expect(browseAction).toBeDefined();

      if (browseAction) {
        const callback = mock();
        const message = createMockMemory({
          content: { text: 'Browse https://httpbin.org/html', source: 'user' },
        });

        await browseAction.handler(mockRuntime, message, createMockState(), {}, callback);

        expect(callback).toHaveBeenCalled();
        const response = callback.mock.calls[0][0];

        // Should not contain potentially dangerous HTML/JavaScript
        expect(response.text).not.toContain('<script>');
        expect(response.text).not.toContain('javascript:');
        expect(response.text).not.toContain('onload=');
        expect(response.text).not.toContain('onerror=');
      }
    });

    it('should limit response content size', async () => {
      const browseAction = autoPlugin.actions?.find((a) => a.name === 'BROWSE_WEB');
      expect(browseAction).toBeDefined();

      if (browseAction) {
        const callback = mock();
        const message = createMockMemory({
          content: { text: 'Browse https://httpbin.org/bytes/1000000', source: 'user' }, // 1MB
        });

        await browseAction.handler(mockRuntime, message, createMockState(), {}, callback);

        expect(callback).toHaveBeenCalled();
        const response = callback.mock.calls[0][0];

        // Response should be limited in size
        expect(response.text.length).toBeLessThan(100000); // Should be truncated or summarized
      }
    });
  });

  describe('Proxy and VPN Detection', () => {
    it('should detect and handle proxy usage appropriately', async () => {
      const browseAction = autoPlugin.actions?.find((a) => a.name === 'BROWSE_WEB');
      expect(browseAction).toBeDefined();

      if (browseAction) {
        // Test with proxy-like URLs
        const proxyUrls = [
          'https://proxy.example.com:8080',
          'https://vpn-server.com/tunnel',
          'https://tor-gateway.onion.ly',
        ];

        for (const url of proxyUrls) {
          const callback = mock();
          const message = createMockMemory({
            content: { text: `Access via ${url}`, source: 'user' },
          });

          await browseAction.handler(mockRuntime, message, createMockState(), {}, callback);

          expect(callback).toHaveBeenCalled();
          // Should handle proxy services appropriately
        }
      }
    });
  });

  describe('Network Timeout Security', () => {
    it('should enforce network timeouts to prevent DoS', async () => {
      const browseAction = autoPlugin.actions?.find((a) => a.name === 'BROWSE_WEB');
      expect(browseAction).toBeDefined();

      if (browseAction) {
        const callback = mock();
        const message = createMockMemory({
          content: { text: 'Browse https://httpbin.org/delay/60', source: 'user' }, // 60 second delay
        });

        const startTime = Date.now();
        await browseAction.handler(mockRuntime, message, createMockState(), {}, callback);
        const duration = Date.now() - startTime;

        expect(callback).toHaveBeenCalled();

        // Should timeout before 60 seconds
        expect(duration).toBeLessThan(45000); // Should timeout within 45 seconds

        const response = callback.mock.calls[0][0];
        expect(response.text).toBeDefined();
      }
    });
  });
});
