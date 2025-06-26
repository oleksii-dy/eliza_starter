/**
 * @fileoverview Simplified database mock for immediate use
 */

import { mock } from './mockUtils';
import type { IDatabaseAdapter, UUID } from '../../types';

export function createMockDatabase(): IDatabaseAdapter {
  return {
    init: mock().mockResolvedValue(undefined),
    close: mock().mockResolvedValue(undefined),
    db: {
      execute: mock().mockResolvedValue([]),
      query: mock().mockResolvedValue([]),
    },
    getMemories: mock().mockResolvedValue([]),
    createMemory: mock().mockResolvedValue('test-memory-id' as UUID),
  } as any;
}
