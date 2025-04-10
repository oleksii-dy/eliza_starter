import { IAgentRuntime, type State } from '@elizaos/core';

// ModelClass enum to use with generateObject

export declare enum ModelClass {
  SMALL = "small",
  MEDIUM = "medium",
  LARGE = "large",
  EMBEDDING = "embedding",
  IMAGE = "image"
}

/**
 * Simple implementation of traceResult for plugins
 * Use this if you don't have access to @realityspiral/plugin-instrumentation
 */
export function traceResult(state: State, content: any): any {
  // This is just a passthrough function
  return content;
} 