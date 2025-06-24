import { type Command } from 'commander';
import { elizaLogger } from '@elizaos/core';
import { SimpleDbExtractor } from '../../lib/simple-db-extractor.js';
import { DatasetBuilder } from '../../lib/dataset-builder.js';

export function extractSimpleCommand(program: Command) {
  program
    .command('extract-data')
    .description('Extract training data from ElizaOS database or create sample data')
    .option(
      '-d, --data-dir <path>',
      'Data directory',
      process.env.TRAINING_DATA_DIR || './training-data'
    )
    .option(
      '-db, --db-dir <path>',
      'ElizaOS database directory',
      process.env.ELIZA_DB_DIR || './.elizadb'
    )
    .option('-q, --min-quality <number>', 'Minimum quality threshold', '0.7')
    .option('-l, --limit <number>', 'Maximum examples to extract', '50')
    .option('--append', 'Append to existing examples instead of replacing')
    .action(async (options) => {
      try {
        elizaLogger.info('🔍 Extracting training data from ElizaOS...');

        const extractor = new SimpleDbExtractor(options.dbDir);
        const builder = new DatasetBuilder(options.dataDir);

        // Load existing examples if appending
        if (options.append) {
          await builder.loadExamples();
          elizaLogger.info(`📋 Loaded ${builder.listExamples().length} existing examples`);
        }

        // Extract data
        const extractedExamples = await extractor.extractTrainingData();

        // Filter by quality and limit
        const minQuality = parseFloat(options.minQuality);
        const limit = parseInt(options.limit, 10);

        const filteredExamples = extractedExamples
          .filter((example) => example.quality >= minQuality)
          .sort((a, b) => b.quality - a.quality)
          .slice(0, limit);

        elizaLogger.info(
          `📋 Filtered to ${filteredExamples.length} high-quality examples (quality >= ${minQuality})`
        );

        // Add to dataset
        for (const example of filteredExamples) {
          await builder.addExample({
            request: example.request,
            response: example.response,
            thinking: example.thinking,
            quality: example.quality,
          });
        }

        // Show statistics
        const stats = builder.getStats();
        elizaLogger.info('\\n📊 Dataset Statistics:');
        elizaLogger.info(`  Total examples: ${stats.totalExamples}`);
        elizaLogger.info(`  Average quality: ${stats.averageQuality.toFixed(2)}`);
        elizaLogger.info(`  Estimated tokens: ${stats.tokenCount}`);

        elizaLogger.info('\\n✅ Data extraction completed!');
        elizaLogger.info('💡 Next steps:');
        elizaLogger.info('  1. Review examples: npm run cli list-examples');
        elizaLogger.info('  2. Generate dataset: npm run cli create-dataset --validate');
        elizaLogger.info(
          '  3. Train model: npm run cli train-model --model "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B"'
        );
      } catch (error) {
        elizaLogger.error(
          '❌ Error extracting data:',
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    });
}
