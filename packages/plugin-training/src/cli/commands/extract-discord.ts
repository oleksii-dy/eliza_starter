import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import { elizaLogger } from '@elizaos/core';
import { DiscordExtractor } from '../../extractors/discord-extractor.js';
import { PersonalityAnalyzer } from '../../processors/personality-analyzer.js';
import type { ExtractionConfig } from '../../types/discord-types.js';

export function extractDiscordCommand(program: Command) {
  program
    .command('extract-discord')
    .description('Extract Discord conversations from elizaos/knowledge repository')
    .requiredOption('-r, --repo-path <path>', 'Path to elizaos/knowledge repository')
    .option('-o, --output-dir <path>', 'Output directory for extracted data', './discord-data')
    .option('--min-messages <number>', 'Minimum messages per conversation', '3')
    .option('--max-gap-hours <number>', 'Maximum hour gap between messages in same conversation', '2')
    .option('--min-conversation-length <number>', 'Minimum conversation length', '3')
    .option('--min-user-messages <number>', 'Minimum messages per user to track', '50')
    .option('--top-users <number>', 'Number of top users to track', '50')
    .option('--exclude-bots', 'Exclude bot messages', false)
    .option('--exclude-system', 'Exclude system messages', true)
    .option('--min-content-length <number>', 'Minimum content length', '5')
    .option('--max-content-length <number>', 'Maximum content length', '2000')
    .option('--exclude-urls', 'Exclude URL-only messages', true)
    .option('--exclude-attachment-only', 'Exclude attachment-only messages', true)
    .option('--min-quality-score <number>', 'Minimum conversation quality score', '0.3')
    .option('--require-multiple-speakers', 'Require multiple speakers per conversation', true)
    .option('--analyze-personalities', 'Analyze user personalities', true)
    .action(async (options) => {
      try {
        elizaLogger.info('🚀 Starting Discord conversation extraction...');
        
        // Validate repository path
        const repoPath = path.resolve(options.repoPath);
        try {
          await fs.access(repoPath);
        } catch (error) {
          elizaLogger.error(`❌ Repository path not found: ${repoPath}`);
          process.exit(1);
        }
        
        // Create configuration
        const config: ExtractionConfig = {
          repoPath,
          outputDir: path.resolve(options.outputDir),
          minMessages: parseInt(options.minMessages),
          maxGapHours: parseFloat(options.maxGapHours),
          minConversationLength: parseInt(options.minConversationLength),
          minUserMessages: parseInt(options.minUserMessages),
          topUserCount: parseInt(options.topUsers),
          excludeBots: options.excludeBots,
          excludeSystemMessages: options.excludeSystem,
          minContentLength: parseInt(options.minContentLength),
          maxContentLength: parseInt(options.maxContentLength),
          excludeUrls: options.excludeUrls,
          excludeAttachmentOnly: options.excludeAttachmentOnly,
          minQualityScore: parseFloat(options.minQualityScore),
          requireMultipleSpeakers: options.requireMultipleSpeakers,
          anonymizeUsers: false,
          excludeSensitiveChannels: []
        };
        
        elizaLogger.info('📋 Extraction configuration:');
        elizaLogger.info(`  Repository: ${config.repoPath}`);
        elizaLogger.info(`  Output: ${config.outputDir}`);
        elizaLogger.info(`  Min messages per conversation: ${config.minMessages}`);
        elizaLogger.info(`  Max gap between messages: ${config.maxGapHours} hours`);
        elizaLogger.info(`  Min user messages: ${config.minUserMessages}`);
        elizaLogger.info(`  Top users to track: ${config.topUserCount}`);
        elizaLogger.info(`  Quality threshold: ${config.minQualityScore}`);
        
        // Initialize extractor
        const extractor = new DiscordExtractor(config);
        
        // Extract conversations
        const { conversations, users, stats } = await extractor.extractConversations();
        
        // Analyze personalities if requested
        let enhancedUsers = users;
        if (options.analyzePersonalities) {
          elizaLogger.info('🧠 Analyzing user personalities...');
          const analyzer = new PersonalityAnalyzer();
          
          // Get all messages for personality analysis
          const allMessages = conversations.flatMap(c => c.messages);
          enhancedUsers = await analyzer.analyzePersonalities(users, conversations, allMessages);
        }
        
        // Save results
        await extractor.saveResults(conversations, enhancedUsers, stats);
        
        // Display summary
        elizaLogger.info('\n📊 Extraction Summary:');
        elizaLogger.info(`  Total messages processed: ${stats.totalMessages.toLocaleString()}`);
        elizaLogger.info(`  Messages after filtering: ${stats.filteredMessages.toLocaleString()}`);
        elizaLogger.info(`  Total conversations: ${stats.totalConversations.toLocaleString()}`);
        elizaLogger.info(`  Quality conversations: ${stats.qualityConversations.toLocaleString()}`);
        elizaLogger.info(`  Total users found: ${stats.totalUsers.toLocaleString()}`);
        elizaLogger.info(`  Users tracked: ${stats.trackedUsers.toLocaleString()}`);
        elizaLogger.info(`  Channels covered: ${stats.channelsCovered.toLocaleString()}`);
        elizaLogger.info(`  Date range: ${stats.dateRange.earliest} to ${stats.dateRange.latest}`);
        elizaLogger.info(`  Average conversation length: ${stats.averageConversationLength.toFixed(1)} messages`);
        elizaLogger.info(`  Average quality score: ${stats.averageQualityScore.toFixed(2)}`);
        
        // Save summary report
        const reportPath = path.join(config.outputDir, 'extraction-report.md');
        await generateReport(stats, enhancedUsers, conversations, reportPath);
        elizaLogger.info(`📄 Generated report: ${reportPath}`);
        
        elizaLogger.info('\n✅ Discord extraction completed successfully!');
        elizaLogger.info(`📁 Results saved to: ${config.outputDir}`);
        
        // Next steps suggestion
        elizaLogger.info('\n💡 Next steps:');
        elizaLogger.info('  1. Review the extraction report');
        elizaLogger.info('  2. Generate training data: eliza-training generate-conversation-data');
        elizaLogger.info('  3. Train model: eliza-training train-model');
        
      } catch (error) {
        elizaLogger.error('❌ Error extracting Discord conversations:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

/**
 * Generate extraction report
 */
async function generateReport(
  stats: any,
  users: any[],
  conversations: any[],
  reportPath: string
): Promise<void> {
  const report = `# Discord Conversation Extraction Report

## Overview

This report summarizes the extraction of Discord conversations from the elizaos/knowledge repository.

**Extraction Date**: ${new Date().toISOString()}

## Statistics

### Message Processing
- **Total Messages**: ${stats.totalMessages.toLocaleString()}
- **Filtered Messages**: ${stats.filteredMessages.toLocaleString()}
- **Filter Rate**: ${((1 - stats.filteredMessages / stats.totalMessages) * 100).toFixed(1)}%

### Conversations
- **Total Conversations**: ${stats.totalConversations.toLocaleString()}
- **Quality Conversations**: ${stats.qualityConversations.toLocaleString()}
- **Quality Rate**: ${(stats.qualityConversations / stats.totalConversations * 100).toFixed(1)}%
- **Average Length**: ${stats.averageConversationLength.toFixed(1)} messages
- **Average Quality Score**: ${stats.averageQualityScore.toFixed(2)}

### Users
- **Total Users**: ${stats.totalUsers.toLocaleString()}
- **Tracked Users**: ${stats.trackedUsers.toLocaleString()}
- **Tracking Rate**: ${(stats.trackedUsers / stats.totalUsers * 100).toFixed(1)}%

### Coverage
- **Channels Covered**: ${stats.channelsCovered.toLocaleString()}
- **Date Range**: ${stats.dateRange.earliest} to ${stats.dateRange.latest}

## Top Users

| Rank | Username | Display Name | Messages | Conversations | Avg Length | Frequency |
|------|----------|--------------|----------|---------------|------------|-----------|
${users.slice(0, 20).map((user, i) => 
  `| ${i + 1} | ${user.username} | ${user.displayName} | ${user.messageCount} | ${user.conversationCount} | ${user.averageMessageLength.toFixed(1)} | ${user.conversationFrequency.toFixed(2)}/day |`
).join('\n')}

## Personality Analysis

${users.filter(u => u.personalityProfile).slice(0, 10).map(user => `
### ${user.displayName} (${user.username})

- **Communication Style**: ${user.personalityProfile?.communicationStyle.join(', ') || 'N/A'}
- **Emotional Tone**: ${user.personalityProfile?.emotionalTone || 'N/A'}
- **Engagement Level**: ${user.personalityProfile?.engagementLevel || 'N/A'}
- **Expertise**: ${user.personalityProfile?.expertise.join(', ') || 'N/A'}
- **Helpfulness Score**: ${(user.personalityProfile?.helpfulness * 100).toFixed(0)}%
- **Leadership Score**: ${(user.personalityProfile?.leadership * 100).toFixed(0)}%
- **Common Phrases**: ${user.personalityProfile?.commonPhrases.slice(0, 5).join(', ') || 'N/A'}
`).join('\n')}

## Quality Distribution

${generateQualityDistribution(conversations)}

## Channel Distribution

${generateChannelDistribution(conversations)}

## Recommendations

### Training Data Generation
- Target **${Math.min(10000, conversations.length * 2)}** instruction examples
- Focus on **${users.slice(0, 50).map(u => u.username).join(', ')}**
- Use conversations with quality score > 0.5

### Model Training
- Use **Llama 70B Distill** as base model
- Set batch size to **8** (minimum for Together.ai)
- Train for **3-5 epochs** to prevent overfitting
- Learning rate: **1e-5** for stability

### Data Improvements
- Consider filtering out very short conversations (< 5 messages)
- Focus on conversations with multiple tracked users
- Balance examples across different channels and topics

## Files Generated

- \`conversations.json\`: All extracted conversations
- \`users.json\`: User profiles with personality analysis
- \`stats.json\`: Detailed extraction statistics
- \`extraction-report.md\`: This report

## Next Steps

1. **Review Results**: Examine the extracted conversations and user profiles
2. **Generate Training Data**: Use \`eliza-training generate-conversation-data\`
3. **Train Model**: Submit training job with \`eliza-training train-model\`
4. **Evaluate**: Test the trained model on held-out conversations
`;

  await fs.writeFile(reportPath, report);
}

function generateQualityDistribution(conversations: any[]): string {
  const bins = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
  const distribution = bins.slice(0, -1).map((min, i) => {
    const max = bins[i + 1];
    const count = conversations.filter(c => c.qualityScore >= min && c.qualityScore < max).length;
    const percentage = (count / conversations.length * 100).toFixed(1);
    return `- **${min.toFixed(1)} - ${max.toFixed(1)}**: ${count} conversations (${percentage}%)`;
  });
  
  return distribution.join('\n');
}

function generateChannelDistribution(conversations: any[]): string {
  const channelCounts = new Map<string, number>();
  
  for (const conv of conversations) {
    const channel = conv.channelName || 'Unknown';
    channelCounts.set(channel, (channelCounts.get(channel) || 0) + 1);
  }
  
  const sorted = Array.from(channelCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  
  return sorted.map(([channel, count]) => {
    const percentage = (count / conversations.length * 100).toFixed(1);
    return `- **#${channel}**: ${count} conversations (${percentage}%)`;
  }).join('\n');
}