declare module '@elizaos/plugin-elizaos-services' {
  export const RealAuthenticationService: unknown;
  export const TEST_KEYS: unknown;
}

declare module '@elizaos/plugin-anthropic' {
  const defaultExport: unknown;
  export default defaultExport;
}

declare module '@elizaos/core/test-utils' {
  export * from '@elizaos/core/dist/test-utils';
  export function createMockRuntime(overrides?: unknown): unknown;
}
