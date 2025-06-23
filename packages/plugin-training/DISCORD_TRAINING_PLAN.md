# Discord Conversation Training Pipeline Plan

## Overview
Create a production system to extract Discord conversations from the elizaos/knowledge repository, format them as instruction tuning data, and train conversational models on personality-specific dialogue patterns.

## Phase 1: Discord Data Extraction

### 1.1 Repository Analysis and Setup
- Clone/sync elizaos/knowledge repository
- Analyze Discord JSON export structure
- Identify conversation patterns and message formats
- Map user IDs to usernames and display names

### 1.2 Conversation Extractor Implementation
```typescript
interface DiscordMessage {
  id: string;
  author: { id: string; username: string; name?: string };
  content: string;
  timestamp: string;
  channelId: string;
  threadId?: string;
  referencedMessage?: string;
}

interface ConversationThread {
  messages: DiscordMessage[];
  participants: string[];
  channelName: string;
  startTime: string;
  endTime: string;
}
```

**Key Features:**
- Extract raw Discord JSON without AI processing
- Preserve message ordering and threading
- Handle attachments, mentions, and replies
- Filter out bot messages and system notifications
- Group messages into conversation threads

### 1.3 Conversation Threading Logic
- Detect conversation boundaries (time gaps, topic changes)
- Handle threaded replies and message references
- Group related messages into coherent dialogues
- Preserve context flow for training effectiveness

## Phase 2: Data Formatting and Preprocessing

### 2.1 Instruction Tuning Format
Convert Discord conversations to instruction tuning format:
```jsonl
{
  "messages": [
    {"role": "system", "content": "You are {USERNAME}. {PERSONALITY_DESCRIPTION}"},
    {"role": "user", "content": "{PREVIOUS_CONTEXT}"},
    {"role": "assistant", "content": "{TARGET_MESSAGE}"}
  ]
}
```

### 2.2 Personality Extraction
For each of the 50 regular users:
- Track conversation patterns and style
- Identify common phrases and expressions
- Note response timing and engagement patterns
- Extract topical expertise and interests
- Document relationship dynamics with other users

### 2.3 Context Window Management
- Use RecentMessagesProvider format for conversation context
- Implement sliding window for long conversations
- Preserve important context (mentions, replies, topic introductions)
- Handle multi-turn dialogues effectively

## Phase 3: Production Data Pipeline

### 3.1 User Tracking System
```typescript
interface TrackedUser {
  userId: string;
  username: string;
  displayName: string;
  messageCount: number;
  conversationFrequency: number;
  personalityProfile: PersonalityProfile;
  relationships: UserRelationship[];
}

interface PersonalityProfile {
  communicationStyle: string[];
  topicExpertise: string[];
  responsePatterns: string[];
  emotionalTone: string;
  engagementLevel: 'high' | 'medium' | 'low';
}
```

### 3.2 Regular User Identification
- Analyze message frequency and engagement
- Identify top 50 most active, consistent contributors
- Filter for quality conversations (not just spam/reactions)
- Track user presence across multiple channels/topics

### 3.3 Conversation Quality Filtering
- Minimum conversation length (3+ meaningful exchanges)
- Filter out pure reactions, links, or one-word responses
- Ensure conversational coherence and context
- Remove sensitive or inappropriate content

## Phase 4: Training Data Generation

### 4.1 Instruction Template System
```typescript
interface InstructionTemplate {
  systemPrompt: string;
  userContext: string;
  targetResponse: string;
  metadata: {
    userId: string;
    conversationId: string;
    timestamp: string;
    channelContext: string;
  };
}
```

### 4.2 Context Variations
Generate multiple training examples per conversation:
- "Write the next message from perspective of {USERNAME}"
- "Continue the conversation as {USERNAME} would respond"
- "Respond to {MENTION} in the style of {USERNAME}"
- "Address the topic of {TOPIC} as {USERNAME}"

### 4.3 Data Augmentation
- Create variations with different context lengths
- Generate examples for different conversation positions
- Include examples of topic initiation and conclusion
- Handle edge cases (interruptions, topic changes)

## Phase 5: Model Training Configuration

### 5.1 Training Setup
- **Target Model**: Llama 70B Distill via Together.ai
- **Training Size**: 10,000 high-quality examples
- **Batch Size**: 8 (minimum for Together.ai)
- **Learning Rate**: 1e-5 (conservative for stability)
- **Epochs**: 3-5 (prevent overfitting)

### 5.2 Data Distribution
- **Per-user examples**: ~200 examples per tracked user (50 users)
- **Context variety**: Multiple conversation positions and lengths
- **Topic diversity**: Spread across different channels and topics
- **Temporal spread**: Include conversations from different time periods

### 5.3 Validation Strategy
- Hold out 20% of conversations for validation
- Test on unseen users to check generalization
- Evaluate conversation coherence and personality consistency
- Monitor for overfitting to specific users or topics

## Phase 6: Implementation Timeline

### Week 1: Data Extraction Infrastructure
```bash
# Implementation files
src/extractors/discord-extractor.ts
src/extractors/conversation-threader.ts
src/extractors/user-tracker.ts
src/types/discord-types.ts
```

### Week 2: Data Processing Pipeline
```bash
# Implementation files
src/processors/instruction-formatter.ts
src/processors/personality-analyzer.ts
src/processors/context-builder.ts
src/processors/quality-filter.ts
```

### Week 3: Training Data Generation
```bash
# Implementation files
src/generators/training-data-generator.ts
src/generators/template-engine.ts
src/cli/commands/extract-discord.ts
src/cli/commands/generate-training-data.ts
```

### Week 4: Model Training and Validation
- Generate 10,000 training examples
- Submit training job to Together.ai
- Monitor training progress and metrics
- Validate model performance on held-out data

## Technical Specifications

### 6.1 File Structure
```
packages/plugin-training/src/
├── extractors/
│   ├── discord-extractor.ts          # Main extraction logic
│   ├── conversation-threader.ts      # Thread detection and grouping
│   ├── user-tracker.ts              # User activity analysis
│   └── knowledge-repo-client.ts     # Git repo management
├── processors/
│   ├── instruction-formatter.ts     # JSONL formatting
│   ├── personality-analyzer.ts      # User personality extraction
│   ├── context-builder.ts          # Conversation context creation
│   └── quality-filter.ts           # Content quality assessment
├── generators/
│   ├── training-data-generator.ts   # Main generation orchestrator
│   └── template-engine.ts          # Instruction template system
└── cli/commands/
    ├── extract-discord.ts           # CLI for data extraction
    ├── analyze-users.ts            # User analysis CLI
    └── generate-conversation-data.ts # Training data generation CLI
```

### 6.2 CLI Commands
```bash
# Extract Discord conversations
eliza-training extract-discord \
  --repo-path ./elizaos-knowledge \
  --output-dir ./discord-data \
  --min-messages 3 \
  --max-gap-hours 2

# Analyze and track users
eliza-training analyze-users \
  --input-dir ./discord-data \
  --output ./user-profiles.json \
  --min-messages 50 \
  --top-users 50

# Generate training data
eliza-training generate-conversation-data \
  --discord-data ./discord-data \
  --user-profiles ./user-profiles.json \
  --output ./training-dataset.jsonl \
  --examples-per-user 200 \
  --context-window 10

# Train model
eliza-training train-model \
  --file ./training-dataset.jsonl \
  --model meta-llama/Llama-2-70b-chat-hf \
  --suffix discord-conversations \
  --epochs 3 \
  --batch-size 8
```

### 6.3 Data Validation
- **Conversation Coherence**: Ensure logical flow and context preservation
- **Personality Consistency**: Validate that generated examples match user patterns
- **Content Quality**: Filter inappropriate, off-topic, or low-quality content
- **Data Balance**: Ensure fair representation across users and topics
- **Privacy Protection**: Remove or anonymize sensitive personal information

## Expected Outcomes

### Training Dataset Characteristics
- **Size**: 10,000 high-quality conversation examples
- **Users**: 50 most active, consistent Discord participants
- **Coverage**: Multiple channels, topics, and conversation types
- **Quality**: Filtered for coherence, appropriateness, and training value

### Model Capabilities
- Generate responses in the style of specific Discord users
- Maintain conversational coherence and context awareness
- Handle multi-turn dialogues with appropriate personality
- Respond to mentions, topics, and social dynamics appropriately

### Production Benefits
- Personalized conversational AI based on real community interactions
- Scalable system for training on additional Discord communities
- Foundation for more sophisticated personality modeling
- Data pipeline for continuous model improvement

This plan provides a comprehensive approach to extracting Discord conversations, formatting them for instruction tuning, and training personality-aware conversational models while maintaining data quality and user privacy.