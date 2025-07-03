import { describe, expect, test } from 'bun:test';
import { CliTestRunner } from './cli-test-runner';

describe('CliTestRunner', () => {
  describe('parseCommandArgs', () => {
    const runner = new CliTestRunner({
      cliPath: 'elizaos',
      workingDirectory: '.',
    });

    // Access the private method for testing
    const parseCommandArgs = (runner as any).parseCommandArgs.bind(runner);

    test('should parse simple arguments', () => {
      const args = parseCommandArgs('create my-project');
      expect(args).toEqual(['create', 'my-project']);
    });

    test('should handle double-quoted arguments with spaces', () => {
      const args = parseCommandArgs('create "my awesome project"');
      expect(args).toEqual(['create', 'my awesome project']);
    });

    test('should handle single-quoted arguments with spaces', () => {
      const args = parseCommandArgs("create 'my cool project'");
      expect(args).toEqual(['create', 'my cool project']);
    });

    test('should handle mixed quotes', () => {
      const args = parseCommandArgs('test --name "Test\'s Name" --tag \'double"quote\'');
      expect(args).toEqual(['test', '--name', "Test's Name", '--tag', 'double"quote']);
    });

    test('should handle multiple spaces', () => {
      const args = parseCommandArgs('create   my-project   --template   default');
      expect(args).toEqual(['create', 'my-project', '--template', 'default']);
    });

    test('should handle empty command', () => {
      const args = parseCommandArgs('');
      expect(args).toEqual([]);
    });

    test('should handle command with only spaces', () => {
      const args = parseCommandArgs('   ');
      expect(args).toEqual([]);
    });

    test('should handle escaped quotes', () => {
      const args = parseCommandArgs('echo "This is a \\"quoted\\" word"');
      expect(args).toEqual(['echo', 'This is a \\"quoted\\" word']);
    });
  });
});