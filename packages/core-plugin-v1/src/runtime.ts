import {
  AgentRuntime as coreAgentRuntime,
} from '@elizaos/core';

import {
    type Character,
    type Goal,
    type HandlerCallback,
    type IAgentRuntime,
    type ICacheManager,
    type IDatabaseAdapter,
    type IMemoryManager,
    type IRAGKnowledgeManager,
    // type IVerifiableInferenceAdapter,
    type KnowledgeItem,
    // RAGKnowledgeItem,
    //Media,
    ModelClass,
    ModelProviderName,
    type Plugin,
    type Provider,
    type Adapter,
    type Service,
    type ServiceType,
    type State,
    type UUID,
    type Action,
    type Actor,
    type Evaluator,
    type Memory,
    type DirectoryItem,
    type ClientInstance,
} from "./types.ts";

export class AgentRuntime implements IAgentRuntime {
  _runtime: coreAgentRuntime;
}
