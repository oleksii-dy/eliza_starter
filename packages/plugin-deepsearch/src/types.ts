import type { EventPayload } from '@elizaos/core';

/**
 * DeepSearch-specific event types used to report progress to the runtime.
 */
export enum DeepSearchEventTypes {
  /** Queries were generated for a research iteration */
  QUERIES_GENERATED = 'DEEPSEARCH_QUERIES_GENERATED',
  /** Notes were added after reading search results */
  NOTES_ADDED = 'DEEPSEARCH_NOTES_ADDED',
  /** Final answer was generated */
  ANSWER_GENERATED = 'DEEPSEARCH_ANSWER_GENERATED',
}

/** Payload when queries are generated */
export interface DeepSearchQueriesGeneratedPayload extends EventPayload {
  question: string;
  iteration: number;
  queries: string[];
  roomId?: string;
  worldId?: string;
}

/** Payload when notes are added after summarising content */
export interface DeepSearchNotesAddedPayload extends EventPayload {
  query: string;
  notes: string[];
  roomId?: string;
  worldId?: string;
}

/** Payload when final answer is generated */
export interface DeepSearchAnswerGeneratedPayload extends EventPayload {
  question: string;
  answer: string;
  citations: string[];
  thinking: unknown[];
  roomId?: string;
  worldId?: string;
}

export interface DeepSearchEventPayloadMap {
  [DeepSearchEventTypes.QUERIES_GENERATED]: DeepSearchQueriesGeneratedPayload;
  [DeepSearchEventTypes.NOTES_ADDED]: DeepSearchNotesAddedPayload;
  [DeepSearchEventTypes.ANSWER_GENERATED]: DeepSearchAnswerGeneratedPayload;
}
