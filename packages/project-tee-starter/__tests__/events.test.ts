import { describe, it, expect } from 'vitest';
import { teeStarterPlugin } from '../src/plugin';

describe('Plugin Events', () => {
  it('should have custom events', () => {
    // Plugin has events
    expect(teeStarterPlugin.events).toBeDefined();
  });

  it('should have correct plugin configuration', () => {
    expect(teeStarterPlugin).toBeDefined();
    expect(teeStarterPlugin.name).toBe('mr-tee-starter-plugin');
    expect(teeStarterPlugin.description).toBe(
      "Mr. TEE's starter plugin - using plugin-tee for attestation"
    );
  });
});
