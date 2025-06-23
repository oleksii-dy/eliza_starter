import { describe, it, expect, spyOn } from 'bun:test';
import { Service } from '../types';
import type { IAgentRuntime } from '../types';

class TestService extends Service {
  static serviceType = 'test-service';
  capabilityDescription = 'test';
  started = false;
  stopped = false;

  async start(): Promise<void> {
    this.started = true;
  }

  async stop(): Promise<void> {
    this.stopped = true;
  }
}

describe('Service base lifecycle', () => {
  const createRuntime = () => ({
    getService: () => null,
  }) as unknown as IAgentRuntime;

  it('should instantiate and call instance start', async () => {
    const runtime = createRuntime();
    const service = await TestService.start(runtime);
    expect(service).toBeInstanceOf(TestService);
    expect((service as TestService).started).toBe(true);
  });

  it('should call instance stop via static stop', async () => {
    const runtime = createRuntime();
    const service = new TestService(runtime);
    runtime.getService = () => service;
    const stopSpy = spyOn(service, 'stop');
    await TestService.stop(runtime);
    expect(stopSpy).toHaveBeenCalled();
  });

  it('should resolve when stopping missing service', async () => {
    const runtime = createRuntime();
    await expect(TestService.stop(runtime)).resolves.toBeUndefined();
  });
});
