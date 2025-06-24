import { Command } from 'commander';

export const cleanupCommand = new Command('cleanup')
  .description('Clean up and organize temporary files throughout the ElizaOS monorepo')
  .action(() => {
    console.log('Cleanup functionality temporarily disabled due to missing imports.');
    console.log('This feature will be restored in a future update.');
  });
