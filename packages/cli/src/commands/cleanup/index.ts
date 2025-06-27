import { Command } from 'commander';

const cleanupCommand = new Command('cleanup')
  .description('Clean up and organize temporary files throughout the ElizaOS monorepo')
  .action(() => {
    console.log('Cleanup functionality temporarily disabled due to missing imports.');
    console.log('This feature will be restored in a future update.');
  });

// Export both default and named for compatibility
export default cleanupCommand;
export { cleanupCommand };
// Also export as 'cleanup' for CLI loader compatibility
export { cleanupCommand as cleanup };
