import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnvironmentLoader } from '../../src/utils/environment-loader';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('EnvironmentLoader Integration Tests', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Create temporary directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eliza-env-integration-'));
    
    // Save original environment
    originalEnv = { ...process.env };
    
    // Clear test environment variables
    for (const key in process.env) {
      if (key.includes('API_KEY') || key.includes('TOKEN') || key.startsWith('TEST_')) {
        delete process.env[key];
      }
    }

    // Reset singleton instance
    (EnvironmentLoader as any).instance = undefined;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Real .env File Loading', () => {
    it('should load complete OpenAI configuration', async () => {
      const envContent = `
# OpenAI Configuration
OPENAI_API_KEY=sk-test123456789
LOG_LEVEL=debug

# Optional Discord Integration
DISCORD_API_TOKEN=MTQxNjI...
DISCORD_APPLICATION_ID=123456789

# Database
POSTGRES_URL=postgresql://user:pass@localhost:5432/eliza
`;

      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(envPath, envContent);

      const loader = EnvironmentLoader.getInstance();
      await loader.load({ envPath });

      expect(loader.get('OPENAI_API_KEY')).toBe('sk-test123456789');
      expect(loader.get('LOG_LEVEL')).toBe('debug');
      expect(loader.get('DISCORD_API_TOKEN')).toBe('MTQxNjI...');
      expect(loader.get('DISCORD_APPLICATION_ID')).toBe('123456789');
      expect(loader.get('POSTGRES_URL')).toBe('postgresql://user:pass@localhost:5432/eliza');

      const validation = await loader.validate();
      expect(validation.success).toBe(true);
      expect(validation.hasModelProvider).toBe(true);
    });

    it('should load complete Anthropic configuration', async () => {
      const envContent = `
# Anthropic Configuration
ANTHROPIC_API_KEY=sk-ant-test123
LOG_LEVEL=info

# Telegram Integration
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

# PGLite Database
PGLITE_DATA_DIR=~/.eliza/.elizadb
`;

      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(envPath, envContent);

      const loader = EnvironmentLoader.getInstance();
      await loader.load({ envPath });

      expect(loader.get('ANTHROPIC_API_KEY')).toBe('sk-ant-test123');
      expect(loader.get('TELEGRAM_BOT_TOKEN')).toBe('123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11');
      expect(loader.get('PGLITE_DATA_DIR')).toBe('~/.eliza/.elizadb');

      const validation = await loader.validate();
      expect(validation.success).toBe(true);
      expect(validation.hasModelProvider).toBe(true);
    });

    it('should load complete Twitter configuration', async () => {
      const envContent = `
# Model Provider
OPENAI_API_KEY=sk-test123

# Complete Twitter Configuration
TWITTER_API_KEY=twitter_api_key_123
TWITTER_API_SECRET=twitter_api_secret_123
TWITTER_ACCESS_TOKEN=twitter_access_token_123
TWITTER_ACCESS_TOKEN_SECRET=twitter_access_token_secret_123
TWITTER_DRY_RUN=true
TWITTER_TARGET_USERS=user1,user2,user3
`;

      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(envPath, envContent);

      const loader = EnvironmentLoader.getInstance();
      await loader.load({ envPath });

      expect(loader.get('TWITTER_API_KEY')).toBe('twitter_api_key_123');
      expect(loader.get('TWITTER_API_SECRET')).toBe('twitter_api_secret_123');
      expect(loader.get('TWITTER_ACCESS_TOKEN')).toBe('twitter_access_token_123');
      expect(loader.get('TWITTER_ACCESS_TOKEN_SECRET')).toBe('twitter_access_token_secret_123');
      expect(loader.getBoolean('TWITTER_DRY_RUN')).toBe(true);
      expect(loader.get('TWITTER_TARGET_USERS')).toBe('user1,user2,user3');

      const validation = await loader.validate();
      expect(validation.success).toBe(true);
      expect(validation.hasModelProvider).toBe(true);
    });

    it('should load character-scoped variables from real .env', async () => {
      const envContent = `
# Global Configuration
OPENAI_API_KEY=sk-global-key

# Character-specific configurations
CHARACTER.alice.OPENAI_API_KEY=sk-alice-key
CHARACTER.alice.SPECIAL_TOKEN=alice-token
CHARACTER.alice.CUSTOM_ENDPOINT=https://alice.example.com

CHARACTER.bob.ANTHROPIC_API_KEY=sk-bob-anthropic
CHARACTER.bob.LOG_LEVEL=trace

CHARACTER.charlie.DISCORD_API_TOKEN=charlie-discord-token
CHARACTER.charlie.DISCORD_APPLICATION_ID=charlie-app-id
`;

      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(envPath, envContent);

      const loader = EnvironmentLoader.getInstance();
      await loader.load({ envPath });

      // Test global access
      expect(loader.get('OPENAI_API_KEY')).toBe('sk-global-key');

      // Test character-scoped access
      const aliceVars = loader.getCharacterScoped('alice');
      expect(aliceVars).toEqual({
        OPENAI_API_KEY: 'sk-alice-key',
        SPECIAL_TOKEN: 'alice-token',
        CUSTOM_ENDPOINT: 'https://alice.example.com',
      });

      const bobVars = loader.getCharacterScoped('bob');
      expect(bobVars).toEqual({
        ANTHROPIC_API_KEY: 'sk-bob-anthropic',
        LOG_LEVEL: 'trace',
      });

      const charlieVars = loader.getCharacterScoped('charlie');
      expect(charlieVars).toEqual({
        DISCORD_API_TOKEN: 'charlie-discord-token',
        DISCORD_APPLICATION_ID: 'charlie-app-id',
      });
    });

    it('should handle comments and empty lines in .env files', async () => {
      const envContent = `
# This is a comment
OPENAI_API_KEY=sk-test123

# Another comment
# LOG_LEVEL=debug (commented out)

DISCORD_API_TOKEN=token123
# Empty line above

DISCORD_APPLICATION_ID=app123
# End of file
`;

      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(envPath, envContent);

      const loader = EnvironmentLoader.getInstance();
      await loader.load({ envPath });

      expect(loader.get('OPENAI_API_KEY')).toBe('sk-test123');
      expect(loader.get('DISCORD_API_TOKEN')).toBe('token123');
      expect(loader.get('DISCORD_APPLICATION_ID')).toBe('app123');
      expect(loader.get('LOG_LEVEL')).toBeUndefined(); // Commented out
    });

    it('should handle malformed .env entries gracefully', async () => {
      const envContent = `
VALID_KEY=valid_value
INVALID_LINE_NO_EQUALS
=VALUE_WITHOUT_KEY
KEY_WITH_EMPTY_VALUE=
KEY_WITH_SPACES = value with spaces
VALID_KEY_2=valid_value_2
`;

      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(envPath, envContent);

      const loader = EnvironmentLoader.getInstance();
      await expect(loader.load({ envPath })).resolves.not.toThrow();

      expect(loader.get('VALID_KEY')).toBe('valid_value');
      expect(loader.get('VALID_KEY_2')).toBe('valid_value_2');
      expect(loader.get('KEY_WITH_EMPTY_VALUE')).toBe('');
    });
  });

  describe('Process Environment Priority', () => {
    it('should prioritize process.env over .env file', async () => {
      // Set process environment variable
      process.env.OPENAI_API_KEY = 'sk-from-process';
      process.env.LOG_LEVEL = 'error';

      // Create .env file with different values
      const envContent = `
OPENAI_API_KEY=sk-from-file
LOG_LEVEL=debug
DISCORD_API_TOKEN=from-file-only
`;

      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(envPath, envContent);

      const loader = EnvironmentLoader.getInstance();
      await loader.load({ envPath });

      // Process env should take precedence
      expect(loader.get('OPENAI_API_KEY')).toBe('sk-from-process');
      expect(loader.get('LOG_LEVEL')).toBe('error');
      
      // File-only variable should be loaded
      expect(loader.get('DISCORD_API_TOKEN')).toBe('from-file-only');
    });
  });

  describe('Validation with Real Configurations', () => {
    it('should validate minimal valid configuration', async () => {
      const envContent = 'OPENAI_API_KEY=sk-test123456789\n';
      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(envPath, envContent);

      const loader = EnvironmentLoader.getInstance();
      await loader.load({ envPath });

      const validation = await loader.validate();
      expect(validation.success).toBe(true);
      expect(validation.hasModelProvider).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toHaveLength(0);
    });

    it('should detect incomplete Twitter configuration', async () => {
      const envContent = `
OPENAI_API_KEY=sk-test123
TWITTER_API_KEY=incomplete
TWITTER_API_SECRET=incomplete
# Missing TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_TOKEN_SECRET
`;

      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(envPath, envContent);

      const loader = EnvironmentLoader.getInstance();
      await loader.load({ envPath });

      const validation = await loader.validate();
      expect(validation.success).toBe(false);
      expect(validation.errors).toContain(
        expect.stringContaining('Twitter integration requires all credentials')
      );
    });

    it('should detect incomplete Discord configuration', async () => {
      const envContent = `
OPENAI_API_KEY=sk-test123
DISCORD_API_TOKEN=incomplete_token
# Missing DISCORD_APPLICATION_ID
`;

      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(envPath, envContent);

      const loader = EnvironmentLoader.getInstance();
      await loader.load({ envPath });

      const validation = await loader.validate();
      expect(validation.success).toBe(false);
      expect(validation.errors).toContain(
        'DISCORD_APPLICATION_ID is required when DISCORD_API_TOKEN is provided'
      );
    });

    it('should generate warnings for legacy configurations', async () => {
      const envContent = `
OPENAI_API_KEY=sk-test123
CLAUDE_API_KEY=sk-legacy-claude
WALLET_PRIVATE_KEY=legacy-wallet-key
POSTGRES_URL=postgres://localhost/db1
DATABASE_URL=postgres://localhost/db2
`;

      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(envPath, envContent);

      const loader = EnvironmentLoader.getInstance();
      await loader.load({ envPath });

      const validation = await loader.validate();
      expect(validation.success).toBe(true); // Should succeed despite warnings
      expect(validation.warnings).toContain(
        expect.stringContaining('CLAUDE_API_KEY is deprecated')
      );
      expect(validation.warnings).toContain(
        expect.stringContaining('WALLET_PRIVATE_KEY is deprecated')
      );
      expect(validation.warnings).toContain(
        expect.stringContaining('Both POSTGRES_URL and DATABASE_URL are set')
      );
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large .env files efficiently', async () => {
      // Create a large .env file with many variables
      let envContent = 'OPENAI_API_KEY=sk-test123\n';
      
      // Add 1000 character-scoped variables
      for (let i = 0; i < 1000; i++) {
        envContent += `CHARACTER.agent${i}.CUSTOM_VAR_${i}=value_${i}\n`;
      }

      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(envPath, envContent);

      const loader = EnvironmentLoader.getInstance();
      
      const startTime = Date.now();
      await loader.load({ envPath });
      const loadTime = Date.now() - startTime;

      // Should load within reasonable time (< 1 second)
      expect(loadTime).toBeLessThan(1000);

      // Verify character-scoped access works
      const agent500Vars = loader.getCharacterScoped('agent500');
      expect(agent500Vars.CUSTOM_VAR_500).toBe('value_500');

      // Validation should also be reasonably fast
      const validationStart = Date.now();
      const validation = await loader.validate();
      const validationTime = Date.now() - validationStart;
      
      expect(validationTime).toBeLessThan(500);
      expect(validation.success).toBe(true);
    });

    it('should not leak memory on repeated loads', async () => {
      const envContent = 'OPENAI_API_KEY=sk-test123\nTEST_VAR=test_value\n';
      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(envPath, envContent);

      const loader = EnvironmentLoader.getInstance();

      // Load multiple times
      for (let i = 0; i < 10; i++) {
        await loader.load({ envPath, force: true });
        expect(loader.get('OPENAI_API_KEY')).toBe('sk-test123');
      }

      // Memory usage should remain stable (this is a basic check)
      const memUsage = process.memoryUsage();
      expect(memUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // < 100MB
    });
  });

  describe('File System Edge Cases', () => {
    it('should handle non-existent .env file path', async () => {
      const nonExistentPath = path.join(tempDir, 'non-existent', '.env');
      
      const loader = EnvironmentLoader.getInstance();
      await expect(loader.load({ envPath: nonExistentPath })).resolves.not.toThrow();
      expect(loader.isLoaded()).toBe(true);
    });

    it('should handle permission denied errors', async () => {
      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(envPath, 'OPENAI_API_KEY=sk-test123\n');
      
      // Make file unreadable (on Unix systems)
      if (process.platform !== 'win32') {
        fs.chmodSync(envPath, 0o000);
      }

      const loader = EnvironmentLoader.getInstance();
      
      if (process.platform !== 'win32') {
        // Should handle gracefully without throwing
        await expect(loader.load({ envPath })).resolves.not.toThrow();
      } else {
        // On Windows, just test normal loading
        fs.chmodSync(envPath, 0o644);
        await expect(loader.load({ envPath })).resolves.not.toThrow();
      }
    });
  });
});