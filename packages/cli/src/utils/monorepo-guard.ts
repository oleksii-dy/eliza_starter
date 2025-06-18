import { UserEnvironment } from './user-environment';
import path from 'node:path';

/**
 * Checks if the CLI is running from within the monorepo directory structure
 * (i.e., using the local build for development)
 */
function isRunningLocalCLI(): boolean {
  const cliPath = process.argv[1]; // Path to the CLI script being executed
  if (!cliPath) return false;

  // Check if the CLI path contains the monorepo packages/cli structure
  return cliPath.includes('packages/cli/dist') || cliPath.includes('packages/cli/src');
}

/**
 * Calculate the relative path to get outside the monorepo
 */
function getExitPath(currentDir: string, monorepoRoot: string): string {
  const relativePath = path.relative(monorepoRoot, currentDir);
  if (relativePath === '') {
    // At monorepo root
    return 'cd ..';
  }

  const depth = relativePath.split(path.sep).length;
  const upLevels = depth + 1; // +1 to get outside the monorepo root
  const exitPath = path.join(...Array(upLevels).fill('..'));
  return `cd ${exitPath}`;
}

/**
 * Checks if running inside monorepo and exits with helpful message if so
 * @returns true if should continue, never returns if in monorepo (exits process)
 */
export function checkMonorepoGuard(): boolean {
  const userEnv = UserEnvironment.getInstance();
  const monorepoRoot = userEnv.findMonorepoRoot(process.cwd());

  if (!monorepoRoot) {
    return true; // Not in monorepo, continue
  }

  // Allow local CLI usage for monorepo development
  // TEMP: Comment out for testing - will re-enable later
  // if (isRunningLocalCLI()) {
  //   return true; // Running local CLI for development, allow it
  // }

  // Color scheme for clear section differentiation
  const blue = '\x1b[38;5;27m'; // Structure
  const orange = '\x1b[38;5;208m'; // Primary user guidance
  const purple = '\x1b[38;5;141m'; // Developer guidance
  const green = '\x1b[38;5;46m'; // Help resources
  const cyan = '\x1b[38;5;51m'; // Command examples
  const reset = '\x1b[0m';
  const bold = '\x1b[1m';
  const red = '\x1b[38;5;196m'; // Error color
  const gray = '\x1b[38;5;240m'; // Advanced guidance color

  const messageText = "You're inside the ElizaOS monorepo (source code)";
  const width = 68;
  const border = `${blue}${'─'.repeat(width)}${reset}`;

  // Calculate exit path and get the command that was run
  const exitCommand = getExitPath(process.cwd(), monorepoRoot);
  const originalCommand = process.argv.slice(2).join(' ');

  // Center the text in the border
  const availableSpace = width - 2; // Subtract border characters
  const padding = Math.max(0, availableSpace - messageText.length);
  const leftPadding = Math.floor(padding / 2);
  const rightPadding = padding - leftPadding;

  console.log('');
  console.log(border);
  console.log(
    `${blue}│${orange}${bold}${' '.repeat(leftPadding)}${messageText}${' '.repeat(rightPadding)}${reset}${blue}│${reset}`
  );
  console.log(border);
  console.log('');
  console.log(`${red}ERROR: Cannot run elizaos commands from within the monorepo${reset}`);
  console.log('');
  console.log(`${orange}The elizaos CLI creates and manages projects and plugins${reset}`);
  console.log(`${orange}in your workspace, not from within the source code.${reset}`);
  console.log('');
  console.log(`${orange}To use the CLI, navigate outside this source directory:${reset}`);
  console.log(`${cyan}${bold}  ${exitCommand}${reset}`);
  console.log(`${cyan}${bold}  elizaos ${originalCommand}${reset}`);
  console.log('');
  console.log(`${green}Need help? • https://eliza.how • packages/cli/README.md${reset}`);
  console.log('');
  console.log(`${gray}Advanced: If you're forking ElizaOS source code or contributing${reset}`);
  console.log(`${gray}to the codebase, you can safely ignore this message and check${reset}`);
  console.log(`${gray}your current directory's package.json for local dev scripts${reset}`);
  console.log('');

  process.exit(1);
}
