import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { MessageBusService } from '../../../src/server/services/message';
import type { IAgentRuntime, Character, UUID } from '@elizaos/core';

// Mock logger to silence output
mock.module('@elizaos/core', async () => {
  const actual = await import('@elizaos/core');
  return {
    ...actual,
    logger: { info: mock(), debug: mock(), warn: mock(), error: mock() },
  };
});

const mockFetch = mock(async () => ({
  ok: true,
  json: async () => ({ success: true, data: { servers: [] } }),
})) as any;
(global as any).fetch = mockFetch;

function createRuntime(token?: string): IAgentRuntime {
  const runtime: Partial<IAgentRuntime> = {
    agentId: '123e4567-e89b-12d3-a456-426614174000' as UUID,
    character: {
      id: 'char-id' as UUID,
      name: 'Tester',
      description: '',
      bio: [],
      system: '',
      modelProvider: '',
      settings: {} as any,
    } as Character,
    getSetting: mock(() => token ?? null),
  };
  return runtime as IAgentRuntime;
}

describe('MessageBusService auth headers', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('includes Authorization header when token is in runtime settings', async () => {
    const runtime = createRuntime('runtime-token');
    const service = new MessageBusService(runtime);
    await (service as any).fetchAgentServers();
    const options = mockFetch.mock.calls[0][1];
    expect(options.headers).toEqual(
      expect.objectContaining({ Authorization: 'Bearer runtime-token' })
    );
  });

  it('includes Authorization header when token is in env', async () => {
    const runtime = createRuntime();
    process.env.ELIZA_SERVER_AUTH_TOKEN = 'env-token';
    const service = new MessageBusService(runtime);
    await (service as any).fetchAgentServers();
    const options = mockFetch.mock.calls[0][1];
    expect(options.headers).toEqual(
      expect.objectContaining({ Authorization: 'Bearer env-token' })
    );
    delete process.env.ELIZA_SERVER_AUTH_TOKEN;
  });

  it('omits Authorization header when no token', async () => {
    const runtime = createRuntime();
    const service = new MessageBusService(runtime);
    await (service as any).fetchAgentServers();
    const options = mockFetch.mock.calls[0][1];
    expect((options.headers as any).Authorization).toBeUndefined();
  });
});
