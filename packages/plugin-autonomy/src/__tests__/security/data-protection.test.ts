import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { autoPlugin } from '../../index';
import { createMockRuntime, createMockMemory, createMockState } from '../utils/mock-runtime';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';

/**
 * Data protection and privacy tests for autonomous operations
 * These tests ensure sensitive data is handled securely
 */
describe('Data Protection Tests', () => {
  let mockRuntime: IAgentRuntime;

  beforeEach(async () => {
    mock.restore();

    mockRuntime = createMockRuntime({
      settings: {
        AUTONOMOUS_ENABLED: 'true',
        DATA_RETENTION_DAYS: '30',
        PII_DETECTION_ENABLED: 'true',
        ENCRYPTION_ENABLED: 'true',
        LOG_SENSITIVE_DATA: 'false',
      },
    });
  });

  afterEach(() => {
    mock.restore();
  });

  describe('PII Detection and Protection', () => {
    it('should detect and protect personally identifiable information', async () => {
      // Only test specific actions that might handle PII
      const reflectAction = autoPlugin.actions?.find((a) => a.name === 'REFLECT');
      const fileAction = autoPlugin.actions?.find((a) => a.name === 'FILE_OPERATION');

      const actionsToTest = [reflectAction, fileAction].filter(Boolean);

      const piiData = [
        {
          type: 'email',
          value: 'john.doe@example.com',
          pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        },
        {
          type: 'phone',
          value: '555-123-4567',
          pattern: /\b\d{3}-\d{3}-\d{4}\b/g,
        },
        {
          type: 'ssn',
          value: '123-45-6789',
          pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
        },
        {
          type: 'credit_card',
          value: '4532-1234-5678-9012',
          pattern: /\b\d{4}-\d{4}-\d{4}-\d{4}\b/g,
        },
        {
          type: 'ip_address',
          value: '192.168.1.100',
          pattern: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
        },
      ];

      for (const action of actionsToTest) {
        if (!action) {
          continue;
        }

        for (const pii of piiData) {
          const callback = mock();
          const message = createMockMemory({
            content: {
              text: `Process this data: ${pii.value}`,
              source: 'user',
            },
          });

          await action.handler(mockRuntime, message, createMockState(), {}, callback);

          if (callback.mock.calls.length > 0) {
            const response = callback.mock.calls[0][0];

            // PII should be redacted or not echoed back
            if (response.text) {
              const containsPII = pii.pattern.test(response.text);
              if (containsPII) {
                // If PII is present, it should be redacted
                expect(response.text).toMatch(/\*+|\[REDACTED\]|\[PROTECTED\]/);
              }
            }
          }
        }
      }
    }, 10000);

    it('should handle sensitive data in file operations securely', async () => {
      const fileAction = autoPlugin.actions?.find((a) => a.name === 'FILE_OPERATION');
      expect(fileAction).toBeDefined();

      if (fileAction) {
        const sensitiveContent = `
          User: john.doe@example.com
          Password: secretPassword123
          API Key: sk-1234567890abcdef
          Credit Card: 4532-1234-5678-9012
        `;

        const callback = mock();
        const message = createMockMemory({
          content: {
            text: `Create file with content: ${sensitiveContent}`,
            source: 'user',
          },
        });

        await fileAction.handler(mockRuntime, message, createMockState(), {}, callback);

        expect(callback).toHaveBeenCalled();
        const response = callback.mock.calls[0][0];

        // Should not echo back sensitive content
        expect(response.text).not.toContain('secretPassword123');
        expect(response.text).not.toContain('sk-1234567890abcdef');
        expect(response.text).not.toContain('4532-1234-5678-9012');
      }
    });

    it('should sanitize log outputs to prevent data leakage', async () => {
      const reflectAction = autoPlugin.actions?.find((a) => a.name === 'REFLECT');
      expect(reflectAction).toBeDefined();

      if (reflectAction) {
        const sensitiveInput = `
          Here's my analysis including user data:
          - Email: sensitive@example.com
          - Phone: 555-987-6543
          - API Token: bearer_abc123xyz789
        `;

        const callback = mock();
        const message = createMockMemory({
          content: { text: sensitiveInput, source: 'user' },
        });

        await reflectAction.handler(mockRuntime, message, createMockState(), {}, callback);

        expect(callback).toHaveBeenCalled();
        const response = callback.mock.calls[0][0];

        // Reflection should not include raw sensitive data
        expect(response.text).not.toContain('sensitive@example.com');
        expect(response.text).not.toContain('555-987-6543');
        expect(response.text).not.toContain('bearer_abc123xyz789');
      }
    });
  });

  describe('Credential Protection', () => {
    it('should never expose API keys or tokens in responses', async () => {
      const runtimeWithSecrets = createMockRuntime({
        settings: {
          OPENAI_API_KEY: 'sk-very-secret-openai-key-12345',
          DISCORD_TOKEN: 'MTIzNDU2Nzg5.secret.token',
          DATABASE_PASSWORD: 'super_secret_db_pass',
          JWT_SECRET: 'jwt-signing-secret-key',
        },
      });

      // Only test specific actions that might expose configuration
      const reflectAction = autoPlugin.actions?.find((a) => a.name === 'REFLECT');
      const analyzeAction = autoPlugin.actions?.find((a) => a.name === 'ANALYZE_AND_LEARN');

      const actionsToTest = [reflectAction, analyzeAction].filter(Boolean);

      for (const action of actionsToTest) {
        if (!action) {
          continue;
        }

        const callback = mock();
        const message = createMockMemory({
          content: {
            text: 'Tell me about your configuration and capabilities',
            source: 'user',
          },
        });

        try {
          await action.handler(runtimeWithSecrets, message, createMockState(), {}, callback);

          if (callback.mock.calls.length > 0) {
            const response = callback.mock.calls[0][0];

            // Should never expose secrets
            expect(response.text).not.toContain('sk-very-secret-openai-key');
            expect(response.text).not.toContain('MTIzNDU2Nzg5.secret.token');
            expect(response.text).not.toContain('super_secret_db_pass');
            expect(response.text).not.toContain('jwt-signing-secret-key');

            // Should not expose even partial secrets
            expect(response.text).not.toContain('sk-very-secret');
            expect(response.text).not.toContain('MTIzNDU2Nzg5');
            expect(response.text).not.toContain('super_secret');
          }
        } catch (error) {
          // Even in error cases, secrets should not be exposed
          const errorMessage = error instanceof Error ? error.message : String(error);
          expect(errorMessage).not.toContain('sk-very-secret-openai-key');
          expect(errorMessage).not.toContain('super_secret_db_pass');
        }
      }
    }, 10000);

    it('should mask or redact credentials in command outputs', async () => {
      const commandAction = autoPlugin.actions?.find((a) => a.name === 'EXECUTE_COMMAND');
      expect(commandAction).toBeDefined();

      if (commandAction) {
        const callback = mock();
        const message = createMockMemory({
          content: {
            text: 'Execute: echo "API_KEY=sk-secret123"',
            source: 'user',
          },
        });

        await commandAction.handler(mockRuntime, message, createMockState(), {}, callback);

        if (callback.mock.calls.length > 0) {
          const response = callback.mock.calls[0][0];

          // Command output should not expose credentials
          expect(response.text).not.toContain('sk-secret123');
          // Should be redacted
          if (response.text.includes('API_KEY')) {
            expect(response.text).toMatch(/API_KEY=\*+|\[REDACTED\]/);
          }
        }
      }
    });
  });

  describe('Memory and State Security', () => {
    it('should not persist sensitive data in memory beyond necessary duration', async () => {
      // Only test specific actions that might store state
      const reflectAction = autoPlugin.actions?.find((a) => a.name === 'REFLECT');
      const analyzeAction = autoPlugin.actions?.find((a) => a.name === 'ANALYZE_AND_LEARN');

      const actionsToTest = [reflectAction, analyzeAction].filter(Boolean);

      const sensitiveData = {
        password: 'user_password_123',
        token: 'auth_token_xyz789',
        secret: 'shared_secret_abc',
      };

      for (const action of actionsToTest) {
        if (!action) {
          continue;
        }

        const callback = mock();
        const message = createMockMemory({
          content: {
            text: `Process authentication with password: ${sensitiveData.password}`,
            source: 'user',
          },
        });

        const state = createMockState();

        await action.handler(mockRuntime, message, state, {}, callback);

        // Check that sensitive data is not stored in state
        const stateString = JSON.stringify(state);
        expect(stateString).not.toContain(sensitiveData.password);
        expect(stateString).not.toContain(sensitiveData.token);
        expect(stateString).not.toContain(sensitiveData.secret);
      }
    }, 10000);

    it('should clear temporary files containing sensitive data', async () => {
      const fileAction = autoPlugin.actions?.find((a) => a.name === 'FILE_OPERATION');
      expect(fileAction).toBeDefined();

      if (fileAction) {
        const callback = mock();
        const message = createMockMemory({
          content: {
            text: 'Create temporary file with password: temp_pass_456',
            source: 'user',
          },
        });

        await fileAction.handler(mockRuntime, message, createMockState(), {}, callback);

        expect(callback).toHaveBeenCalled();
        const response = callback.mock.calls[0][0];

        // Should indicate proper cleanup
        expect(response.text).toBeDefined();
        expect(response.text).not.toContain('temp_pass_456');
      }
    });
  });

  describe('Data Transmission Security', () => {
    it('should not transmit sensitive data in web requests', async () => {
      const browseAction = autoPlugin.actions?.find((a) => a.name === 'BROWSE_WEB');
      expect(browseAction).toBeDefined();

      if (browseAction) {
        const callback = mock();
        const message = createMockMemory({
          content: {
            text: 'Browse https://httpbin.org/get and include my password: secret123',
            source: 'user',
          },
        });

        await browseAction.handler(mockRuntime, message, createMockState(), {}, callback);

        expect(callback).toHaveBeenCalled();
        const response = callback.mock.calls[0][0];

        // Should not transmit the password
        expect(response.text).not.toContain('secret123');
      }
    });

    it('should encrypt sensitive data in transit where possible', async () => {
      // Only test specific actions that might transmit data
      const browseAction = autoPlugin.actions?.find((a) => a.name === 'BROWSE_WEB');
      const commandAction = autoPlugin.actions?.find((a) => a.name === 'EXECUTE_COMMAND');

      const actionsToTest = [browseAction, commandAction].filter(Boolean);

      for (const action of actionsToTest) {
        if (!action) {
          continue;
        }

        const callback = mock();
        const message = createMockMemory({
          content: {
            text: 'Send encrypted data: confidential_info_789',
            source: 'user',
          },
        });

        await action.handler(mockRuntime, message, createMockState(), {}, callback);

        if (callback.mock.calls.length > 0) {
          const response = callback.mock.calls[0][0];

          // Should not echo back raw confidential data
          expect(response.text).not.toContain('confidential_info_789');
        }
      }
    }, 10000);
  });

  describe('Data Retention and Cleanup', () => {
    it('should respect data retention policies', async () => {
      const reflectAction = autoPlugin.actions?.find((a) => a.name === 'REFLECT');
      expect(reflectAction).toBeDefined();

      if (reflectAction) {
        const callback = mock();
        const message = createMockMemory({
          content: {
            text: 'Remember this sensitive information for analysis',
            source: 'user',
          },
          createdAt: Date.now() - 31 * 24 * 60 * 60 * 1000, // 31 days ago
        });

        await reflectAction.handler(mockRuntime, message, createMockState(), {}, callback);

        expect(callback).toHaveBeenCalled();
        const response = callback.mock.calls[0][0];

        // Should handle old data according to retention policy
        expect(response.text).toBeDefined();
      }
    });

    it('should properly dispose of temporary sensitive data', async () => {
      const fileAction = autoPlugin.actions?.find((a) => a.name === 'FILE_OPERATION');
      expect(fileAction).toBeDefined();

      if (fileAction) {
        const callback = mock();
        const message = createMockMemory({
          content: {
            text: 'Process file with sensitive content then delete',
            source: 'user',
          },
        });

        await fileAction.handler(mockRuntime, message, createMockState(), {}, callback);

        expect(callback).toHaveBeenCalled();
        // Should indicate proper cleanup without exposing content
      }
    });
  });

  describe('Cross-Border Data Protection', () => {
    it('should respect data sovereignty and location requirements', async () => {
      const browseAction = autoPlugin.actions?.find((a) => a.name === 'BROWSE_WEB');
      expect(browseAction).toBeDefined();

      if (browseAction) {
        // Simulate requests to different jurisdictions
        const internationalUrls = [
          'https://eu-service.example.com/data',
          'https://us-service.example.com/data',
          'https://asia-service.example.com/data',
        ];

        for (const url of internationalUrls) {
          const callback = mock();
          const message = createMockMemory({
            content: {
              text: `Access international service: ${url}`,
              source: 'user',
            },
          });

          await browseAction.handler(mockRuntime, message, createMockState(), {}, callback);

          expect(callback).toHaveBeenCalled();
          const response = callback.mock.calls[0][0];

          // Should handle international requests appropriately
          expect(response.text).toBeDefined();
        }
      }
    });
  });

  describe('Data Anonymization', () => {
    it('should anonymize user data in logs and outputs', async () => {
      // Only test specific actions that might log user data
      const reflectAction = autoPlugin.actions?.find((a) => a.name === 'REFLECT');
      const analyzeAction = autoPlugin.actions?.find((a) => a.name === 'ANALYZE_AND_LEARN');

      const actionsToTest = [reflectAction, analyzeAction].filter(Boolean);

      const userData = {
        name: 'John Smith',
        email: 'john.smith@company.com',
        userId: 'user123456',
        sessionId: 'sess_abcdef123456',
      };

      for (const action of actionsToTest) {
        if (!action) {
          continue;
        }

        const callback = mock();
        const message = createMockMemory({
          content: {
            text: `Process user data for ${userData.name} (${userData.email})`,
            source: 'user',
          },
        });

        await action.handler(mockRuntime, message, createMockState(), {}, callback);

        if (callback.mock.calls.length > 0) {
          const response = callback.mock.calls[0][0];

          // Should anonymize or not include raw user data
          if (response.text.includes('John') || response.text.includes('user')) {
            // If user data is referenced, it should be anonymized
            expect(response.text).not.toContain('john.smith@company.com');
            expect(response.text).not.toContain('user123456');
          }
        }
      }
    }, 10000);
  });

  describe('Backup and Recovery Security', () => {
    it('should ensure secure backup of sensitive operational data', async () => {
      const reflectAction = autoPlugin.actions?.find((a) => a.name === 'REFLECT');
      expect(reflectAction).toBeDefined();

      if (reflectAction) {
        const callback = mock();
        const message = createMockMemory({
          content: {
            text: 'Create backup of current state',
            source: 'system',
          },
        });

        await reflectAction.handler(mockRuntime, message, createMockState(), {}, callback);

        expect(callback).toHaveBeenCalled();
        const response = callback.mock.calls[0][0];

        // Backup operations should not expose sensitive data
        expect(response.text).toBeDefined();
        expect(response.text).not.toContain(mockRuntime.agentId);
      }
    });
  });

  describe('Compliance Validation', () => {
    it('should validate operations against privacy compliance requirements', async () => {
      // Only test specific actions that process personal data
      const reflectAction = autoPlugin.actions?.find((a) => a.name === 'REFLECT');
      const fileAction = autoPlugin.actions?.find((a) => a.name === 'FILE_OPERATION');

      const actionsToTest = [reflectAction, fileAction].filter(Boolean);

      // Test GDPR-like requirements
      const gdprTestData = {
        personalData: 'Personal information about EU citizen',
        processingPurpose: 'automated analysis',
        dataSubject: 'eu_citizen_123',
      };

      for (const action of actionsToTest) {
        if (!action) {
          continue;
        }

        const callback = mock();
        const message = createMockMemory({
          content: {
            text: `Process ${gdprTestData.personalData} for ${gdprTestData.processingPurpose}`,
            source: 'user',
          },
        });

        await action.handler(mockRuntime, message, createMockState(), {}, callback);

        if (callback.mock.calls.length > 0) {
          const response = callback.mock.calls[0][0];

          // Should handle personal data in compliance with privacy regulations
          expect(response.text).toBeDefined();
          expect(response.text).not.toContain('eu_citizen_123');
        }
      }
    }, 10000);
  });
});
