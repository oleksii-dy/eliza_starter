import { describe, it, expect } from 'vitest';
import { teeStarterPlugin } from '../src/plugin';

describe('Plugin Configuration', () => {
  it('should have custom configuration', () => {
    // Plugin has config and init
    expect(teeStarterPlugin.config).toBeDefined();
    expect(teeStarterPlugin.init).toBeDefined();
  });

  it('should have correct plugin metadata', () => {
    expect(teeStarterPlugin).toBeDefined();
    expect(teeStarterPlugin.name).toBe('mr-tee-starter-plugin');
    expect(teeStarterPlugin.description).toBe(
      "Mr. TEE's starter plugin - using plugin-tee for attestation"
    );
  });

  it('should be a plugin with services and providers', () => {
    // Verify arrays
    expect(teeStarterPlugin.actions).toEqual([]);
    expect(teeStarterPlugin.providers?.length).toBeGreaterThan(0);
    expect(teeStarterPlugin.evaluators).toEqual([]);
    expect(teeStarterPlugin.services?.length).toBeGreaterThan(0);
  });
});
