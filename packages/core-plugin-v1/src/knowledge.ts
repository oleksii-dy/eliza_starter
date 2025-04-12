import {
  knowledge as coreKnowledge,
} from '@elizaos/core';
import type { AgentRuntime } from "./runtime.ts";
import type { KnowledgeItem, UUID, Memory } from "./types.ts";

async function get(
    runtime: AgentRuntime,
    message: Memory
): Promise<KnowledgeItem[]> {
  return coreKnowledge.get(runtime, message);
}

async function set(
    runtime: AgentRuntime,
    item: KnowledgeItem,
    chunkSize = 512,
    bleed = 20
) {
  return coreKnowledge.set(runtime, item, chunkSize, bleed);
}

function preprocess(content: string): string {
  return coreKnowledge.preprocess(content);
}

export default {
    get,
    set,
    preprocess,
};
