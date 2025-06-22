import { describe, it, expect } from 'vitest';
import { searchKnowledgeAction } from '../../actions';
import type {
  IAgentRuntime,
  Memory,
  State,
  UUID,
} from '@elizaos/core';

describe('Action Chaining with Knowledge Plugin', () => {
  const mockState: State = {
    values: {},
    data: {},
    text: '',
  };

  describe('Search Knowledge Action', () => {
    it('should have the correct structure', () => {
      expect(searchKnowledgeAction).toBeDefined();
      expect(searchKnowledgeAction.name).toBe('SEARCH_KNOWLEDGE');
      expect(searchKnowledgeAction.description).toBeDefined();
      expect(typeof searchKnowledgeAction.handler).toBe('function');
      expect(typeof searchKnowledgeAction.validate).toBe('function');
    });

    it('should validate correctly', async () => {
      const mockRuntime = {
        getService: () => ({ getKnowledge: () => [] }),
      } as unknown as IAgentRuntime;

      const mockMessage = {
        content: { text: 'search for information' },
      } as Memory;

      const isValid = await searchKnowledgeAction.validate(mockRuntime, mockMessage, mockState);
      expect(typeof isValid).toBe('boolean');
    });
  });
});
