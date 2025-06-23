import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import { elizaLogger } from '@elizaos/core';
import { InstructionFormatter } from '../../processors/instruction-formatter.js';
import type { 
  ConversationThread, 
  TrackedUser, 
  GenerationConfig,
  GenerationStats,
  InstructionExample
} from '../../types/discord-types.js';

export function generateConversationDataCommand(program: Command) {
  program
    .command('generate-conversation-data')
    .description('Generate instruction tuning data from Discord conversations')
    .option('-i, --input-dir <path>', 'Input directory with extracted Discord data', './discord-data')
    .option('-o, --output <path>', 'Output JSONL file', './training-dataset.jsonl')
    .option('--examples-per-user <number>', 'Target examples per user', '200')
    .option('--context-window <number>', 'Number of context messages', '10')
    .option('--max-examples <number>', 'Maximum total examples', '10000')
    .option('--min-quality-score <number>', 'Minimum quality score', '0.5')
    .option('--include-system-prompt', 'Include system prompt with personality', true)
    .option('--personality-in-system', 'Include personality in system prompt', true)
    .option('--include-channel-context', 'Include channel context in prompts', true)
    .option('--include-time-context', 'Include time context in prompts', false)
    .option('--balance-users', 'Balance examples across users', true)
    .option('--diversify-contexts', 'Diversify conversation contexts', true)
    .option('--output-format <format>', 'Output format (jsonl|json)', 'jsonl')
    .option('--train-split <number>', 'Training set ratio', '0.8')
    .option('--val-split <number>', 'Validation set ratio', '0.1')
    .option('--test-split <number>', 'Test set ratio', '0.1')
    .option('--shuffle', 'Shuffle data before splitting', true)
    .option('--preview <number>', 'Preview first N examples without saving', '0')
    .action(async (options) => {
      try {
        elizaLogger.info('🎯 Starting conversation data generation...');
        
        // Validate input directory
        const inputDir = path.resolve(options.inputDir);
        try {
          await fs.access(inputDir);
        } catch (error) {
          elizaLogger.error(`❌ Input directory not found: ${inputDir}`);
          elizaLogger.info('💡 Run "eliza-training extract-discord" first to extract conversations');
          process.exit(1);
        }
        
        // Load extracted data
        elizaLogger.info('📂 Loading extracted Discord data...');
        const { conversations, users } = await loadExtractedData(inputDir);
        
        elizaLogger.info(`📊 Loaded ${conversations.length} conversations and ${users.length} users`);
        
        // Validate split ratios
        const trainSplit = parseFloat(options.trainSplit);
        const valSplit = parseFloat(options.valSplit);
        const testSplit = parseFloat(options.testSplit);
        
        if (Math.abs(trainSplit + valSplit + testSplit - 1.0) > 0.001) {
          elizaLogger.error('❌ Split ratios must sum to 1.0');
          process.exit(1);
        }
        
        // Create generation configuration
        const config: GenerationConfig = {
          examplesPerUser: parseInt(options.examplesPerUser),
          contextWindow: parseInt(options.contextWindow),
          maxExamples: parseInt(options.maxExamples),
          includeSystemPrompt: options.includeSystemPrompt,
          personalityInSystem: options.personalityInSystem,
          includeChannelContext: options.includeChannelContext,
          includeTimeContext: options.includeTimeContext,
          minQualityScore: parseFloat(options.minQualityScore),
          balanceUserExamples: options.balanceUsers,
          diversifyContexts: options.diversifyContexts,
          outputFormat: options.outputFormat as 'jsonl' | 'json',
          splitRatio: [trainSplit, valSplit, testSplit],
          shuffleData: options.shuffle
        };
        
        elizaLogger.info('📋 Generation configuration:');
        elizaLogger.info(`  Examples per user: ${config.examplesPerUser}`);
        elizaLogger.info(`  Context window: ${config.contextWindow} messages`);
        elizaLogger.info(`  Max total examples: ${config.maxExamples}`);
        elizaLogger.info(`  Quality threshold: ${config.minQualityScore}`);
        elizaLogger.info(`  Balance users: ${config.balanceUserExamples}`);
        elizaLogger.info(`  Include personality: ${config.personalityInSystem}`);
        elizaLogger.info(`  Split ratio: ${config.splitRatio.join('/')}`);
        
        // Initialize formatter
        const formatter = new InstructionFormatter(config);
        
        // Generate instruction examples
        elizaLogger.info('🔄 Generating instruction examples...');
        const examples = await formatter.generateInstructionExamples(conversations, users);
        
        if (examples.length === 0) {
          elizaLogger.error('❌ No examples generated. Check your quality threshold and input data.');
          process.exit(1);
        }
        
        elizaLogger.info(`✅ Generated ${examples.length} instruction examples`);
        
        // Preview mode - show examples without saving
        if (parseInt(options.preview) > 0) {
          const previewCount = Math.min(parseInt(options.preview), examples.length);
          elizaLogger.info(`\n👀 Previewing first ${previewCount} examples:\n`);
          
          for (let i = 0; i < previewCount; i++) {
            const example = examples[i];
            console.log(`\n--- Example ${i + 1} ---`);
            console.log(`User: ${example.metadata.username}`);
            console.log(`Quality: ${example.metadata.qualityScore.toFixed(2)}`);
            console.log(`Context: ${example.metadata.contextLength} messages`);
            console.log('');
            
            for (const message of example.messages) {
              console.log(`${message.role.toUpperCase()}: ${message.content.substring(0, 200)}${message.content.length > 200 ? '...' : ''}`);
              console.log('');
            }
          }
          
          elizaLogger.info('👀 Preview complete. Use without --preview to save data.');
          return;
        }
        
        // Split data
        elizaLogger.info('📊 Splitting data into train/validation/test sets...');
        const splits = formatter.splitExamples(examples);
        
        elizaLogger.info(`  Training: ${splits.train.length} examples`);
        elizaLogger.info(`  Validation: ${splits.validation.length} examples`);
        elizaLogger.info(`  Test: ${splits.test.length} examples`);
        
        // Generate statistics
        const stats = generateStatistics(examples, users);
        
        // Save data
        const outputPath = path.resolve(options.output);
        const outputDir = path.dirname(outputPath);
        const outputName = path.parse(outputPath).name;
        const outputExt = config.outputFormat === 'jsonl' ? '.jsonl' : '.json';
        
        await fs.mkdir(outputDir, { recursive: true });
        
        // Save training sets
        if (config.outputFormat === 'jsonl') {
          await fs.writeFile(
            path.join(outputDir, `${outputName}-train${outputExt}`),
            formatter.formatAsJSONL(splits.train)
          );
          await fs.writeFile(
            path.join(outputDir, `${outputName}-validation${outputExt}`),
            formatter.formatAsJSONL(splits.validation)
          );
          await fs.writeFile(
            path.join(outputDir, `${outputName}-test${outputExt}`),
            formatter.formatAsJSONL(splits.test)
          );
        } else {
          await fs.writeFile(
            path.join(outputDir, `${outputName}-train${outputExt}`),
            JSON.stringify(splits.train, null, 2)
          );
          await fs.writeFile(
            path.join(outputDir, `${outputName}-validation${outputExt}`),
            JSON.stringify(splits.validation, null, 2)
          );
          await fs.writeFile(
            path.join(outputDir, `${outputName}-test${outputExt}`),
            JSON.stringify(splits.test, null, 2)
          );
        }
        
        // Save complete dataset
        if (config.outputFormat === 'jsonl') {
          await fs.writeFile(outputPath, formatter.formatAsJSONL(examples));
        } else {
          await fs.writeFile(outputPath, JSON.stringify(examples, null, 2));
        }
        
        // Save statistics and metadata
        const metadataPath = path.join(outputDir, `${outputName}-metadata.json`);
        await fs.writeFile(metadataPath, JSON.stringify({
          config,
          stats,
          generated_at: new Date().toISOString(),
          total_examples: examples.length,
          train_examples: splits.train.length,
          validation_examples: splits.validation.length,
          test_examples: splits.test.length
        }, null, 2));
        
        // Display summary
        elizaLogger.info('\n📊 Generation Summary:');
        elizaLogger.info(`  Total examples: ${stats.totalExamples.toLocaleString()}`);
        elizaLogger.info(`  Users included: ${stats.usersIncluded.toLocaleString()}`);
        elizaLogger.info(`  Average context length: ${stats.averageContextLength.toFixed(1)} messages`);
        elizaLogger.info(`  Average quality score: ${stats.averageQualityScore.toFixed(2)}`);
        
        elizaLogger.info('\n📁 Files created:');
        elizaLogger.info(`  Complete dataset: ${outputPath}`);
        elizaLogger.info(`  Training set: ${path.join(outputDir, `${outputName}-train${outputExt}`)}`);
        elizaLogger.info(`  Validation set: ${path.join(outputDir, `${outputName}-validation${outputExt}`)}`);
        elizaLogger.info(`  Test set: ${path.join(outputDir, `${outputName}-test${outputExt}`)}`);
        elizaLogger.info(`  Metadata: ${metadataPath}`);
        
        // Show top users
        elizaLogger.info('\n👥 Top users in dataset:');
        const topUsers = Object.entries(stats.userDistribution)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);
        
        for (const [username, count] of topUsers) {
          const percentage = (count / stats.totalExamples * 100).toFixed(1);
          elizaLogger.info(`  ${username}: ${count} examples (${percentage}%)`);
        }
        
        elizaLogger.info('\n✅ Conversation data generation completed successfully!');
        
        // Next steps suggestion
        elizaLogger.info('\n💡 Next steps:');
        elizaLogger.info(`  1. Review the training data in ${outputPath}`);
        elizaLogger.info(`  2. Train model: eliza-training train-model --file ${path.join(outputDir, `${outputName}-train${outputExt}`)}`);
        elizaLogger.info('  3. Monitor training progress and evaluate results');
        
      } catch (error) {
        elizaLogger.error('❌ Error generating conversation data:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Load extracted Discord data from files
 */
async function loadExtractedData(inputDir: string): Promise<{
  conversations: ConversationThread[];
  users: TrackedUser[];
}> {
  const conversationsPath = path.join(inputDir, 'conversations.json');
  const usersPath = path.join(inputDir, 'users.json');
  
  try {
    const [conversationsData, usersData] = await Promise.all([
      fs.readFile(conversationsPath, 'utf-8'),
      fs.readFile(usersPath, 'utf-8')
    ]);
    
    const conversations = JSON.parse(conversationsData) as ConversationThread[];
    const users = JSON.parse(usersData) as TrackedUser[];
    
    return { conversations, users };
  } catch (error) {
    throw new Error(`Failed to load extracted data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate statistics about the instruction examples
 */
function generateStatistics(examples: InstructionExample[], users: TrackedUser[]): GenerationStats {
  const userDistribution: Record<string, number> = {};
  const topicDistribution: Record<string, number> = {};
  const channelDistribution: Record<string, number> = {};
  
  let totalContextLength = 0;
  let totalQualityScore = 0;
  
  for (const example of examples) {
    // User distribution
    const username = example.metadata.username;
    userDistribution[username] = (userDistribution[username] || 0) + 1;
    
    // Channel distribution
    const channel = example.metadata.channelName || 'Unknown';
    channelDistribution[channel] = (channelDistribution[channel] || 0) + 1;
    
    // Context and quality
    totalContextLength += example.metadata.contextLength;
    totalQualityScore += example.metadata.qualityScore;
    
    // Simple topic extraction
    const content = example.messages.join(' ').toLowerCase();
    const topics = ['development', 'ai', 'discord', 'eliza', 'help', 'bug', 'feature'];
    for (const topic of topics) {
      if (content.includes(topic)) {
        topicDistribution[topic] = (topicDistribution[topic] || 0) + 1;
      }
    }
  }
  
  return {
    totalExamples: examples.length,
    usersIncluded: Object.keys(userDistribution).length,
    averageContextLength: totalContextLength / examples.length,
    averageQualityScore: totalQualityScore / examples.length,
    topicDistribution,
    channelDistribution,
    userDistribution
  };
}