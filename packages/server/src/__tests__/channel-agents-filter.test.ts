import { describe, it, expect, vi } from 'vitest';
import type { UUID, IAgentRuntime } from '@elizaos/core';
import { createChannelsRouter } from '../api/messaging/channels';
import type { AgentServer } from '../index';

function getHandler(router: any, path: string) {
  const layer = router.stack.find((l: any) => l.route && l.route.path === path);
  return layer.route.stack[0].handle;
}

describe('getChannelAgents filtering', () => {
  it('returns only participants that are registered agents', async () => {
    const registeredId = '11111111-1111-1111-1111-111111111111' as UUID;
    const unregisteredId = '22222222-2222-2222-2222-222222222222' as UUID;

    const runtime = { agentId: registeredId, character: { name: 'Test' } } as unknown as IAgentRuntime;
    const agents = new Map<UUID, IAgentRuntime>();
    agents.set(registeredId, runtime);

    const serverInstance = {
      getChannelParticipants: vi.fn().mockResolvedValue([registeredId, unregisteredId]),
    } as unknown as AgentServer;

    const router = createChannelsRouter(agents, serverInstance);
    // Define path constant at the top of the file
    const CHANNEL_AGENTS_PATH = '/central-channels/:channelId/agents';

    // Then use it consistently
    const handler = getHandler(router, CHANNEL_AGENTS_PATH);

    const req: any = { params: { channelId: 'abc' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };

    await handler(req, res);

    expect(serverInstance.getChannelParticipants).toHaveBeenCalledWith('abc');
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { channelId: 'abc', participants: [registeredId] },
    });
  });

  it('returns empty array when no registered agents', async () => {
    const runtime = { agentId: '33333333-3333-3333-3333-333333333333' as UUID, character: { name: 'Test' } } as unknown as IAgentRuntime;
    const agents = new Map<UUID, IAgentRuntime>();
    agents.set(runtime.agentId, runtime);

    const serverInstance = {
      getChannelParticipants: vi.fn().mockResolvedValue(['44444444-4444-4444-4444-444444444444' as UUID]),
    } as unknown as AgentServer;

    const router = createChannelsRouter(agents, serverInstance);
    const handler = getHandler(router, CHANNEL_AGENTS_PATH);

    const req: any = { params: { channelId: 'xyz' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { channelId: 'xyz', participants: [] },
    });
  });
});
