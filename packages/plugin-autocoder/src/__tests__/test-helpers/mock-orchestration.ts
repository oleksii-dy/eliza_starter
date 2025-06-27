import { mock } from 'bun:test';
import type { IAgentRuntime, UUID } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';

export function createMockRuntime(): IAgentRuntime {
  return {
    agentId: uuidv4() as UUID,
    getSetting: mock().mockImplementation((key: string) => {
      if (key === 'ANTHROPIC_API_KEY') {
        return 'test-key';
      }
      if (key === 'PLUGIN_DATA_DIR') {
        return '/tmp/test-data';
      }
      return null;
    }),
    getService: mock().mockImplementation((name: string) => {
      if (name === 'research') {
        return {
          createResearchProject: mock().mockResolvedValue({ id: 'research-1' }),
          getProject: mock().mockResolvedValue({
            id: 'research-1',
            status: 'completed',
            report: 'Test research report',
            findings: [],
          }),
        };
      }
      if (name === 'knowledge') {
        return {
          storeDocument: mock().mockResolvedValue({ id: 'doc-1' }),
          getKnowledge: mock().mockResolvedValue([]),
        };
      }
      if (name === 'env-manager') {
        return {
          getEnvVar: mock().mockReturnValue(null),
        };
      }
      if (name === 'plugin-manager') {
        return {
          clonePlugin: mock().mockResolvedValue({ path: '/tmp/test-project' }),
        };
      }
      return null;
    }),
    logger: {
      info: mock(),
      error: mock(),
      warn: mock(),
      debug: mock(),
    },
  } as any;
}

export function mockAnthropicClient() {
  return {
    messages: {
      create: mock().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: `File: src/index.ts
\`\`\`typescript
export const plugin = {
  name: 'test-plugin',
  description: 'A test plugin',
  actions: [],
  providers: [],
};
\`\`\`

File: src/__tests__/index.test.ts
\`\`\`typescript
import { describe, it, expect  } from 'bun:test';
import { plugin } from '../index';

describe('Plugin', () => {
  it('should be defined', () => {
    expect(plugin).toBeDefined();
  });
});
\`\`\``,
          },
        ],
      }),
    },
  };
}
