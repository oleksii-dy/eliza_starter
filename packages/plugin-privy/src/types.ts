// Temporary type definitions until @ai16z/eliza is properly linked
export interface IAgentRuntime {
  getSetting(key: string): string | undefined;
}

export interface Memory {
  [key: string]: any;
}

export interface State {
  [key: string]: any;
}

export interface Provider {
  get: (runtime: IAgentRuntime, message: Memory, state?: State) => Promise<any>;
}

export type Handler = (
  runtime: IAgentRuntime,
  message: Memory,
  state?: State
) => Promise<any>;

export type Validator = (
  runtime: IAgentRuntime,
  message: Memory,
  state?: State
) => Promise<boolean>;

export interface ActionExample {
  user: string;
  content: Content;
}

export interface Content {
  text: string;
  action?: string;
  source?: string;
  url?: string;
  [key: string]: unknown;
}

export interface Action {
  name: string;
  description: string;
  similes: string[];
  examples: ActionExample[][];
  handler: Handler;
  validate: Validator;
}
