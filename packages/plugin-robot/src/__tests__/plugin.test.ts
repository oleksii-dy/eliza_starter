import { describe, it, expect } from 'vitest';
import robotPlugin from '../index';

describe('Robot Plugin', () => {
  it('should have correct plugin structure', () => {
    expect(robotPlugin).toBeDefined();
    expect(robotPlugin.name).toBe('robot');
    expect(robotPlugin.description).toContain('robot control');
  });

  it('should have required services', () => {
    expect(robotPlugin.services).toBeDefined();
    expect(Array.isArray(robotPlugin.services)).toBe(true);
    expect(robotPlugin.services!.length).toBeGreaterThan(0);
  });

  it('should have required actions', () => {
    expect(robotPlugin.actions).toBeDefined();
    expect(Array.isArray(robotPlugin.actions)).toBe(true);
    expect(robotPlugin.actions!.length).toBeGreaterThan(0);
  });

  it('should have required providers', () => {
    expect(robotPlugin.providers).toBeDefined();
    expect(Array.isArray(robotPlugin.providers)).toBe(true);
    expect(robotPlugin.providers!.length).toBeGreaterThan(0);
  });

  it('should have test suites', () => {
    expect(robotPlugin.tests).toBeDefined();
    expect(Array.isArray(robotPlugin.tests)).toBe(true);
    expect(robotPlugin.tests!.length).toBeGreaterThan(0);
  });

  it('should have init function', () => {
    expect(robotPlugin.init).toBeDefined();
    expect(typeof robotPlugin.init).toBe('function');
  });
});