import { describe, expect, it } from 'bun:test';
import { startPluginConfigurationAction } from '../../actions/startPluginConfiguration.ts';
import { pluginManagerPlugin } from '../../index';
import { checkPluginConfigurationAction } from '../../actions/checkPluginConfigurationAction.ts';

describe('Plugin Configuration System', () => {
  it('should export all required components', () => {
    expect(startPluginConfigurationAction).toBeDefined();
    expect(checkPluginConfigurationAction).toBeDefined();
    expect(pluginManagerPlugin).toBeDefined();
  });

  it('should have correct plugin structure', () => {
    expect(pluginManagerPlugin.name).toBe('plugin-manager');
    expect(pluginManagerPlugin.description).toContain('health monitoring');
    expect(pluginManagerPlugin.services).toHaveLength(1); // Only PluginManagerService
    expect(pluginManagerPlugin.actions).toHaveLength(16); // 12 original + 4 new info actions
    expect(pluginManagerPlugin.providers).toHaveLength(0); // All providers migrated to actions
    // Evaluator was removed as it didn't fit the evaluator pattern
    expect(pluginManagerPlugin.evaluators).toBeUndefined();
  });

  it('should have valid action structure', () => {
    expect(startPluginConfigurationAction.name).toBe('START_PLUGIN_CONFIGURATION');
    expect(startPluginConfigurationAction.description).toContain('configuration process');
    expect(startPluginConfigurationAction.validate).toBeTypeOf('function');
    expect(startPluginConfigurationAction.handler).toBeTypeOf('function');
  });

  it('should have valid action structure for configuration check', () => {
    expect(checkPluginConfigurationAction.name).toBe('CHECK_PLUGIN_CONFIGURATION');
    expect(checkPluginConfigurationAction.description).toContain('configuration status');
    expect(checkPluginConfigurationAction.validate).toBeTypeOf('function');
    expect(checkPluginConfigurationAction.handler).toBeTypeOf('function');
  });
});
