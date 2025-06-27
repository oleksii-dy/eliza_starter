/**
 * Basic Platform Integration Test
 *
 * Simple test to verify the platform integration works without complex scenarios
 */

import { describe, it, expect } from 'bun:test';
import { autocoderPlugin } from '../index.js';

describe('Basic Platform Integration', () => {
  it('should have platform workflow actions available', () => {
    expect(autocoderPlugin).toBeDefined();
    expect(autocoderPlugin.name).toBe('@elizaos/plugin-autocoder');
    expect(autocoderPlugin.actions).toBeDefined();

    const actionNames = autocoderPlugin.actions?.map((action) => action.name) || [];

    // Check for new platform workflow actions
    expect(actionNames).toContain('PLATFORM_WORKFLOW');
    expect(actionNames).toContain('SECRETS_WORKFLOW');

    console.log(
      '✅ Platform workflow actions found:',
      actionNames.filter((name) => name.includes('PLATFORM') || name.includes('SECRETS'))
    );
  });

  it('should have correct dependencies', () => {
    expect(autocoderPlugin.dependencies).toBeDefined();
    expect(autocoderPlugin.dependencies).toContain('plugin-plugin-manager');
    // plugin-trust dependency was removed

    console.log('✅ Dependencies verified:', autocoderPlugin.dependencies);
  });

  it('should have expected services', () => {
    expect(autocoderPlugin.services).toBeDefined();
    expect(autocoderPlugin.services?.length || 0).toBeGreaterThan(0);

    const serviceNames =
      autocoderPlugin.services?.map((service) => {
        if (typeof service === 'function') {
          return (service as any).serviceName || service.name || 'unknown';
        } else if (service && typeof service === 'object' && 'component' in service) {
          return (
            (service as any).component.serviceName || (service as any).component.name || 'unknown'
          );
        }
        return 'unknown';
      }) || [];

    console.log('✅ Services available:', serviceNames);
  });

  it('should export platform workflow actions', () => {
    const platformWorkflowAction = autocoderPlugin.actions?.find(
      (action) => action.name === 'PLATFORM_WORKFLOW'
    );
    const secretsWorkflowAction = autocoderPlugin.actions?.find(
      (action) => action.name === 'SECRETS_WORKFLOW'
    );

    expect(platformWorkflowAction).toBeDefined();
    expect(platformWorkflowAction?.description).toBeDefined();
    expect(platformWorkflowAction?.handler).toBeDefined();
    expect(platformWorkflowAction?.validate).toBeDefined();

    expect(secretsWorkflowAction).toBeDefined();
    expect(secretsWorkflowAction?.description).toBeDefined();
    expect(secretsWorkflowAction?.handler).toBeDefined();
    expect(secretsWorkflowAction?.validate).toBeDefined();

    console.log('✅ Platform workflow actions properly defined');
  });

  it('should have plugin configuration correct', () => {
    // The plugin should be properly configured
    expect(autocoderPlugin.dependencies).toContain('plugin-plugin-manager');

    // Check initialization function exists
    expect(autocoderPlugin.init).toBeDefined();
    expect(typeof autocoderPlugin.init).toBe('function');

    console.log('✅ Trust integration configuration verified');
  });
});
