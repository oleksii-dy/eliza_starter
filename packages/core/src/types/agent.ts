import type { DirectoryItem } from './knowledge';
import type { Content, UUID } from './primitives';
import type { State } from './state';

/**
 * Example message for demonstration
 */
export interface MessageExample {
  /** Associated user */
  name: string;

  /** Message content */
  content: Content;
}

export type TemplateType =
  | string
  | ((options: { state: State | { [key: string]: string } }) => string);

/**
 * Represents the core characteristics and configuration of an AI character within the ElizaOS framework.
 *
 * This interface defines all the properties that make up a character's personality, knowledge, and behavior patterns.
 * Characters in ElizaOS are the foundation for creating AI agents with specific roles, expertise, and communication styles.
 *
 * A Character encapsulates:
 * - Identity information (name, bio)
 * - Communication style and examples
 * - Knowledge base and expertise areas
 * - System-level configuration
 * - Client and plugin integrations
 *
 * The Character configuration is used by the AgentRuntime to instantiate and manage AI agents
 * that can interact across various platforms while maintaining consistent personality and behavior.
 *
 * @example
 * ```typescript
 * const character: Character = {
 *   name: "TechHelper",
 *   bio: "A knowledgeable technical assistant",
 *   system: "You are a helpful technical assistant...",
 *   messageExamples: [[
 *     { user: "user", content: { text: "How do I debug this?" } },
 *     { user: "TechHelper", content: { text: "Let me help you debug..." } }
 *   ]],
 *   topics: ["programming", "debugging", "software development"]
 * };
 * ```
 *
 * Key properties:
 * - `name`: Unique identifier and display name for the character.
 * - `bio`: Character background and description (can be string or string array).
 * - `system`: System prompt defining the character's core behavior and instructions.
 * - `messageExamples`: Conversation examples for training response patterns.
 * - `topics`: Keywords describing the character's knowledge areas and traits.
 * - `plugins`: Array of plugin names to be loaded for this character.
 * - `clients`: Array of client platforms where this character can operate.
 * - `knowledge`: Custom knowledge base entries for specialized information.
 *
 * The Character interface is designed to be extensible, allowing for custom
 * properties to support specific use cases and integrations.
 */
export interface Character {
  /** Unique identifier for the character */
  id?: UUID;

  /** The character's display name */
  name: string;

  /** Optional username/handle */
  username?: string;

  /** System prompt that defines the character's core behavior */
  system?: string;

  /**
   * Character biography - can be a single string or array of strings
   * @example
   * bio: "A helpful assistant" // Single string
   * bio: ["Line 1", "Line 2", "Line 3"] // Array of strings
   */
  bio: string | string[];

  /** Example conversations showing how the character should interact */
  messageExamples?: MessageExample[][];

  /** Example posts for social media style interactions */
  postExamples?: string[];

  /** Topics and areas of expertise */
  topics?: string[];

  /** Character traits */

  /** Optional knowledge base */
  knowledge?: (string | { path: string; shared?: boolean } | DirectoryItem)[];

  /** Available plugins */
  plugins?: string[];

  /** Plugin component configurations */
  pluginConfig?: {
    [pluginName: string]: {
      /** Whether entire plugin is enabled */
      enabled?: boolean;
      /** Action configurations */
      actions?: {
        [actionName: string]: {
          enabled?: boolean;
          settings?: Record<string, any>;
        };
      };
      /** Provider configurations */
      providers?: {
        [providerName: string]: {
          enabled?: boolean;
          settings?: Record<string, any>;
        };
      };
      /** Evaluator configurations */
      evaluators?: {
        [evaluatorName: string]: {
          enabled?: boolean;
          settings?: Record<string, any>;
        };
      };
      /** Service configurations */
      services?: {
        [serviceName: string]: {
          enabled?: boolean;
          settings?: Record<string, any>;
        };
      };
      /** Plugin-level settings */
      settings?: Record<string, any>;
    };
  };

  /** Optional configuration */
  settings?: {
    [key: string]: any;
  };

  /** Optional secrets */
  secrets?: {
    [key: string]: string | boolean | number | Record<string, any>;
  };

  /** Writing style guides */
  style?: {
    all?: string[];
    chat?: string[];
    post?: string[];
  };
}

export enum AgentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

/**
 * Represents an operational agent, extending the `Character` definition with runtime status and timestamps.
 * While `Character` defines the blueprint, `Agent` represents an instantiated and potentially running version.
 * It includes:
 * - `enabled`: A boolean indicating if the agent is currently active or disabled.
 * - `status`: The current operational status, typically `AgentStatus.ACTIVE` or `AgentStatus.INACTIVE`.
 * - `createdAt`, `updatedAt`: Timestamps for when the agent record was created and last updated in the database.
 * This interface is primarily used by the `IDatabaseAdapter` for agent management.
 */
export interface Agent extends Character {
  enabled?: boolean;
  status?: AgentStatus;
  createdAt: number;
  updatedAt: number;
}
