import { describe, it, expect } from 'bun:test';
import { visionPlugin } from './index';

describe('Vision Plugin', () => {
  it('should export a valid plugin', () => {
    expect(visionPlugin).toBeDefined();
    expect(visionPlugin.name).toBe('vision');
    expect(visionPlugin.description).toBeDefined();
  });

  it('should have actions', () => {
    expect(visionPlugin.actions).toBeDefined();
    expect(Array.isArray(visionPlugin.actions)).toBe(true);
  });

  it('should have providers', () => {
    expect(visionPlugin.providers).toBeDefined();
    expect(Array.isArray(visionPlugin.providers)).toBe(true);
  });
});
