import { Command } from 'commander';
import { elizaLogger } from '@elizaos/core';
import { TogetherAIClient } from '../../lib/together-client.js';

export function trainModelCommand(program: Command) {
  program
    .command('train-model')
    .description('Start fine-tuning on Together.ai')
    .requiredOption('-k, --api-key <key>', 'Together.ai API key (or set TOGETHER_AI_API_KEY)')
    .requiredOption('-m, --model <model>', 'Base model to fine-tune')
    .requiredOption('-f, --file <path>', 'JSONL dataset file')
    .option('-s, --suffix <suffix>', 'Model suffix')
    .option('-e, --epochs <number>', 'Number of training epochs', '3')
    .option('-lr, --learning-rate <number>', 'Learning rate', '1e-5')
    .option('-b, --batch-size <number>', 'Batch size', '1')
    .option('--monitor', 'Monitor training progress')
    .action(async (options) => {
      try {
        const apiKey = options.apiKey || process.env.TOGETHER_AI_API_KEY;
        if (!apiKey) {
          elizaLogger.error('❌ Error: Together.ai API key is required (use --api-key or TOGETHER_AI_API_KEY env var)');
          process.exit(1);
        }

        const epochs = parseInt(options.epochs);
        const learningRate = parseFloat(options.learningRate);
        const batchSize = parseInt(options.batchSize);

        if (isNaN(epochs) || epochs < 1) {
          elizaLogger.error('❌ Error: Epochs must be a positive integer');
          process.exit(1);
        }

        const client = new TogetherAIClient(apiKey);

        elizaLogger.info('📤 Uploading dataset to Together.ai...');
        const fileId = await client.uploadDataset(options.file);
        elizaLogger.info(`✅ Dataset uploaded: ${fileId}`);

        elizaLogger.info('🚀 Starting fine-tuning job...');
        const job = await client.startFineTuning(
          {
            apiKey,
            baseModel: options.model,
            suffix: options.suffix,
            epochs,
            learningRate,
            batchSize,
          },
          fileId
        );

        elizaLogger.info(`✅ Fine-tuning job started: ${job.id}`);
        elizaLogger.info(`📊 Base model: ${job.model}`);
        elizaLogger.info(`📊 Status: ${job.status}`);
        elizaLogger.info(`📊 Created: ${job.createdAt.toISOString()}`);

        if (options.monitor) {
          elizaLogger.info('\n🔍 Monitoring training progress...');
          await monitorJob(client, job.id);
        } else {
          elizaLogger.info(`\n💡 To monitor progress, run: eliza-training test-model --job-id ${job.id} --api-key ${apiKey}`);
        }
      } catch (error) {
        elizaLogger.error('❌ Error starting training:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

async function monitorJob(client: TogetherAIClient, jobId: string): Promise<void> {
  let lastStatus = '';
  
  while (true) {
    try {
      const job = await client.getJobStatus(jobId);
      
      if (job.status !== lastStatus) {
        elizaLogger.info(`📊 Status: ${job.status}`);
        lastStatus = job.status;
        
        if (job.error) {
          elizaLogger.info(`❌ Error: ${job.error}`);
        }
        
        if (job.fineTunedModel) {
          elizaLogger.info(`🎯 Fine-tuned model: ${job.fineTunedModel}`);
        }
      }

      if (['succeeded', 'failed', 'cancelled'].includes(job.status)) {
        if (job.status === 'succeeded') {
          elizaLogger.info(`✅ Training completed successfully!`);
          elizaLogger.info(`🎯 Fine-tuned model: ${job.fineTunedModel}`);
          elizaLogger.info(`📅 Finished: ${job.finishedAt?.toISOString()}`);
        } else {
          elizaLogger.info(`❌ Training ${job.status}`);
          if (job.error) {
            elizaLogger.info(`Error: ${job.error}`);
          }
        }
        break;
      }

      // Wait 30 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 30000));
    } catch (error) {
      elizaLogger.error('❌ Error monitoring job:', error instanceof Error ? error.message : String(error));
      await new Promise(resolve => setTimeout(resolve, 60000)); // Wait longer on error
    }
  }
}