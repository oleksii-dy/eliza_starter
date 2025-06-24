// Test utility types
import type { Mock } from 'bun:test';

declare global {
  interface Console {
    debug: (...args: any[]) => void;
    trace: (...args: any[]) => void;
  }
}

export interface MockFunction<T = any> extends Mock<T> {
  mockImplementation(fn: T): MockFunction<T>;
  mockResolvedValue(value: any): MockFunction<T>;
  mockRejectedValue(value: any): MockFunction<T>;
  mockReturnValue(value: any): MockFunction<T>;
  mock: {
    calls: any[][];
  };
}
