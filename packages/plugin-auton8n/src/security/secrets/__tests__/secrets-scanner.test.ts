import { describe, it, expect, beforeEach } from 'vitest';
import { SecretsScanner } from '../secrets-scanner';
import { IAgentRuntime } from '@elizaos/core';

describe('SecretsScanner', () => {
  let scanner: SecretsScanner;
  let mockRuntime: IAgentRuntime;

  beforeEach(() => {
    mockRuntime = {} as IAgentRuntime;
    scanner = new SecretsScanner(mockRuntime);
  });

  describe('API Key Detection', () => {
    it('should detect AWS access keys', async () => {
      const text = 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE';
      const result = await scanner.scanText(text);

      expect(result.found).toBe(true);
      expect(result.secrets).toHaveLength(1);
      expect(result.secrets[0].type).toBe('AWS Access Key');
      expect(result.secrets[0].severity).toBe('critical');
      expect(result.secrets[0].match).toContain('AKIAIOSFODNN7EXAMPLE');
    });

    it('should detect AWS secret keys', async () => {
      const text = 'AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
      const result = await scanner.scanText(text);

      expect(result.found).toBe(true);
      expect(result.secrets[0].type).toBe('AWS Secret Key');
      expect(result.secrets[0].severity).toBe('critical');
    });

    it('should detect Google API keys', async () => {
      const text = 'GOOGLE_API_KEY=AIzaSyDRKQ9d6kfsoZT2lUnZcZnBYvH69HExNPE';
      const result = await scanner.scanText(text);

      expect(result.found).toBe(true);
      expect(result.secrets[0].type).toBe('Google API Key');
      expect(result.secrets[0].severity).toBe('high');
    });

    it('should detect GitHub tokens', async () => {
      const text = 'github_token=ghp_16C7e42F292c6912E7710c838347Ae178B4a';
      const result = await scanner.scanText(text);

      expect(result.found).toBe(true);
      expect(result.secrets[0].type).toBe('GitHub Token');
      expect(result.secrets[0].severity).toBe('critical');
    });

    it('should detect Anthropic API keys', async () => {
      const text =
        'ANTHROPIC_API_KEY=sk-ant-api03-aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789AbCdEfGhIjKl';
      const result = await scanner.scanText(text);

      expect(result.found).toBe(true);
      expect(result.secrets[0].type).toBe('Anthropic API Key');
      expect(result.secrets[0].severity).toBe('critical');
    });

    it('should detect OpenAI API keys', async () => {
      const text = 'openai_key=sk-abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKL';
      const result = await scanner.scanText(text);

      expect(result.found).toBe(true);
      expect(result.secrets[0].type).toBe('OpenAI API Key');
      expect(result.secrets[0].severity).toBe('critical');
    });

    it('should detect generic API keys', async () => {
      const text = 'api_key=abcdef1234567890abcdef1234567890';
      const result = await scanner.scanText(text);

      expect(result.found).toBe(true);
      expect(result.secrets[0].type).toBe('Generic API Key');
      expect(result.secrets[0].severity).toBe('high');
    });
  });

  describe('Private Key Detection', () => {
    it('should detect RSA private keys', async () => {
      const text = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAq7BFU2WcySSl1hfVr3d8xJFNKB7VvObbWFBllpQoBj8YmZgT
-----END RSA PRIVATE KEY-----`;
      const result = await scanner.scanText(text);

      expect(result.found).toBe(true);
      expect(result.secrets[0].type).toBe('RSA Private Key');
      expect(result.secrets[0].severity).toBe('critical');
    });

    it('should detect SSH private keys', async () => {
      const text = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAlwAAAAdzc2gtcn
-----END OPENSSH PRIVATE KEY-----`;
      const result = await scanner.scanText(text);

      expect(result.found).toBe(true);
      expect(result.secrets[0].type).toBe('SSH Private Key');
      expect(result.secrets[0].severity).toBe('critical');
    });
  });

  describe('Database Connection Detection', () => {
    it('should detect PostgreSQL connections', async () => {
      const text = 'DATABASE_URL=postgresql://user:password@localhost:5432/dbname';
      const result = await scanner.scanText(text);

      expect(result.found).toBe(true);
      expect(result.secrets[0].type).toBe('PostgreSQL Connection');
      expect(result.secrets[0].severity).toBe('critical');
    });

    it('should detect MySQL connections', async () => {
      const text = 'mysql://root:password123@127.0.0.1:3306/mydb';
      const result = await scanner.scanText(text);

      expect(result.found).toBe(true);
      expect(result.secrets[0].type).toBe('MySQL Connection');
      expect(result.secrets[0].severity).toBe('critical');
    });

    it('should detect MongoDB connections', async () => {
      const text = 'MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db';
      const result = await scanner.scanText(text);

      expect(result.found).toBe(true);
      expect(result.secrets[0].type).toBe('MongoDB Connection');
      expect(result.secrets[0].severity).toBe('critical');
    });
  });

  describe('Token Detection', () => {
    it('should detect JWT tokens', async () => {
      const text =
        'token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const result = await scanner.scanText(text);

      expect(result.found).toBe(true);
      expect(result.secrets[0].type).toBe('JWT Token');
      expect(result.secrets[0].severity).toBe('medium');
    });

    it('should detect Bearer tokens', async () => {
      const text = 'Authorization: Bearer abcdefghijklmnopqrstuvwxyz123456';
      const result = await scanner.scanText(text);

      expect(result.found).toBe(true);
      expect(result.secrets[0].type).toBe('Bearer Token');
      expect(result.secrets[0].severity).toBe('medium');
    });
  });

  describe('Password Detection', () => {
    it('should detect passwords in URLs', async () => {
      const text = 'password=mySecretPassword123!';
      const result = await scanner.scanText(text);

      expect(result.found).toBe(true);
      expect(result.secrets[0].type).toBe('Password in URL');
      expect(result.secrets[0].severity).toBe('high');
    });

    it('should detect basic auth headers', async () => {
      const text = 'Authorization: Basic dXNlcjpwYXNzd29yZA==';
      const result = await scanner.scanText(text);

      expect(result.found).toBe(true);
      expect(result.secrets[0].type).toBe('Basic Auth');
      expect(result.secrets[0].severity).toBe('high');
    });
  });

  describe('Cryptocurrency Detection', () => {
    it('should detect Bitcoin private keys', async () => {
      const text = 'btc_key=L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1';
      const result = await scanner.scanText(text);

      expect(result.found).toBe(true);
      expect(result.secrets[0].type).toBe('Bitcoin Private Key');
      expect(result.secrets[0].severity).toBe('critical');
    });

    it('should detect Ethereum private keys', async () => {
      const text =
        'ETH_PRIVATE_KEY=0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318';
      const result = await scanner.scanText(text);

      expect(result.found).toBe(true);
      expect(result.secrets[0].type).toBe('Ethereum Private Key');
      expect(result.secrets[0].severity).toBe('critical');
    });
  });

  describe('High Entropy Detection', () => {
    it('should detect high entropy strings', async () => {
      const text = 'secret=aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5zA7bC9dE1fG3hI5jK7';
      const result = await scanner.scanText(text);

      expect(result.found).toBe(true);
      const entropySecret = result.secrets.find((s) => s.type === 'High Entropy String');
      expect(entropySecret).toBeDefined();
      expect(entropySecret!.severity).toBe('medium');
    });

    it('should skip known safe patterns', async () => {
      const text = `
        commit_hash=a1b2c3d4e5f6789012345678901234567890abcd
        sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
        ENV_VAR_NAME=PRODUCTION_MODE
        image=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==
        file=my-component.ts
      `;
      const result = await scanner.scanText(text);

      // Should not detect these as secrets
      expect(result.secrets.filter((s) => s.type === 'High Entropy String')).toHaveLength(0);
    });
  });

  describe('Secret Redaction', () => {
    it('should redact short secrets completely', () => {
      const secret = 'abc123';
      const redacted = scanner.redactSecret(secret);
      expect(redacted).toBe('******');
    });

    it('should partially redact long secrets', () => {
      const secret = 'abcdefghijklmnopqrstuvwxyz';
      const redacted = scanner.redactSecret(secret);
      expect(redacted).toBe('abcd******************wxyz');
    });

    it('should redact secrets in text', () => {
      const text =
        'API_KEY=sk-ant-api03-aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789AbCdEfGhIjKl and password=mypassword123';
      const redacted = scanner.redactSecretsInText(text);

      expect(redacted).not.toContain('aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789AbCdEfGhIjKl');
      expect(redacted).not.toContain('mypassword123');
      expect(redacted).toContain('password=');
      expect(redacted).toContain('****');
    });
  });

  describe('Line and Column Detection', () => {
    it('should report correct line and column numbers', async () => {
      const text = `Line 1
Line 2
API_KEY=secret123456789012345678
Line 4`;

      const result = await scanner.scanText(text, 'test.txt');

      expect(result.found).toBe(true);
      const secret = result.secrets[0];
      expect(secret.line).toBe(3);
      expect(secret.column).toBe(1);
      expect(secret.file).toBe('test.txt');
    });
  });

  describe('Multiple File Scanning', () => {
    it('should scan multiple files', async () => {
      const files = new Map([
        ['file1.js', 'const apiKey = "sk-1234567890abcdef1234567890abcdef";'],
        ['file2.env', 'DATABASE_URL=postgresql://user:pass@localhost/db'],
        ['file3.config', 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE'],
      ]);

      const result = await scanner.scanFiles(files);

      expect(result.found).toBe(true);
      expect(result.secrets.length).toBeGreaterThanOrEqual(3);

      const fileNames = result.secrets.map((s) => s.file);
      expect(fileNames).toContain('file1.js');
      expect(fileNames).toContain('file2.env');
      expect(fileNames).toContain('file3.config');
    });
  });

  describe('Environment Variable Validation', () => {
    it('should validate environment variables', async () => {
      const env = {
        NODE_ENV: 'production',
        API_KEY: 'sk-1234567890abcdef1234567890abcdef',
        DATABASE_URL: 'postgresql://user:password@localhost/db',
        PORT: '3000',
      };

      const result = await scanner.validateEnvironmentVariables(env);

      expect(result.found).toBe(true);
      expect(result.secrets.length).toBeGreaterThanOrEqual(2);
      expect(result.secrets.every((s) => s.file === 'environment')).toBe(true);
    });
  });

  describe('Custom Patterns', () => {
    it('should allow adding custom patterns', async () => {
      scanner.addPattern({
        name: 'Custom Secret',
        pattern: /CUSTOM_SECRET_([A-Z0-9]{16})/g,
        severity: 'high',
        description: 'Custom secret pattern',
      });

      const text = 'config=CUSTOM_SECRET_ABCD1234EFGH5678';
      const result = await scanner.scanText(text);

      expect(result.found).toBe(true);
      expect(result.secrets[0].type).toBe('Custom Secret');
    });

    it('should return all patterns including custom ones', () => {
      const initialCount = scanner.getPatterns().length;

      scanner.addPattern({
        name: 'Test Pattern',
        pattern: /TEST_([A-Z]+)/g,
        severity: 'low',
        description: 'Test pattern',
      });

      const patterns = scanner.getPatterns();
      expect(patterns.length).toBe(initialCount + 1);
      expect(patterns.some((p) => p.name === 'Test Pattern')).toBe(true);
    });
  });

  describe('Secret Hashing', () => {
    it('should create consistent hashes', () => {
      const secret = 'my-super-secret-key';
      const hash1 = scanner.hashSecret(secret);
      const hash2 = scanner.hashSecret(secret);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 hex length
    });

    it('should create different hashes for different secrets', () => {
      const hash1 = scanner.hashSecret('secret1');
      const hash2 = scanner.hashSecret('secret2');

      expect(hash1).not.toBe(hash2);
    });
  });
});
