import { elizaLogger, type IAgentRuntime, type Character } from '@elizaos/core';
import { DiscordConversationParser, type ConversationTrainingExample } from './DiscordConversationParser';
import { TrainingDatabaseManager } from '../../database/TrainingDatabaseManager';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

/**
 * ConversationDatasetBuilder - Builds comprehensive training datasets for conversation models
 * 
 * This builder processes Discord conversation exports and creates training data
 * formatted exactly like ElizaOS prompt structure with message history and response generation.
 * Handles <thinking> blocks and creates character files for each user.
 */
export class ConversationDatasetBuilder {
  private parser: DiscordConversationParser;
  private dbManager: TrainingDatabaseManager;
  private runtime?: IAgentRuntime;

  constructor(runtime?: IAgentRuntime) {
    this.runtime = runtime;
    this.parser = new DiscordConversationParser(runtime);
    this.dbManager = new TrainingDatabaseManager(runtime);
  }

  /**
   * Process all conversation files in a directory
   */
  async processConversationDirectory(
    conversationDir: string,
    outputDir: string = './conversation_training_data'
  ): Promise<{
    totalExamples: number;
    totalUsers: number;
    modelSizes: { '8B': number; '32B': number };
    characterFiles: string[];
  }> {
    elizaLogger.info(`🏗️  Building conversation dataset from ${conversationDir}`);

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Find all JSON conversation files
    const conversationFiles = await glob('**/*.json', { cwd: conversationDir });
    elizaLogger.info(`📁 Found ${conversationFiles.length} conversation files`);

    if (conversationFiles.length === 0) {
      // Create sample conversation files for demonstration
      await this.createSampleConversations(conversationDir);
      return this.processConversationDirectory(conversationDir, outputDir);
    }

    const allExamples: ConversationTrainingExample[] = [];
    const allUsers = new Map<string, Character>();

    // Process each conversation file
    for (const file of conversationFiles) {
      const filePath = path.join(conversationDir, file);
      
      try {
        elizaLogger.info(`📖 Processing conversation file: ${file}`);
        
        const examples = await this.parser.parseConversationFile(filePath);
        allExamples.push(...examples);

        // Collect user profiles
        const userProfiles = this.parser.getUserProfiles();
        for (const [userId, profile] of userProfiles) {
          allUsers.set(userId, profile);
        }

        elizaLogger.info(`✅ Processed ${examples.length} examples from ${file}`);
        
      } catch (error) {
        elizaLogger.error(`❌ Failed to process ${file}:`, error);
      }
    }

    // Generate character files
    const characterFiles = await this.generateCharacterFiles(allUsers, outputDir);

    // Create model-specific datasets
    const modelSizes = await this.createModelDatasets(allExamples, outputDir);

    // Store in database if available
    if (this.runtime) {
      await this.storeInDatabase(allExamples);
    }

    const result = {
      totalExamples: allExamples.length,
      totalUsers: allUsers.size,
      modelSizes,
      characterFiles,
    };

    elizaLogger.info(`🎉 Conversation dataset built successfully:`, result);
    return result;
  }

  /**
   * Create sample conversation files for demonstration
   */
  private async createSampleConversations(conversationDir: string): Promise<void> {
    elizaLogger.info(`📝 Creating sample conversation files in ${conversationDir}`);
    
    await fs.mkdir(conversationDir, { recursive: true });

    // Sample Discord conversation with ElizaOS development discussion
    const sampleConversation = {
      guild: {
        id: "123456789012345678",
        name: "ElizaOS Development"
      },
      channel: {
        id: "987654321098765432",
        name: "general",
        type: "GUILD_TEXT"
      },
      messages: [
        {
          id: "1001",
          timestamp: "2024-01-15T10:00:00.000Z",
          author: {
            id: "user1",
            username: "developer_alice",
            displayName: "Alice",
            bot: false
          },
          content: "Hey everyone! I've been working on improving the conversation parsing for our training pipeline. Has anyone else looked into the Discord message format?",
          attachments: [],
          embeds: [],
          mentions: [],
          reference: null,
          reactions: [{ emoji: "👍", count: 2 }],
          url: "https://discord.com/channels/123456789012345678/987654321098765432/1001"
        },
        {
          id: "1002",
          timestamp: "2024-01-15T10:02:00.000Z",
          author: {
            id: "user2",
            username: "coder_bob",
            displayName: "Bob",
            bot: false
          },
          content: "Yes! I was just looking at that yesterday. The structure is pretty complex with all the embeds and references. Are you thinking of using it for training the conversation model?",
          attachments: [],
          embeds: [],
          mentions: [{ id: "user1", username: "developer_alice" }],
          reference: { messageId: "1001" },
          reactions: [],
          url: "https://discord.com/channels/123456789012345678/987654321098765432/1002"
        },
        {
          id: "1003",
          timestamp: "2024-01-15T10:05:00.000Z",
          author: {
            id: "user1",
            username: "developer_alice",
            displayName: "Alice",
            bot: false
          },
          content: "Exactly! I'm thinking we can extract conversation patterns and create training data that mimics our current prompt structure. The key is handling the <thinking> blocks correctly so the model can reason through responses.",
          attachments: [],
          embeds: [],
          mentions: [{ id: "user2", username: "coder_bob" }],
          reference: { messageId: "1002" },
          reactions: [{ emoji: "🧠", count: 1 }],
          url: "https://discord.com/channels/123456789012345678/987654321098765432/1003"
        },
        {
          id: "1004",
          timestamp: "2024-01-15T10:07:00.000Z",
          author: {
            id: "user3",
            username: "ai_researcher",
            displayName: "Dr. Chen",
            bot: false
          },
          content: "This is fascinating work! I've been researching similar approaches. Have you considered using different model sizes for different types of conversations? Maybe 8B for casual chat and 32B for technical discussions?",
          attachments: [],
          embeds: [],
          mentions: [],
          reference: null,
          reactions: [{ emoji: "🔬", count: 3 }],
          url: "https://discord.com/channels/123456789012345678/987654321098765432/1004"
        },
        {
          id: "1005",
          timestamp: "2024-01-15T10:10:00.000Z",
          author: {
            id: "user2",
            username: "coder_bob",
            displayName: "Bob",
            bot: false
          },
          content: "That's a great point, Dr. Chen! We could definitely optimize model selection based on conversation complexity. I think the 8B model would handle most Discord interactions, while the 32B could be reserved for detailed technical explanations.",
          attachments: [],
          embeds: [],
          mentions: [{ id: "user3", username: "ai_researcher" }],
          reference: { messageId: "1004" },
          reactions: [],
          url: "https://discord.com/channels/123456789012345678/987654321098765432/1005"
        },
        {
          id: "1006",
          timestamp: "2024-01-15T10:15:00.000Z",
          author: {
            id: "user4",
            username: "community_manager",
            displayName: "Sam",
            bot: false
          },
          content: "I love seeing all this technical discussion! 🚀 From a community perspective, I think it's important that we maintain the natural conversational flow that makes Discord special. Users should feel like they're talking to real people, not just getting generated responses.",
          attachments: [],
          embeds: [],
          mentions: [],
          reference: null,
          reactions: [{ emoji: "❤️", count: 4 }, { emoji: "🚀", count: 2 }],
          url: "https://discord.com/channels/123456789012345678/987654321098765432/1006"
        },
        {
          id: "1007",
          timestamp: "2024-01-15T10:18:00.000Z",
          author: {
            id: "user1",
            username: "developer_alice",
            displayName: "Alice",
            bot: false
          },
          content: "Absolutely, Sam! That's why I'm focusing on preserving the authentic communication patterns. Each user gets their own character profile based on their actual messaging style, topics of interest, and response patterns. The model should learn to respond AS that person, not just generate generic responses.",
          attachments: [],
          embeds: [],
          mentions: [{ id: "user4", username: "community_manager" }],
          reference: { messageId: "1006" },
          reactions: [{ emoji: "💯", count: 3 }],
          url: "https://discord.com/channels/123456789012345678/987654321098765432/1007"
        },
        {
          id: "1008",
          timestamp: "2024-01-15T10:22:00.000Z",
          author: {
            id: "user5",
            username: "newbie_dev",
            displayName: "Jordan",
            bot: false
          },
          content: "This all sounds really advanced! I'm still learning about LLMs and training data. Could someone explain how the <thinking> blocks work? I see them mentioned but I'm not sure what they're for.",
          attachments: [],
          embeds: [],
          mentions: [],
          reference: null,
          reactions: [{ emoji: "🤔", count: 1 }],
          url: "https://discord.com/channels/123456789012345678/987654321098765432/1008"
        },
        {
          id: "1009",
          timestamp: "2024-01-15T10:25:00.000Z",
          author: {
            id: "user3",
            username: "ai_researcher",
            displayName: "Dr. Chen",
            bot: false
          },
          content: "<thinking>\nJordan is asking about thinking blocks, which is a great question. I should explain this clearly since they're new to LLMs. Thinking blocks allow the model to reason through a problem step by step before generating the final response. It's similar to chain-of-thought reasoning.\n</thinking>\n\nGreat question, Jordan! <thinking> blocks are a way for the model to \"think out loud\" before responding. Inside these blocks, the model can reason through the problem, consider different approaches, and plan its response. Think of it like showing your work in math class - the model can work through its reasoning process step by step, which leads to better and more thoughtful responses.",
          attachments: [],
          embeds: [],
          mentions: [{ id: "user5", username: "newbie_dev" }],
          reference: { messageId: "1008" },
          reactions: [{ emoji: "🧠", count: 5 }, { emoji: "📚", count: 2 }],
          url: "https://discord.com/channels/123456789012345678/987654321098765432/1009"
        },
        {
          id: "1010",
          timestamp: "2024-01-15T10:28:00.000Z",
          author: {
            id: "user5",
            username: "newbie_dev",
            displayName: "Jordan",
            bot: false
          },
          content: "Oh wow, that makes so much sense! So it's like the model can have an internal monologue before responding. That's really cool! Does that mean the responses are more accurate when using thinking blocks?",
          attachments: [],
          embeds: [],
          mentions: [{ id: "user3", username: "ai_researcher" }],
          reference: { messageId: "1009" },
          reactions: [{ emoji: "💡", count: 2 }],
          url: "https://discord.com/channels/123456789012345678/987654321098765432/1010"
        }
      ],
      metadata: {
        exportedAt: "2024-01-15T15:00:00.000Z",
        totalMessages: 10,
        dateRange: {
          start: "2024-01-15T10:00:00.000Z",
          end: "2024-01-15T10:28:00.000Z"
        }
      }
    };

    // Write sample conversation
    const samplePath = path.join(conversationDir, 'elizaos-dev-sample.json');
    await fs.writeFile(samplePath, JSON.stringify(sampleConversation, null, 2));

    elizaLogger.info(`✅ Created sample conversation file: ${samplePath}`);
  }

  /**
   * Generate character files for each user
   */
  private async generateCharacterFiles(
    users: Map<string, Character>,
    outputDir: string
  ): Promise<string[]> {
    const characterDir = path.join(outputDir, 'characters');
    await fs.mkdir(characterDir, { recursive: true });

    const characterFiles: string[] = [];

    for (const [userId, character] of users) {
      const filename = `${character.username || userId}.json`;
      const filepath = path.join(characterDir, filename);
      
      try {
        await fs.writeFile(filepath, JSON.stringify(character, null, 2));
        characterFiles.push(filepath);
        elizaLogger.debug(`📄 Generated character file: ${filename}`);
      } catch (error) {
        elizaLogger.warn(`Failed to write character file for ${userId}:`, error);
      }
    }

    elizaLogger.info(`👥 Generated ${characterFiles.length} character files`);
    return characterFiles;
  }

  /**
   * Create model-specific datasets (8B and 32B)
   */
  private async createModelDatasets(
    examples: ConversationTrainingExample[],
    outputDir: string
  ): Promise<{ '8B': number; '32B': number }> {
    const datasetsDir = path.join(outputDir, 'datasets');
    await fs.mkdir(datasetsDir, { recursive: true });

    // Separate examples by complexity for different model sizes
    const simpleExamples = examples.filter(ex => this.isSimpleConversation(ex));
    const complexExamples = examples.filter(ex => !this.isSimpleConversation(ex));

    // 8B Model Dataset - Simple conversations, casual chat
    const dataset8B = {
      model_type: 'conversation_8B',
      target_model_size: '8B',
      description: 'Casual conversation and simple interactions',
      format: 'instruction_following_with_thinking',
      samples: simpleExamples.map(ex => this.formatFor8BModel(ex)),
      metadata: {
        total_samples: simpleExamples.length,
        avg_context_length: this.calculateAvgContextLength(simpleExamples),
        conversation_types: ['casual', 'questions', 'greetings', 'simple_responses'],
        exported_at: Date.now(),
      },
    };

    // 32B Model Dataset - Complex discussions, technical content
    const dataset32B = {
      model_type: 'conversation_32B',
      target_model_size: '32B',
      description: 'Complex discussions, technical content, and detailed explanations',
      format: 'instruction_following_with_thinking',
      samples: complexExamples.map(ex => this.formatFor32BModel(ex)),
      metadata: {
        total_samples: complexExamples.length,
        avg_context_length: this.calculateAvgContextLength(complexExamples),
        conversation_types: ['technical', 'detailed_explanations', 'complex_reasoning', 'multi_turn'],
        exported_at: Date.now(),
      },
    };

    // Write datasets
    const path8B = path.join(datasetsDir, 'conversation_8B_dataset.jsonl');
    const path32B = path.join(datasetsDir, 'conversation_32B_dataset.jsonl');

    await this.writeJSONLDataset(dataset8B, path8B);
    await this.writeJSONLDataset(dataset32B, path32B);

    elizaLogger.info(`📊 Created 8B dataset: ${simpleExamples.length} samples`);
    elizaLogger.info(`📊 Created 32B dataset: ${complexExamples.length} samples`);

    return {
      '8B': simpleExamples.length,
      '32B': complexExamples.length,
    };
  }

  /**
   * Determine if conversation is simple enough for 8B model
   */
  private isSimpleConversation(example: ConversationTrainingExample): boolean {
    const { input, output } = example;
    
    // Simple criteria
    const isShortResponse = output.response.text.length < 300;
    const hasSimpleContext = input.messageHistory.length < 5;
    const noComplexThinking = !output.response.thinking || output.response.thinking.length < 100;
    const isBasicType = ['question', 'brief_response', 'general_message'].includes(example.metadata.responseType);
    
    return isShortResponse && hasSimpleContext && noComplexThinking && isBasicType;
  }

  /**
   * Format example for 8B model (simplified)
   */
  private formatFor8BModel(example: ConversationTrainingExample) {
    const { input, output } = example;
    
    // Create simplified prompt
    const systemPrompt = `You are ${input.targetUser.displayName}, responding naturally in a Discord conversation. Match your established communication style and personality.`;
    
    // Simplified context (last 3 messages only)
    const recentContext = input.messageHistory.slice(-3);
    const contextText = recentContext.map(msg => 
      `${msg.entityId === input.targetUser.entityId ? input.targetUser.displayName : 'User'}: ${msg.content.text}`
    ).join('\n');
    
    const promptText = `${contextText}\n${input.targetUser.displayName}: `;
    
    return {
      instruction: systemPrompt,
      input: promptText,
      output: output.response.text,
      metadata: {
        user_id: example.metadata.userId,
        conversation_id: example.metadata.conversationId,
        response_type: example.metadata.responseType,
        model_size: '8B',
      },
    };
  }

  /**
   * Format example for 32B model (with thinking)
   */
  private formatFor32BModel(example: ConversationTrainingExample) {
    const { input, output } = example;
    
    // Full character profile integration
    const character = input.targetUser.characterProfile;
    const systemPrompt = `${character.system}

You have access to the full conversation history and should respond naturally as ${input.targetUser.displayName}.

Your personality traits: ${character.adjectives?.join(', ')}
Your interests: ${character.topics?.join(', ')}
Your communication style: ${character.style?.all?.join(', ')}`;

    // Full context
    const contextText = input.messageHistory.map(msg => {
      const isTarget = msg.entityId === input.targetUser.entityId;
      const name = isTarget ? input.targetUser.displayName : 'User';
      return `${name}: ${msg.content.text}`;
    }).join('\n');
    
    // Include thinking process if available
    let fullResponse = '';
    if (output.response.thinking) {
      fullResponse += `<thinking>\n${output.response.thinking}\n</thinking>\n\n`;
    }
    fullResponse += output.response.text;
    
    if (output.response.actions && output.response.actions.length > 0) {
      fullResponse += `\n\nActions: ${output.response.actions.join(', ')}`;
    }
    
    return {
      instruction: systemPrompt,
      input: `${contextText}\n${input.targetUser.displayName}: `,
      output: fullResponse,
      metadata: {
        user_id: example.metadata.userId,
        conversation_id: example.metadata.conversationId,
        response_type: example.metadata.responseType,
        context_length: example.metadata.contextLength,
        model_size: '32B',
        has_thinking: !!output.response.thinking,
        has_actions: !!(output.response.actions && output.response.actions.length > 0),
      },
    };
  }

  /**
   * Write dataset in JSONL format
   */
  private async writeJSONLDataset(dataset: any, filepath: string): Promise<void> {
    const jsonlLines = dataset.samples.map((sample: any) => JSON.stringify(sample)).join('\n');
    await fs.writeFile(filepath, jsonlLines);
    
    // Also write metadata
    const metadataPath = filepath.replace('.jsonl', '_metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify({
      ...dataset.metadata,
      file_format: 'jsonl',
      sample_count: dataset.samples.length,
      created_at: new Date().toISOString(),
    }, null, 2));
  }

  /**
   * Store examples in training database
   */
  private async storeInDatabase(examples: ConversationTrainingExample[]): Promise<void> {
    if (!this.runtime) return;

    try {
      const dbPath = this.runtime.getSetting('TRAINING_DATABASE_URL') || 'sqlite:./training.db';
      await this.dbManager.initializeSchema();

      for (const example of examples) {
        const trainingData = {
          id: uuidv4() as any,
          modelType: 'conversation' as const,
          input: {
            prompt: `Respond to this conversation as ${example.input.targetUser.username}`,
            ...example.input,
          },
          output: example.output,
          conversationContext: example.input.messageHistory,
          stateData: example.input.contextState,
          metadata: {
            ...example.metadata,
            agentId: this.runtime.agentId,
            roomId: example.input.contextState.roomId as any,
            messageId: example.metadata.messageId ? (example.metadata.messageId as any) : undefined,
            timestamp: Date.now(),
          },
          tags: ['conversation', 'discord', example.metadata.responseType],
          timestamp: Date.now(),
        };

        await this.dbManager.storeTrainingData(trainingData);
      }

      elizaLogger.info(`💾 Stored ${examples.length} conversation examples in database`);
      
    } catch (error) {
      elizaLogger.error('Failed to store conversation data in database:', error);
    }
  }

  // Helper methods
  private calculateAvgContextLength(examples: ConversationTrainingExample[]): number {
    const totalLength = examples.reduce((sum, ex) => sum + ex.metadata.contextLength, 0);
    return Math.round(totalLength / examples.length);
  }

  /**
   * Export conversation training data
   */
  async exportConversationDataset(
    modelType: '8B' | '32B' | 'all' = 'all',
    limit: number = 10000
  ): Promise<any> {
    try {
      const data = await this.dbManager.getTrainingData({ modelType: 'conversation', limit });
      
      let filteredData = data;
      if (modelType !== 'all') {
        filteredData = data.filter(item => {
          const metadata = JSON.parse(item.metadata || '{}');
          return metadata.model_size === modelType;
        });
      }

      const formattedData = filteredData.map(item => {
        const input = JSON.parse(item.input_data);
        const output = JSON.parse(item.output_data);
        
        return {
          input: input,
          output: output,
          metadata: JSON.parse(item.metadata || '{}'),
        };
      });

      elizaLogger.info(`📊 Exported ${formattedData.length} conversation training samples (${modelType})`);
      
      return {
        model_type: `conversation_${modelType}`,
        format: 'conversation_with_character_profiles',
        samples: formattedData,
        metadata: {
          total_samples: formattedData.length,
          model_target: modelType,
          exported_at: Date.now(),
          includes_thinking: formattedData.some(s => s.output.response?.thinking),
          includes_actions: formattedData.some(s => s.output.response?.actions?.length > 0),
        },
      };
      
    } catch (error) {
      elizaLogger.error('❌ Failed to export conversation dataset:', error);
      throw error;
    }
  }
}