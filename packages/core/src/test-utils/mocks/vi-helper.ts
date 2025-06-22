/**
 * @fileoverview Safe vitest import helper
 * Provides vitest functionality when available, fallback when not
 */

// Safe vitest import that works in both test and non-test environments
function createMockVi() {
  return {
    fn: (implementation?: any) => {
      const mockFn = implementation || (() => {});
      mockFn.mockReturnValue = (value: any) => { mockFn._returnValue = value; return mockFn; };
      mockFn.mockResolvedValue = (value: any) => { 
        mockFn._returnValue = Promise.resolve(value); 
        return mockFn; 
      };
      mockFn.mockRejectedValue = (value: any) => { 
        mockFn._returnValue = Promise.reject(value); 
        return mockFn; 
      };
      mockFn.mockImplementation = (impl: any) => {
        Object.assign(mockFn, impl);
        return mockFn;
      };
      return mockFn;
    }
  };
}

let vi: any;
try {
  vi = require('vitest').vi;
} catch {
  // Fallback mock for when vitest is not available
  vi = createMockVi();
}

export { vi };