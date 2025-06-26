import type { IAgentRuntime, Memory, HandlerCallback } from '@elizaos/core';
import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { installPluginFromRegistryAction } from '../../actions/installPluginFromRegistry.ts';
import { PluginManagerService } from '../../services/pluginManagerService.ts';

describe('installPluginFromRegistry Action (Consolidated)', () => {
  let mockRuntime: IAgentRuntime;
  let mockPluginManager: PluginManagerService;
  let mockCallback: HandlerCallback;

  beforeEach(() => {
    mock.restore();
    mockPluginManager = {
      installPluginFromRegistry: mock(),
    } as any;
    mockRuntime = {
      getService: mock().mockReturnValue(mockPluginManager),
    } as any;
    mockCallback = mock();
  });

  it('handler should call the consolidated service method', async () => {
    const message: Memory = {
      content: {
        text: 'install plugin from registry',
        pluginName: '@elizaos/plugin-example',
      },
    } as any;

    mockPluginManager.installPluginFromRegistry = mock().mockResolvedValue({
      name: '@elizaos/plugin-example',
      version: '1.0.0',
      status: 'installed',
    });

    const result = await installPluginFromRegistryAction.handler(
      mockRuntime,
      message,
      undefined,
      undefined,
      mockCallback
    );

    expect(mockPluginManager.installPluginFromRegistry).toHaveBeenCalledWith(
      '@elizaos/plugin-example',
      undefined,
      expect.any(Function)
    );
    expect(result).toMatchObject({
      text: expect.stringContaining('Successfully installed plugin @elizaos/plugin-example v1.0.0'),
    });
    expect(mockCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining(
          'Successfully installed plugin @elizaos/plugin-example v1.0.0'
        ),
      })
    );
  });

  it('handler should handle plugins that need configuration', async () => {
    const message: Memory = {
      content: {
        text: 'install plugin',
        pluginName: '@elizaos/plugin-needs-config',
      },
    } as any;

    mockPluginManager.installPluginFromRegistry = mock().mockResolvedValue({
      name: '@elizaos/plugin-needs-config',
      version: '1.0.0',
      status: 'needs_configuration',
      requiredEnvVars: [{ name: 'API_KEY', description: 'API Key', sensitive: true }],
    });

    const result = await installPluginFromRegistryAction.handler(
      mockRuntime,
      message,
      undefined,
      undefined,
      mockCallback
    );

    expect(result).toMatchObject({
      text: expect.stringContaining('installed but requires configuration'),
    });
    expect(mockCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('installed but requires configuration'),
      })
    );
    expect(mockCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('API_KEY'),
      })
    );
  });

  it('handler should handle installation errors', async () => {
    const message: Memory = {
      content: {
        text: 'install plugin',
        pluginName: '@elizaos/plugin-fails',
      },
    } as any;
    mockPluginManager.installPluginFromRegistry = mock()
      .mockRejectedValue(new Error('Installation failed'));

    const result = await installPluginFromRegistryAction.handler(
      mockRuntime,
      message,
      undefined,
      undefined,
      mockCallback
    );
    expect(result).toMatchObject({
      text: expect.stringContaining('Failed to install plugin: Installation failed'),
    });
    expect(mockCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('Failed to install plugin: Installation failed'),
      })
    );
  });

  it('handler should handle missing plugin manager service', async () => {
    mockRuntime.getService = mock().mockReturnValue(null);
    const message: Memory = {
      content: {
        text: 'install plugin',
        pluginName: '@elizaos/plugin-example',
      },
    } as any;

    const result = await installPluginFromRegistryAction.handler(
      mockRuntime,
      message,
      undefined,
      undefined,
      mockCallback
    );
    expect(result).toMatchObject({
      text: 'Plugin manager service not available',
    });
    expect(mockCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Plugin manager service not available',
      })
    );
  });
});
