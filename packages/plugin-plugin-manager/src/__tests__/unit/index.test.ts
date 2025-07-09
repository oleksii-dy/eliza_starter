import { describe, expect, it } from 'bun:test';
import { installPluginFromRegistryAction } from '../../actions/installPluginFromRegistry.ts';
import { loadPluginAction } from '../../actions/loadPlugin.ts';
import { startPluginConfigurationAction } from '../../actions/startPluginConfiguration.ts';
import { unloadPluginAction } from '../../actions/unloadPlugin.ts';
import { viewPluginDetailsAction } from '../../actions/viewPluginDetails.ts';
import { pluginManagerPlugin } from '../../index.ts';
import { checkPluginConfigurationAction } from '../../actions/checkPluginConfigurationAction.ts';
import { checkPluginHealthAction } from '../../actions/checkPluginHealthAction.ts';
import { getPluginStateAction } from '../../actions/getPluginStateAction.ts';
import { listRegistryPluginsAction } from '../../actions/listRegistryPluginsAction.ts';
import { PluginManagerService } from '../../services/pluginManagerService.ts';

describe('Plugin Manager Index', () => {
  it('should export pluginManagerPlugin with correct definitions', () => {
    expect(pluginManagerPlugin.name).toBe('plugin-manager');
    expect(pluginManagerPlugin.description).toBe(
      'Manages the full lifecycle of plugins with health monitoring, dependency resolution, trust-based access control, and enhanced platform registry supporting plugins, MCPs, and workflows.'
    );
    expect(pluginManagerPlugin.services).toHaveLength(2); // PluginManagerService and PlatformRegistryService
    expect(pluginManagerPlugin.providers).toHaveLength(0); // All providers migrated to actions
    expect(pluginManagerPlugin.actions).toHaveLength(20); // 16 core actions + 4 platform registry actions
    expect(pluginManagerPlugin.actions).toContainEqual(loadPluginAction);
    expect(pluginManagerPlugin.actions).toContainEqual(unloadPluginAction);
    expect(pluginManagerPlugin.actions).toContainEqual(startPluginConfigurationAction);
    expect(pluginManagerPlugin.actions).toContainEqual(installPluginFromRegistryAction);
    expect(pluginManagerPlugin.actions).toContainEqual(viewPluginDetailsAction);
    expect(pluginManagerPlugin.actions).toContainEqual(checkPluginConfigurationAction);
    expect(pluginManagerPlugin.actions).toContainEqual(checkPluginHealthAction);
    expect(pluginManagerPlugin.actions).toContainEqual(getPluginStateAction);
    expect(pluginManagerPlugin.actions).toContainEqual(listRegistryPluginsAction);

    // Verify plugin dependencies
    expect(pluginManagerPlugin.dependencies).toBeDefined();
    expect(pluginManagerPlugin.dependencies).toEqual([]);
  });
});
