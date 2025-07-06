---
sidebar_position: 18
title: State Management
description: Complete guide to managing conversational state in ElizaOS agents
keywords: [state, state management, context, conversation state, memory, providers]
---

# State Management

State management in ElizaOS is the core mechanism for maintaining context throughout conversations and agent interactions. The state system provides a flexible, extensible way to store and access information that shapes agent behavior and responses.

## Overview

The state system serves as the agent's "working memory" during interactions, containing:

- **Current conversation context**
- **User information and preferences**
- **Environmental data from providers**
- **Computed values and temporary data**
- **Historical context and summaries**

## Core Concepts

### State Interface

The base state structure provides flexible storage:

```typescript
export interface State {
  // Dynamic properties
  [key: string]: any;

  // Provider-populated values
  values: {
    [key: string]: any;
  };

  // Structured internal data
  data: {
    [key: string]: any;
  };

  // Text representation of context
  text: string;
}
```

### Enhanced State

For better type safety, use the enhanced state interface:

```typescript
export interface EnhancedState {
  // Directly accessible state values
  values: StateObject;

  // Complex or structured data
  data: StateObject;

  // Textual summary of current state
  text: string;

  // Additional dynamic properties
  [key: string]: StateValue;
}

// Type-safe state values
export type StateValue = string | number | boolean | null | StateObject | StateArray;
```

## State Composition

State is composed dynamically by the runtime through the `composeState` method:

```typescript
// Compose state with specific components
const state = await runtime.composeState(message, [
  'RECENT_MESSAGES', // Recent conversation history
  'FACTS', // Known facts about entities
  'ENTITIES', // Active entities in conversation
  'RELATIONSHIPS', // Relationships between entities
  'PERSONALITY', // Agent personality traits
  'ACTIVE_GOALS', // Current goals and objectives
  'EVALUATORS', // Evaluator-provided context
]);
```

## State Components

### 1. Recent Messages

Provides conversation history context:

```typescript
state.values.recentMessages = [
  {
    entityId: 'user-123',
    content: { text: "What's the weather like?" },
    timestamp: 1234567890,
  },
  {
    entityId: 'agent-456',
    content: { text: "I'll check the weather for you." },
    timestamp: 1234567891,
  },
];

state.text += `
Recent conversation:
User: What's the weather like?
Agent: I'll check the weather for you.
`;
```

### 2. Facts

Stores persistent facts about entities:

```typescript
state.values.facts = [
  'User prefers metric units',
  'User is located in Tokyo',
  'User is interested in technology',
];

state.data.entityFacts = {
  'user-123': {
    location: 'Tokyo',
    preferences: {
      units: 'metric',
      language: 'en',
    },
  },
};
```

### 3. Entity Information

Active participants in the conversation:

```typescript
state.values.entities = {
  user: {
    id: 'user-123',
    name: 'Alice',
    role: 'user',
    active: true,
  },
  agent: {
    id: 'agent-456',
    name: 'Assistant',
    role: 'agent',
    active: true,
  },
};
```

### 4. Relationships

Connections between entities:

```typescript
state.data.relationships = [
  {
    entityA: 'user-123',
    entityB: 'project-789',
    type: 'owner',
    strength: 1.0,
  },
  {
    entityA: 'user-123',
    entityB: 'team-101',
    type: 'member',
    strength: 0.8,
  },
];
```

## Provider-Populated State

Providers add dynamic context to state:

```typescript
// Time provider adds temporal context
state.values.currentTime = '2024-01-15T10:30:00Z';
state.values.timezone = 'Asia/Tokyo';
state.values.timeOfDay = 'morning';

// Weather provider adds environmental data
state.values.weather = {
  temperature: 22,
  condition: 'partly cloudy',
  humidity: 65,
};

// User provider adds user context
state.values.userProfile = {
  preferences: { theme: 'dark' },
  subscription: 'premium',
  joinedDate: '2023-01-01',
};
```

## Using State in Components

### In Actions

Actions receive state to make decisions:

```typescript
const weatherAction: Action = {
  name: 'CHECK_WEATHER',

  validate: async (runtime, message, state) => {
    // Check if location is available in state
    return !!(state.values.userLocation || state.data.entityFacts?.location);
  },

  handler: async (runtime, message, state) => {
    const location =
      state.values.userLocation || state.data.entityFacts?.location || 'current location';

    // Use state to customize response
    const units = state.values.preferredUnits || 'celsius';
    const weather = await getWeather(location, units);

    return {
      text: `The weather in ${location} is ${weather.description}`,
      data: { weather },
    };
  },
};
```

### In Evaluators

Evaluators use and modify state:

```typescript
const sentimentEvaluator: Evaluator = {
  name: 'SENTIMENT_ANALYZER',

  handler: async (runtime, message, state) => {
    const sentiment = await analyzeSentiment(message.content.text);

    // Add sentiment to state for other components
    state.values.messageSentiment = sentiment;
    state.data.sentimentHistory = state.data.sentimentHistory || [];
    state.data.sentimentHistory.push({
      messageId: message.id,
      sentiment,
      timestamp: Date.now(),
    });

    // Update conversation mood
    if (sentiment.score < -0.5) {
      state.values.conversationMood = 'negative';
    } else if (sentiment.score > 0.5) {
      state.values.conversationMood = 'positive';
    }
  },
};
```

### In Providers

Providers populate state with context:

```typescript
const contextProvider: Provider = {
  name: 'CONTEXT_PROVIDER',

  get: async (runtime, message, state) => {
    const roomContext = await runtime.getRoomContext(message.roomId);
    const userContext = await runtime.getUserContext(message.entityId);

    return {
      room: {
        topic: roomContext.topic,
        participants: roomContext.participants.length,
        isPrivate: roomContext.isPrivate,
      },
      user: {
        messageCount: userContext.messageCount,
        firstSeen: userContext.firstSeen,
        interests: userContext.interests,
      },
    };
  },
};
```

## State Patterns

### 1. State Accumulation

Build up state over multiple providers:

```typescript
// Provider 1: Basic user info
const userProvider: Provider = {
  get: async () => ({
    userId: '123',
    username: 'alice',
  }),
};

// Provider 2: Extended profile
const profileProvider: Provider = {
  get: async (runtime, message, state) => {
    // Access previous provider's data
    const userId = state.values.userId;
    const profile = await getProfile(userId);
    return { profile };
  },
};

// Provider 3: Preferences based on profile
const preferencesProvider: Provider = {
  get: async (runtime, message, state) => {
    // Build on accumulated state
    const profile = state.values.profile;
    return {
      preferences: profile?.settings || defaultSettings,
    };
  },
};
```

### 2. Conditional State

Add state based on conditions:

```typescript
const conditionalProvider: Provider = {
  get: async (runtime, message, state) => {
    const result: any = {};

    // Add location if mentioned
    if (message.content.text?.includes('weather')) {
      result.needsLocation = true;
      result.location = await detectLocation(message.content.text);
    }

    // Add time context if scheduling
    if (message.content.text?.includes('schedule')) {
      result.needsCalendar = true;
      result.availableSlots = await getAvailableSlots();
    }

    return result;
  },
};
```

### 3. State Transformation

Transform state for specific uses:

```typescript
// Transform provider data for template rendering
const transformedState = {
  ...state,
  values: {
    ...state.values,
    // Transform for display
    formattedTime: formatTime(state.values.currentTime),
    temperatureDisplay: `${state.values.weather?.temperature}°C`,
    // Compute derived values
    isBusinessHours: isWithinBusinessHours(state.values.currentTime),
    userLevel: calculateUserLevel(state.values.userProfile),
  },
};
```

## State Persistence

While state is ephemeral during conversations, you can persist important data:

```typescript
// Save important state to facts
const persistentData = {
  userPreferences: state.values.preferences,
  learningProgress: state.data.learningProgress,
};

await runtime.addFact({
  entityId: message.entityId,
  type: 'preference',
  data: persistentData,
});

// Restore in future conversations
const savedFacts = await runtime.getFacts({ entityId: message.entityId });
state.values.restored = savedFacts.map((f) => f.data);
```

## Advanced State Management

### 1. State Validation

Ensure state integrity:

```typescript
const validateState = (state: State): boolean => {
  // Check required fields
  if (!state.values || !state.data) {
    console.error('Invalid state structure');
    return false;
  }

  // Validate specific values
  if (state.values.temperature && typeof state.values.temperature !== 'number') {
    console.error('Temperature must be a number');
    return false;
  }

  // Check data consistency
  if (state.values.userId && !state.data.entities?.[state.values.userId]) {
    console.error('User ID references missing entity');
    return false;
  }

  return true;
};
```

### 2. State Middleware

Process state before use:

```typescript
const stateMiddleware = async (state: State): Promise<State> => {
  // Sanitize sensitive data
  if (state.values.apiKey) {
    state.values.apiKey = '[REDACTED]';
  }

  // Add computed properties
  state.values.sessionDuration = Date.now() - state.values.sessionStart;

  // Normalize data
  if (state.values.username) {
    state.values.username = state.values.username.toLowerCase();
  }

  return state;
};
```

### 3. State Debugging

Debug state for development:

```typescript
const debugState = (state: State, label: string = 'State') => {
  console.log(`=== ${label} ===`);
  console.log('Values:', JSON.stringify(state.values, null, 2));
  console.log('Data:', JSON.stringify(state.data, null, 2));
  console.log('Text length:', state.text.length);
  console.log('Text preview:', state.text.substring(0, 200) + '...');
};

// Use in components
const debugAction: Action = {
  handler: async (runtime, message, state) => {
    debugState(state, 'Action State');
    // ... action logic
  },
};
```

## State Best Practices

### 1. Keep State Focused

Only include relevant data:

```typescript
// ✅ Good - Focused state
const focusedProvider: Provider = {
  get: async (runtime, message) => {
    if (message.content.text?.includes('weather')) {
      return {
        location: await getLocation(),
        weatherEnabled: true,
      };
    }
    return {};
  },
};

// ❌ Bad - Unfocused state
const unfocusedProvider: Provider = {
  get: async () => ({
    weather: await getWeather(), // Always fetched
    stocks: await getStocks(), // Even if not needed
    news: await getNews(), // Wastes resources
    sports: await getSports(), // Clutters state
  }),
};
```

### 2. Use Proper Namespacing

Organize state values logically:

```typescript
// ✅ Good - Namespaced organization
state.values = {
  user: {
    id: '123',
    preferences: { theme: 'dark' },
  },
  context: {
    location: 'Tokyo',
    timezone: 'JST',
  },
  conversation: {
    topic: 'weather',
    sentiment: 'positive',
  },
};

// ❌ Bad - Flat organization
state.values = {
  userId: '123',
  userTheme: 'dark',
  locationCity: 'Tokyo',
  locationTimezone: 'JST',
  currentTopic: 'weather',
  currentSentiment: 'positive',
};
```

### 3. Document State Shape

Clearly document what your components add to state:

```typescript
/**
 * Weather Provider
 *
 * Adds to state.values:
 * - weather.current: Current weather conditions
 * - weather.forecast: 5-day forecast array
 * - weather.location: Detected or specified location
 *
 * Adds to state.data:
 * - weatherApiResponse: Raw API response for debugging
 * - weatherLastUpdated: Timestamp of last update
 */
const weatherProvider: Provider = {
  name: 'WEATHER_PROVIDER',
  // ... implementation
};
```

### 4. Handle Missing State

Always handle cases where expected state might be missing:

```typescript
const resilientAction: Action = {
  handler: async (runtime, message, state) => {
    // Safely access nested values
    const location =
      state.values?.user?.location || state.data?.detectedLocation || 'unknown location';

    // Provide defaults
    const preferences = state.values?.preferences || {
      units: 'metric',
      language: 'en',
    };

    // Check before using
    if (!state.values?.requiredData) {
      return {
        text: 'I need more information to help with that.',
        data: { error: 'missing_required_data' },
      };
    }
  },
};
```

## State Lifecycle

Understanding when state is created and destroyed:

1. **Creation**: State is created fresh for each message processing
2. **Population**: Providers and components add data during composition
3. **Usage**: Actions and evaluators consume and modify state
4. **Cleanup**: State is discarded after message processing completes

```typescript
// State lifecycle in message processing
async function processMessage(message: Memory) {
  // 1. Create fresh state
  const state = await runtime.composeState(message, ['RECENT_MESSAGES']);

  // 2. State is populated by providers
  // 3. Actions/evaluators use state
  await runtime.processActions(message, state);

  // 4. State is discarded (not persisted)
  // Important data should be saved as facts or memories
}
```

## Performance Optimization

### 1. Lazy Loading

Load expensive data only when needed:

```typescript
const lazyProvider: Provider = {
  get: async (runtime, message, state) => {
    return {
      // Getter function instead of immediate value
      get expensiveData() {
        if (!this._cached) {
          this._cached = loadExpensiveData();
        }
        return this._cached;
      },
    };
  },
};
```

### 2. State Caching

Cache computed values within state:

```typescript
const cachingProvider: Provider = {
  get: async (runtime, message, state) => {
    // Check if already computed
    if (state.data._computedAnalysis) {
      return { analysis: state.data._computedAnalysis };
    }

    // Compute and cache
    const analysis = await performExpensiveAnalysis(message);
    state.data._computedAnalysis = analysis;

    return { analysis };
  },
};
```

### 3. Selective Composition

Only compose needed state components:

```typescript
// Light state for simple responses
const lightState = await runtime.composeState(message, ['RECENT_MESSAGES']);

// Full state for complex analysis
const fullState = await runtime.composeState(message, [
  'RECENT_MESSAGES',
  'FACTS',
  'ENTITIES',
  'RELATIONSHIPS',
  'PERSONALITY',
  'ACTIVE_GOALS',
  'EVALUATORS',
]);
```

## Summary

The ElizaOS state management system provides:

- **Flexible structure** for storing conversation context
- **Provider-based population** for dynamic data
- **Type-safe interfaces** for better development experience
- **Ephemeral design** optimized for conversation processing
- **Extensible patterns** for custom state management

State is the cornerstone of contextual agent responses, enabling:

- Personalized interactions based on user data
- Contextual awareness of conversation history
- Environmental adaptation through provider data
- Complex decision-making in actions
- Stateful behavior across components
