import { describe, expect, it, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { hyperfyPlugin } from '../index';
import { HyperfyService } from '../service';
import { ModelType, logger } from '@elizaos/core';
import dotenv from 'dotenv';

// Setup environment variables
dotenv.config();

// Need to spy on logger for documentation
beforeAll(() => {
  vi.spyOn(logger, 'info');
  vi.spyOn(logger, 'error');
  vi.spyOn(logger, 'warn');
  vi.spyOn(logger, 'debug');
});

afterAll(() => {
  vi.restoreAllMocks();
});

// Create a real runtime for testing
function createRealRuntime() {
  const services = new Map();

  // Create a real service instance if needed
  const createService = (serviceType: string) => {
    if (serviceType === HyperfyService.serviceType) {
      return new HyperfyService({
        character: {
          name: 'Test Character',
          system: 'You are a helpful assistant for testing.',
        },
      } as any);
    }
    return null;
  };

  return {
    character: {
      name: 'Test Character',
      system: 'You are a helpful assistant for testing.',
      plugins: []
      settings: {},
    },
    getSetting: (key: string) => null,
    models: hyperfyPlugin.models,
    db: {
      get: async (key: string) => null,
      set: async (key: string, value: any) => true,
      delete: async (key: string) => true,
      getKeys: async (pattern: string) => []
    },
    getService: (serviceType: string) => {
      // Log the service request for debugging
      logger.debug(`Requesting service: ${serviceType}`);

      // Get from cache or create new
      if (!services.has(serviceType)) {
        logger.debug(`Creating new service: ${serviceType}`);
        services.set(serviceType, createService(serviceType));
      }

      return services.get(serviceType);
    },
    registerService: (serviceType: string, service: any) => {
      logger.debug(`Registering service: ${serviceType}`);
      services.set(serviceType, service);
    },
  };
}

describe('Plugin Configuration', () => {
  it('should have correct plugin metadata', () => {
    expect(hyperfyPlugin.name).toBe('hyperfy');
    expect(hyperfyPlugin.description).toBe('Integrates ElizaOS agents with Hyperfy worlds');
    expect(hyperfyPlugin.config).toBeDefined();
  });

  it('should include the DEFAULT_HYPERFY_WS_URL in config', () => {
    expect(hyperfyPlugin.config).toHaveProperty('DEFAULT_HYPERFY_WS_URL');
  });

  it('should initialize properly', async () => {
    const originalEnv = process.env.WS_URL;

    try {
      process.env.WS_URL = 'wss://test.hyperfy.xyz/ws';

      // Initialize with config - using real runtime
      const runtime = createRealRuntime();

      if (hyperfyPlugin.init) {
        await hyperfyPlugin.init({ DEFAULT_HYPERFY_WS_URL: 'wss://test.hyperfy.xyz/ws' }, runtime as any);
        expect(true).toBe(true); // If we got here, init succeeded
      }
    } finally {
      process.env.WS_URL = originalEnv;
    }
  });

  it('should have a valid config', () => {
    expect(hyperfyPlugin.config).toBeDefined();
    if (hyperfyPlugin.config) {
      // Check if the config has expected DEFAULT_HYPERFY_WS_URL property
      expect(Object.keys(hyperfyPlugin.config)).toContain('DEFAULT_HYPERFY_WS_URL');
    }
  });
});

describe('Plugin Actions', () => {
  it('should have actions defined', () => {
    expect(hyperfyPlugin.actions).toBeDefined();
    expect(Array.isArray(hyperfyPlugin.actions)).toBe(true);
    expect(hyperfyPlugin.actions?.length).toBeGreaterThan(0);
  });

  it('should have providers defined', () => {
    expect(hyperfyPlugin.providers).toBeDefined();
    expect(Array.isArray(hyperfyPlugin.providers)).toBe(true);
    expect(hyperfyPlugin.providers?.length).toBeGreaterThan(0);
  });

  it('should have services defined', () => {
    expect(hyperfyPlugin.services).toBeDefined();
    expect(Array.isArray(hyperfyPlugin.services)).toBe(true);
    expect(hyperfyPlugin.services?.length).toBeGreaterThan(0);
  });
});

describe('HyperfyService', () => {
  it('should start the service', async () => {
    const runtime = createRealRuntime();
    const startResult = await HyperfyService.start(runtime as any);

    expect(startResult).toBeDefined();
    expect(startResult.constructor.name).toBe('HyperfyService');

    // Test real functionality - check stop method is available
    expect(typeof startResult.stop).toBe('function');
  });

  it('should stop the service', async () => {
    const runtime = createRealRuntime();

    // Register a real service first
    const service = new HyperfyService(runtime as any);
    runtime.registerService(HyperfyService.serviceType, service);

    // Spy on the real service's stop method
    const stopSpy = vi.spyOn(service, 'stop');

    // Call the static stop method
    await HyperfyService.stop(runtime as any);

    // Verify the service's stop method was called
    expect(stopSpy).toHaveBeenCalled();
  });

  it('should throw an error when stopping a non-existent service', async () => {
    const runtime = createRealRuntime();
    // Don't register a service, so getService will return null

    // We'll patch the getService function to ensure it returns null
    const originalGetService = runtime.getService;
    runtime.getService = () => null;

    await expect(HyperfyService.stop(runtime as any)).rejects.toThrow('Hyperfy service not found');

    // Restore original getService function
    runtime.getService = originalGetService;
  });
});
