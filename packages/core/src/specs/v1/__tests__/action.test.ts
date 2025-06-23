import { describe, it, expect, mock } from 'bun:test';
import { fromV2Action, toV2Action } from '../action';
import type { Action as ActionV1 } from '../types';
import type { Action as ActionV2, Memory } from '../../v2';

const dummyMemory: Memory = {
  entityId: '00000000-0000-0000-0000-000000000001',
  roomId: '00000000-0000-0000-0000-000000000002',
  content: { text: 'hi' },
};

describe('action adapter', () => {
  it('toV2Action wraps handler with responses param', async () => {
    const handler = mock(async () => 'ok');
    const action: ActionV1 = {
      name: 'test',
      description: 'd',
      similes: [],
      examples: [],
      validate: async () => true,
      handler,
    };

    const v2 = toV2Action(action);
    await v2.handler({} as any, dummyMemory, {} as any, {}, undefined, []);
    expect(handler).toHaveBeenCalled();
  });

  it('fromV2Action strips responses argument', async () => {
    const handlerV2 = mock(async () => 'ok');
    const actionV2: ActionV2 = {
      name: 'v2',
      description: 'd',
      handler: handlerV2,
      validate: async () => true,
    };
    const v1 = fromV2Action(actionV2);
    await v1.handler({} as any, dummyMemory, {} as any, {});
    expect(handlerV2).toHaveBeenCalled();
  });
});
