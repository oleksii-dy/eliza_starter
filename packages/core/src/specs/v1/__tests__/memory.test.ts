import { describe, it, expect } from 'bun:test';
import {
  fromV2Memory,
  toV2Memory,
  fromV2KnowledgeItem,
  toV2KnowledgeItem,
} from '../memory';
import type { Memory as MemoryV1, RAGKnowledgeItem } from '../types';
import type { Memory as MemoryV2, KnowledgeItem } from '../../v2';

const v2Memory: MemoryV2 = {
  id: '1',
  entityId: 'u1',
  agentId: 'a1',
  roomId: 'r1',
  content: { text: 'hi' },
};

describe('memory adapters', () => {
  it('converts memory to v1 and back', () => {
    const v1 = fromV2Memory(v2Memory);
    expect(v1.userId).toBe('u1');
    const back = toV2Memory(v1);
    expect(back.entityId).toBe('u1');
  });

  it('converts knowledge items', () => {
    const item: KnowledgeItem = {
      id: 'k1',
      content: { text: 'text' },
    };
    const rag = fromV2KnowledgeItem(item, 'a1');
    expect(rag.agentId).toBe('a1');
    const again = toV2KnowledgeItem(rag);
    expect(again.id).toBe('k1');
  });
});
