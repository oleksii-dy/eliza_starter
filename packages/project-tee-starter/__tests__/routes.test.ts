import { describe, it, expect } from 'vitest';
import { teeStarterPlugin } from '../src/plugin';

describe('Plugin Routes', () => {
  it('should have custom routes', () => {
    // Plugin has routes
    expect(teeStarterPlugin.routes).toBeDefined();
    expect(teeStarterPlugin.routes?.length).toBeGreaterThan(0);
  });

  it('should have correct plugin configuration', () => {
    expect(teeStarterPlugin).toBeDefined();
    expect(teeStarterPlugin.name).toBe('mr-tee-starter-plugin');
    expect(teeStarterPlugin.description).toBe(
      "Mr. TEE's starter plugin - using plugin-tee for attestation"
    );
  });
});
