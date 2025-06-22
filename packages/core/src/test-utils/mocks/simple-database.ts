/**
 * @fileoverview Simplified database mock for immediate use
 */

import { vi } from './vi-helper';
import type {
  IDatabaseAdapter,
  UUID,
} from '../../types';

export function createMockDatabase(): IDatabaseAdapter {
  return {
    init: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    db: {
      execute: vi.fn().mockResolvedValue([]),
      query: vi.fn().mockResolvedValue([]),
    },
    getMemories: vi.fn().mockResolvedValue([]),
    createMemory: vi.fn().mockResolvedValue('test-memory-id' as UUID),
  } as any;
}

// Note: vi is used internally but not exported to avoid conflicts