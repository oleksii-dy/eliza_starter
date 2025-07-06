---
sidebar_position: 20
title: Character System
description: Complete guide to the ElizaOS character system for defining agent personalities and behaviors
keywords: [character, personality, validation, schema, templates, bio, knowledge integration]
---

# Character System

The Character System in ElizaOS is a comprehensive framework for defining agent personalities, behaviors, and capabilities. It goes beyond simple configuration to create truly unique, consistent agent identities that persist across conversations and platforms.

## Overview

The character system enables:

- **Personality definition** through bio, adjectives, and topics
- **Behavioral templates** for consistent responses
- **Knowledge integration** for domain expertise
- **Plugin configuration** for extended capabilities
- **Message examples** for conversation training
- **Settings and secrets** management

## Core Character Structure

### Character Interface

The complete character definition includes:

```typescript
export interface Character {
  // Unique identifier
  id?: UUID;

  // Display name
  name: string;

  // Username/handle
  username?: string;

  // System prompt override
  system?: string;

  // Response templates
  templates?: {
    [key: string]: TemplateType;
  };

  // Personality description
  bio: string | string[];

  // Conversation examples
  messageExamples?: MessageExample[][];

  // Post examples
  postExamples?: string[];

  // Topics of interest
  topics?: string[];

  // Personality traits
  adjectives?: string[];

  // Knowledge sources
  knowledge?: KnowledgeItem[];

  // Plugin names
  plugins?: string[];

  // Configuration
  settings?: {
    [key: string]: any;
  };

  // Secrets/credentials
  secrets?: {
    [key: string]: any;
  };

  // Style configuration
  style?: {
    all?: string[];
    chat?: string[];
    post?: string[];
  };
}
```

## Character Components

### 1. Identity and Personality

Define the agent's core identity:

```typescript
const character: Character = {
  name: 'TechBot',
  username: 'techbot_ai',

  // Bio can be a string or array of strings
  bio: [
    'An enthusiastic technology expert and educator',
    'Specializes in web development and AI',
    'Loves helping developers solve complex problems',
    'Always up-to-date with the latest tech trends',
  ],

  // Personality traits
  adjectives: ['knowledgeable', 'helpful', 'enthusiastic', 'patient', 'technical', 'precise'],

  // Areas of expertise/interest
  topics: [
    'programming',
    'artificial intelligence',
    'web development',
    'cloud computing',
    'open source',
    'developer tools',
  ],
};
```

### 2. Response Templates

Templates shape how the agent communicates:

```typescript
const character: Character = {
  templates: {
    // Core response templates
    responseTemplate: `
{{agent}}: *adjusts glasses and types on keyboard*

{{response}}

*shares a helpful link or code snippet when relevant*
    `,

    // Greeting template
    greetingTemplate: `*waves* Hey {{user}}! I'm {{agent}}, your friendly tech assistant. What coding challenge can I help you tackle today?`,

    // Error handling
    errorTemplate: `*scratches head* Hmm, I encountered an error: {{error}}. Let me try a different approach...`,

    // Custom templates for specific scenarios
    codeReviewTemplate: `Let me review this code:
\`\`\`{{language}}
{{code}}
\`\`\`

Here's my analysis:
{{analysis}}`,

    // Dynamic templates (functions)
    contextualTemplate: (state) => {
      if (state.values.isNewUser) {
        return "Welcome! I see you're new here. Let me give you a quick introduction...";
      }
      return 'Welcome back! Ready to continue where we left off?';
    },
  },
};
```

### 3. Message Examples

Train conversation patterns with examples:

````typescript
const character: Character = {
  messageExamples: [
    // Example 1: Technical question
    [
      {
        name: '{{user1}}',
        content: {
          text: "What's the difference between let and const in JavaScript?",
        },
      },
      {
        name: 'TechBot',
        content: {
          text: "Great question! Both `let` and `const` are block-scoped variables introduced in ES6, but they have a key difference:\n\n`const` creates a read-only reference - you can't reassign the variable itself. However, if it holds an object or array, you can still modify its contents.\n\n`let` allows reassignment of the variable.\n\nHere's a quick example:\n```js\nconst pi = 3.14; // Can't reassign\nlet counter = 0; // Can reassign\ncounter = 1; // ✓ Works\npi = 3.14159; // ✗ Error!\n```",
          actions: ['EXPLAIN_CODE'],
        },
      },
    ],

    // Example 2: Using providers
    [
      {
        name: '{{user2}}',
        content: {
          text: 'Can you help me debug this React component?',
        },
      },
      {
        name: 'TechBot',
        content: {
          text: "Absolutely! I'd be happy to help debug your React component. Could you share the code and describe what issue you're experiencing?",
          providers: ['CODE_ANALYZER', 'REACT_KNOWLEDGE'],
          actions: ['REQUEST_CODE', 'PREPARE_DEBUG_SESSION'],
        },
      },
    ],
  ],
};
````

### 4. Knowledge Integration

Connect knowledge sources to the character:

```typescript
const character: Character = {
  knowledge: [
    // Simple file path
    'docs/react-guide.md',

    // Object with metadata
    {
      path: 'knowledge/typescript-handbook.pdf',
      shared: true, // Available to all agents
    },

    // Directory of files
    {
      directory: 'knowledge/web-development',
      shared: false, // Agent-specific knowledge
    },
  ],
};
```

### 5. Style Configuration

Define communication styles for different contexts:

```typescript
const character: Character = {
  style: {
    // Applied to all responses
    all: [
      'Be concise but thorough',
      'Use technical terms appropriately',
      'Include code examples when helpful',
      'Maintain a friendly, professional tone',
    ],

    // Chat-specific style
    chat: [
      'Respond conversationally',
      'Ask clarifying questions',
      'Break complex topics into steps',
      'Use emoji sparingly for emphasis',
    ],

    // Post/tweet style
    post: [
      'Keep under 280 characters when possible',
      'Use relevant hashtags',
      'Share one key insight or tip',
      'Include a call-to-action',
    ],
  },
};
```

## Character Validation

ElizaOS provides robust validation for character files:

```typescript
import { validateCharacter, parseAndValidateCharacter } from '@elizaos/core';

// Validate a character object
const validationResult = validateCharacter(characterData);

if (validationResult.success) {
  console.log('Character is valid:', validationResult.data);
} else {
  console.error('Validation failed:', validationResult.error);
  console.error('Issues:', validationResult.error.issues);
}

// Parse and validate JSON
const jsonResult = parseAndValidateCharacter(characterJson);

if (!jsonResult.success) {
  console.error('Invalid character JSON:', jsonResult.error.message);
}
```

### Validation Schema

The character validation uses Zod schema to ensure:

- Required fields are present
- UUIDs are properly formatted
- Message examples follow correct structure
- Knowledge items are valid
- Settings and secrets are proper objects

## Advanced Character Features

### 1. Dynamic Characters

Create characters that adapt based on context:

```typescript
const adaptiveCharacter: Character = {
  name: 'AdaptBot',

  // Dynamic bio based on environment
  bio:
    process.env.NODE_ENV === 'production'
      ? 'A professional AI assistant for enterprise solutions'
      : 'A friendly dev assistant for testing and debugging',

  // Conditional plugins
  plugins: [
    '@elizaos/plugin-bootstrap',
    ...(process.env.ENABLE_SLACK ? ['@elizaos/plugin-slack'] : []),
    ...(process.env.ENABLE_DISCORD ? ['@elizaos/plugin-discord'] : []),
  ],

  // Environment-specific settings
  settings: {
    debugMode: process.env.NODE_ENV !== 'production',
    responseDelay: process.env.RESPONSE_DELAY || 1000,
  },
};
```

### 2. Multi-Modal Characters

Support different interaction modes:

```typescript
const multiModalCharacter: Character = {
  name: 'MediaBot',

  templates: {
    // Text response
    textResponse: "Here's what I found: {{result}}",

    // Voice response
    voiceResponse: "I'll explain this verbally. {{audioDescription}}",

    // Visual response
    imageResponse: 'Let me show you visually: {{imageCaption}}',
  },

  settings: {
    // Enable different modalities
    supportedModalities: ['text', 'voice', 'image'],
    preferredModality: 'text',

    // Voice settings
    voice: {
      provider: 'elevenlabs',
      voiceId: 'custom-voice-id',
      speed: 1.0,
    },
  },
};
```

### 3. Specialized Characters

Create domain-specific experts:

```typescript
const securityExpert: Character = {
  name: 'SecBot',

  bio: 'Cybersecurity expert specializing in web application security',

  knowledge: [
    { directory: 'knowledge/owasp-top-10' },
    { directory: 'knowledge/security-best-practices' },
    { path: 'knowledge/vulnerability-database.json' },
  ],

  plugins: ['@elizaos/plugin-security-scanner', '@elizaos/plugin-vulnerability-checker'],

  messageExamples: [
    [
      {
        name: '{{user}}',
        content: { text: 'Is this code vulnerable to SQL injection?' },
      },
      {
        name: 'SecBot',
        content: {
          text: 'Let me analyze this code for SQL injection vulnerabilities...',
          providers: ['CODE_ANALYZER', 'SECURITY_CHECKER'],
          actions: ['SCAN_CODE', 'GENERATE_REPORT'],
        },
      },
    ],
  ],
};
```

## Character Management

### Loading Characters

```typescript
import { loadCharacter } from '@elizaos/core';

// Load from file
const character = await loadCharacter('characters/techbot.json');

// Load with validation
try {
  const validated = await loadAndValidateCharacter('characters/techbot.json');
  console.log('Character loaded:', validated.name);
} catch (error) {
  console.error('Failed to load character:', error);
}
```

### Character Composition

Compose characters from multiple sources:

```typescript
// Base character template
const baseCharacter: Partial<Character> = {
  plugins: ['@elizaos/plugin-bootstrap'],
  settings: {
    responseTimeout: 30000,
  },
};

// Personality overlay
const personality: Partial<Character> = {
  bio: 'A helpful assistant',
  adjectives: ['friendly', 'knowledgeable'],
};

// Compose final character
const composedCharacter: Character = {
  ...baseCharacter,
  ...personality,
  name: 'ComposedBot',
  // Override specific fields
  plugins: [...(baseCharacter.plugins || []), '@elizaos/plugin-openai'],
};
```

### Character Evolution

Track and evolve character traits:

```typescript
class EvolvingCharacter {
  private character: Character;
  private interactions: number = 0;

  constructor(baseCharacter: Character) {
    this.character = { ...baseCharacter };
  }

  async evolve(interaction: Memory) {
    this.interactions++;

    // Evolve personality based on interactions
    if (this.interactions > 100) {
      this.character.adjectives?.push('experienced');
    }

    // Add new topics based on conversations
    const topics = await extractTopics(interaction);
    this.character.topics = [...(this.character.topics || []), ...topics];

    // Update bio with learned information
    if (Array.isArray(this.character.bio)) {
      this.character.bio.push(`Has had ${this.interactions} interactions`);
    }
  }

  getCharacter(): Character {
    return this.character;
  }
}
```

## Best Practices

### 1. Character Consistency

Maintain consistent personality across all components:

```typescript
// ✅ Good - Consistent personality
const consistentChar: Character = {
  name: 'ProfessorBot',
  bio: 'A patient, thorough educator who loves teaching',
  adjectives: ['patient', 'thorough', 'educational'],
  style: {
    all: ['Explain concepts step-by-step', 'Use analogies'],
  },
  messageExamples: [
    // Examples show patient, educational responses
  ],
};

// ❌ Bad - Inconsistent personality
const inconsistentChar: Character = {
  name: 'RushBot',
  bio: 'A patient teacher', // Says patient...
  style: {
    all: ['Be extremely brief', 'Skip explanations'], // But acts rushed
  },
};
```

### 2. Comprehensive Examples

Provide diverse message examples:

```typescript
const wellTrainedChar: Character = {
  messageExamples: [
    // Simple queries
    simpleQuestionExample,

    // Complex technical discussions
    technicalDiscussionExample,

    // Error handling
    errorScenarioExample,

    // Multi-turn conversations
    multiTurnExample,

    // Edge cases
    edgeCaseExample,
  ],
};
```

### 3. Modular Knowledge

Organize knowledge systematically:

```typescript
const organizedChar: Character = {
  knowledge: [
    // Core knowledge
    { directory: 'knowledge/core', shared: true },

    // Domain-specific
    { directory: 'knowledge/web-dev', shared: false },

    // Frequently updated
    { path: 'knowledge/latest-updates.md', shared: true },

    // Reference materials
    { directory: 'knowledge/references', shared: true },
  ],
};
```

### 4. Environment-Aware Settings

Use environment variables for flexibility:

```typescript
const flexibleChar: Character = {
  name: process.env.AGENT_NAME || 'Assistant',

  settings: {
    apiKey: process.env.API_KEY,
    debugMode: process.env.DEBUG === 'true',
    maxTokens: parseInt(process.env.MAX_TOKENS || '1000'),
  },

  secrets: {
    // Never hardcode secrets
    openaiKey: process.env.OPENAI_API_KEY,
  },
};
```

## Character Testing

### Validation Testing

```typescript
import { describe, test, expect } from 'bun:test';
import { validateCharacter } from '@elizaos/core';

describe('Character Validation', () => {
  test('validates correct character', () => {
    const result = validateCharacter(validCharacter);
    expect(result.success).toBe(true);
  });

  test('rejects invalid character', () => {
    const result = validateCharacter({
      // Missing required 'name' field
      bio: 'A test character',
    });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('name');
  });
});
```

### Personality Testing

```typescript
// Test character responses match personality
async function testPersonalityConsistency(character: Character, runtime: IAgentRuntime) {
  const testPrompts = [
    'Tell me about yourself',
    'How do you approach problems?',
    'What are your interests?',
  ];

  for (const prompt of testPrompts) {
    const response = await runtime.generate(prompt);

    // Check response aligns with character traits
    const matchesPersonality = character.adjectives?.some((adj) =>
      response.toLowerCase().includes(adj)
    );

    expect(matchesPersonality).toBe(true);
  }
}
```

## Summary

The ElizaOS Character System provides:

- **Comprehensive personality definition** through multiple components
- **Flexible configuration** for different platforms and contexts
- **Knowledge integration** for domain expertise
- **Validation and type safety** for reliability
- **Extensible design** for custom character types

Key features:

- Multi-faceted personality definition
- Template-based response generation
- Example-driven conversation training
- Integrated knowledge management
- Platform-specific styling
- Runtime validation

The character system is essential for creating believable, consistent AI agents that maintain their personality across all interactions while adapting to different contexts and platforms.
