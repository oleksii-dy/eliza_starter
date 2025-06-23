import type { Memory as MemoryV1, RAGKnowledgeItem, KnowledgeItem } from './types';
import type { Memory as MemoryV2, KnowledgeItem as KnowledgeItemV2 } from '../v2';

/** Convert a v2 Memory object to v1 Memory */
export function fromV2Memory(memory: MemoryV2): MemoryV1 {
  return {
    id: memory.id,
    userId: memory.entityId,
    agentId: memory.agentId as UUID,
    createdAt: memory.createdAt,
    content: memory.content,
    embedding: memory.embedding,
    roomId: memory.roomId,
    unique: memory.unique,
    similarity: memory.similarity,
  };
}

/** Convert a v1 Memory object to v2 Memory */
export function toV2Memory(memory: MemoryV1): MemoryV2 {
  return {
    id: memory.id,
    entityId: memory.userId,
    agentId: memory.agentId,
    createdAt: memory.createdAt,
    content: memory.content,
    embedding: memory.embedding,
    roomId: memory.roomId,
    unique: memory.unique,
    similarity: memory.similarity,
  };
}

/** Convert a v2 KnowledgeItem to a v1 RAGKnowledgeItem */
export function fromV2KnowledgeItem(item: KnowledgeItemV2, agentId: string): RAGKnowledgeItem {
  return {
    id: item.id,
    agentId: agentId as any,
    content: {
      text: item.content.text,
      metadata: item.metadata,
    },
    embedding: undefined,
    createdAt: undefined,
  };
}

/** Convert a v1 RAGKnowledgeItem to a v2 KnowledgeItem */
export function toV2KnowledgeItem(item: RAGKnowledgeItem): KnowledgeItemV2 {
  return {
    id: item.id,
    content: {
      text: item.content.text,
    },
    metadata: item.content.metadata,
  };
}
