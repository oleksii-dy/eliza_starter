import { Command } from 'commander';
import { phalaCliCommand } from './phala-wrapper';
import { checkMonorepoGuard } from '@/src/utils/monorepo-guard';

export const teeCommand = new Command('tee')
  .description('Manage TEE deployments')
  .hook('preAction', () => {
    checkMonorepoGuard();
  })
  // Add TEE Vendor Commands
  .addCommand(phalaCliCommand);
