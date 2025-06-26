/**
 * Type declarations for @elizaos/core test utilities
 */

declare module '@elizaos/core/test-utils' {
  export function createMockDatabase(): any;
  export function createTestRuntime(plugins?: any[], timeout?: number): Promise<any>;
  export function createMockRuntime(): any;
  export const mockDatabase: any;
}

declare module '@elizaos/core/test-utils/mocks/simpleDatabase' {
  export const mockSimpleDatabase: any;
  export default mockSimpleDatabase;
}

declare module '@elizaos/core/test-utils/realRuntime' {
  export function createTestAgent(plugins?: any[], timeout?: number): Promise<any>;
}