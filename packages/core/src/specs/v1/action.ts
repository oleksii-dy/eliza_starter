import type { Action as ActionV1, Handler as HandlerV1 } from './types';
import type { Action as ActionV2, Handler as HandlerV2 } from '../v2';

/**
 * Convert a v2 style handler to a v1 style handler.
 * v1 handlers do not receive the `responses` argument.
 */
export function fromV2Handler(handler: HandlerV2): HandlerV1 {
  return async (runtime, message, state, options, callback) => {
    return handler(runtime as any, message as any, state as any, options as any, callback as any, []);
  };
}

/**
 * Convert a v1 style handler to a v2 style handler.
 * v2 handlers receive an extra `responses` argument which is ignored by v1.
 */
export function toV2Handler(handler: HandlerV1): HandlerV2 {
  return async (runtime, message, state, options, callback, responses) => {
    return handler(runtime as any, message as any, state as any, options as any, callback as any);
  };
}

/**
 * Convert a v2 Action to a v1 Action.
 */
export function fromV2Action(action: ActionV2): ActionV1 {
  return {
    name: action.name,
    description: action.description,
    similes: action.similes ?? [],
    examples: action.examples ?? [],
    validate: action.validate,
    handler: fromV2Handler(action.handler),
  };
}

/**
 * Convert a v1 Action to a v2 Action.
 */
export function toV2Action(action: ActionV1): ActionV2 {
  return {
    name: action.name,
    description: action.description,
    similes: action.similes,
    examples: action.examples,
    validate: action.validate,
    handler: toV2Handler(action.handler),
  };
}
