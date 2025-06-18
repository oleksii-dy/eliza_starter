import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('EnvironmentLoader Simple Test', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should import without errors', async () => {
    // Test basic import
    const { EnvironmentLoader } = await import('../../../src/utils/environment-loader');
    expect(EnvironmentLoader).toBeDefined();
    expect(typeof EnvironmentLoader.getInstance).toBe('function');
  });

  it('should create singleton instance', async () => {
    const { EnvironmentLoader } = await import('../../../src/utils/environment-loader');
    const instance1 = EnvironmentLoader.getInstance();
    const instance2 = EnvironmentLoader.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should handle environment variables without loading', async () => {
    process.env.TEST_VAR = 'test_value';
    
    const { EnvironmentLoader } = await import('../../../src/utils/environment-loader');
    const loader = EnvironmentLoader.getInstance();
    
    // Should fallback to process.env even without loading
    expect(loader.get('TEST_VAR')).toBe('test_value');
    expect(loader.isLoaded()).toBe(false);
  });

  it('should handle boolean conversion', async () => {
    process.env.TEST_TRUE = 'true';
    process.env.TEST_FALSE = 'false';
    process.env.TEST_ONE = '1';
    process.env.TEST_ZERO = '0';
    
    const { EnvironmentLoader } = await import('../../../src/utils/environment-loader');
    const loader = EnvironmentLoader.getInstance();
    
    expect(loader.getBoolean('TEST_TRUE')).toBe(true);
    expect(loader.getBoolean('TEST_FALSE')).toBe(false);
    expect(loader.getBoolean('TEST_ONE')).toBe(true);
    expect(loader.getBoolean('TEST_ZERO')).toBe(false);
    expect(loader.getBoolean('NON_EXISTENT')).toBe(false);
    expect(loader.getBoolean('NON_EXISTENT', true)).toBe(true);
  });

  it('should handle number conversion', async () => {
    process.env.TEST_NUMBER = '42';
    process.env.TEST_INVALID = 'not_a_number';
    
    const { EnvironmentLoader } = await import('../../../src/utils/environment-loader');
    const loader = EnvironmentLoader.getInstance();
    
    expect(loader.getNumber('TEST_NUMBER')).toBe(42);
    expect(loader.getNumber('TEST_INVALID')).toBe(0);
    expect(loader.getNumber('TEST_INVALID', 100)).toBe(100);
    expect(loader.getNumber('NON_EXISTENT')).toBe(0);
  });

  it('should handle required variables', async () => {
    process.env.TEST_REQUIRED = 'required_value';
    process.env.TEST_EMPTY = '';
    
    const { EnvironmentLoader } = await import('../../../src/utils/environment-loader');
    const loader = EnvironmentLoader.getInstance();
    
    expect(loader.getRequired('TEST_REQUIRED')).toBe('required_value');
    expect(() => loader.getRequired('NON_EXISTENT')).toThrow();
    expect(() => loader.getRequired('TEST_EMPTY')).toThrow();
  });

  it('should handle character-scoped variables', async () => {
    process.env['CHARACTER.alice.API_KEY'] = 'alice_key';
    process.env['CHARACTER.alice.SECRET'] = 'alice_secret';
    process.env['CHARACTER.bob.API_KEY'] = 'bob_key';
    process.env['REGULAR_VAR'] = 'regular_value';
    
    const { EnvironmentLoader } = await import('../../../src/utils/environment-loader');
    const loader = EnvironmentLoader.getInstance();
    
    const aliceVars = loader.getCharacterScoped('alice');
    expect(aliceVars).toEqual({
      API_KEY: 'alice_key',
      SECRET: 'alice_secret',
    });

    const bobVars = loader.getCharacterScoped('bob');
    expect(bobVars).toEqual({
      API_KEY: 'bob_key',
    });

    const charlieVars = loader.getCharacterScoped('charlie');
    expect(charlieVars).toEqual({});
  });

  it('should filter sensitive variables', async () => {
    process.env.OPENAI_API_KEY = 'sk-sensitive';
    process.env.PUBLIC_VAR = 'public_value';
    
    const { EnvironmentLoader } = await import('../../../src/utils/environment-loader');
    const loader = EnvironmentLoader.getInstance();
    
    const filtered = loader.getAll(false);
    expect(filtered.OPENAI_API_KEY).toBe('[REDACTED]');
    expect(filtered.PUBLIC_VAR).toBe('public_value');
    
    const unfiltered = loader.getAll(true);
    expect(unfiltered.OPENAI_API_KEY).toBe('sk-sensitive');
    expect(unfiltered.PUBLIC_VAR).toBe('public_value');
  });
});