import { Content, IAgentRuntime, Memory } from '@elizaos/core';
import { afterEach, beforeEach, describe, expect, it, vi, MockInstance } from 'vitest';
import { pluginVerificationAction } from '../actions/plugin-verification-action';
import { PluginCreationJob, PluginCreationService } from '../services/plugin-creation-service';

// Extend service for testing
class TestablePluginCreationService extends PluginCreationService {
  public registerJob(job: PluginCreationJob) {
    // Use the protected method instead of accessing private property
    const jobs = this['jobs'];
    jobs.set(job.id, job);
  }
}

describe('Plugin Verification Action E2E', () => {
  let runtime: IAgentRuntime;
  let service: TestablePluginCreationService;
  let callback: any;

  beforeEach(async () => {
    // Mock runtime and service
    runtime = {
      getSetting: vi.fn(),
      getService: vi.fn(),
      services: new Map(),
    } as any;

    service = new TestablePluginCreationService(runtime);
    await service.initialize(runtime);

    // Mock a completed plugin creation job
    const job = {
      id: 'test-job-id',
      status: 'completed',
      specification: { name: '@test/weather-plugin' },
    };
    (service as any).registerJob(job as any);

    (runtime.getService as any).mockReturnValue(service);
    vi.spyOn(runtime.services, 'get').mockReturnValue(service);

    callback = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initiate API integration verification scenario', async () => {
    const message: Memory = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      entityId: '123e4567-e89b-12d3-a456-426614174001',
      roomId: '123e4567-e89b-12d3-a456-426614174002',
      content: { text: 'Help me set up my new API plugin' },
    };

    await pluginVerificationAction.handler(runtime, message, {} as any, {}, callback);

    // Verify the sequence of prompts
    expect(callback).toHaveBeenCalledTimes(7);

    expect(callback.mock.calls[0][0].text).toContain('@test/weather-plugin');
    expect(callback.mock.calls[1][0].text).toContain('🚀 Starting API Integration Setup');
    expect(callback.mock.calls[2][0].text).toContain(
      'I need to help you set up these environment variables'
    );
    expect(callback.mock.calls[3][0].text).toContain('📍 Step: Environment Setup');
    expect(callback.mock.calls[4][0].text).toContain('📍 Step: Test Connection');
    expect(callback.mock.calls[5][0].text).toContain('📍 Step: Sample Request');
    expect(callback.mock.calls[6][0].text).toContain('✅ Verification Complete!');
  });

  it('should ask the user to specify plugin type if it cannot be detected', async () => {
    const message: Memory = {
      id: '123e4567-e89b-12d3-a456-426614174003',
      entityId: '123e4567-e89b-12d3-a456-426614174004',
      roomId: '123e4567-e89b-12d3-a456-426614174005',
      content: { text: 'Help me verify my new plugin' }, // Ambiguous prompt
    };

    // Clear jobs so it can't be inferred
    (service.listJobs as any) = vi.fn().mockReturnValue([]);

    const result = (await pluginVerificationAction.handler(
      runtime,
      message,
      {} as any,
      {},
      callback
    )) as Content;

    // Verify it asks for plugin type
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('Which type of plugin would you like to configure?'),
      })
    );

    expect((result as any).action).toBe('WAITING_FOR_PLUGIN_TYPE');
  });

  it('should handle cases where the plugin creation service is not found', async () => {
    (runtime.getService as any).mockReturnValue(undefined);
    vi.spyOn(runtime.services, 'get').mockReturnValue(undefined);

    const message: Memory = {
      id: '123e4567-e89b-12d3-a456-426614174006',
      entityId: '123e4567-e89b-12d3-a456-426614174007',
      roomId: '123e4567-e89b-12d3-a456-426614174008',
      content: { text: 'Help me set up my plugin' },
    };

    const result = await pluginVerificationAction.handler(
      runtime,
      message,
      {} as any,
      {},
      callback
    );

    expect((result as any).text).toContain('Plugin creation service is not available');
    expect((result as any).success).toBe(false);
  });
});
